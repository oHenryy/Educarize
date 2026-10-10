import { useCallback, useEffect, useState, useRef } from "react";
import { api, getErrorMessage } from "../api/client";
import type { Conversation, Message, User } from "../types";
import { useToast } from "../context/useToast";
import { useAuth } from "../context/useAuth";
import { useSocket, useSocketEvent } from "../context/useSocket";
import { useDebouncedValue } from "../utils/useDebouncedValue";

export default function MessagesPage() {
  const { user } = useAuth();
  // Conexão compartilhada pelo app (a mesma usada pelas notificações).
  const socket = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebouncedValue(userSearch);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [typing, setTyping] = useState<{ userId: string; typing: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<Conversation[]>("/messages/conversations");
      setConversations(res.data);
    } catch (err) {
      console.error("Erro ao carregar conversas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Busca de usuários no servidor (limitada), em vez de carregar todos os usuários da plataforma.
  useEffect(() => {
    if (!showUserSelect) return;
    let cancelled = false;
    api
      .get<User[]>("/auth/users", { params: { search: debouncedUserSearch || undefined, limit: 20 } })
      .then((res) => {
        if (!cancelled) setUsers(res.data);
      })
      .catch((err) => console.error("Erro ao carregar usuários:", err));
    return () => {
      cancelled = true;
    };
  }, [showUserSelect, debouncedUserSearch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ---------- eventos em tempo real ----------

  useSocketEvent<Message>("new_message", (message) => {
    if (message.senderId === selectedUserId || message.receiverId === selectedUserId) {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      // A conversa está aberta: a mensagem já foi vista.
      if (message.senderId === selectedUserId) {
        socket?.emit("mark_conversation_as_read", { userId: selectedUserId });
      }
    }
    fetchConversations();
  });

  useSocketEvent<Message>("message_sent", (message) => {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    fetchConversations();
  });

  useSocketEvent<Conversation[]>("conversations_update", setConversations);

  useSocketEvent<{ userId: string; typing: boolean }>("user_typing", (data) => {
    if (data.userId === selectedUserId) setTyping(data);
  });

  useSocketEvent<{ message: string }>("error", (error) => {
    showToast(error?.message || "Erro na conexão de mensagens", "error");
  });

  // ---------- ações ----------

  const fetchMessages = async (userId: string) => {
    try {
      const res = await api.get<{ messages: Message[] }>(`/messages/conversations/${userId}`);
      setMessages(res.data.messages);

      await api.put(`/messages/conversations/${userId}/read`);
      fetchConversations();
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    }
  };

  const selectConversation = (userId: string) => {
    setSelectedUserId(userId);
    setTyping(null);
  };

  const handleSelectConversation = async (userId: string) => {
    selectConversation(userId);
    await fetchMessages(userId);
  };

  const handleStartConversation = async (userId: string) => {
    selectConversation(userId);
    setShowUserSelect(false);
    setUserSearch("");
    fetchMessages(userId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId || sending) return;

    if (!socket?.connected) {
      showToast("Sem conexão com o servidor de mensagens. Tente novamente em instantes.", "error");
      return;
    }

    try {
      setSending(true);
      socket.emit("send_message", {
        receiverId: selectedUserId,
        content: newMessage.trim(),
      });
      setNewMessage("");

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit("typing_stop", { receiverId: selectedUserId });
      setTyping(null);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao enviar mensagem"), "error");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!socket || !selectedUserId) return;

    socket.emit("typing_start", { receiverId: selectedUserId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", { receiverId: selectedUserId });
      setTyping(null);
    }, 3000);
  };

  const selectedConversation = conversations.find((c) => c.userId === selectedUserId);
  const selectedUser = selectedConversation?.user || users.find((u) => u.id === selectedUserId);

  if (loading) {
    return <div className="loading">Carregando mensagens...</div>;
  }

  return (
    <div className="messages-page">
      <div className="messages-container">
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h2>Mensagens</h2>
            <button
              onClick={() => setShowUserSelect(!showUserSelect)}
              className="btn-primary btn-small"
              title="Nova conversa"
            >
              +
            </button>
          </div>

          {showUserSelect && (
            <div className="user-select-dropdown">
              <input
                type="text"
                placeholder="Buscar usuário..."
                className="user-search-input"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                autoFocus
              />
              <div className="user-list">
                {users.length === 0 && <p className="muted" style={{ padding: "8px 12px" }}>Nenhum usuário encontrado</p>}
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartConversation(u.id)}
                    className="user-item"
                  >
                    <div className="user-avatar">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.name} />
                      ) : (
                        <span>{u.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="user-info">
                      <strong>{u.name}</strong>
                      <small>{u.email || u.role}</small>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="conversations-list">
            {conversations.length === 0 ? (
              <p className="muted" style={{ padding: "20px", textAlign: "center" }}>
                Nenhuma conversa ainda. Comece uma nova conversa!
              </p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.userId}
                  onClick={() => handleSelectConversation(conversation.userId)}
                  className={`conversation-item ${selectedUserId === conversation.userId ? "active" : ""}`}
                >
                  <div className="conversation-avatar">
                    {conversation.user.avatarUrl ? (
                      <img src={conversation.user.avatarUrl} alt={conversation.user.name} />
                    ) : (
                      <span>{conversation.user.name.charAt(0).toUpperCase()}</span>
                    )}
                    {conversation.unreadCount > 0 && (
                      <span className="unread-badge">{conversation.unreadCount}</span>
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <strong>{conversation.user.name}</strong>
                      <span className="conversation-time">
                        {new Date(conversation.lastMessage.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="conversation-preview">
                      {conversation.lastMessage.content.length > 50
                        ? conversation.lastMessage.content.substring(0, 50) + "..."
                        : conversation.lastMessage.content}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="chat-area">
          {selectedUserId && selectedUser ? (
            <>
              <div className="chat-header">
                <div className="chat-user-info">
                  <div className="chat-avatar">
                    {selectedUser.avatarUrl ? (
                      <img src={selectedUser.avatarUrl} alt={selectedUser.name} />
                    ) : (
                      <span>{selectedUser.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <strong>{selectedUser.name}</strong>
                    {(() => {
                      const userWithEmail = selectedUser as User;
                      return userWithEmail.email ? <small>{userWithEmail.email}</small> : null;
                    })()}
                  </div>
                </div>
              </div>

              <div className="messages-list">
                {messages.length === 0 ? (
                  <div className="empty-messages">
                    <p>Nenhuma mensagem ainda. Comece a conversa!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`message-item ${isOwn ? "own" : "other"}`}
                      >
                        {!isOwn && (
                          <div className="message-avatar">
                            {message.sender.avatarUrl ? (
                              <img src={message.sender.avatarUrl} alt={message.sender.name} />
                            ) : (
                              <span>{message.sender.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        )}
                        <div className="message-content">
                          {!isOwn && <div className="message-sender">{message.sender.name}</div>}
                          <div className="message-bubble">{message.content}</div>
                          <div className="message-time">
                            {new Date(message.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {isOwn && message.read && <span className="read-indicator">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {typing && typing.typing && (
                <div className="typing-indicator">
                  <span>{selectedUser?.name} está digitando...</span>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="message-input-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Digite sua mensagem..."
                  className="message-input"
                  disabled={sending}
                />
                <button type="submit" className="btn-primary" disabled={sending || !newMessage.trim()}>
                  {sending ? "Enviando..." : "Enviar"}
                </button>
              </form>
            </>
          ) : (
            <div className="no-conversation-selected">
              <p>Selecione uma conversa ou inicie uma nova</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

