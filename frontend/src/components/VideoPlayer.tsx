import { useEffect, useMemo, useRef } from "react";
import { parseVideoUrl } from "../utils/video";
import { WatchTracker } from "../utils/watchTracker";
import { loadVimeoApi, loadYouTubeApi } from "../utils/playerApis";

export type VideoProgressReport = {
  positionSeconds: number;
  durationSeconds: number;
  watchedDeltaSeconds: number;
  /** Último envio (aula trocada, página fechada): deve ser enviado mesmo se a página estiver saindo. */
  final: boolean;
};

type VideoPlayerProps = {
  videoUrl: string | null | undefined;
  /** Posição inicial (retomar de onde parou). */
  startAt?: number;
  /** Quando informado, o andamento é amostrado e enviado periodicamente (só YouTube e Vimeo). */
  onProgress?: (report: VideoProgressReport) => void;
};

const SAMPLE_INTERVAL_MS = 1000;
const REPORT_INTERVAL_MS = 15000;

/** Estado instantâneo do player, comum a YouTube e Vimeo. */
type PlayerSnapshot = { currentTime: number; duration: number; playing: boolean };

export default function VideoPlayer({ videoUrl, startAt = 0, onProgress }: VideoPlayerProps) {
  const source = useMemo(() => parseVideoUrl(videoUrl), [videoUrl]);
  const containerRef = useRef<HTMLDivElement>(null);
  const onProgressRef = useRef(onProgress);
  const tracking = !!onProgress;

  useEffect(() => {
    onProgressRef.current = onProgress;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !source || source.kind === "embed") return;

    let disposed = false;
    let readSnapshot: (() => Promise<PlayerSnapshot>) | null = null;
    let destroyPlayer: () => void = () => undefined;
    const tracker = new WatchTracker();
    let last: PlayerSnapshot | null = null;
    let lastReportedPosition: number | null = null;

    const report = (final: boolean) => {
      if (!tracking || !last || last.duration < 1) return;
      const durationSeconds = Math.floor(last.duration);
      const positionSeconds = Math.min(Math.floor(last.currentTime), durationSeconds);
      const watchedDeltaSeconds = tracker.takeWatchedSeconds();
      // Pausado e sem mudanças desde o último envio: nada a registrar.
      if (watchedDeltaSeconds === 0 && positionSeconds === lastReportedPosition) return;
      lastReportedPosition = positionSeconds;
      onProgressRef.current?.({ positionSeconds, durationSeconds, watchedDeltaSeconds, final });
    };

    /** Lê o player. Em `stopping` (evento de pausa/fim), o trecho desde a última amostra foi assistido. */
    const sample = async (stopping = false) => {
      if (!readSnapshot) return;
      try {
        last = await readSnapshot();
        if (stopping) tracker.sample(last.currentTime, true);
        tracker.sample(last.currentTime, stopping ? false : last.playing);
      } catch {
        // Player ainda carregando ou já destruído.
      }
    };
    const onStop = () => sample(true).then(() => report(false));

    const mount = async () => {
      // Cada player vive num elemento próprio, recriado a cada vídeo.
      const host = document.createElement("div");
      container.replaceChildren(host);

      if (source.kind === "youtube") {
        const YT = await loadYouTubeApi();
        if (disposed) return;
        const player = new YT.Player(host, {
          videoId: source.id,
          playerVars: { start: startAt, rel: 0, modestbranding: 1 },
          events: {
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) sample();
              else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) onStop();
            },
          },
        });
        readSnapshot = async () => ({
          currentTime: player.getCurrentTime(),
          duration: player.getDuration(),
          playing: player.getPlayerState() === YT.PlayerState.PLAYING,
        });
        destroyPlayer = () => player.destroy();
      } else {
        const Vimeo = await loadVimeoApi();
        if (disposed) return;
        const player = new Vimeo.Player(host, { id: Number(source.id), responsive: true });
        if (startAt > 0) player.setCurrentTime(startAt).catch(() => undefined);
        player.on("play", () => sample());
        player.on("pause", onStop);
        player.on("ended", onStop);
        readSnapshot = async () => {
          const [currentTime, duration, paused] = await Promise.all([
            player.getCurrentTime(),
            player.getDuration(),
            player.getPaused(),
          ]);
          return { currentTime, duration, playing: !paused };
        };
        destroyPlayer = () => {
          player.destroy().catch(() => undefined);
        };
      }
    };

    mount().catch((error) => console.warn("Não foi possível carregar o player:", error));

    const sampler = window.setInterval(() => sample(), SAMPLE_INTERVAL_MS);
    const reporter = window.setInterval(() => report(false), REPORT_INTERVAL_MS);
    // Fechar a aba ou trocar de página: envia o que falta.
    const onPageHide = () => report(true);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      disposed = true;
      window.clearInterval(sampler);
      window.clearInterval(reporter);
      window.removeEventListener("pagehide", onPageHide);
      report(true);
      destroyPlayer();
      container.replaceChildren();
    };
  }, [source, startAt, tracking]);

  if (!source) {
    return (
      <div className="video-placeholder">
        <p>Nenhum vídeo disponível</p>
      </div>
    );
  }

  if (source.kind === "embed") {
    return (
      <div className="video-player">
        <iframe
          src={source.url}
          title="Video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: "8px" }}
        />
      </div>
    );
  }

  return (
    <div className="video-player">
      <div ref={containerRef} className="video-player-host" data-video-kind={source.kind} />
    </div>
  );
}
