import { useState } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './components/HomePage';
import SeriesDetailPage from './components/SeriesDetailPage';
import SettingsTab from './components/SettingsTab';
import MetadataTab from './components/MetadataTab';
import VideoPlayer from './components/VideoPlayer';
import ContextMenu from './components/ContextMenu';
import SearchBar from './components/SearchBar';
import './styles/App.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <HashRouter>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-left">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/settings" className="nav-link">Settings</Link>
            <Link to="/metadata" className="nav-link">Metadata</Link>
          </div>
          <SearchBar onSearch={setSearchQuery} placeholder="Search series and movies..." />
          <div className="navbar-right"></div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage searchQuery={searchQuery} />} />
            <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
            <Route path="/settings" element={<SettingsTab />} />
            <Route path="/metadata" element={<MetadataTab />} />
            <Route path="/player/:seriesId/:episodeNumber" element={<VideoPlayer />} />
          </Routes>
        </main>
        <ContextMenu />
      </div>
    </HashRouter>
  );
}

export default App;
