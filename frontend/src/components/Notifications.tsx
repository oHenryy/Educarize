import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useSocket, useSocketEvent } from "../context/useSocket";
import type { Notification } from "../types";

const DROPDOWN_LIMIT = 10;

export default function Notifications() {
  const socket = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>(
        `/notifications?limit=${DROPDOWN_LIMIT}`
      );
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega ao abrir e ressincroniza a cada (re)conexão do socket, cobrindo o que chegou enquanto estava offline.
  useEffect(() => {
    fetchNotifications();
    if (!socket) return;
    socket.on("connect", fetchNotifications);
    return () => {
      socket.off("connect", fetchNotifications);
    };
  }, [socket, fetchNotifications]);

  // Notificações novas chegam em tempo real (sem consultas periódicas ao servidor).
  useSocketEvent<Notification>("notification", (notification) => {
    setNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)].slice(0, DROPDOWN_LIMIT));
    setUnreadCount((count) => count + 1);
  });

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error("Erro ao marcar como lida:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "SUCCESS": return "✅";
      case "WARNING": return "⚠️";
      case "ERROR": return "❌";
      default: return "ℹ️";
    }
  };

  return (
    <div className="notifications-container">
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) {
            fetchNotifications();
          }
        }}
        className="notifications-button"
        title="Notificações"
        aria-label={unreadCount > 0 ? `Você tem ${unreadCount} notificações não lidas` : "Notificações"}
      >
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {showDropdown && (
        <>
          <div className="notifications-overlay" onClick={() => setShowDropdown(false)} />
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <h4>Notificações</h4>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead} className="btn-link-small">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="notifications-list">
              {loading ? (
                <div className="loading">Carregando...</div>
              ) : notifications.length === 0 ? (
                <p className="muted">Nenhuma notificação</p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? "unread" : ""}`}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="notification-icon">{getNotificationIcon(notification.type)}</div>
                    <div className="notification-content">
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <small>{new Date(notification.createdAt).toLocaleString("pt-BR")}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="notifications-footer">
              <Link to="/notifications" onClick={() => setShowDropdown(false)} className="btn-link">
                Ver todas as notificações
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

