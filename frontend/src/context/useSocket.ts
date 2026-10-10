import { useContext, useEffect, useRef } from "react";
import { SocketContext } from "./socket-context";

export function useSocket() {
  return useContext(SocketContext);
}

/**
 * Assina um evento do socket enquanto o componente estiver montado.
 * O handler mais recente é sempre usado, sem precisar reassinar a cada render.
 */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const socket = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!socket) return;
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}
