import { useMemo } from "react";
import { useMetadata, type SeriesMetadata } from "../hooks/useMetadata";
import ShowCard from "../components/ShowCard";
// Static import - if this fails, the build will fail, which is fine
// We handle runtime errors in the useMemo below
import Fuse from "fuse.js";
import { Search, Tv, Film } from "lucide-react";

interface ShowWithId extends SeriesMetadata {
  seriesId: string;
}

interface HomePageProps {
  searchQuery?: string;
}

function HomePage({ searchQuery = "" }: HomePageProps) {
  const { metadata, loading, error } = useMetadata();

  // All hooks must be called before any early returns
  // Prepare all items for search - filter out shows with 0 downloaded episodes
  const allItems = useMemo(() => {
    const items: ShowWithId[] = [];
    Object.entries(metadata).forEach(([seriesId, seriesData]) => {
      // Only include shows that have at least one downloaded episode/file
      const fileEpisodes = seriesData.fileEpisodes || [];
      if (fileEpisodes.length > 0) {
        items.push({ ...seriesData, seriesId });
      }
    });
    return items;
  }, [metadata]);

  // Configure Fuse.js for fuzzy search with error handling
  const fuse = useMemo(() => {
    try {
      if (!Fuse || typeof Fuse !== "function") {
        return null;
      }
      return new Fuse(allItems, {
        keys: [
          { name: "title", weight: 0.4 },
          { name: "titleRomaji", weight: 0.3 },
          { name: "titleEnglish", weight: 0.3 },
          { name: "titleNative", weight: 0.2 },
          { name: "genres", weight: 0.1 },
          { name: "description", weight: 0.05 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1,
      });
    } catch (error) {
      console.error("Fuse.js initialization failed:", error);
      return null;
    }
  }, [allItems]);

  // Filter items based on search query with error handling
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return allItems;
    }
    if (!fuse) {
      // Fallback to simple string matching if Fuse failed
      const queryLower = searchQuery.toLowerCase();
      return allItems.filter((item) => {
        const title = (item.title || "").toLowerCase();
        const titleRomaji = (item.titleRomaji || "").toLowerCase();
        const titleEnglish = (item.titleEnglish || "").toLowerCase();
        const titleNative = (item.titleNative || "").toLowerCase();
        return (
          title.includes(queryLower) ||
          titleRomaji.includes(queryLower) ||
          titleEnglish.includes(queryLower) ||
          titleNative.includes(queryLower) ||
          item.genres?.some((g) => g.toLowerCase().includes(queryLower))
        );
      });
    }
    try {
      const results = fuse.search(searchQuery);
      return results.map((result: { item: ShowWithId }) => result.item);
    } catch (error) {
      console.error("Fuse.js search failed:", error);
      // Fallback to simple string matching
      const queryLower = searchQuery.toLowerCase();
      return allItems.filter((item) => {
        const title = (item.title || "").toLowerCase();
        const titleRomaji = (item.titleRomaji || "").toLowerCase();
        const titleEnglish = (item.titleEnglish || "").toLowerCase();
        const titleNative = (item.titleNative || "").toLowerCase();
        return (
          title.includes(queryLower) ||
          titleRomaji.includes(queryLower) ||
          titleEnglish.includes(queryLower) ||
          titleNative.includes(queryLower) ||
          item.genres?.some((g) => g.toLowerCase().includes(queryLower))
        );
      });
    }
  }, [searchQuery, fuse, allItems]);

  // Early returns are safe now - all hooks have been called
  if (loading) {
    return <div className="loading">Loading your library...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  // Separate series and movies from filtered results
  const series: ShowWithId[] = [];
  const movies: ShowWithId[] = [];

  filteredItems.forEach((item: ShowWithId) => {
    // Check if it's a movie (single episode or type is 'movie')
    const isMovie =
      item.type === "movie" ||
      (item.fileEpisodes?.length === 1 && !item.totalEpisodes) ||
      item.format === "MOVIE";

    if (isMovie) {
      movies.push(item);
    } else {
      series.push(item);
    }
  });

  if (series.length === 0 && movies.length === 0) {
    if (searchQuery.trim()) {
      return (
        <div className="empty-state">
          <Search className="empty-state-icon" size={48} />
          <h2>No results found</h2>
          <p>No series or movies match "{searchQuery}"</p>
        </div>
      );
    }
    return (
      <div className="empty-state">
        <Tv className="empty-state-icon" size={48} />
        <h2>Your library is empty</h2>
        <p>
          Go to <strong>Settings</strong> to select a folder with your anime collection.
        </p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {searchQuery.trim() && (
        <div className="search-results-header">
          <span className="search-results-text">
            {filteredItems.length === 0
              ? "No results"
              : `Found ${filteredItems.length} ${filteredItems.length === 1 ? "result" : "results"}`}
          </span>
          {searchQuery.trim() && <span className="search-query">for "{searchQuery}"</span>}
        </div>
      )}
      {series.length > 0 && (
        <section className="media-section">
          <h2 className="section-title">
            <Tv className="section-icon" size={20} />
            Series
            <span className="section-count">{series.length}</span>
          </h2>
          <div className="media-grid media-grid-large">
            {series.map((show) => (
              <ShowCard
                key={show.seriesId}
                seriesId={show.seriesId}
                seriesData={show}
                size="large"
              />
            ))}
          </div>
        </section>
      )}

      {movies.length > 0 && (
        <section className="media-section">
          <h2 className="section-title">
            <Film className="section-icon" size={20} />
            Movies
            <span className="section-count">{movies.length}</span>
          </h2>
          <div className="media-grid media-grid-large">
            {movies.map((show) => (
              <ShowCard
                key={show.seriesId}
                seriesId={show.seriesId}
                seriesData={show}
                size="large"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;
