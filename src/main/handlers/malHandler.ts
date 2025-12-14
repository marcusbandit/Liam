import axios from 'axios';

const JIKAN_API_URL = 'https://api.jikan.moe/v4';

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  synopsis: string | null;
  background: string | null;
  genres: { name: string }[];
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  episodes: number | null;
  status: string;
  type: string;
  score: number | null;
  studios: { name: string }[];
  aired: {
    from: string | null;
    to: string | null;
  };
}

interface JikanEpisode {
  mal_id: number;
  episode: number;
  title: string;
  synopsis: string | null;
  aired: string | null;
  images?: {
    jpg?: {
      image_url: string;
    };
  };
}

export interface SeriesMetadata {
  seriesId: string;
  title: string;
  titleEnglish?: string | null;
  titleJapanese?: string | null;
  description: string;
  genres: string[];
  poster: string | null;
  banner: null;
  episodes: EpisodeMetadata[];
  totalEpisodes: number | null;
  status: string;
  format: string;
  averageScore: number | null;
  studios: string[];
  startDate: string | null;
  endDate: string | null;
  malId: number;
}

export interface EpisodeMetadata {
  episodeNumber: number;
  seasonNumber?: number | null;
  title: string;
  description: string | null;
  airDate: string | null;
  thumbnail: string | null;
}

const malHandler = {
  async searchAnime(searchTerm: string): Promise<JikanAnime | null> {
    try {
      const response = await axios.get<{ data: JikanAnime[] }>(`${JIKAN_API_URL}/anime`, {
        params: {
          q: searchTerm,
          limit: 1,
        },
      });

      if (response.data?.data?.[0]) {
        return response.data.data[0];
      }
      return null;
    } catch (error) {
      console.error('Error searching MyAnimeList:', error);
      throw error;
    }
  },

  async getEpisodes(animeId: number, totalEpisodes: number | null, seasonNumber?: number | null): Promise<EpisodeMetadata[]> {
    try {
      const response = await axios.get<{ data: JikanEpisode[] }>(`${JIKAN_API_URL}/anime/${animeId}/episodes`);
      
      // Create a map of fetched episodes
      const fetchedEpisodeMap = new Map<number, JikanEpisode>();
      if (response.data?.data) {
        for (const ep of response.data.data) {
          const epNum = ep.mal_id || ep.episode;
          if (epNum) {
            fetchedEpisodeMap.set(epNum, ep);
          }
        }
      }
      
      // Generate episodes based on totalEpisodes count
      const episodeCount = totalEpisodes || fetchedEpisodeMap.size || 0;
      const episodes: EpisodeMetadata[] = [];
      
      for (let i = 1; i <= episodeCount; i++) {
        const fetchedEp = fetchedEpisodeMap.get(i);
        episodes.push({
          episodeNumber: i,
          seasonNumber: seasonNumber ?? null,
          title: fetchedEp?.title || `Episode ${i}`,
          description: fetchedEp?.synopsis || null,
          airDate: fetchedEp?.aired || null,
          thumbnail: fetchedEp?.images?.jpg?.image_url || null,
        });
      }
      
      return episodes;
    } catch (error) {
      console.error('Error fetching MAL episodes:', error);
      // If fetching fails but we know totalEpisodes, generate basic entries
      if (totalEpisodes) {
        return Array.from({ length: totalEpisodes }, (_, i) => ({
          episodeNumber: i + 1,
          seasonNumber: seasonNumber ?? null,
          title: `Episode ${i + 1}`,
          description: null,
          airDate: null,
          thumbnail: null,
        }));
      }
      return [];
    }
  },

  async searchAndFetchMetadata(seriesName: string, seasonNumber?: number | null): Promise<SeriesMetadata | null> {
    try {
      // Include season in search query if available
      const searchQuery = seasonNumber 
        ? `${seriesName} Season ${seasonNumber}`
        : seriesName;
      
      const anime = await this.searchAnime(searchQuery);
      
      if (!anime) {
        // If season-specific search failed, try without season
        if (seasonNumber) {
          const animeWithoutSeason = await this.searchAnime(seriesName);
          if (animeWithoutSeason) {
            // Found the series, but we'll need to filter episodes by season
            // For now, return it and let the UI handle season filtering
            const episodes = await this.getEpisodes(animeWithoutSeason.mal_id, animeWithoutSeason.episodes, seasonNumber);
            return this.formatMetadata(animeWithoutSeason, episodes, seasonNumber);
          }
        }
        return null;
      }

      const episodes = await this.getEpisodes(anime.mal_id, anime.episodes, seasonNumber);

      return this.formatMetadata(anime, episodes, seasonNumber);
    } catch (error) {
      console.error('Error fetching MAL metadata:', error);
      return null;
    }
  },

  formatMetadata(anime: JikanAnime, episodes: EpisodeMetadata[], seasonNumber?: number | null): SeriesMetadata {
    // Add season number to title if we searched for a specific season
    let title = anime.title || anime.title_english || anime.title_japanese || '';
    if (seasonNumber) {
      title = `${title} (Season ${seasonNumber})`;
    }

    return {
      seriesId: `mal_${anime.mal_id}${seasonNumber ? `_s${String(seasonNumber).padStart(2, '0')}` : ''}`,
      title,
      titleEnglish: anime.title_english,
      titleJapanese: anime.title_japanese,
      description: anime.synopsis || anime.background || '',
      genres: anime.genres?.map(g => g.name) || [],
      poster: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
      banner: null,
      episodes,
      totalEpisodes: anime.episodes,
      status: anime.status,
      format: anime.type,
      averageScore: anime.score,
      studios: anime.studios?.map(s => s.name) || [],
      startDate: anime.aired?.from ? new Date(anime.aired.from).toISOString().split('T')[0] : null,
      endDate: anime.aired?.to ? new Date(anime.aired.to).toISOString().split('T')[0] : null,
      malId: anime.mal_id,
    };
  },
};

export default malHandler;
