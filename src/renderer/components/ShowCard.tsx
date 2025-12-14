import { useNavigate } from 'react-router-dom';
import type { SeriesMetadata } from '../hooks/useMetadata';
import { Film, Tv, Play, Star } from 'lucide-react';
import { getDisplayRating } from '../utils/ratingUtils';

// Helper to convert local file path to media:// URL
function getImageUrl(localPath?: string | null, remotePath?: string | null): string | null {
  if (localPath) {
    // Use media:// protocol for local cached images
    return `media://${encodeURIComponent(localPath)}`;
  }
  return remotePath || null;
}

interface ShowCardProps {
  seriesId: string;
  seriesData: SeriesMetadata;
  size?: 'normal' | 'large';
}

function ShowCard({ seriesId, seriesData, size = 'normal' }: ShowCardProps) {
  const navigate = useNavigate();

  const isMovie = seriesData.type === 'movie' || seriesData.format === 'MOVIE';
  
  const handleClick = () => {
    // Always go to detail page first - never auto-play
    navigate(`/series/${seriesId}`);
  };

  // Show total episodes from metadata, with downloaded count
  const totalEpisodes = seriesData.totalEpisodes || seriesData.episodes?.length || 0;
  const downloadedEpisodes = seriesData.fileEpisodes?.length || 0;
  
  // Prefer local cached image, fall back to remote URL
  const posterUrl = getImageUrl(seriesData.posterLocal, seriesData.poster);

  return (
    <div className={`show-card ${size === 'large' ? 'show-card-large' : ''}`} onClick={handleClick}>
      <div className="show-card-image-wrapper">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={seriesData.title || 'Show poster'}
            className="show-card-poster"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Try remote URL as fallback if local fails
              if (seriesData.poster && target.src !== seriesData.poster) {
                target.src = seriesData.poster;
              } else {
                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="280"%3E%3Crect width="200" height="280" fill="%231a1a24"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%234a4a5a" font-size="14" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';
              }
            }}
          />
        ) : (
          <div className="show-card-no-image">
            {isMovie ? <Film size={48} /> : <Tv size={48} />}
          </div>
        )}
        <div className="show-card-overlay">
          <div className="show-card-play">
            <Play size={24} />
          </div>
        </div>
        {!isMovie && totalEpisodes > 0 && (
          <div className="show-card-badge">
            {downloadedEpisodes}/{totalEpisodes} EP
          </div>
        )}
        {seriesData.averageScore && (
          <div className="show-card-score">
            <Star size={14} /> {getDisplayRating(seriesData.averageScore, seriesData.source)}
          </div>
        )}
        <div className="show-card-info">
          <div className="show-card-title">{seriesData.title}</div>
          {seriesData.genres && seriesData.genres.length > 0 && (
            <div className="show-card-genres">
              {seriesData.genres.slice(0, 2).join(' • ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShowCard;
