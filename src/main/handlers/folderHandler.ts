import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.ass', '.ssa'];

export interface VideoFile {
  filename: string;
  filePath: string;
  title: string;
  episodeNumber: number;
  seasonNumber: number | null;
  subtitlePath: string | null;
  subtitlePaths: string[];
  parentFolder: string;
}

export interface ScannedMedia {
  id: string;
  name: string;           // Name to use for metadata lookup
  type: 'series' | 'movie';
  folderPath: string;
  files: VideoFile[];
  seasonNumber: number | null;  // Season number extracted from folder name
}

function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.includes(extname(filename).toLowerCase());
}

function isSubtitleFile(filename: string): boolean {
  return SUBTITLE_EXTENSIONS.includes(extname(filename).toLowerCase());
}

function getBaseName(filename: string): string {
  return basename(filename, extname(filename));
}

function extractSeasonAndEpisode(filename: string): { season: number | null; episode: number } {
  // IMPORTANT: Work on base name WITHOUT extension to avoid ".mp4" → "4" bug
  const baseName = getBaseName(filename);
  
  // First, try to extract season and episode from S01E01 format
  const seasonEpisodeMatch = baseName.match(/\bS(\d+)E(\d+)\b/i);
  if (seasonEpisodeMatch) {
    return {
      season: parseInt(seasonEpisodeMatch[1], 10),
      episode: parseInt(seasonEpisodeMatch[2], 10),
    };
  }
  
  // Try to extract season from folder name patterns (Season 1, S01, etc.)
  // This will be handled separately when processing folders
  
  // Try various patterns to extract episode number
  const patterns = [
    /Episode\s*(\d+)/i,           // "Episode 10" or "Episode10"
    /Ep\.?\s*(\d+)/i,             // "Ep 10" or "Ep.10"
    /E(\d{2,})/i,                 // "E10" (at least 2 digits)
    /\s-\s*(\d+)(?:\s|$)/,        // " - 10 " or " - 10" at end
    /\[(\d+)\]/,                  // "[10]"
    /\s(\d{1,3})(?:\s|$)/,        // " 10 " or " 10" at end (1-3 digit episode)
  ];

  for (const pattern of patterns) {
    const match = baseName.match(pattern);
    if (match) {
      return {
        season: null,
        episode: parseInt(match[1], 10),
      };
    }
  }

  // Fallback: find numbers in the base name (not extension!)
  const numbers = baseName.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    // Filter out year-like numbers (1900-2099)
    const nonYearNumbers = numbers.filter(n => {
      const num = parseInt(n, 10);
      return num < 1900 || num > 2099;
    });
    
    if (nonYearNumbers.length > 0) {
      // Return the last non-year number
      return {
        season: null,
        episode: parseInt(nonYearNumbers[nonYearNumbers.length - 1], 10),
      };
    }
  }

  return { season: null, episode: 1 };
}

function extractSeasonNumber(folderName: string): number | null {
  // Try various patterns to extract season number from folder name
  const patterns = [
    /Season\s*(\d+)/i,           // "Season 1" or "Season1"
    /\bS(\d+)\b/i,               // "S01" or "S1"
    /Season\s*(\d+)/i,           // "Season 1"
  ];

  for (const pattern of patterns) {
    const match = folderName.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

function cleanSeriesName(folderName: string): string {
  // Remove common suffixes and clean up the name for search
  // BUT keep season info for now - we'll extract it separately
  return folderName
    .replace(/\s*\(.*?\)\s*/g, '')     // Remove (2020), (TV), etc
    .replace(/\s*\[.*?\]\s*/g, '')     // Remove [1080p], etc
    .replace(/Season\s*\d+/i, '')      // Remove Season 1, etc (for search name only)
    .replace(/S\d+$/i, '')             // Remove S01 at end (for search name only)
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();
}

function cleanMovieTitle(filename: string): string {
  // Clean movie filename for metadata search
  const baseName = getBaseName(filename);
  return baseName
    .replace(/\s*\(.*?\)\s*/g, '')     // Remove (2020), etc
    .replace(/\s*\[.*?\]\s*/g, '')     // Remove [1080p], etc
    .replace(/\.\d{4}\./g, ' ')        // Remove .2018.
    .replace(/\./g, ' ')               // Replace dots with spaces
    .replace(/_/g, ' ')                // Replace underscores with spaces
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();
}

async function scanFolderForVideos(folderPath: string, folderSeason: number | null = null): Promise<{ videos: VideoFile[], subtitles: Map<string, string[]> }> {
  const videos: VideoFile[] = [];
  const subtitles = new Map<string, string[]>();
  const folderName = basename(folderPath);
  
  // Extract season from folder name if not provided
  const seasonFromFolder = folderSeason ?? extractSeasonNumber(folderName);

  try {
    const entries = await readdir(folderPath);

    for (const entry of entries) {
      const fullPath = join(folderPath, entry);
      
      try {
        const stats = await stat(fullPath);

        if (stats.isFile()) {
          if (isVideoFile(entry)) {
            const { season, episode } = extractSeasonAndEpisode(entry);
            // Use season from filename if available, otherwise from folder
            const finalSeason = season ?? seasonFromFolder;
            
            videos.push({
              filename: entry,
              filePath: fullPath,
              title: getBaseName(entry),
              episodeNumber: episode,
              seasonNumber: finalSeason,
              subtitlePath: null,
              subtitlePaths: [],
              parentFolder: folderName,
            });
          } else if (isSubtitleFile(entry)) {
            const baseName = getBaseName(entry);
            const existing = subtitles.get(baseName) || [];
            existing.push(fullPath);
            subtitles.set(baseName, existing);
          }
        }
      } catch (err) {
        // Skip files we can't stat
        console.warn(`Could not stat: ${fullPath}`);
      }
    }

    // Match subtitles to videos
    for (const video of videos) {
      const videoBase = getBaseName(video.filename);
      const matchingSubs = subtitles.get(videoBase) || [];
      if (matchingSubs.length > 0) {
        video.subtitlePath = matchingSubs[0];
        video.subtitlePaths = matchingSubs;
      }
    }
  } catch (error) {
    console.error(`Error scanning folder ${folderPath}:`, error);
  }

  return { videos, subtitles };
}

async function scanDirectory(rootPath: string): Promise<ScannedMedia[]> {
  const results: ScannedMedia[] = [];

  console.log(`\n=== Scanning: ${rootPath} ===`);

  try {
    const entries = await readdir(rootPath);
    
    for (const entry of entries) {
      const entryPath = join(rootPath, entry);
      
      try {
        const stats = await stat(entryPath);

        if (stats.isDirectory()) {
          // This is a subfolder - could be a category (Movies, Series) or a series folder
          const { videos: subVideos } = await scanFolderForVideos(entryPath);
          
          // Check for nested subfolders (like Series/ShowName/)
          const subEntries = await readdir(entryPath);
          const subDirs: string[] = [];
          
          for (const subEntry of subEntries) {
            const subPath = join(entryPath, subEntry);
            try {
              const subStats = await stat(subPath);
              if (subStats.isDirectory()) {
                subDirs.push(subEntry);
              }
            } catch {
              // Skip
            }
          }

          if (subDirs.length > 0 && subVideos.length === 0) {
            // This is a CATEGORY folder (like "Series") containing series subfolders
            console.log(`  📁 Category folder: ${entry}`);
            
            for (const subDir of subDirs) {
              const seriesPath = join(entryPath, subDir);
              const seasonFromFolder = extractSeasonNumber(subDir);
              const { videos } = await scanFolderForVideos(seriesPath, seasonFromFolder);
              
              if (videos.length > 0) {
                const seriesName = cleanSeriesName(entry);
                const seriesSeasonName = seriesName + (seasonFromFolder ? ` Season ${seasonFromFolder}` : '');
                // Include season in seriesId to distinguish seasons
                const baseId = subDir.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const seriesId = seasonFromFolder 
                  ? `${baseId}_s${seasonFromFolder.toString().padStart(2, '0')}`
                  : baseId;
                
                console.log(`    📺 Series: ${subDir} (${videos.length} episodes${seasonFromFolder ? `, Season ${seasonFromFolder}` : ''}) → search: "${seriesSeasonName}"`);
                
                results.push({
                  id: seriesId,
                  name: seriesName,
                  type: 'series',
                  folderPath: seriesPath,
                  files: videos.sort((a, b) => {
                    // Sort by season first, then episode
                    const seasonA = a.seasonNumber ?? 0;
                    const seasonB = b.seasonNumber ?? 0;
                    if (seasonA !== seasonB) return seasonA - seasonB;
                    return a.episodeNumber - b.episodeNumber;
                  }),
                  seasonNumber: seasonFromFolder,
                });
              }
            }
            
            // Also check for loose video files in category (like Movies/movie.mp4)
            if (subVideos.length > 0) {
              console.log(`    🎬 Loose videos in ${entry}: ${subVideos.length}`);
              
              for (const video of subVideos) {
                const movieTitle = cleanMovieTitle(video.filename);
                const movieId = movieTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                
                console.log(`      🎬 Movie: ${video.filename} → search: "${movieTitle}"`);
                
                results.push({
                  id: `movie_${movieId}`,
                  name: movieTitle,
                  type: 'movie',
                  folderPath: entryPath,
                  files: [video],
                  seasonNumber: null,
                });
              }
            }
          } else if (subVideos.length > 0) {
            // This folder directly contains videos - treat as series (folder name is series name)
            // Don't assume single video = movie - user may just have 1 episode downloaded
            const seriesName = cleanSeriesName(entry);
            const seasonFromFolder = extractSeasonNumber(entry);
            const baseId = entry.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const seriesId = seasonFromFolder 
              ? `${baseId}_s${seasonFromFolder.toString().padStart(2, '0')}`
              : baseId;
            
            console.log(`  📺 Series: ${entry} (${subVideos.length} episode${subVideos.length > 1 ? 's' : ''}${seasonFromFolder ? `, Season ${seasonFromFolder}` : ''}) → search: "${seriesName}"`);
            
            results.push({
              id: seriesId,
              name: seriesName,
              type: 'series',
              folderPath: entryPath,
              files: subVideos.sort((a, b) => {
                // Sort by season first, then episode
                const seasonA = a.seasonNumber ?? 0;
                const seasonB = b.seasonNumber ?? 0;
                if (seasonA !== seasonB) return seasonA - seasonB;
                return a.episodeNumber - b.episodeNumber;
              }),
              seasonNumber: seasonFromFolder,
            });
          }
        } else if (stats.isFile() && isVideoFile(entry)) {
          // Video file directly in root - treat as standalone movie
          const movieTitle = cleanMovieTitle(entry);
          const movieId = movieTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          
          console.log(`  🎬 Movie (root): ${entry} → search: "${movieTitle}"`);
          
          const { episode: movieEpisode } = extractSeasonAndEpisode(entry);
          results.push({
            id: `movie_${movieId}`,
            name: movieTitle,
            type: 'movie',
            folderPath: rootPath,
            files: [{
              filename: entry,
              filePath: entryPath,
              title: getBaseName(entry),
              episodeNumber: movieEpisode,
              seasonNumber: null,
              subtitlePath: null,
              subtitlePaths: [],
              parentFolder: basename(rootPath),
            }],
            seasonNumber: null,
          });
        }
      } catch (err) {
        console.warn(`Could not process ${entryPath}:`, err);
      }
    }
  } catch (error) {
    console.error(`Error scanning root directory ${rootPath}:`, error);
    throw error;
  }

  console.log(`=== Found ${results.length} media items ===\n`);
  return results;
}

const folderHandler = {
  async scanFolder(folderPath: string): Promise<ScannedMedia[]> {
    if (!folderPath) {
      throw new Error('Folder path is required');
    }

    return await scanDirectory(folderPath);
  },
  
  async scanMultipleFolders(folderPaths: string[]): Promise<ScannedMedia[]> {
    const allResults: ScannedMedia[] = [];
    
    for (const folderPath of folderPaths) {
      try {
        const results = await scanDirectory(folderPath);
        allResults.push(...results);
      } catch (error) {
        console.error(`Error scanning ${folderPath}:`, error);
      }
    }
    
    return allResults;
  },
};

export default folderHandler;
