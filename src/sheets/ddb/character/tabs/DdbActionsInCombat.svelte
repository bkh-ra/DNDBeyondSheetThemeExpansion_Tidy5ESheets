<!--
  DDB-FORK: D&D Beyond's "Actions in Combat" line under the Actions list
  (ddb-next Wave 3): the generic combat actions as rule links.

  The links are dnd5e's own rule references, `CONFIG.DND5E.rules[key]`, written
  as `@UUID[<page uuid>]` and enriched by Foundry, so the label is the rule
  page's (translatable) name and a click opens the page / hover shows dnd5e's
  rich tooltip. Keys missing from this dnd5e version are skipped, keys that
  point at the same page (`useanobject` and `utilize`, `castaspell` and
  `magic` on the 2024 rules) appear once, and the list is sorted by name as on
  D&D Beyond. Like D&D Beyond, the box shows under ALL and under ACTION only.

  DOM contract: section.ddb-actions-in-combat[data-tidy-sheet-part=
  "ddb-actions-in-combat"] > ul > li[data-rule-key] > a.content-link
-->
<script lang="ts">
  import { useTabStripHeight } from './tab-strip.svelte';
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { error } from 'src/utils/logging';

  interface Props {
    tabId: string;
  }

  let { tabId }: Props = $props();

  const localize = FoundryAdapter.localize;

  /**
   * The curated set, in CONFIG.DND5E.rules key spelling (`useanobject`,
   * `grappling`, `shoving` are this dnd5e version's keys for Use an Object,
   * Grapple and Shove).
   */
  const RULE_KEYS = [
    'attack',
    'dash',
    'disengage',
    'dodge',
    'help',
    'hide',
    'ready',
    'search',
    'useanobject',
    'grappling',
    'shoving',
    'influence',
    'magic',
    'study',
    'utilize',
  ];

  type RuleLink = { key: string; uuid: string; html: string; name: string };

  let context = $derived(getCharacterSheetQuadroneContext());

  let links = $state<RuleLink[]>([]);

  async function loadLinks(): Promise<RuleLink[]> {
    const rules = (CONFIG.DND5E.rules ?? {}) as Record<string, string>;
    const seen = new Set<string>();
    const entries: { key: string; uuid: string }[] = [];

    for (const key of RULE_KEYS) {
      const uuid = rules[key];
      if (!uuid || seen.has(uuid)) {
        continue;
      }
      seen.add(uuid);
      entries.push({ key, uuid });
    }

    const enriched = await Promise.all(
      entries.map(async ({ key, uuid }) => {
        try {
          const html = await FoundryAdapter.enrichHtml(`@UUID[${uuid}]`);
          const name = html.replace(/<[^>]*>/g, '').trim();
          return { key, uuid, html, name };
        } catch (e) {
          error('Could not enrich a combat action rule link', false, {
            key,
            uuid,
            error: e,
          });
          return null;
        }
      }),
    );

    return enriched
      .filter((link): link is RuleLink => !!link && link.name !== '')
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
  }

  $effect(() => {
    let cancelled = false;

    loadLinks().then((result) => {
      if (!cancelled) {
        links = result;
      }
    });

    return () => {
      cancelled = true;
    };
  });

  /**
   * D&D Beyond lists these under ALL and ACTION only; the user asked for the
   * box to stay visible under every pill (2026-10-05), pinned at the top of
   * the list like the other tabs' header strips. The wrapper is the pinned
   * strip slot (tab-strips.css section 0) and publishes its height for the
   * pills under it.
   */
  const stripHeight = useTabStripHeight();
</script>

{#if links.length}
  <div class="ddb-tab-strip ddb-actions-in-combat-strip" {@attach stripHeight}>
  <section
    class="ddb-actions-in-combat"
    data-tidy-sheet-part="ddb-actions-in-combat"
    aria-label={localize('TIDY5E.DdbLayout.Actions.InCombat')}
  >
    <h4 class="ddb-actions-in-combat-title">
      {localize('TIDY5E.DdbLayout.Actions.InCombat')}
    </h4>
    <ul class="ddb-actions-in-combat-list">
      {#each links as link (link.uuid)}
        <li data-rule-key={link.key}>{@html link.html}</li>
      {/each}
    </ul>
  </section>
  </div>
{/if}
