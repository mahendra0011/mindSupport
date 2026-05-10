import jwt from "jsonwebtoken";
import { Server as SocketIOServer } from "socket.io";
import { CLIENT_ORIGIN, JWT_SECRET } from "../config/env.js";
import { User } from "../models/index.js";

export function createRealtimeServer(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || String(socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!token) {
        next(new Error("Authentication required"));
        return;
      }
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user || user.status === "suspended") {
        next(new Error("Forbidden"));
        return;
      }
      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role}`);
    socket.emit("realtime:ready", { userId: String(user._id), role: user.role });
  });

  return io;
}
