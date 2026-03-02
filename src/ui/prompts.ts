import inquirer from 'inquirer';
import { type Gist } from '../types/index.js';

export async function selectGist(gists: Gist[], pinnedIds: string[]): Promise<string> {
  const pinned = gists.filter((g) => pinnedIds.includes(g.id));
  const unpinned = gists.filter((g) => !pinnedIds.includes(g.id));

  const choices = [
    ...pinned.map((g) => ({
      name: formatGistChoice(g, true),
      value: g.id,
    })),
    new inquirer.Separator(),
    ...unpinned.map((g) => ({
      name: formatGistChoice(g, false),
      value: g.id,
    })),
  ];

  const { gistId } = await inquirer.prompt([
    {
      type: 'select',
      name: 'gistId',
      message: 'Select a gist to run:',
      choices,
      pageSize: 15,
    },
  ]);
  return gistId;
}

export async function selectFile(files: Array<{ filename: string }>): Promise<string> {
  if (files.length === 0) {
    throw new Error('No files to select');
  }
  if (files.length === 1) {
    return files[0] ? files[0].filename : '';
  }
  const { filename } = await inquirer.prompt([
    {
      type: 'select',
      name: 'filename',
      message: 'Multiple files found. Choose one to run:',
      choices: files.map((f) => ({ name: f.filename, value: f.filename })),
    },
  ]);
  return filename;
}

function formatGistChoice(gist: Gist, isPinned: boolean): string {
  const pinIcon = isPinned ? '📌 ' : '';
  const desc = gist.description || '(no description)';

  // Safely handle undefined files and collect filenames
  const fileNames: string[] = [];
  if (gist.files) {
    for (const f of Object.values(gist.files)) {
      if (f?.filename) {
        fileNames.push(f.filename);
      }
    }
  }

  const fileCount = fileNames.length;
  const fileList = fileNames.join(', ').substring(0, 40);

  return `${pinIcon}${desc} (${fileCount} file${fileCount !== 1 ? 's' : ''}) – ${fileList}`;
}
