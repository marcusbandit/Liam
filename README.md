# Anime Media Player

An Electron application for watching downloaded anime with metadata integration from AniList, MyAnimeList, and TVDB.

## Features

- **Folder Management**: Select and scan folders containing anime series (each subfolder is a series)
- **Metadata Integration**: Automatically fetch metadata from AniList (priority), MyAnimeList, and TVDB
- **Genre Organization**: Home page displays shows organized by genre
- **Series Detail Pages**: View all episodes with metadata for each series
- **Video Player**: Built-in player using Vidstack with subtitle support
- **Local Metadata Storage**: Metadata is fetched once and stored locally

## Installation

```bash
npm install
```

## Development

To run in development mode:

1. Start the Vite dev server:
```bash
npm run dev
```

2. In another terminal, start Electron:
```bash
npm start
```

Or use the combined command (if configured):
```bash
npm run dev:electron
```

## Building

To package the application:

```bash
npm run package
```

To create distributables:

```bash
npm run make
```

## Usage

1. **Select Folder**: Go to Settings and select the folder containing your anime (each subfolder should be a series)
2. **Scan Folder**: Click "Scan Folder" to discover all series and fetch metadata
3. **Browse**: View shows organized by genre on the home page
4. **Watch**: Click on a series to see episodes, then click an episode to play it

## Folder Structure

Your anime folder should be structured like this:

```
/anime-folder/
  ├── Series Name 1/
  │   ├── Episode 01.mkv
  │   ├── Episode 01.srt
  │   ├── Episode 02.mkv
  │   └── Episode 02.srt
  ├── Series Name 2/
  │   └── ...
  └── ...
```

## Metadata Sources

The app tries to fetch metadata in this order:
1. AniList (GraphQL API - no key required)
2. MyAnimeList (Jikan API - no key required)
3. TVDB (requires API key - configure in settings if needed)

## Technologies

- Electron
- React
- Vite
- Vidstack (media player)
- AniList GraphQL API
- MyAnimeList Jikan API
- TVDB API

## License

MIT
