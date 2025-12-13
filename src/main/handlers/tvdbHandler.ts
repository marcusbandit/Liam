import axios from 'axios';

const TVDB_API_URL = 'https://api4.thetvdb.com/v4';

let tvdbApiKey: string | null = null;
let tvdbToken: string | null = null;

interface TVDBSearchResult {
  tvdb_id?: number;
  id?: number;
  name: string;
  overview?: string;
  image?: string;
  type?: string;
}

interface TVDBSeriesInfo {
  name: string;
  overview?: string;
  genres?: { name: string }[];
  image?: string;
  banner?: string;
  episodes?: unknown[];
  status?: { name: string };
  score?: number;
  firstAired?: string;
  lastAired?: string;
}

interface TVDBEpisode {
  number?: number;
  name?: string;
  overview?: string;
  aired?: string;
  image?: string;
}

export interface SeriesMetadata {
  seriesId: string;
  title: string;
  description: string;
  genres: string[];
  poster: string | null;
  banner: string | null;
  episodes: EpisodeMetadata[];
  totalEpisodes: number;
  status: string | null;
  format: null;
  averageScore: number | null;
  studios: string[];
  startDate: string | null;
  endDate: string | null;
  tvdbId: number;
}

export interface EpisodeMetadata {
  episodeNumber: number | null;
  seasonNumber?: number | null;
  title: string;
  description: string | null;
  airDate: string | null;
  thumbnail: string | null;
}

const tvdbHandler = {
  setApiKey(apiKey: string): void {
    tvdbApiKey = apiKey;
  },

  async authenticate(): Promise<string> {
    if (!tvdbApiKey) {
      throw new Error('TVDB API key not set');
    }

    try {
      const response = await axios.post<{ data: { token: string } }>(
        `${TVDB_API_URL}/login`,
        { apikey: tvdbApiKey },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data?.data?.token) {
        tvdbToken = response.data.data.token;
        return tvdbToken;
      }
      throw new Error('Failed to authenticate with TVDB');
    } catch (error) {
      console.error('TVDB authentication error:', error);
      throw error;
    }
  },

  async getAuthHeaders(): Promise<Record<string, string>> {
    if (!tvdbToken) {
      await this.authenticate();
    }
    return {
      'Authorization': `Bearer ${tvdbToken}`,
      'Content-Type': 'application/json',
    };
  },

  async searchAnime(searchTerm: string): Promise<TVDBSearchResult | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<{ data: TVDBSearchResult[] }>(
        `${TVDB_API_URL}/search`,
        {
          params: { query: searchTerm, type: 'series' },
          headers,
        }
      );

      if (response.data?.data?.[0]) {
        const animeResult = response.data.data.find(
          item => item.type === 'series' && (item.overview || item.name.toLowerCase().includes('anime'))
        ) || response.data.data[0];
        return animeResult;
      }
      return null;
    } catch (error) {
      console.error('Error searching TVDB:', error);
      throw error;
    }
  },

  async getSeriesInfo(seriesId: number): Promise<TVDBSeriesInfo | null> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<{ data: TVDBSeriesInfo }>(
        `${TVDB_API_URL}/series/${seriesId}/extended`,
        { headers }
      );

      return response.data?.data || null;
    } catch (error) {
      console.error('Error fetching TVDB series info:', error);
      throw error;
    }
  },

  async getEpisodes(seriesId: number, seasonNumber?: number | null): Promise<EpisodeMetadata[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get<{ data: { episodes: TVDBEpisode[] } }>(
        `${TVDB_API_URL}/series/${seriesId}/episodes/default`,
        { headers }
      );

      if (response.data?.data?.episodes) {
        return response.data.data.episodes.map((ep) => ({
          episodeNumber: ep.number || null,
          seasonNumber: seasonNumber ?? null,
          title: ep.name || `Episode ${ep.number || ''}`,
          description: ep.overview || null,
          airDate: ep.aired || null,
          thumbnail: ep.image || null,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching TVDB episodes:', error);
      return [];
    }
  },

  async searchAndFetchMetadata(seriesName: string, seasonNumber?: number | null): Promise<SeriesMetadata | null> {
    try {
      if (!tvdbApiKey) {
        return null;
      }

      // Include season in search query if available
      const searchQuery = seasonNumber 
        ? `${seriesName} Season ${seasonNumber}`
        : seriesName;

      const searchResult = await this.searchAnime(searchQuery);
      
      if (!searchResult) {
        // If season-specific search failed, try without season
        if (seasonNumber) {
          const searchResultWithoutSeason = await this.searchAnime(seriesName);
          if (searchResultWithoutSeason) {
            const seriesId = searchResultWithoutSeason.tvdb_id || searchResultWithoutSeason.id;
            if (seriesId) {
              const seriesInfo = await this.getSeriesInfo(seriesId);
              const episodes = await this.getEpisodes(seriesId, seasonNumber);
              return this.formatMetadata(searchResultWithoutSeason, seriesInfo, episodes, seriesId, seasonNumber);
            }
          }
        }
        return null;
      }

      const seriesId = searchResult.tvdb_id || searchResult.id;
      if (!seriesId) {
        return null;
      }

      const seriesInfo = await this.getSeriesInfo(seriesId);
      const episodes = await this.getEpisodes(seriesId, seasonNumber);

      return this.formatMetadata(searchResult, seriesInfo, episodes, seriesId, seasonNumber);
    } catch (error) {
      console.error('Error fetching TVDB metadata:', error);
      return null;
    }
  },

  formatMetadata(searchResult: TVDBSearchResult, seriesInfo: TVDBSeriesInfo | null, episodes: EpisodeMetadata[], seriesId: number, seasonNumber?: number | null): SeriesMetadata {
    // Add season number to title if we searched for a specific season
    let title = seriesInfo?.name || searchResult.name;
    if (seasonNumber) {
      title = `${title} (Season ${seasonNumber})`;
    }

    return {
      seriesId: `tvdb_${seriesId}${seasonNumber ? `_s${seasonNumber.toString().padStart(2, '0')}` : ''}`,
      title,
      description: seriesInfo?.overview || searchResult.overview || '',
      genres: seriesInfo?.genres?.map(g => g.name) || [],
      poster: seriesInfo?.image || searchResult.image || null,
      banner: seriesInfo?.banner || null,
      episodes,
      totalEpisodes: seriesInfo?.episodes?.length || episodes.length,
      status: seriesInfo?.status?.name || null,
      format: null,
      averageScore: seriesInfo?.score || null,
      studios: [],
      startDate: seriesInfo?.firstAired || null,
      endDate: seriesInfo?.lastAired || null,
      tvdbId: seriesId,
    };
  },
};

export default tvdbHandler;
