import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, Server } from "http";
import { AddressInfo } from "net";
import { Server as SocketServer } from "socket.io";
import { io as connect, Socket } from "socket.io-client";
import app from "../src/app";
import { setupSocketIO } from "../src/socket/socketHandler";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";

let httpServer: Server;
let url: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  httpServer = createServer(app);
  setupSocketIO(new SocketServer(httpServer));
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await new Promise((resolve) => httpServer.close(resolve));
});

/** Conecta como o navegador faria: o cookie da sessão vai no handshake. */
async function connectAs(user: TestUser): Promise<Socket> {
  const socket = connect(url, { transports: ["websocket"], extraHeaders: { Cookie: user.cookie } });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return socket;
}

const nextEvent = <T>(socket: Socket, event: string) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`evento "${event}" não recebido`)), 5000);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

describe("tempo real (Socket.io)", () => {
  it("recusa conexão sem sessão", async () => {
    const socket = connect(url, { transports: ["websocket"] });
    sockets.push(socket);
    const error = await new Promise<Error>((resolve) => socket.once("connect_error", resolve));
    expect(error.message).toBe("Não autenticado");
  });

  it("entrega notificações na hora", async () => {
    const instructor = await registerUser("INSTRUCTOR");
    const student = await registerUser();
    const { course } = await createCourse(instructor, { publish: true });
    const instructorSocket = await connectAs(instructor);

    const received = nextEvent<{ title: string; read: boolean }>(instructorSocket, "notification");
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });

    expect(await received).toMatchObject({ title: "Novo aluno matriculado", read: false });
  });

  it("mensagem enviada pela API REST chega ao destinatário conectado", async () => {
    const sender = await registerUser();
    const receiver = await registerUser();
    const receiverSocket = await connectAs(receiver);

    const received = nextEvent<{ content: string; senderId: string }>(receiverSocket, "new_message");
    await api.post("/messages").set(auth(sender)).send({ receiverId: receiver.user.id, content: "olá via REST" });

    expect(await received).toMatchObject({ content: "olá via REST", senderId: sender.user.id });
  });

  it("mensagem pelo socket confirma ao remetente e chega ao destinatário", async () => {
    const sender = await registerUser();
    const receiver = await registerUser();
    const [senderSocket, receiverSocket] = await Promise.all([connectAs(sender), connectAs(receiver)]);

    const confirmed = nextEvent<{ content: string }>(senderSocket, "message_sent");
    const delivered = nextEvent<{ content: string }>(receiverSocket, "new_message");
    senderSocket.emit("send_message", { receiverId: receiver.user.id, content: "olá via socket" });

    expect((await confirmed).content).toBe("olá via socket");
    expect((await delivered).content).toBe("olá via socket");
  });

  it("valida a mensagem enviada pelo socket", async () => {
    const sender = await registerUser();
    const socket = await connectAs(sender);
    const error = nextEvent<{ message: string }>(socket, "error");
    socket.emit("send_message", { receiverId: "x", content: "" });
    expect((await error).message).toBe("Mensagem é obrigatória");
  });
});
