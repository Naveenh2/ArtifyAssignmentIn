import { createServer } from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();
const httpServer = createServer(app);

/**
 * Socket.io — lightweight realtime layer for optional collaborative presence.
 * Clients join `note:{noteId}` rooms; edits can be broadcast from the client MVP.
 */
const io = new Server(httpServer, {
  cors: { origin: env.CLIENT_ORIGIN, credentials: true },
});

io.on("connection", (socket) => {
  socket.on("join-note", (noteId: string) => {
    if (typeof noteId === "string" && noteId.length < 80) {
      socket.join(`note:${noteId}`);
    }
  });
  socket.on("leave-note", (noteId: string) => {
    if (typeof noteId === "string") socket.leave(`note:${noteId}`);
  });
  socket.on("note-presence", (payload: { noteId?: string; user?: string }) => {
    if (!payload?.noteId) return;
    socket.to(`note:${payload.noteId}`).emit("note-presence", {
      user: payload.user ?? "Someone",
      socketId: socket.id,
    });
  });
  socket.on("note-delta", (payload: { noteId?: string; content?: string; title?: string }) => {
    if (!payload?.noteId) return;
    socket.to(`note:${payload.noteId}`).emit("note-delta", {
      content: payload.content,
      title: payload.title,
      from: socket.id,
    });
  });
});

httpServer.listen(env.PORT, () => {
  console.log(`API + Socket listening on :${env.PORT}`);
});
