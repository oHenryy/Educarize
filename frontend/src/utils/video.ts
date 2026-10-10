export type VideoSource =
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string }
  | { kind: "embed"; url: string };

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
const VIMEO_REGEX = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;

/** Identifica a origem do vídeo. Links que não são YouTube/Vimeo só são aceitos se forem http(s). */
export function parseVideoUrl(videoUrl: string | null | undefined): VideoSource | null {
  if (!videoUrl) return null;

  const youtube = videoUrl.match(YOUTUBE_REGEX);
  if (youtube) return { kind: "youtube", id: youtube[1] };

  const vimeo = videoUrl.match(VIMEO_REGEX);
  if (vimeo) return { kind: "vimeo", id: vimeo[1] };

  try {
    const parsed = new URL(videoUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? { kind: "embed", url: parsed.href } : null;
  } catch {
    return null;
  }
}

/** Onde retomar: perto do fim (últimos 10s), recomeça do início. */
export function resumePosition(lastPositionSeconds: number | undefined, durationSeconds: number | null | undefined) {
  if (!lastPositionSeconds || lastPositionSeconds < 5) return 0;
  if (durationSeconds && lastPositionSeconds >= durationSeconds - 10) return 0;
  return Math.floor(lastPositionSeconds);
}
