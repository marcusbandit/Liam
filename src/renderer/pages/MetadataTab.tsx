import { useState, useMemo } from 'react';
import { useMetadata, type SeriesMetadata, type FileEpisode } from '../hooks/useMetadata';
import Button from '../components/Button';
import { BookOpen, Tv, Film, Star, Search, X, Folder, Calendar, Building, ChevronDown, RefreshCw, Check, AlertCircle, Trash2 } from 'lucide-react';
import { normalizeRating, getDisplayRating } from '../utils/ratingUtils';

type SortOption = 'title' | 'episodes' | 'score';

function MetadataTab() {
  const { metadata, loading, updateSeriesMetadata, loadMetadata } = useMetadata();
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [bulkRefreshing, setBulkRefreshing] = useState(false);

  const seriesList = useMemo(() => Object.entries(metadata), [metadata]);

  // Get stats
  const stats = useMemo(() => {
    let totalEpisodes = 0;
    let avgScore = 0;
    let scoreCount = 0;

    seriesList.forEach(([, data]) => {
      totalEpisodes += data.episodes?.length || 0;
      if (data.averageScore) {
        const normalized = normalizeRating(data.averageScore, data.source) || 0;
        avgScore += normalized;
        scoreCount++;
      }
    });

    return {
      totalSeries: seriesList.length,
      totalEpisodes,
      avgScore: scoreCount > 0 ? Math.round(avgScore / scoreCount) : 0
    };
  }, [seriesList]);

  // Filter and sort series
  const filteredSeries = useMemo(() => {
    let filtered = seriesList.filter(([id, data]) => {
      const title = data.title || id;
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.titleRomaji?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        data.titleEnglish?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
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
          const scoreA = normalizeRating(dataA.averageScore, dataA.source) || 0;
          const scoreB = normalizeRating(dataB.averageScore, dataB.source) || 0;
          comparison = scoreA - scoreB;
          break;
      }
      return comparison;
    });

    return filtered;
  }, [seriesList, searchQuery, sortBy]);

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

  const toggleCardExpanded = (seriesId: string) => {
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

  const handleManualSearch = (seriesId: string) => {
    // Placeholder for future manual search functionality
    console.log('Manual search clicked for:', seriesId);
    alert(`Manual search for "${seriesId}" - Coming soon!`);
  };

  const handleDelete = async (seriesId: string, seriesName: string) => {
    if (!confirm(`Delete "${seriesName}"?\n\nThis will remove all cached images and metadata for this series.`)) {
      return;
    }

    try {
      await window.electronAPI.deleteSeries(seriesId);
      await loadMetadata();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error deleting series:', err);
      alert('Error deleting series: ' + errorMessage);
    }
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
        <BookOpen className="empty-icon" size={48} />
        <h2>No Metadata Found</h2>
        <p>Your library is empty. Add some anime folders in Settings and scan them to get started.</p>
        <Button as="link" to="/settings">Go to Settings</Button>
      </div>
    );
  }

  return (
    <div className="metadata-container compact">
      {/* Compact Header */}
      <div className="metadata-header-compact">
        <div className="metadata-stats-inline">
          <span className="stat-inline"><Tv size={16} /> {stats.totalSeries} Series</span>
          <span className="stat-inline"><Film size={16} /> {stats.totalEpisodes} Episodes</span>
          {stats.avgScore > 0 && <span className="stat-inline"><Star size={16} /> {stats.avgScore} Avg</span>}
        </div>
        
        <div className="metadata-controls-compact">
          <div className="search-wrapper compact">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button className="search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </Button>
            )}
          </div>
          
          <select
            className="sort-select compact"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="title">Title</option>
            <option value="episodes">Episodes</option>
            <option value="score">Score</option>
          </select>

          <Button
            className="refresh-all-btn"
            onClick={handleBulkRefresh}
            disabled={bulkRefreshing || filteredSeries.length === 0}
            variant="primary"
            size="small"
          >
            <RefreshCw size={14} className={bulkRefreshing ? 'spin' : ''} />
            {bulkRefreshing ? 'Refreshing...' : 'Refresh All'}
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info compact">
        {filteredSeries.length} of {seriesList.length} items
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Series List */}
      {filteredSeries.length === 0 ? (
        <div className="no-results">
          <Search className="no-results-icon" size={48} />
          <p>No series match your search</p>
          <Button variant="secondary" onClick={() => setSearchQuery('')}>
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="metadata-list-compact">
          {filteredSeries.map(([seriesId, seriesData]) => {
            const hasMetadata = seriesData.title && seriesData.poster;
            const isExpanded = expandedCards.has(seriesId);
            const fileCount = seriesData.fileEpisodes?.length || 0;
            
            // Create a map of episode numbers to files
            const fileMap = new Map<number, FileEpisode>();
            seriesData.fileEpisodes?.forEach(file => {
              fileMap.set(file.episodeNumber, file);
            });
            
            // Create merged list: files + missing episodes
            const allEpisodes: Array<{
              episodeNumber: number;
              isFile: boolean;
              filename?: string;
              title?: string;
            }> = [];
            
            // Add all metadata episodes (for missing ones)
            if (seriesData.episodes) {
              seriesData.episodes.forEach(ep => {
                const file = fileMap.get(ep.episodeNumber);
                if (file) {
                  // File exists - use actual filename
                  allEpisodes.push({
                    episodeNumber: ep.episodeNumber,
                    isFile: true,
                    filename: file.filename,
                    title: ep.title
                  });
                } else {
                  // Missing episode - show from metadata
                  allEpisodes.push({
                    episodeNumber: ep.episodeNumber,
                    isFile: false,
                    title: ep.title
                  });
                }
              });
            } else if (seriesData.fileEpisodes) {
              // No metadata episodes, just show files
              seriesData.fileEpisodes.forEach(file => {
                allEpisodes.push({
                  episodeNumber: file.episodeNumber,
                  isFile: true,
                  filename: file.filename
                });
              });
            }
            
            return (
              <div 
                key={seriesId} 
                className={`metadata-card-v2 ${hasMetadata ? 'matched' : 'unmatched'} ${isExpanded ? 'expanded' : ''}`}
              >
                {/* Main Card Content */}
                <div className="card-main" onClick={() => toggleCardExpanded(seriesId)}>
                  {/* Left: Folder Info */}
                  <div className="card-folder">
                    <Folder size={18} className="folder-icon" />
                    <div className="folder-info">
                      <span className="folder-name">{seriesId}</span>
                      <span className="folder-files">{fileCount} video files</span>
                    </div>
                  </div>

                  {/* Center: Arrow */}
                  <div className="card-arrow">
                    <span className="arrow-icon">→</span>
                  </div>

                  {/* Right: Matched Metadata */}
                  <div className="card-metadata">
                    {hasMetadata ? (
                      <>
                        <div className="meta-poster-lg">
                          <img src={seriesData.poster || undefined} alt={seriesData.title} />
                        </div>
                        <div className="meta-info">
                          <div className="meta-title-row">
                            <span className={`meta-title ${isExpanded ? 'expanded' : ''}`}>{seriesData.title}</span>
                            <Check size={16} className="match-icon" />
                          </div>
                          <div className="meta-details">
                            <span className="detail-item detail-year">
                              <Calendar size={13} />
                              {seriesData.startDate ? seriesData.startDate.split('-')[0] : '—'}
                            </span>
                            <span className="detail-item detail-eps">
                              <Film size={13} />
                              {seriesData.totalEpisodes || '?'} eps
                            </span>
                            <span className="detail-item detail-score">
                              <Star size={13} />
                              {seriesData.averageScore ? getDisplayRating(seriesData.averageScore, seriesData.source) : '—'}
                            </span>
                            {seriesData.studios && seriesData.studios.length > 0 && (
                              <span className="detail-item detail-studio">
                                <Building size={13} />
                                {seriesData.studios[0]}
                              </span>
                            )}
                          </div>
                          <div className="meta-source">
                            <span className={`source-tag source-${seriesData.source?.toLowerCase()}`}>
                              {seriesData.source}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="meta-empty">
                        <AlertCircle size={20} className="warning-icon" />
                        <span>No metadata found</span>
                      </div>
                    )}
                  </div>

                  {/* Expand Indicator */}
                  <div className="card-expand">
                    <ChevronDown size={18} className={`expand-chevron ${isExpanded ? 'rotated' : ''}`} />
                  </div>
                </div>

                {/* Expanded Content - Always rendered, CSS controls visibility */}
                <div className={`card-expanded-wrapper ${isExpanded ? 'open' : ''}`}>
                  <div className="card-expanded-inner">
                    {/* Files List */}
                    <div className="expanded-section">
                      <div className="section-header">
                        <Film size={14} />
                        <span>Video Files ({fileCount} / {seriesData.totalEpisodes || allEpisodes.length})</span>
                      </div>
                      <div className="files-list">
                        {allEpisodes.length > 0 ? (
                          allEpisodes.map((ep, idx) => (
                            <div key={idx} className={`file-row ${ep.isFile ? '' : 'missing'}`}>
                              <span className="file-number">#{ep.episodeNumber}</span>
                              <span className="file-name">
                                {ep.isFile ? ep.filename : (ep.title || `Episode ${ep.episodeNumber}`)}
                              </span>
                              {!ep.isFile && <span className="missing-badge">Missing</span>}
                            </div>
                          ))
                        ) : (
                          <div className="no-files">No video files found</div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="expanded-actions">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManualSearch(seriesId);
                        }}
                      >
                        <Search size={14} />
                        Manual Search
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefresh(seriesId, seriesData.title || seriesId);
                        }}
                        disabled={refreshing[seriesId] || bulkRefreshing}
                      >
                        <RefreshCw size={14} className={refreshing[seriesId] ? 'spin' : ''} />
                        {refreshing[seriesId] ? 'Refreshing...' : 'Refresh'}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(seriesId, seriesData.title || seriesId);
                        }}
                        disabled={refreshing[seriesId] || bulkRefreshing}
                      >
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MetadataTab;
