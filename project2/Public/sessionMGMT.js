export const SESSION_TIMEOUT_MS = 10.5 * 60 * 1000; // 10.5 minutes max limit
export const UPDATE_THRESHOLD_MS = 2 * 60 * 1000; // Update when necessary, 2 minute update threshold
export const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute
export const BUCKET_MS = 60 * 1000; // 1-minute buckets

export const SSID_USER_TOKEN = 'user-session-token';
export const SSID_USER_ID = 'user-id-name';
export const SSID_USER_LAST_ACTIVE = 'user-last-active-time';

export const ROLES = Object.freeze({
    CLIENT: "client",
    CONTRACTOR: "contractor"
});

// SessionExpirationBuckets.js

export class SessionExpirationBuckets 
{
    /** @type {Number} */ bucketMs;
    /** @type {Map<number, Set<string>>} */ buckets;

    constructor(inpBucketMs = BUCKET_MS) 
    {
        this.bucketMs = inpBucketMs;
        // Map<bucketStartTimestamp, Set<token>>
        this.buckets = new Map();
    }

    getBucketKey(timestamp) 
    { return Math.floor(timestamp / this.bucketMs) * this.bucketMs; }

    addTokenToBucket(token, expiryTimestamp) 
    {
        const bucketKey = this.getBucketKey(expiryTimestamp);
        if (!this.buckets.has(bucketKey)) {
            this.buckets.set(bucketKey, new Set());
        }
        this.buckets.get(bucketKey).add(token);
        return bucketKey;
    }

    removeTokenFromBucket(token, bucketKey) 
    {
        if (bucketKey === undefined || !this.buckets.has(bucketKey)) 
        { return false; }

        const bucketSet = this.buckets.get(bucketKey);
        const removed = bucketSet.delete(token);
        if (bucketSet.size === 0) {
            this.buckets.delete(bucketKey);
        }

        return removed;
    }

    moveTokenToNewBucket(token, session, newExpiryTimestamp) 
    {
        const newBucketKey = this.getBucketKey(newExpiryTimestamp);

        if (session.bucketKey === newBucketKey) 
        { return session.bucketKey; }

        this.removeTokenFromBucket(token, session.bucketKey);  
        session.bucketKey = this.addTokenToBucket(token, newExpiryTimestamp);
        return session.bucketKey;
    }

    // Collects tokens from buckets whose minute window has elapsed and removes those buckets
    collectExpiredTokens(now = Date.now()) {
        const candidateTokens = new Set();

        for (const [bucketKey, tokenSet] of this.buckets.entries()) {
            if (bucketKey + this.bucketMs <= now) {
                for (const token of tokenSet) {
                    candidateTokens.add(token);
                }
                this.buckets.delete(bucketKey);
            }
        }

        return candidateTokens;
    }
}

// Core expiration handler
export function handleSessionExpiration(message = 'Session expired. Please sign in again.') 
{
    removeSessionStorageContents();
    
    alert(message);
    window.location.href = '/Frontend/index.html';
}

export function removeSessionStorageContents()
{
    sessionStorage.removeItem(SSID_USER_TOKEN);
    sessionStorage.removeItem(SSID_USER_ID);
    sessionStorage.removeItem(SSID_USER_LAST_ACTIVE);
}

export async function fetchActiveRole(token, user) {
    if (!token) return null;

    try {
        const response = await fetch('http://localhost:5050/validateUserSession', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [SSID_USER_TOKEN]: token
            },
            body: JSON.stringify({ [SSID_USER_ID]: user })
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data?.success ? (data.role ?? null) : null;
    } 
    catch (err) 
    { console.error('Session validation error:', err); return null; }
}

// Track user activity and update timestamp in sessionStorage, this is for LOCAL tracking! GLOBAL tracking is also handled on the server as well.
function setupActivityListeners() {
    ['keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => { sessionStorage.setItem(SSID_USER_LAST_ACTIVE, Date.now()); }, { passive: true });
    });
}

// Validate session with the backend on page load
async function validateSessionOnLoad() 
{
    const token = sessionStorage.getItem(SSID_USER_TOKEN);
    const storedUsername = sessionStorage.getItem('username');

    if (!token || !storedUsername) 
    { handleSessionExpiration('Please sign in to continue.'); return false; }

    try {
        const response = await fetch('http://localhost:5050/validateUserSession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', [SSID_USER_TOKEN]: token },
            body: JSON.stringify({ username: storedUsername })
        });

        const result = await response.json();

        if (!response.ok || !result.success) 
        { handleSessionExpiration(result.error || 'Session expired or invalid.'); return false; }

        return true;
    } 
    catch (error) 
    {
        console.error('Error validating session: ', error);
        return false;
    }
}

// Start the background heartbeat/ping interval
function startHeartbeat() 
{
    // Initialize lastActiveTime if not present
    if (!sessionStorage.getItem(SSID_USER_LAST_ACTIVE)) 
    { sessionStorage.setItem(SSID_USER_LAST_ACTIVE, Date.now()); }

    setInterval(async () => {
        const token = sessionStorage.getItem(SSID_USER_TOKEN); if (!token) return;

        const lastActive = parseInt(sessionStorage.getItem(SSID_USER_LAST_ACTIVE) || Date.now(), 10);
        const now = Date.now();
        const inactiveDuration = now - lastActive;

        // If active recently, ping the server to update lastActive and lastUpdated
        if (inactiveDuration < CHECK_INTERVAL_MS + 5000) {
            try {
                const response = await fetch('http://localhost:5050/api/session/ping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', [SSID_USER_TOKEN]: token }
                });

                if (!response.ok) 
                { handleSessionExpiration('Your session has expired due to inactivity.'); }
            } 
            catch (error) 
            {
                console.error('Ping failed:', error);
            }
        } 
        else if (inactiveDuration > SESSION_TIMEOUT_MS) 
        { handleSessionExpiration('Your session has expired due to inactivity.'); }
    }, CHECK_INTERVAL_MS);
}

// Main initializer to be called on protected pages
export async function initSessionManager() 
{
    // 1. Validate on load first
    const isValid = await validateSessionOnLoad();
    if (!isValid) return;

    // 2. Setup activity trackers and start background heartbeat
    setupActivityListeners();
    startHeartbeat();
}

/* Need to use it like the following in each HTML

<!-- Notice type="module" is required -->
<script type="module">
    import { initSessionManager } from './sessionManager.js'; // Example import

    // Initialize session protection on DOM load
    document.addEventListener('DOMContentLoaded', () => { initSessionManager(); });
</script>

*/