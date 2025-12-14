import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useMetadata, type FileEpisode } from '../hooks/useMetadata.js';
import Button from '../components/Button';
import { ArrowLeft } from 'lucide-react';

interface SubtitleTrack {
  src: string;
  kind: string;
  label: string;
  default?: boolean;
}

function VideoPlayer() {
  const { seriesId, episodeNumber } = useParams<{ seriesId?: string; episodeNumber?: string }>();
  const navigate = useNavigate();
  const { metadata } = useMetadata();
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [subtitleSrcs, setSubtitleSrcs] = useState<SubtitleTrack[]>([]);
  const [episodeData, setEpisodeData] = useState<FileEpisode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!seriesId || !episodeNumber || !metadata[seriesId]) {
      return;
    }

    const seriesData = metadata[seriesId];
    const episodeNum = parseInt(episodeNumber, 10);
    
    if (isNaN(episodeNum)) {
      return;
    }
    
    // Find the episode
    const fileEpisodes = seriesData.fileEpisodes || [];
    const episode = fileEpisodes.find(
      (ep: FileEpisode) => ep.episodeNumber === episodeNum
    );

    if (episode && episode.filePath) {
      setEpisodeData(episode);
      // Convert file path to file:// URL for Electron
      setVideoSrc(`file://${episode.filePath}`);
      
      // Set up subtitle tracks
      const subtitles: SubtitleTrack[] = [];
      if (episode.subtitlePath) {
        subtitles.push({
          src: `file://${episode.subtitlePath}`,
          kind: 'subtitles',
          label: 'Subtitle',
          default: true,
        });
      }
      if (episode.subtitlePaths && episode.subtitlePaths.length > 0) {
        episode.subtitlePaths.forEach((subPath: string, index: number) => {
          if (subPath !== episode.subtitlePath) {
            subtitles.push({
              src: `file://${subPath}`,
              kind: 'subtitles',
              label: `Subtitle ${index + 2}`,
            });
          }
        });
      }
      setSubtitleSrcs(subtitles);
    }
  }, [seriesId, episodeNumber, metadata]);

  if (!episodeData || !seriesId || !episodeNumber) {
    return (
      <div className="loading">
        <p>Loading episode...</p>
        {seriesId && (
          <Button onClick={() => navigate(`/series/${seriesId}`)}>
            Back to Series
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="video-player-wrapper">
      <div className="video-player-header">
        <Button 
          onClick={() => navigate(`/series/${seriesId}`)} 
          className="player-back-btn"
          aria-label="Back to series"
        >
          <ArrowLeft className="back-icon" size={18} />
          <span>Back</span>
        </Button>
        <div className="player-header-info">
          <h2 className="player-episode-title">
            {episodeData.title || `Episode ${episodeNumber}`}
          </h2>
          {episodeData.seasonNumber !== null && episodeData.seasonNumber !== undefined && (
            <span className="player-episode-meta">
              Season {episodeData.seasonNumber} • Episode {episodeNumber}
            </span>
          )}
        </div>
      </div>
      <div className="video-container">
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          autoPlay
          className="video-element"
        >
          {subtitleSrcs.map((subtitle, index) => (
            <track
              key={index}
              src={subtitle.src}
              kind={subtitle.kind}
              label={subtitle.label}
              default={subtitle.default}
            />
          ))}
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

export default VideoPlayer;
