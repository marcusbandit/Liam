import { useState } from "react";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SeriesDetailPage from "./pages/SeriesDetailPage";
import SettingsTab from "./components/SettingsTab";
import MetadataTab from "./pages/MetadataTab";
import VideoPlayer from "./pages/VideoPlayer";
import ContextMenu from "./components/ContextMenu";
import SearchBar from "./components/SearchBar";
import "./styles/App.css";

function AppContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const isPlayerRoute = location.pathname.startsWith("/player/");

  return (
    <div className="app">
      {!isPlayerRoute && (
        <nav className="navbar">
          <div className="navbar-left">
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/settings" className="nav-link">
              Settings
            </Link>
            <Link to="/metadata" className="nav-link">
              Metadata
            </Link>
          </div>
          <SearchBar onSearch={setSearchQuery} placeholder="Search series and movies..." />
          <div className="navbar-right"></div>
        </nav>
      )}
      {!isPlayerRoute ? (
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage searchQuery={searchQuery} />} />
            <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
            <Route path="/settings" element={<SettingsTab />} />
            <Route path="/metadata" element={<MetadataTab />} />
          </Routes>
        </main>
      ) : (
        <Routes>
          <Route path="/player/:seriesId/:episodeNumber" element={<VideoPlayer />} />
        </Routes>
      )}
      {!isPlayerRoute && <ContextMenu />}
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
