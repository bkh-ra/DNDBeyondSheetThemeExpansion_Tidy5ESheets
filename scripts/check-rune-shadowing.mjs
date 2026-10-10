// DDB-FORK: fail the build when a Svelte component declares a TOP-LEVEL binding
// whose name is a Svelte 5 rune (effect, state, derived, props, bindable,
// inspect, host) AND uses that rune in the same file.
//
// Why: Svelte 5 resolves `$name` against top-level bindings before it treats
// it as a rune. A component with a prop called `effect` compiled `$effect(fn)`
// into `store_get($$props.effect)(fn)` - a store subscription on the prop -
// which threw on first render and tripped the enclosing <svelte:boundary>
// (13.10.5-ddb.15, DdbEffectDetail.svelte; hotfixed in ddb.16). svelte-check
// did not flag it, so this guard runs ahead of vite in `npm run build`.
//
//   node scripts/check-rune-shadowing.mjs   (exit 1 on any finding)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const RUNES = ['effect', 'state', 'derived', 'props', 'bindable', 'inspect', 'host'];

function* svelteFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* svelteFiles(full);
    else if (entry.name.endsWith('.svelte')) yield full;
  }
}

/** Top-level binding names declared in an instance script (prettier-formatted: 2-space indent). */
function topLevelBindings(script) {
  const names = new Set();
  const lines = script.split(/\r?\n/);
  for (const line of lines) {
    let m;
    if ((m = /^  (?:let|const|var)\s+([A-Za-z_$][\w$]*)\b/.exec(line))) names.add(m[1]);
    if ((m = /^  (?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(line))) names.add(m[1]);
    if ((m = /^  (?:let|const)\s+\{([^}]*)\}/.exec(line))) {
      for (const part of m[1].split(',')) {
        const name = part.split(':').pop().split('=')[0].trim();
        if (name) names.add(name);
      }
    }
  }
  // Multi-line destructuring: `let {\n    a,\n    b,\n  }: Props = $props();`
  const multi = /^  (?:let|const)\s+\{\n([\s\S]*?)\n  \}/gm;
  let m;
  while ((m = multi.exec(script))) {
    for (const part of m[1].split(/,\n?/)) {
      const name = part.replace(/\/\*[\s\S]*?\*\//g, '').split(':').pop().split('=')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  return names;
}

const findings = [];

if (process.argv.includes('--dist')) {
  // Post-build net: the compiled shape of the bug is a store subscription on
  // a prop named like a rune, or a rune "called" through such a subscription.
  const DIST = path.join(ROOT, 'dist');
  for (const entry of fs.readdirSync(DIST)) {
    if (!entry.endsWith('.js')) continue;
    const code = fs.readFileSync(path.join(DIST, entry), 'utf8');
    for (const rune of RUNES) {
      const re = new RegExp(`store_get\\(\\$\\$props\\.${rune}\\b|\\$${rune}\\(\\)\\(`);
      if (re.test(code)) {
        findings.push(`dist/${entry}: compiled store subscription on a prop named "${rune}" (a component shadows the $${rune} rune)`);
      }
    }
  }
} else {
  for (const file of svelteFiles(SRC)) {
    const source = fs.readFileSync(file, 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bmodule\b)[^>]*>([\s\S]*?)<\/script>/g)].map((x) => x[1]);
    for (const script of scripts) {
      const names = topLevelBindings(script);
      for (const rune of RUNES) {
        if (!names.has(rune)) continue;
        // A rune used ONLY as the initializer of the binding that carries its
        // name is fine: `let props: Props = $props();` is how upstream
        // declares props, and Svelte resolves that call as the rune.
        const uses = (source.match(new RegExp(`\\$${rune}\\b`, 'g')) || []).length;
        const ownInit = (script.match(new RegExp(`^  (?:let|const)\\s+${rune}\\b[^=\\n]*=\\s*\\$${rune}\\(`, 'gm')) || []).length;
        if (uses - ownInit > 0) {
          findings.push(`${path.relative(ROOT, file)}: top-level binding "${rune}" shadows the $${rune} rune used in this file`);
        }
      }
    }
  }
}

if (findings.length) {
  console.error('check-rune-shadowing: FAIL');
  for (const f of findings) console.error('  ' + f);
  process.exit(1);
}
console.log('check-rune-shadowing: OK (no top-level rune-name bindings shadow a rune used in the same component)');
