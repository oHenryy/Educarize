import { useMemo } from "react";

type VideoPlayerProps = {
  videoUrl: string | null | undefined;
};

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
const VIMEO_REGEX = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;

function toEmbedUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;

  const youtubeMatch = videoUrl.match(YOUTUBE_REGEX);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;

  const vimeoMatch = videoUrl.match(VIMEO_REGEX);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // Outros links só são incorporados se forem http(s).
  try {
    const parsed = new URL(videoUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export default function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const embedUrl = useMemo(() => toEmbedUrl(videoUrl), [videoUrl]);

  if (!embedUrl) {
    return (
      <div className="video-placeholder">
        <p>Nenhum vídeo disponível</p>
      </div>
    );
  }

  return (
    <div className="video-player">
      <iframe
        src={embedUrl}
        title="Video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          width: "100%",
          aspectRatio: "16/9",
          border: "none",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}
