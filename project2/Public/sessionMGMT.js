export const SESSION_TIMEOUT_MS = 10.5 * 60 * 1000; // 10.5 minutes max limit
export const UPDATE_THRESHOLD_MS = 2 * 60 * 1000; // Update when necessary, 2 minute update threshold
export const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute

export class SessionMinHeap {
    constructor() { this.heap = []; }

    push(token, expiresAt) {
        this.heap.push({ token, expiresAt });
        this._upheap(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        
        const top = this.heap[0];
        this.heap[0] = this.heap.pop();
        this._downheap(0);
        return top;
    }

    peek() { return this.heap.length > 0 ? this.heap[0] : null; }

    _upheap(i) {
        while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this.heap[i].expiresAt >= this.heap[p].expiresAt) break;
            [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
            i = p;
        }
    }

    _downheap(i) {
        const last = this.heap.length - 1;
        while ((i * 2 + 1) <= last) {
            let left = i * 2 + 1; let right = left + 1;
            let smallest = i;

            if (this.heap[left].expiresAt < this.heap[smallest].expiresAt) smallest = left;
            if (right <= last && this.heap[right].expiresAt < this.heap[smallest].expiresAt) smallest = right;

            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
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
    sessionStorage.removeItem('user-session-token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('lastActiveTime');
}

// Track user activity and update timestamp in sessionStorage, this is for LOCAL tracking! GLOBAL tracking is also handled on the server as well.
function setupActivityListeners() {
    ['keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => { sessionStorage.setItem('lastActiveTime', Date.now()); }, { passive: true });
    });
}

// Validate session with the backend on page load
async function validateSessionOnLoad() 
{
    const token = sessionStorage.getItem('user-session-token');
    const storedUsername = sessionStorage.getItem('username');

    if (!token || !storedUsername) 
    { handleSessionExpiration('Please sign in to continue.'); return false; }

    try {
        const response = await fetch('http://localhost:5050/validateUserSession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'user-session-token': token },
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
    if (!sessionStorage.getItem('lastActiveTime')) { sessionStorage.setItem('lastActiveTime', Date.now()); }

    setInterval(async () => {
        const token = sessionStorage.getItem('user-session-token'); if (!token) return;

        const lastActive = parseInt(sessionStorage.getItem('lastActiveTime') || Date.now(), 10);
        const now = Date.now();
        const inactiveDuration = now - lastActive;

        // If active recently, ping the server to update lastActive and lastUpdated
        if (inactiveDuration < CHECK_INTERVAL_MS + 5000) {
            try {
                const response = await fetch('http://localhost:5050/api/session/ping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'user-session-token': token }
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