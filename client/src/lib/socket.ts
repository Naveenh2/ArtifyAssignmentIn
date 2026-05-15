"use client";

import { io, type Socket } from "socket.io-client";
import * as React from "react";

/**
 * Socket.io connects **directly** to the Express host (Render URL in production).
 * REST traffic uses the Next.js BFF (`/api/backend`) so JWT stays httpOnly on the Vercel origin.
 */
const SOCKET_ORIGIN = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://127.0.0.1:4000";

/** Singleton Socket.io client for optional realtime collaboration. */
export function useNoteSocket() {
  const ref = React.useRef<Socket | null>(null);
  if (!ref.current && typeof window !== "undefined") {
    ref.current = io(SOCKET_ORIGIN, { transports: ["websocket"], autoConnect: true });
  }
  React.useEffect(() => {
    return () => {
      ref.current?.disconnect();
      ref.current = null;
    };
  }, []);
  return ref.current;
}
