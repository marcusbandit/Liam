import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useMetadata, type FileEpisode } from '../hooks/useMetadata.js';

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
          <button className="button" onClick={() => navigate(`/series/${seriesId}`)}>
            Back to Series
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#000', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000 }}>
        <button
          className="button"
          onClick={() => navigate(`/series/${seriesId}`)}
          style={{ marginRight: '1rem' }}
        >
          ← Back
        </button>
        <span style={{ color: '#fff', marginLeft: '1rem' }}>
          {episodeData.title || `Episode ${episodeNumber}`}
        </span>
      </div>
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        autoPlay
        style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
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
  );
}

export default VideoPlayer;
