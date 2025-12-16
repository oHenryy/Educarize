import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de resposta para tratar erros de autenticação
api.interceptors.response.use(
  (response) => {
    // Retornar resposta bem-sucedida normalmente
    return response;
  },
  (error) => {
    // Se for erro 401, redirecionar para login
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("educarize_auth");
      window.location.href = "/login";
    }
    // Rejeitar o erro para que seja tratado no catch
    return Promise.reject(error);
  }
);


