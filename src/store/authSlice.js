import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiFetch, clearSession, getStoredToken, getStoredUser, storeSession, } from "@/lib/api";
const initialState = {
    user: getStoredUser(),
    token: getStoredToken(),
    status: "idle",
    error: null,
};
export const loginUser = createAsyncThunk("auth/login", async (payload) => {
    return apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
    });
});
export const registerUser = createAsyncThunk("auth/register", async (payload) => {
    return apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
    });
});
export const loadCurrentUser = createAsyncThunk("auth/me", async () => {
    const response = await apiFetch("/api/auth/me");
    return response.user;
});
const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        logout(state) {
            state.user = null;
            state.token = null;
            state.status = "idle";
            state.error = null;
            clearSession();
        },
        setCredentials(state, action) {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.error = null;
            storeSession(action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
            state.status = "loading";
            state.error = null;
        })
            .addCase(loginUser.fulfilled, (state, action) => {
            state.status = "succeeded";
            state.user = action.payload.user;
            state.token = action.payload.token;
            storeSession(action.payload);
        })
            .addCase(loginUser.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.error.message || "Login failed";
        })
            .addCase(registerUser.pending, (state) => {
            state.status = "loading";
            state.error = null;
        })
            .addCase(registerUser.fulfilled, (state, action) => {
            state.status = "succeeded";
            state.user = action.payload.user;
            state.token = action.payload.token;
            storeSession(action.payload);
        })
            .addCase(registerUser.rejected, (state, action) => {
            state.status = "failed";
            state.error = action.error.message || "Signup failed";
        })
            .addCase(loadCurrentUser.pending, (state) => {
            state.status = "loading";
        })
            .addCase(loadCurrentUser.fulfilled, (state, action) => {
            state.status = "succeeded";
            state.user = action.payload;
            localStorage.setItem("mindsupport_user", JSON.stringify(action.payload));
        })
            .addCase(loadCurrentUser.rejected, (state) => {
            state.status = "failed";
            state.user = null;
            state.token = null;
            clearSession();
        });
    },
});
export const { logout, setCredentials } = authSlice.actions;
export default authSlice.reducer;
