import { useState, useEffect } from 'react';
import { useMetadata } from '../hooks/useMetadata';
import Button from './Button';
import { Folder, RefreshCw, Image, FileText, Trash2, Info } from 'lucide-react';

interface CacheStats {
  count: number;
  sizeBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function SettingsTab() {
  const [folderSources, setFolderSources] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [loading, setLoading] = useState(true);
  const [cacheStats, setCacheStats] = useState<CacheStats>({ count: 0, sizeBytes: 0 });
  const { loadMetadata } = useMetadata();

  useEffect(() => {
    loadFolderSources();
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await window.electronAPI.getImageCacheStats();
      setCacheStats(stats);
    } catch (err) {
      console.error('Error loading cache stats:', err);
    }
  };

  const loadFolderSources = async () => {
    try {
      setLoading(true);
      const sources = await window.electronAPI.getFolderSources();
      setFolderSources(sources);
    } catch (err) {
      console.error('Error loading folder sources:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFolder = async () => {
    try {
      const selectedPath = await window.electronAPI.selectFolder();
      if (selectedPath) {
        await window.electronAPI.addFolderSource(selectedPath);
        await loadFolderSources();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error adding folder:', err);
      alert('Error adding folder: ' + errorMessage);
    }
  };

  const handleRemoveFolder = async (folderPath: string) => {
    if (!confirm(`Remove "${folderPath}" from sources?`)) return;
    
    try {
      await window.electronAPI.removeFolderSource(folderPath);
      await loadFolderSources();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error removing folder:', err);
      alert('Error removing folder: ' + errorMessage);
    }
  };

  const handleScanFolder = async (folderPath: string) => {
    setScanning(true);
    setScanProgress(`Scanning ${folderPath}...`);

    try {
      const result = await window.electronAPI.scanAndFetchMetadata(folderPath);
      setScanProgress(`Found ${result.count} items in ${folderPath}`);
      await loadMetadata();
      await loadCacheStats();
      
      setTimeout(() => {
        setScanProgress('');
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error scanning folder:', err);
      setScanProgress(`Error: ${errorMessage}`);
    } finally {
      setScanning(false);
    }
  };

  const handleScanAll = async () => {
    if (folderSources.length === 0) {
      alert('No folder sources added. Please add a folder first.');
      return;
    }

    setScanning(true);
    
    for (let i = 0; i < folderSources.length; i++) {
      const folder = folderSources[i];
      setScanProgress(`Scanning folder ${i + 1}/${folderSources.length}: ${folder}...`);
      
      try {
        await window.electronAPI.scanAndFetchMetadata(folder);
      } catch (err) {
        console.error(`Error scanning ${folder}:`, err);
      }
    }

    setScanProgress('Scan complete!');
    await loadMetadata();
    await loadCacheStats();
    
    setTimeout(() => {
      setScanning(false);
      setScanProgress('');
    }, 2000);
  };

  const handleClearMetadata = async () => {
    if (!confirm('Clear all metadata? This will remove all cached information.')) return;
    
    try {
      await window.electronAPI.clearMetadata();
      await loadMetadata();
      alert('Metadata cleared. Re-scan your folders to fetch metadata again.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error clearing metadata:', err);
      alert('Error clearing metadata: ' + errorMessage);
    }
  };

  const handleClearImageCache = async () => {
    if (!confirm('Clear all cached images? This will remove locally stored images.')) return;
    
    try {
      await window.electronAPI.clearImageCache();
      await loadCacheStats();
      alert('Image cache cleared. Images will be re-downloaded on next scan.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error clearing image cache:', err);
      alert('Error clearing image cache: ' + errorMessage);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all cached data (metadata and images)? You will need to re-scan your folders.')) return;
    
    try {
      await window.electronAPI.clearMetadata();
      await window.electronAPI.clearImageCache();
      await loadMetadata();
      await loadCacheStats();
      alert('All cached data cleared. Re-scan your folders to fetch fresh data.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error clearing cache:', err);
      alert('Error clearing cache: ' + errorMessage);
    }
  };

  if (loading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      <div className="settings-section">
        <h2 className="settings-title"><Folder size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Media Folder Sources</h2>
        <p className="settings-description">
          Add folders containing your anime. Each folder will be scanned for series and movies.
        </p>
        
        {folderSources.length === 0 ? (
          <div className="empty-folders">
            <p>No folders added yet. Click "Add Folder" to get started.</p>
          </div>
        ) : (
          <div className="folder-list">
            {folderSources.map((folder, index) => (
              <div key={index} className="folder-item">
                <div className="folder-path">{folder}</div>
                <div className="folder-actions">
                  <Button
                    size="small"
                    onClick={() => handleScanFolder(folder)}
                    disabled={scanning}
                  >
                    Scan
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => handleRemoveFolder(folder)}
                    disabled={scanning}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="settings-buttons">
          <Button
            onClick={handleAddFolder}
            disabled={scanning}
          >
            + Add Folder
          </Button>
          
          {folderSources.length > 0 && (
            <Button
              variant="primary"
              onClick={handleScanAll}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : <><RefreshCw size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Scan All Folders</>}
            </Button>
          )}
        </div>

        {scanProgress && (
          <div className="scan-progress">
            {scanning && <div className="loading-spinner small"></div>}
            <span>{scanProgress}</span>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2 className="settings-title"><FileText size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Cache & Storage</h2>
        <p className="settings-description">
          Images and metadata are cached locally for faster loading and offline access.
        </p>
        
        <div className="cache-stats">
          <div className="cache-stat">
            <span className="cache-stat-label"><Image size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Cached Images:</span>
            <span className="cache-stat-value">{cacheStats.count} files ({formatBytes(cacheStats.sizeBytes)})</span>
          </div>
        </div>
        
        <div className="settings-buttons">
          <Button
            onClick={handleClearImageCache}
            disabled={scanning}
          >
            <Image size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Clear Image Cache
          </Button>
          <Button
            onClick={handleClearMetadata}
            disabled={scanning}
          >
            <FileText size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Clear Metadata
          </Button>
          <Button
            variant="danger"
            onClick={handleClearAll}
            disabled={scanning}
          >
            <Trash2 size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> Clear All Cache
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-title"><Info size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} /> How It Works</h2>
        <div className="settings-info">
          <p><strong>Folder Structure:</strong></p>
          <pre className="code-block">{`📁 Your Anime Folder/
├── 📁 Movies/
│   └── 🎬 Movie Name.mp4        → Treated as movie
├── 📁 Series/
│   ├── 📁 Anime Title/
│   │   ├── Episode 1.mp4        → Treated as series
│   │   ├── Episode 2.mp4
│   │   └── ...
│   └── 📁 Another Anime/
│       ├── 📁 Season 1/
│       │   ├── 📁 Episode 1.mp4
│       │   ├── 📁 Episode 2.mp4
│       │   └── ...
│       ├── 📁 Season 2/
│       │   └── ...
│       └── ...
└── 🎬 Standalone Movie.mp4      → Treated as movie`}</pre>
          <p><strong>Metadata Priority:</strong> AniList → MyAnimeList → TVDB</p>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
