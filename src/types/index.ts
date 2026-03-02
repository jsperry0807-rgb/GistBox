import { type RestEndpointMethodTypes } from '@octokit/rest';

export type Gist = RestEndpointMethodTypes['gists']['list']['response']['data'][0];
export type GistDetail = RestEndpointMethodTypes['gists']['get']['response']['data'];

export interface ConfigSchema {
  githubToken: string | null;
  pinnedGists: string[];
  cacheTTL: number;
}
