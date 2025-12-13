import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';

export interface AppConfig {
  folderSources: string[];
  lastScanned: string | null;
  version: number;
}

const DEFAULT_CONFIG: AppConfig = {
  folderSources: [],
  lastScanned: null,
  version: 1,
};

function getConfigPath(): string {
  const userDataPath = app.getPath('userData');
  return join(userDataPath, 'config.json');
}

async function ensureDataDirectory(): Promise<void> {
  const userDataPath = app.getPath('userData');
  try {
    await mkdir(userDataPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

const configHandler = {
  async loadConfig(): Promise<AppConfig> {
    try {
      await ensureDataDirectory();
      const configPath = getConfigPath();
      const data = await readFile(configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return DEFAULT_CONFIG;
      }
      console.error('Error loading config:', error);
      return DEFAULT_CONFIG;
    }
  },

  async saveConfig(config: Partial<AppConfig>): Promise<boolean> {
    try {
      await ensureDataDirectory();
      const configPath = getConfigPath();
      const existingConfig = await this.loadConfig();
      const mergedConfig = { ...existingConfig, ...config };
      await writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  },

  async addFolderSource(folderPath: string): Promise<boolean> {
    try {
      const config = await this.loadConfig();
      if (!config.folderSources.includes(folderPath)) {
        config.folderSources.push(folderPath);
        await this.saveConfig(config);
      }
      return true;
    } catch (error) {
      console.error('Error adding folder source:', error);
      throw error;
    }
  },

  async removeFolderSource(folderPath: string): Promise<boolean> {
    try {
      const config = await this.loadConfig();
      config.folderSources = config.folderSources.filter(f => f !== folderPath);
      await this.saveConfig(config);
      return true;
    } catch (error) {
      console.error('Error removing folder source:', error);
      throw error;
    }
  },

  async getFolderSources(): Promise<string[]> {
    const config = await this.loadConfig();
    return config.folderSources;
  },
};

export default configHandler;





