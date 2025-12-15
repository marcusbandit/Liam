import { useParams, useNavigate } from "react-router-dom";
import { useMetadata, type EpisodeMetadata, type FileEpisode } from "../hooks/useMetadata";
import EpisodeCard from "../components/EpisodeCard";
import {
  Star,
  Calendar,
  Clock,
  Tv,
  Film,
  Play,
  AlertTriangle,
  ArrowLeft,
  Home,
} from "lucide-react";
import { getDisplayRating } from "../utils/ratingUtils";

// Helper to convert local file path to media:// URL
function getImageUrl(localPath?: string | null, remotePath?: string | null): string | null {
  if (localPath) {
    return `media://${encodeURIComponent(localPath)}`;
  }
  return remotePath || null;
}

// Format duration nicely
function formatDuration(minutes: number | null | undefined, isMovie: boolean): string | null {
  if (!minutes) return null;
  if (isMovie) {
    // For movies, show total runtime
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  } else {
    // For series, show per episode
    return `${minutes} min/ep`;
  }
}

// Format season nicely
function formatSeason(
  season: string | null | undefined,
  year: number | null | undefined
): string | null {
  if (!season && !year) return null;
  const seasonName = season ? season.charAt(0) + season.slice(1).toLowerCase() : "";
  if (seasonName && year) return `${seasonName} ${year}`;
  if (year) return `${year}`;
  return seasonName;
}

// Get year from startDate
function getYear(startDate: string | null | undefined): number | null {
  if (!startDate) return null;
  const year = parseInt(startDate.split("-")[0], 10);
  return isNaN(year) ? null : year;
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

function SeriesDetailPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { metadata, loading } = useMetadata();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!seriesId) {
    return (
      <div className="error">
        <p>Series ID not provided.</p>
        <button className="action-btn action-btn-secondary" onClick={() => navigate("/")}>
          <Home size={16} /> Go Home
        </button>
      </div>
    );
  }

  const seriesData = metadata[seriesId];

  if (!seriesData) {
    return (
      <div className="error">
        <p>Series not found.</p>
        <button className="action-btn action-btn-secondary" onClick={() => navigate("/")}>
          <Home size={16} /> Go Home
        </button>
      </div>
    );
  }

  const metadataEpisodes: EpisodeMetadata[] = seriesData.episodes || [];
  const fileEpisodes: FileEpisode[] = seriesData.fileEpisodes || [];

  // Determine if this is a movie (single playable item)
  const isMovie =
    seriesData.type === "movie" ||
    seriesData.format === "MOVIE" ||
    (fileEpisodes.length === 1 && (seriesData.totalEpisodes === 1 || !seriesData.totalEpisodes));

  // Create a map of file episodes by season and episode number
  const fileEpisodeMap = new Map<string, FileEpisode>();
  fileEpisodes.forEach((ep) => {
    const key =
      ep.seasonNumber !== null ? `S${ep.seasonNumber}E${ep.episodeNumber}` : `E${ep.episodeNumber}`;
    fileEpisodeMap.set(key, ep);
  });

  // Group episodes by season
  type SeasonEpisodes = {
    seasonNumber: number | null;
    episodes: (EpisodeMetadata & { hasFile: boolean })[];
  };
  const episodesBySeason = new Map<number | null, SeasonEpisodes>();

  if (!isMovie) {
    // Determine the season from file episodes (they have the real season info)
    const fileSeasons = new Set<number | null>();
    fileEpisodes.forEach((ep) => fileSeasons.add(ep.seasonNumber ?? null));

    // If metadata episodes don't have season info but files do, assign metadata to file seasons
    const metadataHasSeasons = metadataEpisodes.some(
      (ep) => ep.seasonNumber !== null && ep.seasonNumber !== undefined
    );
    const defaultSeason = fileSeasons.size === 1 ? Array.from(fileSeasons)[0] : null;

    // Group metadata episodes by season
    const metadataBySeason = new Map<number | null, EpisodeMetadata[]>();
    metadataEpisodes.forEach((ep) => {
      // If metadata doesn't have season info but files do, use the file season
      let season = ep.seasonNumber ?? null;
      if (!metadataHasSeasons && defaultSeason !== null) {
        season = defaultSeason;
      }
      if (!metadataBySeason.has(season)) {
        metadataBySeason.set(season, []);
      }
      metadataBySeason.get(season)!.push(ep);
    });

    // Process each season separately - use seasons from both sources
    const allSeasons = new Set<number | null>();
    metadataEpisodes.forEach((ep) => {
      const season = ep.seasonNumber ?? null;
      allSeasons.add(!metadataHasSeasons && defaultSeason !== null ? defaultSeason : season);
    });
    fileEpisodes.forEach((ep) => allSeasons.add(ep.seasonNumber ?? null));

    for (const season of allSeasons) {
      const seasonMetadata = metadataBySeason.get(season) || [];
      const seasonFiles = fileEpisodes.filter((ep) => (ep.seasonNumber ?? null) === season);

      const canonicalFileEpisodes = seasonFiles.filter((ep) => Number.isInteger(ep.episodeNumber));
      const maxCanonicalFileEpisode =
        canonicalFileEpisodes.length > 0
          ? Math.max(...canonicalFileEpisodes.map((ep) => ep.episodeNumber))
          : 0;

      const metadataMaxEpisode =
        seasonMetadata.length > 0 ? Math.max(...seasonMetadata.map((ep) => ep.episodeNumber)) : 0;

      const metadataTotalEpisodes =
        (allSeasons.size === 1 || season === defaultSeason) && seriesData.totalEpisodes
          ? seriesData.totalEpisodes
          : null;

      const seasonTotalEpisodes =
        metadataTotalEpisodes && metadataTotalEpisodes > maxCanonicalFileEpisode
          ? metadataTotalEpisodes
          : Math.max(metadataMaxEpisode, maxCanonicalFileEpisode);

      // Create map for this season
      const seasonMetadataMap = new Map<number, EpisodeMetadata>();
      seasonMetadata.forEach((ep) => seasonMetadataMap.set(ep.episodeNumber, ep));

      // Create a map of file episodes for this season by episode number
      const seasonFileMap = new Map<number, FileEpisode>();
      seasonFiles.forEach((ep) => seasonFileMap.set(ep.episodeNumber, ep));

      const seasonEpisodes: (EpisodeMetadata & { hasFile: boolean })[] = [];

      // Collect all episode numbers (from both metadata and files, including decimals)
      const allEpisodeNumbers = new Set<number>();
      seasonMetadata.forEach((ep) => allEpisodeNumbers.add(ep.episodeNumber));
      seasonFiles.forEach((ep) => allEpisodeNumbers.add(ep.episodeNumber));

      // Only add integer episodes up to seasonTotalEpisodes
      // This ensures we don't show episodes beyond what we have (unless metadata says there are more)
      for (let i = 1; i <= seasonTotalEpisodes; i++) {
        allEpisodeNumbers.add(i);
      }

      // Convert to sorted array (decimals will sort correctly: 6, 6.5, 7, 7.5, 10, 10.5)
      const sortedEpisodeNumbers = Array.from(allEpisodeNumbers).sort((a, b) => a - b);

      // Generate episodes for all episode numbers (including decimals)
      for (const epNum of sortedEpisodeNumbers) {
        const metaEp = seasonMetadataMap.get(epNum);
        const fileEp = seasonFileMap.get(epNum);

        // Prioritize metadata episode title, but only if it's not a generic "Episode X" title
        let episodeTitle = `Episode ${formatEpisodeNumber(epNum)}`;
        if (metaEp?.title) {
          const metaTitle = metaEp.title.trim();
          const genericPattern = /^Episode\s+\d+(\.\d+)?$/i;
          if (!genericPattern.test(metaTitle)) {
            episodeTitle = metaTitle;
          } else if (fileEp?.title) {
            const fileTitle = fileEp.title.trim();
            if (fileTitle && !/^Episode\s+\d+(\.\d+)?$/i.test(fileTitle)) {
              episodeTitle = fileTitle;
            } else {
              episodeTitle = metaTitle;
            }
          } else {
            episodeTitle = metaTitle;
          }
        } else if (fileEp?.title) {
          const fileTitle = fileEp.title.trim();
          if (fileTitle && !/^Episode\s+\d+(\.\d+)?$/i.test(fileTitle)) {
            episodeTitle = fileTitle;
          }
        }

        seasonEpisodes.push({
          episodeNumber: epNum,
          seasonNumber: season ?? undefined,
          title: episodeTitle,
          description: metaEp?.description || null,
          airDate: metaEp?.airDate || null,
          thumbnail: metaEp?.thumbnail || null,
          thumbnailLocal: metaEp?.thumbnailLocal || null,
          filePath: fileEp?.filePath,
          subtitlePath: fileEp?.subtitlePath || null,
          subtitlePaths: fileEp?.subtitlePaths || [],
          hasFile: !!fileEp,
        });
      }

      episodesBySeason.set(season, {
        seasonNumber: season,
        episodes: seasonEpisodes,
      });
    }
  }

  // Flatten for counting (but we'll display by season)
  const allMergedEpisodes = Array.from(episodesBySeason.values()).flatMap((s) => s.episodes);

  const availableCount = isMovie
    ? fileEpisodes.length > 0
      ? 1
      : 0
    : allMergedEpisodes.filter((ep) => ep.hasFile).length;
  const hasFile = fileEpisodes.length > 0;

  // Prefer local cached images, fall back to remote URLs
  const bannerUrl = getImageUrl(seriesData.bannerLocal, seriesData.banner);
  const posterUrl = getImageUrl(seriesData.posterLocal, seriesData.poster);

  // Formatted data
  const durationText = formatDuration(seriesData.duration, isMovie);
  const seasonText = formatSeason(seriesData.season, seriesData.seasonYear);
  const releaseYear = getYear(seriesData.startDate);

  const handlePlay = () => {
    navigate(`/player/${seriesId}/1`);
  };

  // Find first available episode for series
  const firstAvailableEpisode = allMergedEpisodes.find((ep) => ep.hasFile);
  const handlePlaySeries = () => {
    if (firstAvailableEpisode) {
      navigate(`/player/${seriesId}/${firstAvailableEpisode.episodeNumber}`);
    }
  };

  return (
    <div className={`series-detail ${isMovie ? "movie-detail" : ""}`}>
      {/* Hero Banner with gradient overlay */}
      <div
        className="detail-hero"
        style={{
          backgroundImage: bannerUrl
            ? `url(${bannerUrl})`
            : posterUrl
              ? `url(${posterUrl})`
              : "none",
        }}
      >
        <div className="detail-hero-overlay"></div>

        <div className="detail-hero-content">
          {/* Poster */}
          <div className="detail-poster-wrapper">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={seriesData.title || "Poster"}
                className="detail-poster"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (seriesData.poster && target.src !== seriesData.poster) {
                    target.src = seriesData.poster;
                  } else {
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450"%3E%3Crect width="300" height="450" fill="%231a1a24"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%234a4a5a" font-size="16" font-family="sans-serif"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }
                }}
              />
            ) : (
              <div className="detail-poster-placeholder">
                {isMovie ? <Film size={64} /> : <Tv size={64} />}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="detail-info">
            <h1 className="detail-title">{seriesData.title}</h1>

            {seriesData.titleRomaji && seriesData.titleRomaji !== seriesData.title && (
              <div className="detail-alt-title">{seriesData.titleRomaji}</div>
            )}

            {/* Quick Stats Row */}
            <div className="detail-stats">
              {seriesData.averageScore && (
                <div className="detail-stat detail-stat-score">
                  <Star className="stat-icon" size={16} />
                  <span className="stat-value">
                    {getDisplayRating(seriesData.averageScore, seriesData.source)}
                  </span>
                </div>
              )}

              {releaseYear && (
                <div className="detail-stat">
                  <Calendar className="stat-icon" size={16} />
                  <span className="stat-value">{releaseYear}</span>
                </div>
              )}

              {durationText && (
                <div className="detail-stat">
                  <Clock className="stat-icon" size={16} />
                  <span className="stat-value">{durationText}</span>
                </div>
              )}

              {!isMovie && seriesData.totalEpisodes && (
                <div className="detail-stat">
                  <Tv className="stat-icon" size={16} />
                  <span className="stat-value">{seriesData.totalEpisodes} eps</span>
                </div>
              )}

              {isMovie && (
                <div className="detail-stat detail-stat-movie">
                  <Film className="stat-icon" size={16} />
                  <span className="stat-value">Movie</span>
                </div>
              )}

              {seasonText && !isMovie && (
                <div className="detail-stat">
                  <span className="stat-value">{seasonText}</span>
                </div>
              )}

              {seriesData.status && !isMovie && (
                <div
                  className={`detail-stat detail-stat-status status-${seriesData.status?.toLowerCase()}`}
                >
                  <span className="stat-value">{seriesData.status}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {seriesData.genres && seriesData.genres.length > 0 && (
              <div className="detail-genres">
                {seriesData.genres.map((genre: string) => (
                  <span key={genre} className="detail-genre-tag">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {seriesData.description && (
              <div
                className="detail-description"
                dangerouslySetInnerHTML={{
                  __html:
                    seriesData.description
                      .replace(/<br\s*\/?>/gi, " ")
                      .replace(/<[^>]*>/g, "")
                      .substring(0, 600) + (seriesData.description.length > 600 ? "..." : ""),
                }}
              />
            )}

            {/* Studio */}
            {seriesData.studios && seriesData.studios.length > 0 && (
              <div className="detail-studio">
                <span className="studio-label">Studio</span>
                <span className="studio-name">{seriesData.studios.join(", ")}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="detail-actions">
              {isMovie ? (
                hasFile ? (
                  <button className="action-btn action-btn-play" onClick={handlePlay}>
                    <Play size={18} strokeWidth={2.5} />
                    <span>Play Movie</span>
                    {durationText && <span className="action-btn-meta">{durationText}</span>}
                  </button>
                ) : (
                  <div className="detail-unavailable">
                    <AlertTriangle className="unavailable-icon" size={20} />
                    <span>Movie file not available</span>
                  </div>
                )
              ) : (
                availableCount > 0 && (
                  <button className="action-btn action-btn-play" onClick={handlePlaySeries}>
                    <Play size={18} strokeWidth={2.5} />
                    <span>Play</span>
                  </button>
                )
              )}

              <button className="action-btn action-btn-secondary" onClick={() => navigate("/")}>
                <ArrowLeft size={16} strokeWidth={2} />
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes section - only for series, not movies */}
      {!isMovie && (
        <div className="episodes-section">
          <h2 className="episodes-title">
            Episodes
            <span className="episodes-count">
              {availableCount} / {allMergedEpisodes.length} available
            </span>
          </h2>

          {episodesBySeason.size > 0 ? (
            Array.from(episodesBySeason.values())
              .sort((a, b) => {
                // Sort seasons: null first, then by season number
                if (a.seasonNumber === null) return -1;
                if (b.seasonNumber === null) return 1;
                return (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0);
              })
              .map((seasonData) => (
                <div key={seasonData.seasonNumber ?? "no-season"} className="season-section">
                  <h3 className="season-title">
                    {seasonData.seasonNumber !== null
                      ? `Season ${seasonData.seasonNumber}`
                      : "Episodes"}
                    <span className="season-episode-count">
                      {seasonData.episodes.filter((ep) => ep.hasFile).length} /{" "}
                      {seasonData.episodes.length} available
                    </span>
                  </h3>
                  <div className="episodes-grid">
                    {seasonData.episodes.map((episode) => (
                      <EpisodeCard
                        key={`${seasonData.seasonNumber ?? "no-season"}-${episode.episodeNumber}`}
                        seriesId={seriesId}
                        episode={episode}
                        hasFile={episode.hasFile}
                      />
                    ))}
                  </div>
                </div>
              ))
          ) : (
            <div className="no-episodes">No episodes found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SeriesDetailPage;
