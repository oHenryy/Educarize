/** Interfaces mínimas das APIs oficiais de player (carregadas sob demanda). */
export interface YouTubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void; onStateChange?: (event: { data: number }) => void };
    }
  ) => YouTubePlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

export interface VimeoPlayer {
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  getPaused(): Promise<boolean>;
  setCurrentTime(seconds: number): Promise<number>;
  on(event: string, callback: () => void): void;
  destroy(): Promise<void>;
}

interface VimeoNamespace {
  Player: new (element: HTMLElement, options: { id: number; responsive?: boolean }) => VimeoPlayer;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: VimeoNamespace;
  }
}

let youtubeApi: Promise<YouTubeNamespace> | null = null;
let vimeoApi: Promise<VimeoNamespace> | null = null;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });
}

export function loadYouTubeApi(): Promise<YouTubeNamespace> {
  youtubeApi ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    injectScript("https://www.youtube.com/iframe_api").catch((err) => {
      youtubeApi = null;
      reject(err);
    });
  });
  return youtubeApi;
}

export function loadVimeoApi(): Promise<VimeoNamespace> {
  vimeoApi ??= (window.Vimeo?.Player
    ? Promise.resolve(window.Vimeo)
    : injectScript("https://player.vimeo.com/api/player.js").then(() => window.Vimeo!)
  ).catch((err) => {
    vimeoApi = null;
    throw err;
  });
  return vimeoApi;
}
