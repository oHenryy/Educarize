import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

export function useSocket() {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:4000", {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Conectado ao servidor Socket.io");
    });

    socket.on("disconnect", () => {
      console.log("Desconectado do servidor Socket.io");
    });

    socket.on("connect_error", (error) => {
      console.error("Erro de conexão Socket.io:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return socketRef.current;
}

