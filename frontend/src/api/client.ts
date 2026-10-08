import axios from "axios";

/** Extrai a mensagem de erro retornada pela API ({ error }) ou usa o texto padrão. */
export function getErrorMessage(err: unknown, fallback = "Ocorreu um erro inesperado"): string {
  if (axios.isAxiosError<{ error?: string }>(err)) {
    return err.response?.data?.error || fallback;
  }
  return fallback;
}

/** Status HTTP da resposta de erro, se houver. */
export function getErrorStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined;
}

/** Erro de rede: a requisição saiu mas não houve resposta do servidor. */
export function isNetworkError(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response && !!err.request;
}

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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("educarize_auth");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);


