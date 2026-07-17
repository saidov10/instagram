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
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
