<!--
  DDB-FORK: the DDB spell "DURATION" cell (column key `ddbSpellDuration`,
  ddb-next Wave 3). D&D Beyond prints a spell's duration in its notes with a
  boxed C (concentration) / R (ritual) tag; this is that, from dnd5e's own
  labels (`item.labels.duration`, the `concentration` / `ritual` properties
  and their CONFIG abbreviations), so it follows the system's localization.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { Item5e } from 'src/types/item.types';

  type Props = {
    rowDocument: Item5e;
    rowContext?: any;
  };

  let { rowDocument, rowContext }: Props = $props();

  const localize = FoundryAdapter.localize;

  function propertyAbbreviation(key: string, fallback: string) {
    const abbreviation = (CONFIG.DND5E.itemProperties as Record<string, any>)[
      key
    ]?.abbreviation;
    return abbreviation ? localize(abbreviation) : fallback;
  }

  let duration = $derived.by(() => {
    void rowContext;
    return rowDocument?.labels?.duration ?? '';
  });

  let concentration = $derived.by(() => {
    void rowContext;
    return rowDocument?.system?.properties?.has?.('concentration') === true;
  });

  let ritual = $derived.by(() => {
    void rowContext;
    return rowDocument?.system?.properties?.has?.('ritual') === true;
  });
</script>

{#if duration || concentration || ritual}
  <span class="ddb-spell-duration">
    {#if duration}
      <span class="duration truncate" data-tooltip={duration}>{duration}</span>
    {/if}
    {#if concentration}
      <span
        class="ddb-spell-tag concentration"
        data-tooltip="TIDY5E.DdbLayout.Spells.Concentration"
        aria-label={localize('TIDY5E.DdbLayout.Spells.Concentration')}
        >{propertyAbbreviation('concentration', 'C')}</span
      >
    {/if}
    {#if ritual}
      <span
        class="ddb-spell-tag ritual"
        data-tooltip="TIDY5E.DdbLayout.Spells.Ritual"
        aria-label={localize('TIDY5E.DdbLayout.Spells.Ritual')}
        >{propertyAbbreviation('ritual', 'R')}</span
      >
    {/if}
  </span>
{:else}
  <span class="color-text-disabled">—</span>
{/if}
