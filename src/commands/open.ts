import chalk from 'chalk';
import ora from 'ora';
import { GitHubClient } from '../core/githubClient.js';
import { CacheManager } from '../core/cacheManager.js';
import { runScript } from '../core/scriptRunner.js';
import config from '../core/configManager.js';
import { selectGist, selectFile } from '../ui/prompts.js';

export async function openCommand() {
  try {
    const github = new GitHubClient();
    const cache = new CacheManager();

    const spinner = ora('Fetching your gists...').start();
    const gists = await github.listGists();
    spinner.succeed(`Found ${gists.length} gists`);

    const pinnedIds = config.get('pinnedGists');
    const gistId = await selectGist(gists, pinnedIds);

    const gistDetail = await github.getGist(gistId);

    // Safely handle possible undefined files object
    const filesMap = gistDetail.files ?? {};
    const files = Object.values(filesMap).filter(
      (f): f is NonNullable<typeof f> & { filename: string } => f != null && f.filename != null
    );

    if (files.length === 0) {
      console.log(chalk.yellow('No valid files found in this gist.'));
      return;
    }

    const selectedFilename = await selectFile(files.map((f) => ({ filename: f.filename })));
    const selectedFile = files.find((f) => f.filename === selectedFilename);
    if (!selectedFile) {
      throw new Error(`Selected file "${selectedFilename}" not found in gist.`);
    }

    // Get content (if truncated, fetch from raw_url)
    let content = selectedFile.content;
    if (selectedFile.truncated && selectedFile.raw_url) {
      const response = await fetch(selectedFile.raw_url);
      content = await response.text();
    }

    let scriptPath = await cache.get(gistId, selectedFilename);
    if (!scriptPath) {
      scriptPath = await cache.set(gistId, selectedFilename, content || '');
    }

    console.log(chalk.green(`\n▶️ Running ${selectedFilename}...\n`));
    await runScript(scriptPath, process.argv.slice(3));
  } catch (error: unknown) {
    console.error(chalk.red('Error:'), (error as Error).message);
  }
}
