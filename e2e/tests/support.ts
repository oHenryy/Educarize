import fs from "fs";
import os from "os";
import path from "path";
import type { Browser, Page } from "@playwright/test";

export const API_URL = `http://localhost:${process.env.E2E_API_PORT || "4600"}`;

export type Session = { page: Page; label: string };

/** Erros de console, exceções da página e respostas 5xx coletados durante os testes. */
export const runtimeProblems: string[] = [];

/**
 * Substituto da IFrame API do YouTube: o teste não depende da internet e controla a reprodução
 * por window.__fakeYT (vídeo de 20s tocando a 1,5x).
 */
const FAKE_YOUTUBE_API = `
(function () {
  var PS = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2 };
  function Player(el, opts) {
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube.com/embed/" + opts.videoId;
    iframe.title = "YouTube video player";
    el.replaceWith(iframe);
    var s = { time: (opts.playerVars && opts.playerVars.start) || 0, duration: 20, status: -1, rate: 1.5, since: 0 };
    function emit(data) {
      if (opts.events && opts.events.onStateChange) opts.events.onStateChange({ data: data });
    }
    function now() {
      if (s.status !== PS.PLAYING) return s.time;
      var t = s.time + ((performance.now() - s.since) / 1000) * s.rate;
      if (t < s.duration) return t;
      s.time = s.duration;
      s.status = PS.ENDED;
      setTimeout(function () { emit(PS.ENDED); });
      return s.duration;
    }
    function set(status) {
      s.time = now();
      s.status = status;
      s.since = performance.now();
      emit(status);
    }
    this.getCurrentTime = now;
    this.getDuration = function () { return s.duration; };
    this.getPlayerState = function () { now(); return s.status; };
    this.destroy = function () { iframe.remove(); };
    window.__fakeYT = {
      start: s.time,
      play: function () { set(PS.PLAYING); },
      pause: function () { set(PS.PAUSED); },
      time: now,
    };
  }
  window.YT = { Player: Player, PlayerState: PS };
  setTimeout(function () { if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady(); });
})();
`;

export async function newSession(browser: Browser, label: string): Promise<Session> {
  const context = await browser.newContext({ acceptDownloads: true });
  // O iframe do player falso não carrega o YouTube de verdade: sem depender da internet e sem os avisos
  // de console da página do YouTube (ex.: "Permissions policy violation"), que não são da aplicação.
  await context.route(/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be|player\.vimeo\.com)\//, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>player</title>" })
  );
  // Registrada depois, tem prioridade sobre a regra acima (o Playwright consulta as rotas da última para a primeira).
  await context.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({ contentType: "application/javascript", body: FAKE_YOUTUBE_API })
  );
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  page.on("console", (msg) => {
    // 4xx esperados aparecem como "Failed to load resource" e são verificados pelos próprios testes.
    if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) {
      runtimeProblems.push(`[${label}] console: ${msg.text().slice(0, 200)}`);
    }
  });
  page.on("pageerror", (err) => runtimeProblems.push(`[${label}] pageerror: ${err.message}`));
  page.on("response", (res) => {
    if (res.url().startsWith(API_URL) && res.status() >= 500) {
      runtimeProblems.push(`[${label}] ${res.status()} ${res.url()}`);
    }
  });
  return { page, label };
}

export async function register(s: Session, name: string, email: string, role: "STUDENT" | "INSTRUCTOR") {
  await s.page.goto("/register");
  await s.page.fill("#name", name);
  await s.page.fill("#email", email);
  await s.page.fill("#password", "senha123");
  await s.page.selectOption("#role", role);
  await s.page.click('button[type="submit"]');
  await s.page.waitForURL("**/catalog");
}

export async function login(s: Session, email: string, password: string) {
  await s.page.goto("/login");
  await s.page.fill("#email", email);
  await s.page.fill("#password", password);
  await s.page.click('button[type="submit"]');
  await s.page.waitForURL("**/catalog");
}

/** Chamada à API com a sessão do navegador (útil para preparar dados ou conferir o resultado). */
export async function apiAs<T = unknown>(s: Session, method: string, path: string, body?: unknown) {
  return s.page.evaluate(
    async ({ apiUrl, method, path, body }) => {
      const res = await fetch(apiUrl + path, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: (await res.json().catch(() => null)) as T };
    },
    { apiUrl: API_URL, method, path, body }
  );
}

const OUTBOX = path.join(os.tmpdir(), "educarize-e2e", "outbox");

/** Último e-mail enviado para o endereço, lido da caixa de saída local do backend. */
export function lastEmailTo(email: string): { subject: string; text: string } | undefined {
  if (!fs.existsSync(OUTBOX)) return undefined;
  const messages = fs
    .readdirSync(OUTBOX)
    .sort()
    .map((file) => JSON.parse(fs.readFileSync(path.join(OUTBOX, file), "utf-8")));
  return messages.reverse().find((m) => m.to === email);
}

/** Extrai o caminho relativo (ex.: /reset-password?token=...) do link contido no e-mail. */
export function linkPathFromEmail(text: string): string {
  const url = new URL(/https?:\/\/\S+/.exec(text)![0]);
  return url.pathname + url.search;
}
