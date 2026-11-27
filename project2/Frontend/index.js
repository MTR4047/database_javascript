import { removeSessionStorageContents, SSID_USER_ID, SSID_USER_LAST_ACTIVE, SSID_USER_TOKEN } from "../Public/sessionMGMT.js";

const loginForm = document.querySelector('#user-sign-in');
const registerBtn = document.querySelector('#register-button');
const errorMsg = document.querySelector('#error-message');

const ROLE_DASHBOARD_MAP = Object.freeze({
    [ROLES.CLIENT]: 'clientDashboard.html',
    [ROLES.ADMIN]: 'adminDashboard.html'
});

function getDashboardUrl(role) {
    return ROLE_DASHBOARD_MAP[role] ?? 'clientDashboard.html';
}

function clearError() { if (errorMsg) errorMsg.textContent = ''; }
function showError(msg) { if (errorMsg) errorMsg.textContent = msg; }


// --- SESSION GUARD FOR BACK BUTTON NAVIGATION ---
async function fetchActiveRole(token) {
    if (!token) return null;

    try {
        const response = await fetch('http://localhost:5050/auth/session', {
            method: 'GET',
            headers: {
                [SSID_USER_TOKEN]: token
            }
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data?.role ?? null;
    } catch (err) {
        console.error('Session role lookup error:', err);
        return null;
    }
}

async function signOutBackend(token, user) 
{
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5050/update/Clients/signOut', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [SSID_USER_TOKEN]: token
            },
            body: JSON.stringify({ username: user })
        });

        if (!response.ok) { console.warn('Backend sign-out returned status:', response.status); }
    } 
    catch (err) 
    { console.error('Backend sign-out notification error:', err); }
}

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

            window.location.href = getDashboardUrl(role);
        }
    }
}

// Run check on initial page load; Run check on pageshow event (handles browser Back/Forward cache in modern browsers)
window.addEventListener('DOMContentLoaded', checkExistingSession);
window.addEventListener('pageshow', (event) => { if (event.persisted) { checkExistingSession(); }} );

// Sign In via form submit event (triggers native pattern checks)
loginForm.onsubmit = async function(e) 
{
    e.preventDefault(); clearError();

    const username = document.querySelector('#username-input').value.trim();
    const password = document.querySelector('#password-input').value.trim();

    try {
        const response = await fetch('http://localhost:5050/update/Clients/signIn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const resData = await response.json();

        // Transition into the tableContents.html!
        if (response.ok && resData.success) 
        {
            sessionStorage.setItem(SSID_USER_ID, resData.data.username); // Can use session storage to get the data, the token begin used is better though
            sessionStorage.setItem(SSID_USER_TOKEN, resData.token);
            sessionStorage.setItem(SSID_USER_LAST_ACTIVE, resData.activeTime);
            window.location.href = 'tableContents.html'; // with session storage, we don't need to pass data!
        } 
        else { showError(resData.error || 'Invalid credentials. Check username and password.'); }
    } 
    catch (err) { console.error('Sign In Error:', err); showError('Unable to connect to server.'); }
};

// Register Handler (explicit checkValidity call, as well as it not being a form submit)
registerBtn.onclick = async function() 
{
    clearError();

    if (!loginForm.checkValidity()) // The checkValidity() method of the HTMLFormElement interface returns a boolean value which indicates if all associated controls meet any constraint validation rules applied to them.
    {
        loginForm.reportValidity(); // Triggers browser tooltip showing illegal characters; The reportValidity() method of the HTMLFormElement interface performs the same validity checking steps as the checkValidity() method.
        return;
    }

    const username = document.querySelector('#username-input').value.trim();
    const password = document.querySelector('#password-input').value.trim();

    try {
        const response = await fetch('http://localhost:5050/insert/Clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const resData = await response.json();

        if (response.ok && resData.success) 
        {
            sessionStorage.setItem(SSID_USER_ID, resData.data.username); // Wouldn't use this as much as the token
            sessionStorage.setItem(SSID_USER_TOKEN, resData.token);
            sessionStorage.setItem(SSID_USER_LAST_ACTIVE, resData.activeTime);
            window.location.href = 'tableContents.html';
        } 
        else { showError(resData.error || 'Registration failed.'); }
    } 
    catch (err) { console.error('Registration Error:', err); showError('Unable to connect to server.'); }
};