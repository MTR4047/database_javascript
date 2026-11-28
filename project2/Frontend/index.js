import { ADDRESS_TC, CLIENT_TC, US_States, userID_alias } from "../Public/constants.js";
import { fetchActiveRole, removeSessionStorageContents, signOutBackend, SSID_USER_ID, SSID_USER_LAST_ACTIVE, SSID_USER_TOKEN } from "../Public/sessionMGMT.js";

const loginForm = document.querySelector('#user-sign-in');
const registerForm = document.querySelector('#register-button');
const loginErrorMsg = document.querySelector('#login-error-message');
const registerErrorMsg = document.querySelector('#register-error-message');
const stateSelect = document.querySelector('#reg-state'); 

function populateStateDropdown(selectEl, statesMap) 
{
    if (!selectEl || !statesMap) return;

    const fragment = document.createDocumentFragment();

    for (const [code, name] of statesMap.entries()) {
        const option = document.createElement('option');
        option.value = code; // e.g. "MI"
        option.textContent = `${code} - ${name}`; // or just `name`
        fragment.appendChild(option);
    }

    selectEl.appendChild(fragment);
}

function formatCardExpiryParts(mmValue, yyValue) 
{
    const month = Number(mmValue);
    const year = Number(yyValue);

    if (!Number.isInteger(month) || month < 1 || month > 12) return null;
    if (!Number.isInteger(year) || year < 0 || year > 99) return null;

    const mm = String(month).padStart(2, '0');
    const yy = String(year).padStart(2, '0');
    return `${mm}/${yy}`;
}

const ROLE_DASHBOARD_MAP = Object.freeze({
    [ROLES.CLIENT]: 'clientDashboard.html',
    [ROLES.ADMIN]: 'adminDashboard.html'
});

function getDashboardUrl(role) { return ROLE_DASHBOARD_MAP[role] ?? 'clientDashboard.html'; }
function clearErrors() { if (loginErrorMsg) loginErrorMsg.textContent = ''; if (registerErrorMsg) registerErrorMsg.textContent = ''; }
function showLoginError(msg) { if (loginErrorMsg) loginErrorMsg.textContent = msg; }
function showRegisterError(msg) { if (registerErrorMsg) registerErrorMsg.textContent = msg; }

// --- SESSION GUARD FOR BACK BUTTON NAVIGATION ---
async function checkExistingSession() 
{
    const token = sessionStorage.getItem(SSID_USER_TOKEN);
    const user = sessionStorage.getItem(SSID_USER_ID);

    // If session data exists, the user is trying to access index.html while logged in
    if (token || user) 
    {
        const confirmLogout = window.confirm('You are currently logged in. Going back to the login page will log you out. Do you want to proceed?');

        // User confirmed: Clear session storage and notify backend
        if (confirmLogout) 
        {
            removeSessionStorageContents();
            await signOutBackend(token, user);
        } 
        else // User disagreed: Ask server for role; if null/invalid, clear and sign out
        {
            const role = await fetchActiveRole(token, user);

            if (!role) 
            {
                removeSessionStorageContents();
                await signOutBackend(token, user);
                return;
            }

            window.location.href = `./Dashboard/${getDashboardUrl(role)}`;
        }
    }
}

// Run check on initial page load; Run check on pageshow event (handles browser Back/Forward cache in modern browsers)
window.addEventListener('DOMContentLoaded', () => {
    populateStateDropdown(stateSelect, US_States);
    checkExistingSession();
});
window.addEventListener('pageshow', (event) => { if (event.persisted) { checkExistingSession(); }} );

// Sign In via form submit event (triggers native pattern checks)
loginForm.onsubmit = async function(e) 
{
    e.preventDefault(); clearErrors();

    const userId = document.querySelector('#username-input').value.trim();
    const password = document.querySelector('#password-input').value.trim();

    try {
        const response = await fetch('http://localhost:5050/update/Clients/signIn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [userID_alias]: userId, password })
        });

        const resData = await response.json();

        if (response.ok && resData.success) 
        {
            sessionStorage.setItem(SSID_USER_ID, resData.data.email);
            sessionStorage.setItem(SSID_USER_TOKEN, resData.token);
            sessionStorage.setItem(SSID_USER_LAST_ACTIVE, resData.activeTime);
            window.location.href = getDashboardUrl(resData.data.role);
        } 
        else { showLoginError(resData.error || 'Invalid credentials. Check username and password.'); }
    } 
    catch (err) { console.error('Sign In Error:', err); showLoginError('Unable to connect to server.'); }
};

// Register Handler (explicit checkValidity call, as well as it not being a form submit)
registerForm.onsubmit = async function(e) 
{
    e.preventDefault(); clearErrors();

    const expMM = document.querySelector('#reg-card-exp-mm').value.trim();
    const expYY = document.querySelector('#reg-card-exp-yy').value.trim();
    const cardExpiration = formatCardExpiryParts(expMM, expYY);

    if (!cardExpiration) {
        showRegisterError('Please enter a valid expiration month (MM) and year (YY).');
        return;
    }

    const registrationPayload = {
        [userID_alias]: document.querySelector('#reg-email').value.trim(),
        [CLIENT_TC.password]: document.querySelector('#reg-password').value.trim(),
        clientDetails :{
            [CLIENT_TC.firstName]: document.querySelector('#reg-first-name').value.trim(),
            [CLIENT_TC.lastName]: document.querySelector('#reg-last-name').value.trim(),
            [CLIENT_TC.phoneNumber]: document.querySelector('#reg-phone').value.trim(),
        },
        address: {
            [ADDRESS_TC.street]: document.querySelector('#reg-street').value.trim(),
            [ADDRESS_TC.city]: document.querySelector('#reg-city').value.trim(),
            [ADDRESS_TC.state]: document.querySelector('#reg-state').value.trim(),
            [ADDRESS_TC.postalCode]: document.querySelector('#reg-postal').value.trim()
        },
        creditCard: {
            [CLIENT_TC.cardNumber]: document.querySelector('#reg-card-number').value.trim(),
            [CLIENT_TC.cardCVV]: document.querySelector('#reg-card-cvv').value.trim(),
            [CLIENT_TC.cardExpiration]: cardExpiration
        }
    };

    try {
        const response = await fetch('http://localhost:5050/insert/Clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationPayload)
        });

        const resData = await response.json();

        if (response.ok && resData.success) 
        {
            sessionStorage.setItem(SSID_USER_ID, resData.data.email);
            sessionStorage.setItem(SSID_USER_TOKEN, resData.token);
            sessionStorage.setItem(SSID_USER_LAST_ACTIVE, resData.activeTime);
            window.location.href = getDashboardUrl(resData.data.role);
        } 
        else { showRegisterError(resData.error || 'Registration failed.'); }
    } 
    catch (err) { console.error('Registration Error:', err); showRegisterError('Unable to connect to server.'); }
};