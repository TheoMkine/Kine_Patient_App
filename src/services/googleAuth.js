import { GOOGLE_CLIENT_ID, SCOPES } from '../config/google';

let tokenClient;
let accessToken = localStorage.getItem('google_access_token');
const tokenExpiry = localStorage.getItem('google_token_expiry');

// Initialize the Google Identity Services (GIS) only
export const initGoogleIdentity = () => {
    return new Promise((resolve) => {
        if (window.google) {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: (resp) => {
                    if (resp.error) {
                        console.error('Auth Error:', resp);
                        return;
                    }
                    // Store valid token
                    if (resp.access_token) {
                        accessToken = resp.access_token;
                        const expiresIn = resp.expires_in || 3599; // Default to 1 hour
                        const expiryTime = Date.now() + (expiresIn * 1000);

                        localStorage.setItem('google_access_token', accessToken);
                        localStorage.setItem('google_token_expiry', expiryTime);
                        localStorage.setItem('google_auth', 'true');
                    }
                },
            });
            resolve();
        } else {
            // Wait for script to load
            const interval = setInterval(() => {
                if (window.google) {
                    clearInterval(interval);
                    initGoogleIdentity().then(resolve);
                }
            }, 100);
        }
    });
};

// No longer need initGoogleAPI (was causing the crash)
export const initGoogleAPI = async () => {
    return Promise.resolve();
};

// Trigger login
export const handleAuthClick = () => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject('Google Identity not initialized');
            return;
        }

        // Override the callback for this specific request to resolve the promise
        const originalCallback = tokenClient.callback;
        tokenClient.callback = (resp) => {
            // Run the standard storage logic
            if (originalCallback) originalCallback(resp);

            if (resp.error) {
                reject(resp);
            } else {
                resolve(resp);
            }
        };

        // If we have a valid token, we might want to skip, but for new session ensure we get one
        // prompt: '' will try to silently refresh if possible
        tokenClient.requestAccessToken({ prompt: '' });
    });
};

export const handleSignoutClick = () => {
    if (accessToken) {
        window.google?.accounts?.oauth2?.revoke(accessToken);
    }
    accessToken = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_auth');
};

export const isAuthenticated = () => {
    const isAuth = localStorage.getItem('google_auth') === 'true';
    const expiry = parseInt(localStorage.getItem('google_token_expiry') || '0');
    const hasToken = !!localStorage.getItem('google_access_token');

    // Refresh if close to expiry (less than 5 mins) or expired
    const now = Date.now();
    const isValid = isAuth && hasToken && now < expiry;

    return isValid;
};

export const getAccessToken = () => {
    return localStorage.getItem('google_access_token');
};
