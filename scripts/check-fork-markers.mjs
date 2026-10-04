// Fork-marker hygiene check for the DDB 5e Sheets fork of Tidy 5e Sheets.
//
// Every edit the fork makes to an UPSTREAM file must carry a `DDB-FORK` marker
// comment, so an upstream merge (`git merge <upstream tag>`) can be reviewed by
// grepping for it (FORK_NOTES.md, "Upstream merge procedure"). This script
// takes the files changed between <base> and HEAD that already exist in <base>
// (i.e. upstream files, not the fork's own new files) and fails when one of
// them has no marker and is not allowlisted below.
//
// Usage: node scripts/check-fork-markers.mjs [--base <ref>] [--list] [--json]
//   --base <ref>  upstream ref to compare with
//                 (default: newest v13.* tag reachable from HEAD)
//   --list        print every file with its status, not just the failures
//   --json        machine-readable report on stdout (for tooling)
// Exit codes: 0 = every file marked or allowlisted, 1 = unmarked or missing
// files, 2 = usage or git error.
//
// The file set comes from the committed diff (<base>..HEAD); file contents are
// read from the working tree, so a marker counts as soon as it is saved.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = 'DDB-FORK';

// Upstream release line the fork tracks. Bump when the fork moves to a new line.
const BASE_TAG_PATTERN = 'v13.*';

// Where upstream files edited by the fork live (see the "Shared-file edits"
// table in FORK_NOTES.md).
const SCANNED_PATHS = [
  'src',
  'vite.config.ts',
  'find-preloaded-images.js',
  'public/module.json',
  'public/lang',
];

// Upstream files that may differ without a marker, and why. Patterns are
// repo-relative globs: `*` stays within one path segment, `**/` spans folders.
const ALLOWLIST = [
  {
    pattern: 'public/module.json',
    reason:
      'JSON cannot carry comments; the identity edits (id/title/version, ' +
      'tidy5e-sheet conflict, manifest/download removed) are listed in FORK_NOTES.md',
  },
  {
    pattern: 'public/lang/*.json',
    reason:
      'JSON cannot carry comments; the fork only adds keys ' +
      '(upstream keys are never changed or removed)',
  },
  {
    pattern: 'src/utils/preloaded-images.generated.ts',
    reason:
      'generated: find-preloaded-images.js rewrites the whole file on every ' +
      'dev/build run, so a marker would not survive',
  },
].map((entry) => ({ ...entry, regex: globToRegExp(entry.pattern) }));

const USAGE =
  'Usage: node scripts/check-fork-markers.mjs [--base <ref>] [--list] [--json]';

class UsageError extends Error {}

function globToRegExp(glob) {
  const source = glob
    .split(/(\*\*\/|\*\*|\*)/)
    .map((part) => {
      if (part === '**/') return '(?:.*/)?';
      if (part === '**') return '.*';
      if (part === '*') return '[^/]*';
      return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp(`^${source}$`);
}

function parseArgs(argv) {
  const options = { base: null, list: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--list') {
      options.list = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--base' || arg.startsWith('--base=')) {
      const value = arg === '--base' ? argv[++i] : arg.slice('--base='.length);
      if (!value || value.startsWith('-')) {
        throw new UsageError('--base needs a git ref, e.g. --base v13.10.5');
      }
      options.base = value;
    } else {
      throw new UsageError(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function gitLines(args, cwd) {
  // -z output: NUL-separated, never quoted.
  return git(args, cwd).split('\0').filter(Boolean);
}

function resolveBase(requested, root) {
  if (requested) {
    try {
      git(['rev-parse', '--verify', '--quiet', `${requested}^{commit}`], root);
    } catch {
      throw new UsageError(`--base ${requested} is not a known git ref`);
    }
    return requested;
  }
  try {
    return git(
      ['describe', '--tags', '--match', BASE_TAG_PATTERN, '--abbrev=0', 'HEAD'],
      root,
    ).trim();
  } catch {
    throw new UsageError(
      `no tag matching ${BASE_TAG_PATTERN} is reachable from HEAD ` +
        '(run `git fetch upstream --tags`), or pass --base <ref>',
    );
  }
}

function checkForkMarkers(base, root) {
  // --no-renames: a fork rename of an upstream file must show up as a change
  // to the upstream path, not vanish as a "new" file.
  const changed = gitLines(
    ['diff', '--name-only', '-z', '--no-renames', base, 'HEAD', '--', ...SCANNED_PATHS],
    root,
  );
  const inBase = new Set(
    gitLines(['ls-tree', '-r', '-z', '--name-only', base, '--', ...SCANNED_PATHS], root),
  );

  return changed
    .filter((file) => inBase.has(file))
    .sort()
    .map((file) => {
      const absolute = path.join(root, file);
      const content = existsSync(absolute) ? readFileSync(absolute, 'utf8') : null;
      if (content?.includes(MARKER)) {
        return { file, status: 'marked' };
      }
      const allowed = ALLOWLIST.find((entry) => entry.regex.test(file));
      if (allowed) {
        return { file, status: 'allowlisted', reason: allowed.reason };
      }
      return { file, status: content === null ? 'missing' : 'unmarked' };
    });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const root = git(['rev-parse', '--show-toplevel'], scriptDir).trim();
  const base = resolveBase(options.base, root);
  const head = git(['rev-parse', '--short', 'HEAD'], root).trim();
  const files = checkForkMarkers(base, root);

  const counts = { total: files.length, marked: 0, allowlisted: 0, unmarked: 0, missing: 0 };
  for (const { status } of files) counts[status]++;
  const failures = files.filter((f) => f.status === 'unmarked' || f.status === 'missing');
  const ok = failures.length === 0;

  if (options.json) {
    console.log(JSON.stringify({ base, head, ok, counts, files }, null, 2));
    return ok ? 0 : 1;
  }

  const label = (status) =>
    (status === 'marked' || status === 'allowlisted' ? status : status.toUpperCase()).padEnd(12);
  const shown = options.list ? files : failures;
  if (options.list) {
    console.log(`Upstream files changed by the fork (${base}..HEAD ${head}):`);
  }
  for (const { file, status, reason } of shown) {
    console.log(`  ${label(status)} ${file}${reason ? `  (${reason})` : ''}`);
  }

  console.log(
    `check-fork-markers: ${counts.total} upstream files changed since ${base}: ` +
      `${counts.marked} marked, ${counts.allowlisted} allowlisted, ` +
      `${counts.unmarked} unmarked, ${counts.missing} missing.`,
  );
  if (!ok) {
    console.log(
      `Add a "${MARKER}: <what the fork changed>" comment near the top of each ` +
        'file listed above (see FORK_NOTES.md), or allowlist it in ' +
        'scripts/check-fork-markers.mjs with a reason.',
    );
  }
  return ok ? 0 : 1;
}

try {
  process.exitCode = main();
} catch (error) {
  const detail =
    error instanceof UsageError
      ? `${error.message}\n${USAGE}`
      : error.stderr?.trim() || error.message;
  console.error(`check-fork-markers: ${detail}`);
  process.exitCode = 2;
}
