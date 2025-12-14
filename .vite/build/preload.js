"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Config
  getFolderSources: () => electron.ipcRenderer.invoke("get-folder-sources"),
  addFolderSource: (folderPath) => electron.ipcRenderer.invoke("add-folder-source", folderPath),
  removeFolderSource: (folderPath) => electron.ipcRenderer.invoke("remove-folder-source", folderPath),
  // Folder scanning
  selectFolder: () => electron.ipcRenderer.invoke("select-folder"),
  scanFolder: (folderPath) => electron.ipcRenderer.invoke("scan-folder", folderPath),
  scanAllFolders: () => electron.ipcRenderer.invoke("scan-all-folders"),
  scanAndFetchMetadata: (folderPath) => electron.ipcRenderer.invoke("scan-and-fetch-metadata", folderPath),
  // Metadata
  fetchMetadata: (seriesName) => electron.ipcRenderer.invoke("fetch-metadata", seriesName),
  fetchAnilistMetadata: (seriesName) => electron.ipcRenderer.invoke("fetch-anilist-metadata", seriesName),
  fetchMALMetadata: (seriesName) => electron.ipcRenderer.invoke("fetch-mal-metadata", seriesName),
  fetchTVDBMetadata: (seriesName) => electron.ipcRenderer.invoke("fetch-tvdb-metadata", seriesName),
  saveMetadata: (metadata) => electron.ipcRenderer.invoke("save-metadata", metadata),
  loadMetadata: () => electron.ipcRenderer.invoke("load-metadata"),
  clearMetadata: () => electron.ipcRenderer.invoke("clear-metadata"),
  deleteSeries: (seriesId) => electron.ipcRenderer.invoke("delete-series", seriesId),
  getSeriesEpisodes: (seriesId) => electron.ipcRenderer.invoke("get-series-episodes", seriesId),
  // Image cache
  getImageCacheStats: () => electron.ipcRenderer.invoke("get-image-cache-stats"),
  clearImageCache: () => electron.ipcRenderer.invoke("clear-image-cache"),
  getImageCachePath: () => electron.ipcRenderer.invoke("get-image-cache-path")
});
