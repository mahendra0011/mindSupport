import { io } from "socket.io-client";
import { API_BASE, getStoredToken } from "@/lib/api";

let socket;

function socketBaseUrl() {
  if (API_BASE) return API_BASE;
  if (typeof window !== "undefined" && window.location.port === "8080") return "http://localhost:5001";
  return typeof window !== "undefined" ? window.location.origin : "http://localhost:5001";
}

export function getRealtimeSocket() {
  const token = getStoredToken();
  if (!token) return null;
  if (socket?.connected) return socket;
  socket = io(socketBaseUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function closeRealtimeSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
}
