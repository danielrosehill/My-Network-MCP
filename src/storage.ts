import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { NetworkMap, NetworkResource } from './types.js';

const DEFAULT_CONFIG_DIR = join(homedir(), '.config', 'my-network-mcp');
const DEFAULT_MAP_FILE = join(DEFAULT_CONFIG_DIR, 'network-map.json');

/**
 * Storage manager for network map
 */
export class NetworkMapStorage {
  private mapPath: string;

  constructor(mapPath?: string) {
    this.mapPath = mapPath || process.env.NETWORK_MAP_PATH || DEFAULT_MAP_FILE;
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    const dir = dirname(this.mapPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Load network map from disk
   */
  async load(): Promise<NetworkMap> {
    await this.ensureConfigDir();

    if (!existsSync(this.mapPath)) {
      // Return empty map if file doesn't exist
      return this.createEmptyMap();
    }

    try {
      const data = await readFile(this.mapPath, 'utf-8');
      return JSON.parse(data) as NetworkMap;
    } catch (error) {
      console.error('Error loading network map:', error);
      return this.createEmptyMap();
    }
  }

  /**
   * Save network map to disk
   */
  async save(map: NetworkMap): Promise<void> {
    await this.ensureConfigDir();

    // Update metadata
    map.metadata = map.metadata || {};
    map.metadata.lastModified = new Date().toISOString();
    map.metadata.version = map.metadata.version || '1.0.0';

    const data = JSON.stringify(map, null, 2);
    await writeFile(this.mapPath, data, 'utf-8');
  }

  /**
   * Create an empty network map
   */
  private createEmptyMap(): NetworkMap {
    return {
      resources: [],
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Get the path to the network map file
   */
  getMapPath(): string {
    return this.mapPath;
  }
}
