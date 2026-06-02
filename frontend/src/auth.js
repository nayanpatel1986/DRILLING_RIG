const ROLE_PRIORITY = {
    viewer: 0,
    operator: 1,
    admin: 2,
};

function safeStorageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Ignore storage failures and let the UI continue in-memory.
    }
}

function safeStorageRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch {
        // Ignore storage failures and let the UI continue in-memory.
    }
}

function decodeJwtPayload(token) {
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
                .join('')
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function getRoleFromToken(token) {
    const payload = decodeJwtPayload(token);
    const role = payload?.role?.toLowerCase();
    return ROLE_PRIORITY[role] !== undefined ? role : 'viewer';
}

export function getStoredRole() {
    const token = safeStorageGet('token');
    if (!token) return 'viewer';

    const role = getRoleFromToken(token);
    safeStorageSet('role', role);
    return role;
}

export function storeAuthSession({ access_token, username, role }) {
    safeStorageSet('token', access_token);
    safeStorageSet('user', username);
    safeStorageSet('role', role || getRoleFromToken(access_token));
}

export function clearAuthSession() {
    safeStorageRemove('token');
    safeStorageRemove('user');
    safeStorageRemove('role');
}

export function hasStoredToken() {
    return !!safeStorageGet('token');
}

export function isAdmin(role) {
    return role === 'admin';
}

export function canAccessCalibration(role) {
    return role === 'admin' || role === 'operator';
}

export function isOperator(role) {
    return (role || '').trim().toLowerCase() === 'operator';
}

export function isViewer(role) {
    return (role || '').trim().toLowerCase() === 'viewer';
}
