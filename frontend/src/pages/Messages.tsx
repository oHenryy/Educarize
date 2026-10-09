import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { api, API_URL, getErrorMessage, refreshSession } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { Conversation, Message, User } from "../types";
import { useToast } from "../context/useToast";

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [typing, setTyping] = useState<{ userId: string; typing: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mantém a conversa selecionada acessível aos handlers do socket sem recriar a conexão.
  const selectedUserIdRef = useRef<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
    setTyping(null);
  }, [selectedUserId]);

  useEffect(() => {
    if (!user?.id) return;
    
    if (typeof io !== 'function') {
      console.error('Socket.io não está disponível. Verifique se o pacote foi instalado corretamente.');
      return;
    }

    // A autenticação usa o cookie httpOnly da sessão, enviado no handshake.
    const socket = io(API_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Conectado ao Socket.io");
    });

    socket.on("new_message", (message: Message) => {
      const currentUserId = selectedUserIdRef.current;
      if (message.senderId === currentUserId || message.receiverId === currentUserId) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
        // A conversa está aberta: a mensagem já foi vista.
        if (message.senderId === currentUserId) {
          socket.emit("mark_conversation_as_read", { userId: currentUserId });
        }
      }
      fetchConversations();
    });

    socket.on("message_sent", (message: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();
    });

    socket.on("conversations_update", (conversations: Conversation[]) => {
      setConversations(conversations);
    });

    socket.on("unread_count_update", () => {
      fetchConversations();
    });

    socket.on("user_typing", (data: { userId: string; typing: boolean }) => {
      if (data.userId === selectedUserIdRef.current) {
        setTyping(data);
      }
    });

    socket.on("error", (error: { message: string }) => {
      console.error("Erro Socket.io:", error);
      showToast(error?.message || "Erro na conexão de mensagens", "error");
    });

    let renewedOnce = false;
    socket.on("connect_error", async (error) => {
      // O access token dura poucos minutos: renova a sessão e tenta conectar de novo (uma vez).
      if (error.message === "Sessão expirada" && !renewedOnce) {
        renewedOnce = true;
        try {
          await refreshSession();
          socket.connect();
          return;
        } catch {
          // Sessão não renovável: o AuthProvider leva o usuário ao login.
        }
      }
      console.warn("Erro de conexão Socket.io:", error.message);
    });

    fetchConversations();
    fetchUsers();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get<Conversation[]>("/messages/conversations");
      setConversations(res.data);
    } catch (err) {
      console.error("Erro ao carregar conversas:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get<User[]>("/auth/users");
      setUsers(res.data.filter((u) => u.id !== user?.id));
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    }
  };

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

  const handleSelectConversation = async (userId: string) => {
    setSelectedUserId(userId);
    await fetchMessages(userId);
    if (socketRef.current) {
      socketRef.current.emit("mark_conversation_as_read", { userId });
    }
  };

  const handleStartConversation = async (userId: string) => {
    setSelectedUserId(userId);
    setShowUserSelect(false);
    fetchMessages(userId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId || sending) return;

    if (!socketRef.current?.connected) {
      showToast("Sem conexão com o servidor de mensagens. Tente novamente em instantes.", "error");
      return;
    }

    try {
      setSending(true);
      socketRef.current.emit("send_message", {
        receiverId: selectedUserId,
        content: newMessage.trim(),
      });
      setNewMessage("");
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socketRef.current.emit("typing_stop", { receiverId: selectedUserId });
      setTyping(null);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao enviar mensagem"), "error");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!socketRef.current || !selectedUserId) return;

    socketRef.current.emit("typing_start", { receiverId: selectedUserId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing_stop", { receiverId: selectedUserId });
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
                onFocus={(e) => {
                  const list = e.target.nextElementSibling as HTMLElement;
                  if (list) list.style.display = "block";
                }}
              />
              <div className="user-list">
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

