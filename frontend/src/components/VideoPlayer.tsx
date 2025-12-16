import { useEffect, useState } from "react";

type VideoPlayerProps = {
  videoUrl: string | null | undefined;
};

export default function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl) {
      setEmbedUrl(null);
      return;
    }

    // Detectar YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = videoUrl.match(youtubeRegex);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      setEmbedUrl(`https://www.youtube.com/embed/${videoId}`);
      return;
    }

    // Detectar Vimeo
    const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
    const vimeoMatch = videoUrl.match(vimeoRegex);
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      setEmbedUrl(`https://player.vimeo.com/video/${videoId}`);
      return;
    }

    // Se não for YouTube nem Vimeo, tentar usar a URL diretamente
    setEmbedUrl(videoUrl);
  }, [videoUrl]);

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

