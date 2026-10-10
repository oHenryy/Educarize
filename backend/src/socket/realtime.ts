import type { Server as SocketServer } from "socket.io";

/**
 * Acesso ao Socket.io a partir dos services (ex.: enviar uma notificação em tempo real).
 * Fora do servidor HTTP (testes, scripts) não há socket e os envios são ignorados.
 */
let io: SocketServer | null = null;

export function setRealtimeServer(server: SocketServer): void {
  io = server;
}

/** Se o usuário tem alguma aba conectada (em qualquer instância, quando há o adaptador Redis). */
export async function isUserOnline(userId: string): Promise<boolean> {
  if (!io) return false;
  try {
    return (await io.in(`user:${userId}`).fetchSockets()).length > 0;
  } catch {
    return false;
  }
}

/** Cada usuário conectado entra na sala `user:<id>` ao autenticar o socket. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}
