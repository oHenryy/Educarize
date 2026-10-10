import { useEffect, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL, refreshSession } from "../api/client";
import { useAuth } from "./useAuth";
import { SocketContext } from "./socket-context";

/**
 * Mantém uma única conexão Socket.io enquanto houver usuário logado.
 * A autenticação usa o cookie httpOnly da sessão, enviado no handshake.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const connection = io(API_URL, { withCredentials: true, transports: ["websocket", "polling"] });

    let renewing = false;
    connection.on("connect_error", async (error) => {
      // O access token dura poucos minutos: renova a sessão e reconecta (uma tentativa por falha).
      if (error.message === "Sessão expirada" && !renewing) {
        renewing = true;
        try {
          await refreshSession();
          connection.connect();
        } catch {
          // Sessão não renovável: o AuthProvider leva o usuário ao login.
        } finally {
          renewing = false;
        }
        return;
      }
      console.warn("Erro de conexão em tempo real:", error.message);
    });

    // Disponibiliza a conexão para os componentes quando ela é estabelecida
    // (as reconexões reutilizam o mesmo objeto, então não há novo render).
    connection.on("connect", () => setSocket(connection));

    return () => {
      connection.disconnect();
      setSocket(null);
    };
  }, [userId]);

  return <SocketContext.Provider value={userId ? socket : null}>{children}</SocketContext.Provider>;
}
