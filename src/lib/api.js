export const API_BASE = import.meta?.env?.VITE_API_BASE_URL?.trim?.() || "";
export const AUTH_TOKEN_KEY = "mindsupport_token";
export const AUTH_USER_KEY = "mindsupport_user";
export function getStoredToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}
export function getStoredUser() {
    try {
        const raw = localStorage.getItem(AUTH_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function storeSession(payload) {
    localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
}
export function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}
export async function apiFetch(path, init = {}) {
    const token = getStoredToken();
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.body)
        headers.set("Content-Type", "application/json");
    if (token)
        headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
    });
    if (!response.ok) {
        const fallback = `${response.status} ${response.statusText}`;
        let message = fallback;
        try {
            const data = await response.json();
            message = data?.error || data?.message || fallback;
        }
        catch {
            message = (await response.text().catch(() => "")) || fallback;
        }
        throw new Error(message);
    }
    if (response.status === 204)
        return undefined;
    return response.json();
}
