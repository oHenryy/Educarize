import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Notification } from "../types";

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications?limit=10");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err: any) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err: any) {
      console.error("Erro ao carregar contador de não lidas:", err);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err: any) {
      console.error("Erro ao marcar como lida:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
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

