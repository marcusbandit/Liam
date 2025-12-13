import Button from './subcomponents/Button';
import { useState, useMemo } from 'react';
import { useMetadata, type SeriesMetadata } from '../hooks/useMetadata';
import { Link } from 'react-router-dom';

type SortOption = 'title' | 'episodes' | 'score' | 'status' | 'source';
type ViewMode = 'grid' | 'list';

function MetadataTab() {
  const { metadata, loading, updateSeriesMetadata, loadMetadata } = useMetadata();
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [bulkRefreshing, setBulkRefreshing] = useState(false);

  const seriesList = useMemo(() => Object.entries(metadata), [metadata]);

  // Get unique sources and genres for filters
  const { sources, genres, stats } = useMemo(() => {
    const sourceSet = new Set<string>();
    const genreSet = new Set<string>();
    let totalEpisodes = 0;
    let avgScore = 0;
    let scoreCount = 0;

    seriesList.forEach(([, data]) => {
      if (data.source) sourceSet.add(data.source);
      data.genres?.forEach(g => genreSet.add(g));
      totalEpisodes += data.episodes?.length || 0;
      if (data.averageScore) {
        avgScore += data.averageScore;
        scoreCount++;
      }
    });

    return {
      sources: Array.from(sourceSet).sort(),
      genres: Array.from(genreSet).sort(),
      stats: {
        totalSeries: seriesList.length,
        totalEpisodes,
        avgScore: scoreCount > 0 ? Math.round(avgScore / scoreCount) : 0
      }
    };
  }, [seriesList]);

  // Filter and sort series
  const filteredSeries = useMemo(() => {
    let filtered = seriesList.filter(([id, data]) => {
      const title = data.title || id;
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.titleRomaji?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.titleEnglish?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSource = filterSource === 'all' || data.source === filterSource;
      const matchesGenre = filterGenre === 'all' || data.genres?.includes(filterGenre);
      return matchesSearch && matchesSource && matchesGenre;
    });

    filtered.sort(([idA, dataA], [idB, dataB]) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = (dataA.title || idA).localeCompare(dataB.title || idB);
          break;
        case 'episodes':
          comparison = (dataA.episodes?.length || 0) - (dataB.episodes?.length || 0);
          break;
        case 'score':
          comparison = (dataA.averageScore || 0) - (dataB.averageScore || 0);
          break;
        case 'status':
          comparison = (dataA.status || '').localeCompare(dataB.status || '');
          break;
        case 'source':
          comparison = (dataA.source || '').localeCompare(dataB.source || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [seriesList, searchQuery, filterSource, filterGenre, sortBy, sortOrder]);

  const handleRefresh = async (seriesId: string, seriesName: string) => {
    setRefreshing(prev => ({ ...prev, [seriesId]: true }));
    try {
      const fetchedMetadata = await window.electronAPI.fetchMetadata(seriesName) as SeriesMetadata | null;
      if (fetchedMetadata) {
        await updateSeriesMetadata(seriesId, fetchedMetadata);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error refreshing metadata:', err);
      alert('Error refreshing metadata: ' + errorMessage);
    } finally {
      setRefreshing(prev => ({ ...prev, [seriesId]: false }));
    }
  };

  const handleBulkRefresh = async () => {
    if (!confirm(`Refresh metadata for all ${filteredSeries.length} series? This may take a while.`)) return;
    
    setBulkRefreshing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [seriesId, data] of filteredSeries) {
      try {
        setRefreshing(prev => ({ ...prev, [seriesId]: true }));
        const fetchedMetadata = await window.electronAPI.fetchMetadata(data.title || seriesId) as SeriesMetadata | null;
        if (fetchedMetadata) {
          await updateSeriesMetadata(seriesId, fetchedMetadata);
          successCount++;
        }
      } catch (err) {
        console.error('Error refreshing:', seriesId, err);
        errorCount++;
      } finally {
        setRefreshing(prev => ({ ...prev, [seriesId]: false }));
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setBulkRefreshing(false);
    alert(`Refresh complete!\n✅ ${successCount} successful\n❌ ${errorCount} failed`);
    await loadMetadata();
  };

  const toggleExpanded = (seriesId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  };

  const getStatusClass = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'RELEASING':
      case 'ONGOING':
        return 'status-releasing';
      case 'FINISHED':
      case 'COMPLETED':
        return 'status-finished';
      case 'NOT_YET_RELEASED':
      case 'UPCOMING':
        return 'status-upcoming';
      case 'CANCELLED':
        return 'status-cancelled';
      case 'HIATUS':
        return 'status-hiatus';
      default:
        return '';
    }
  };

  const formatStatus = (status?: string) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="metadata-loading">
        <div className="loading-spinner"></div>
        <p>Loading metadata...</p>
      </div>
    );
  }

  if (seriesList.length === 0) {
    return (
      <div className="metadata-empty">
        <div className="empty-icon">📚</div>
        <h2>No Metadata Found</h2>
        <p>Your library is empty. Add some anime folders in Settings and scan them to get started.</p>
        <Link to="/settings" className="button">Go to Settings</Link>
      </div>
    );
  }

  return (
    <div className="metadata-container">
      {/* Stats Header */}
      <div className="metadata-stats">
        <div className="stat-card">
          <div className="stat-icon">📺</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalSeries}</span>
            <span className="stat-label">Series</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎬</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalEpisodes}</span>
            <span className="stat-label">Episodes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <span className="stat-value">{stats.avgScore || '—'}</span>
            <span className="stat-label">Avg Score</span>
          </div>
        </div>
        <div className="stat-card sources">
          <div className="stat-icon">🔗</div>
          <div className="stat-content">
            <span className="stat-value">{sources.length}</span>
            <span className="stat-label">Sources</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="metadata-controls">
        <div className="controls-left">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>
          
          <select
            className="filter-select"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">All Sources</option>
            {sources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
          >
            <option value="all">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>

        <div className="controls-right">
          <div className="sort-controls">
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="title">Sort by Title</option>
              <option value="episodes">Sort by Episodes</option>
              <option value="score">Sort by Score</option>
              <option value="status">Sort by Status</option>
              <option value="source">Sort by Source</option>
            </select>
            <Button
              className="sort-order-btn"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              size="small"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ▦
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
          </div>

          <Button
            className="refresh-all-btn"
            onClick={handleBulkRefresh}
            disabled={bulkRefreshing || filteredSeries.length === 0}
            variant="primary"
            size="small"
          >
            {bulkRefreshing ? 'Refreshing...' : 'Refresh All'}
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        Showing {filteredSeries.length} of {seriesList.length} series
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Series Grid/List */}
      {filteredSeries.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">🔎</div>
          <p>No series match your filters</p>
          <button className="button-secondary" onClick={() => {
            setSearchQuery('');
            setFilterSource('all');
            setFilterGenre('all');
          }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className={`metadata-grid ${viewMode}`}>
          {filteredSeries.map(([seriesId, seriesData]) => (
            <div 
              key={seriesId} 
              className={`metadata-card ${viewMode} ${expandedCards.has(seriesId) ? 'expanded' : ''}`}
            >
              {/* Poster */}
              <div className="card-poster">
                {seriesData.poster ? (
                  <img src={seriesData.poster} alt={seriesData.title} loading="lazy" />
                ) : (
                  <div className="no-poster">🎬</div>
                )}
                {seriesData.averageScore && (
                  <div className="card-score">⭐ {seriesData.averageScore}</div>
                )}
              </div>

              {/* Content */}
              <div className="card-content">
                <div className="card-header">
                  <Link to={`/series/${seriesId}`} className="card-title">
                    {seriesData.title || seriesId}
                  </Link>
                  {seriesData.titleRomaji && seriesData.titleRomaji !== seriesData.title && (
                    <span className="card-alt-title">{seriesData.titleRomaji}</span>
                  )}
                </div>

                <div className="card-badges">
                  <span className={`badge source-badge source-${seriesData.source?.toLowerCase()}`}>
                    {seriesData.source || 'Unknown'}
                  </span>
                  {seriesData.status && (
                    <span className={`badge status-badge ${getStatusClass(seriesData.status)}`}>
                      {formatStatus(seriesData.status)}
                    </span>
                  )}
                  {seriesData.format && (
                    <span className="badge format-badge">{seriesData.format}</span>
                  )}
                </div>

                <div className="card-meta">
                  <span className="meta-item">
                    <span className="meta-icon">📁</span>
                    {seriesData.episodes?.length || 0} / {seriesData.totalEpisodes || '?'} episodes
                  </span>
                  {seriesData.startDate && (
                    <span className="meta-item">
                      <span className="meta-icon">📅</span>
                      {seriesData.startDate}
                    </span>
                  )}
                  {seriesData.studios && seriesData.studios.length > 0 && (
                    <span className="meta-item">
                      <span className="meta-icon">🏢</span>
                      {seriesData.studios.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>

                {seriesData.genres && seriesData.genres.length > 0 && (
                  <div className="card-genres">
                    {seriesData.genres.slice(0, 4).map(genre => (
                      <span key={genre} className="genre-pill">{genre}</span>
                    ))}
                    {seriesData.genres.length > 4 && (
                      <span className="genre-pill more">+{seriesData.genres.length - 4}</span>
                    )}
                  </div>
                )}

                {seriesData.description && (
                  <div className={`card-description ${expandedCards.has(seriesId) ? 'expanded' : ''}`}>
                    <p dangerouslySetInnerHTML={{ 
                      __html: expandedCards.has(seriesId) 
                        ? seriesData.description 
                        : seriesData.description.substring(0, 150) + (seriesData.description.length > 150 ? '...' : '')
                    }} />
                    {seriesData.description.length > 150 && (
                      <button 
                        className="expand-btn"
                        onClick={() => toggleExpanded(seriesId)}
                      >
                        {expandedCards.has(seriesId) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}

                <div className="card-actions">
                  <Link to={`/series/${seriesId}`} className="button-secondary view-btn">
                    View Series
                  </Link>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleRefresh(seriesId, seriesData.title || seriesId)}
                    disabled={refreshing[seriesId] || bulkRefreshing}
                  >
                    {refreshing[seriesId] ? (
                      <>
                        <span className="btn-spinner"></span>
                        Refreshing...
                      </>
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MetadataTab;
