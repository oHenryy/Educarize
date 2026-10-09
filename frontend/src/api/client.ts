import axios, { type AxiosRequestConfig } from "axios";

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

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/** Evento disparado quando a sessão não pode mais ser renovada (o AuthProvider limpa o usuário). */
export const SESSION_EXPIRED_EVENT = "educarize:session-expired";

export const api = axios.create({
  baseURL: API_URL,
  // A sessão fica em cookies httpOnly: o JavaScript nunca vê o token.
  withCredentials: true,
  // Cabeçalho exigido pelo backend em requisições que alteram dados (proteção CSRF).
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

/** Rotas que não devem disparar renovação de sessão ao receber 401. */
const AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

let refreshing: Promise<void> | null = null;

/** Renova a sessão uma única vez, mesmo que várias requisições recebam 401 ao mesmo tempo. */
export function refreshSession(): Promise<void> {
  refreshing ??= api
    .post("/auth/refresh")
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableConfig | undefined;
    const isAuthRoute = AUTH_ROUTES.some((route) => original?.url?.startsWith(route));

    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
    }

    return Promise.reject(error);
  }
);
