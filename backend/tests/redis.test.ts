import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createServer, Server } from "http";
import { AddressInfo } from "net";
import { Server as SocketServer } from "socket.io";
import { io as connect } from "socket.io-client";
import Redis from "ioredis";
import { rateLimit, RedisRateLimitStore } from "../src/middleware/authMiddleware";
import { attachRedisAdapter } from "../src/config/redis";

const REDIS_URL = process.env.TEST_REDIS_URL || "redis://localhost:6379";

/** Verifica se há Redis disponível. No CI ele é obrigatório; localmente, sem Redis, a suíte é pulada. */
async function redisAvailable(): Promise<boolean> {
  const probe = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 0, retryStrategy: () => null });
  probe.on("error", () => undefined);
  try {
    await probe.connect();
    await probe.ping();
    return true;
  } catch {
    if (process.env.CI) throw new Error(`Redis indisponível em ${REDIS_URL} (obrigatório no CI)`);
    console.warn(`[redis.test] Redis indisponível em ${REDIS_URL}: suíte pulada. Rode "docker compose up -d".`);
    return false;
  } finally {
    probe.disconnect();
  }
}

describe("Redis (várias instâncias do backend)", () => {
  let available = false;
  let redis: Redis;

  beforeAll(async () => {
    available = await redisAvailable();
    if (available) redis = new Redis(REDIS_URL);
  });

  afterAll(async () => {
    await redis?.quit();
  });

  it("o rate limit é compartilhado entre instâncias", async (ctx) => {
    if (!available) return ctx.skip();
    // Duas "instâncias" com limitadores próprios, mas o mesmo Redis e o mesmo prefixo.
    const prefix = `ratelimit-test-${Date.now()}:`;
    const makeInstance = () => {
      const app = express();
      app.post("/login", rateLimit(3, 60_000, new RedisRateLimitStore(redis, prefix)), (_req, res) => res.json({ ok: true }));
      return app;
    };
    const a = makeInstance();
    const b = makeInstance();

    const statuses = [];
    for (const app of [a, b, a, b, a]) statuses.push((await request(app).post("/login")).status);
    expect(statuses).toEqual([200, 200, 200, 429, 429]);

    // Um único contador no Redis, com expiração definida.
    const keys = await redis.keys(`${prefix}*`);
    expect(keys).toHaveLength(1);
    expect(await redis.pttl(keys[0])).toBeGreaterThan(0);
    await redis.del(...keys);
  });

  it("um evento emitido em uma instância chega a um cliente conectado em outra", async (ctx) => {
    if (!available) return ctx.skip();
    const servers: { http: Server; io: SocketServer; close: () => Promise<void> }[] = [];
    for (let i = 0; i < 2; i++) {
      const http = createServer();
      const io = new SocketServer(http);
      const adapter = attachRedisAdapter(io, REDIS_URL);
      await new Promise<void>((resolve) => http.listen(0, resolve));
      servers.push({ http, io, close: adapter.close });
    }
    const [serverA, serverB] = servers;

    serverB.io.on("connection", (socket) => socket.join("user:42"));
    const port = (serverB.http.address() as AddressInfo).port;
    const client = connect(`http://localhost:${port}`, { transports: ["websocket"] });

    try {
      await new Promise<void>((resolve) => client.once("connect", () => resolve()));
      // Dá tempo de a sala ser registrada no adaptador antes de emitir pela outra instância.
      await new Promise((resolve) => setTimeout(resolve, 200));

      const received = new Promise<unknown>((resolve) => client.once("notification", resolve));
      serverA.io.to("user:42").emit("notification", { title: "de outra instância" });

      expect(await received).toEqual({ title: "de outra instância" });
    } finally {
      client.disconnect();
      for (const s of servers) {
        s.io.close();
        await s.close();
      }
    }
  });
});
