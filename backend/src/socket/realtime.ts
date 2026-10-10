import type { Server as SocketServer } from "socket.io";

/**
 * Acesso ao Socket.io a partir dos services (ex.: enviar uma notificação em tempo real).
 * Fora do servidor HTTP (testes, scripts) não há socket e os envios são ignorados.
 */
let io: SocketServer | null = null;

export function setRealtimeServer(server: SocketServer): void {
  io = server;
}

/** Cada usuário conectado entra na sala `user:<id>` ao autenticar o socket. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}
