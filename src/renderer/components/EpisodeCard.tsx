import { useNavigate } from "react-router-dom";
import type { EpisodeMetadata } from "../hooks/useMetadata";
import { Play } from "lucide-react";

// Helper to convert local file path to media:// URL
function getImageUrl(localPath?: string | null, remotePath?: string | null): string | null {
  if (localPath) {
    return `media://${encodeURIComponent(localPath)}`;
  }
  return remotePath || null;
}

// Helper to format episode numbers (handles decimal episodes: 6.5 -> "6.5", 7.5 -> "7.5")
function formatEpisodeNumber(episodeNumber: number): string {
  // If episode number is not an integer, it's a decimal episode (6.5, 7.5, 10.5, etc.)
  if (!Number.isInteger(episodeNumber)) {
    // Format to show one decimal place
    return episodeNumber.toFixed(1);
  }
  return episodeNumber.toString();
}

interface EpisodeCardProps {
  seriesId: string;
  episode: EpisodeMetadata;
  hasFile: boolean;
}

function EpisodeCard({ seriesId, episode, hasFile }: EpisodeCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (hasFile) {
      navigate(`/player/${seriesId}/${episode.episodeNumber}`);
    }
  };

  // Prefer local cached thumbnail, fall back to remote URL
  const thumbnailUrl = getImageUrl(episode.thumbnailLocal, episode.thumbnail);

  return (
    <div className={`episode-card ${hasFile ? "has-file" : "no-file"}`} onClick={handleClick}>
      <div className="episode-thumbnail-wrapper">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={episode.title || `Episode ${episode.episodeNumber}`}
            className="episode-thumbnail"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Try remote URL as fallback if local fails
              if (episode.thumbnail && target.src !== episode.thumbnail) {
                target.src = episode.thumbnail;
              } else {
                target.style.display = "none";
                target.parentElement?.classList.add("no-thumbnail");
              }
            }}
          />
        ) : (
          <div className="episode-thumbnail-placeholder">
            <span className="episode-thumbnail-number">{episode.episodeNumber}</span>
          </div>
        )}
        {hasFile && (
          <div className="episode-play-overlay">
            <Play className="play-icon" size={24} />
          </div>
        )}
        {!hasFile && (
          <div className="episode-unavailable">
            <span>Not Available</span>
          </div>
        )}
        <div className="episode-info">
          <div className="episode-number">
            {episode.seasonNumber !== null && episode.seasonNumber !== undefined
              ? `S${episode.seasonNumber.toString().padStart(2, "0")}E${formatEpisodeNumber(episode.episodeNumber)}`
              : `Episode ${formatEpisodeNumber(episode.episodeNumber)}`}
          </div>
          <div className="episode-title">{episode.title || `Episode ${episode.episodeNumber}`}</div>
          {episode.airDate && (
            <div className="episode-air-date">{new Date(episode.airDate).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EpisodeCard;
