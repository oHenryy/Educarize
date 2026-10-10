import { createContext } from "react";
import type { Socket } from "socket.io-client";

/** Conexão Socket.io compartilhada pelo app (nula enquanto não há usuário logado). */
export const SocketContext = createContext<Socket | null>(null);
