import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { MessageService } from "../services/messageService";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function setupSocketIO(io: SocketServer) {
  const messageService = new MessageService();

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Token não fornecido"));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; role: string };
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
      console.log(`Usuário ${userId} desconectado`);
    });

    socket.on("send_message", async (data: { receiverId: string; content: string }) => {
      try {
        const { receiverId, content } = data;

        if (!receiverId || !content) {
          socket.emit("error", { message: "receiverId e content são obrigatórios" });
          return;
        }

        const message = await messageService.sendMessage(userId, receiverId, content);

        socket.emit("message_sent", message);
        io.to(`user:${receiverId}`).emit("new_message", message);

        const unreadCount = await messageService.getUnreadCount(receiverId);
        io.to(`user:${receiverId}`).emit("unread_count_update", { count: unreadCount });

        const conversations = await messageService.getConversations(receiverId);
        io.to(`user:${receiverId}`).emit("conversations_update", conversations);
      } catch (error: any) {
        socket.emit("error", { message: error.message || "Erro ao enviar mensagem" });
      }
    });

    socket.on("mark_as_read", async (data: { messageId: string }) => {
      try {
        await messageService.markAsRead(data.messageId, userId);
        socket.emit("message_read", { messageId: data.messageId });
      } catch (error: any) {
        socket.emit("error", { message: error.message || "Erro ao marcar como lida" });
      }
    });

    socket.on("mark_conversation_as_read", async (data: { userId: string }) => {
      try {
        await messageService.markConversationAsRead(userId, data.userId);
        const conversations = await messageService.getConversations(userId);
        socket.emit("conversations_update", conversations);
      } catch (error: any) {
        socket.emit("error", { message: error.message || "Erro ao marcar conversa como lida" });
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

