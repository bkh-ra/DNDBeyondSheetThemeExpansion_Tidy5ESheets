<!--
  DDB-FORK: the DDB spell "EFFECT" cell (column key `ddbSpellEffect`, ddb-next
  Wave 3). D&D Beyond shows a damage spell's dice and type there and a
  condition for the rest. dnd5e has no spell tags, so:
    1. damage / healing formulas -> the rollable formula buttons
       (DdbItemDamageFormulasColumn, reused as is);
    2. else the conditions its activities apply (status ids of the activity
       effects, labelled through CONFIG.DND5E.conditionTypes / statusEffects);
    3. else an em dash.
-->
<script lang="ts">
  import { Activities } from 'src/features/activities/activities';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { Item5e } from 'src/types/item.types';
  import DdbItemDamageFormulasColumn from './DdbItemDamageFormulasColumn.svelte';

  type Props = {
    rowDocument: Item5e;
    rowContext?: any;
  };

  let { rowDocument, rowContext }: Props = $props();

  const localize = FoundryAdapter.localize;

  let identified = $derived(rowDocument?.system?.identified !== false);

  let activities = $derived.by<any[]>(() => {
    void rowContext;
    return identified && rowDocument?.system?.activities
      ? (Activities.getVisibleActivities(
          rowDocument,
          rowDocument.system.activities,
        ) ?? [])
      : [];
  });

  let hasFormulas = $derived(
    activities.some(
      (a) =>
        typeof a?.rollDamage === 'function' && !!a.labels?.damage?.length,
    ),
  );

  function statusLabel(id: string): string {
    const condition = (CONFIG.DND5E.conditionTypes as Record<string, any>)[id];
    const status = (CONFIG.statusEffects as any[]).find((s) => s.id === id);
    return localize(condition?.label ?? status?.name ?? status?.label ?? id);
  }

  let conditions = $derived.by<string[]>(() => {
    if (hasFormulas) {
      return [];
    }

    const ids = new Set<string>();
    for (const activity of activities) {
      for (const entry of activity.effects ?? []) {
        for (const id of entry?.effect?.statuses ?? []) {
          ids.add(id);
        }
      }
    }

    return [...ids].map(statusLabel);
  });
</script>

{#if hasFormulas}
  <DdbItemDamageFormulasColumn {rowDocument} {rowContext} maxShown={1} />
{:else if conditions.length}
  <span class="ddb-spell-effect truncate" data-tooltip={conditions.join(', ')}
    >{conditions[0]}{#if conditions.length > 1}<span class="more"
        >&nbsp;+{conditions.length - 1}</span
      >{/if}</span
  >
{:else}
  <span class="color-text-disabled"
    >{identified ? '—' : localize('TIDY5E.Table.UnidentifiedPlaceholder')}</span
  >
{/if}
