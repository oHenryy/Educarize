import Redis from "ioredis";
import type { Server as SocketServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

/**
 * Redis é opcional: com REDIS_URL definido, o rate limit e o Socket.io passam a ser
 * compartilhados entre várias instâncias do backend. Sem ele, tudo fica em memória
 * (suficiente para uma única instância e para os testes).
 */
let client: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  client ??= createRedisClient(url);
  return client;
}

export function createRedisClient(url: string): Redis {
  const redis = new Redis(url, { maxRetriesPerRequest: 3 });
  redis.on("error", (error) => console.error("[Redis]", error.message));
  return redis;
}

/** Conecta o Socket.io ao Redis para que eventos cheguem a usuários conectados em qualquer instância. */
export function attachRedisAdapter(io: SocketServer, url: string): { close: () => Promise<void> } {
  const pub = createRedisClient(url);
  const sub = pub.duplicate();
  io.adapter(createAdapter(pub, sub));
  return {
    close: async () => {
      await Promise.all([pub.quit(), sub.quit()]);
    },
  };
}
