import { Server as SocketServer, Socket } from "socket.io";
import { parse as parseCookie } from "cookie";
import { resolveUser } from "../middleware/authMiddleware";
import { ACCESS_COOKIE } from "../utils/authCookies";
import { MessageService } from "../services/messageService";
import { sendMessageBody } from "../validation/schemas";
import { toHttpResponse } from "../utils/httpError";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function setupSocketIO(io: SocketServer) {
  const messageService = new MessageService();

  // O navegador envia o cookie httpOnly da sessão no handshake (withCredentials no cliente).
  io.use(async (socket: AuthenticatedSocket, next) => {
    const cookies = parseCookie(socket.handshake.headers.cookie || "");
    const result = await resolveUser(cookies[ACCESS_COOKIE]);
    if ("error" in result) {
      return next(new Error(result.error === "expired" ? "Sessão expirada" : "Não autenticado"));
    }
    socket.userId = result.user.userId;
    socket.userRole = result.user.role;
    next();
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
      console.log(`Usuário ${userId} desconectado`);
    });

    socket.on("send_message", async (data: { receiverId: string; content: string }) => {
      try {
        const parsed = sendMessageBody.safeParse(data);
        if (!parsed.success) {
          socket.emit("error", { message: parsed.error.issues[0]?.message || "Mensagem inválida" });
          return;
        }
        const { receiverId, content } = parsed.data;

        const message = await messageService.sendMessage(userId, receiverId, content);

        socket.emit("message_sent", message);
        io.to(`user:${receiverId}`).emit("new_message", message);

        const unreadCount = await messageService.getUnreadCount(receiverId);
        io.to(`user:${receiverId}`).emit("unread_count_update", { count: unreadCount });

        const conversations = await messageService.getConversations(receiverId);
        io.to(`user:${receiverId}`).emit("conversations_update", conversations);
      } catch (error) {
        socket.emit("error", { message: toHttpResponse(error).body.error });
      }
    });

    socket.on("mark_as_read", async (data: { messageId: string }) => {
      try {
        await messageService.markAsRead(data.messageId, userId);
        socket.emit("message_read", { messageId: data.messageId });
      } catch (error) {
        socket.emit("error", { message: toHttpResponse(error).body.error });
      }
    });

    socket.on("mark_conversation_as_read", async (data: { userId: string }) => {
      try {
        await messageService.markConversationAsRead(userId, data.userId);
        const conversations = await messageService.getConversations(userId);
        socket.emit("conversations_update", conversations);
      } catch (error) {
        socket.emit("error", { message: toHttpResponse(error).body.error });
      }
    });

    socket.on("typing_start", (data: { receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit("user_typing", { userId, typing: true });
    });

    socket.on("typing_stop", (data: { receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit("user_typing", { userId, typing: false });
    });
  });
}

