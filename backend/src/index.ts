import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import app from "./app";
import { config } from "./config/env";
import { setupSocketIO } from "./socket/socketHandler";

const PORT = config.port;

const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setupSocketIO(io);

httpServer.listen(PORT, () => {
  console.log(`Educarize backend rodando na porta ${PORT}`);
  console.log(`Socket.io configurado e pronto para conexões`);
});
