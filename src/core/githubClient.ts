import { Octokit } from '@octokit/rest';
import config from './configManager.js';
import type { Gist, GistDetail } from '../types/index.js';

export class GitHubClient {
  private octokit: Octokit;

  constructor() {
    const token = config.get('githubToken');
    if (!token) {
      throw new Error('GitHub token is not set in the configuration.');
    }
    this.octokit = new Octokit({ auth: token });
  }

  async listGists(): Promise<Gist[]> {
    const response = await this.octokit.rest.gists.list({
      per_page: 100,
    });
    return response.data;
  }

  async getGist(gistId: string): Promise<GistDetail> {
    const response = await this.octokit.rest.gists.get({
      gist_id: gistId,
    });
    return response.data;
  }
}
