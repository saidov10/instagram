"use client";

import { io, Socket } from "socket.io-client";
import { BASE_URL, getStoredToken } from "./api";

/**
 * One Socket.IO connection per app session, reused across every call — signaling
 * for WebRTC (offer/answer/ICE relay), not a per-call connection. Recreated only if
 * the stored auth token changes (e.g. after a re-login) or the previous socket died.
 */
let socket: Socket | null = null;
let socketToken: string | null = null;

export function getSocket(): Socket {
  const token = getStoredToken();
  if (socket && socketToken === token && socket.connected) {
    return socket;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socketToken = token;
  socket = io(BASE_URL, {
    auth: { token },
    // Default order (polling first, then upgrade to websocket) on purpose: forcing a cold
    // direct WebSocket connection as the first attempt fails against this backend's Render +
    // Cloudflare edge ("WebSocket is closed before the connection is established") — polling
    // bootstraps the Engine.IO session first, then the client upgrades the transport in place.
  });
  socket.on("connect", () => console.log("[socket] connected", socket?.id));
  socket.on("connect_error", (err) => console.error("[socket] connect_error:", err.message));
  socket.on("disconnect", (reason) => console.warn("[socket] disconnected:", reason));
  return socket;
}

export function disconnectSocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
