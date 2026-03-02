import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import config from './configManager.js';

const CACHE_DIR = path.join(os.homedir(), '.mycli', 'cache');

interface CacheMeta {
  gistId: string;
  filename: string;
  cachedAt: number;
}

export class CacheManager {
  private getFileKey(gistId: string, filename: string): string {
    return crypto.createHash('md5').update(`${gistId}-${filename}`).digest('hex');
  }

  async get(gistId: string, filename: string): Promise<string | null> {
    const key = this.getFileKey(gistId, filename);
    const ext = path.extname(filename); // get the original extension
    const filePath = path.join(CACHE_DIR, key + ext); // cache file with extension
    const metaPath = filePath + '.meta';

    try {
      const meta = (await fs.readJSON(metaPath)) as CacheMeta;
      const ttl = config.get('cacheTTL');
      if (Date.now() - meta.cachedAt < ttl) {
        return filePath; // still valid
      }
      // expired
      await fs.remove(filePath);
      await fs.remove(metaPath);
      return null;
    } catch {
      return null;
    }
  }

  async set(gistId: string, originalFilename: string, content: string): Promise<string> {
    await fs.ensureDir(CACHE_DIR);
    const ext = path.extname(originalFilename);
    const key = this.getFileKey(gistId, originalFilename);
    const filePath = path.join(CACHE_DIR, key + ext); // save with extension
    const metaPath = filePath + '.meta';

    await fs.writeFile(filePath, content);
    await fs.writeJSON(metaPath, {
      gistId,
      filename: originalFilename,
      cachedAt: Date.now(),
    });
    return filePath;
  }

  async clear(): Promise<void> {
    await fs.remove(CACHE_DIR);
    await fs.ensureDir(CACHE_DIR);
  }
}
