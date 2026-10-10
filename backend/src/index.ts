import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import app from "./app";
import { config } from "./config/env";
import { setupSocketIO } from "./socket/socketHandler";
import { attachRedisAdapter } from "./config/redis";

const PORT = config.port;

const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Com Redis, eventos em tempo real chegam a usuários conectados em qualquer instância do backend.
if (process.env.REDIS_URL) {
  attachRedisAdapter(io, process.env.REDIS_URL);
}

setupSocketIO(io);

httpServer.listen(PORT, () => {
  console.log(`Educarize backend rodando na porta ${PORT}`);
  console.log(
    `Socket.io configurado${process.env.REDIS_URL ? " com Redis (várias instâncias)" : " em memória (instância única)"}`
  );
});
