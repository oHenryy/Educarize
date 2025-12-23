import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Notification } from "../types";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { useToast } from "../context/ToastContext";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/notifications?page=${page}&limit=50`);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao marcar como lida", "error");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao marcar todas como lidas", "error");
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm("Deseja deletar esta notificação?")) return;

    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao deletar notificação", "error");
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

  if (loading) return <div className="loading">Carregando notificações...</div>;

  return (
    <div className="notifications-page">
      <PageHeader
        title="Notificações"
        subtitle="Veja os avisos importantes sobre matrículas, comentários, certificados e mais."
        actions={
          unreadCount > 0 ? (
            <button onClick={handleMarkAllAsRead} className="btn-primary">
              Marcar todas como lidas ({unreadCount})
            </button>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState title="Nenhuma notificação" />
      ) : (
        <>
          <div className="notifications-list-page">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-card ${!notification.read ? "unread" : ""}`}
              >
                <div className="notification-icon-large">{getNotificationIcon(notification.type)}</div>
                <div className="notification-content-full">
                  <div className="notification-header">
                    <strong>{notification.title}</strong>
                    <div>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="btn-icon-small"
                          title="Marcar como lida"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="btn-icon-small"
                        title="Deletar"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <p>{notification.message}</p>
                  <small>{new Date(notification.createdAt).toLocaleString("pt-BR")}</small>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="btn-secondary"
              >
                Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="btn-secondary"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

