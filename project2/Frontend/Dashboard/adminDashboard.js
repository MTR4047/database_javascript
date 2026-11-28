import { fetchActiveRole, removeSessionStorageContents, ROLES, signOutBackend } from "../../Public/sessionMGMT.js";

// If not a contractor, cannot access this page
async function checkExistingSession() 
{
    const token = sessionStorage.getItem(SSID_USER_TOKEN);
    const user = sessionStorage.getItem(SSID_USER_ID);

    const role = await fetchActiveRole(token, user);
    if (!role)
    {
        removeSessionStorageContents();
        await signOutBackend(token, user);
        window.location.href = `../index.html`;
        return;
    }
    else if (role !== ROLES.CONTRACTOR)
    {
        window.location.href = `./clientDashboard.html`;   
    }
}

window.addEventListener('DOMContentLoaded', () => { checkExistingSession(); });