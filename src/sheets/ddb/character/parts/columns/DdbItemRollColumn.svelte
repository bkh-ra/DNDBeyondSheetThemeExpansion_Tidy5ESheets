<!--
  DDB-FORK: the DDB "HIT / DC" cell (column key `ddbRoll`, ddb-next Wave 3).

  Same data as quadrone's ItemRollColumn (`rowContext.toHit`, else the first
  save activity's ability + DC), but the to-hit is a BUTTON that rolls the
  attack, like D&D Beyond's bordered dice box:
    button.ddb-roll-button.ddb-roll-attack[data-action="ddbRollAttack"]
      [data-activity-id]  -> Tidy5eCharacterSheetDdb.#ddbRollAttack
  The activity is the item's first usable attack activity: the one dnd5e takes
  `item.labels.modifier` (and so `toHit`) from.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { Item5e } from 'src/types/item.types';
  import { isNil } from 'src/utils/data';
  import { getModifierData } from 'src/utils/formatting';

  type Props = {
    rowContext: any;
    rowDocument?: Item5e;
  };

  let { rowContext, rowDocument }: Props = $props();

  const localize = FoundryAdapter.localize;

  let identified = $derived(rowDocument?.system?.identified !== false);

  let attackActivity = $derived.by(() => {
    // Re-evaluated with every prepared context (rowContext is rebuilt per
    // render), since the item itself is not reactive.
    void rowContext;
    return rowDocument?.system?.activities?.find(
      (a: any) => a.type === 'attack' && a.canUse,
    );
  });
</script>

{#if identified && !isNil(rowContext?.toHit)}
  {const mod = $derived(getModifierData(rowContext.toHit))}
  {const label = $derived(
    `${localize('DND5E.ToHit')} ${mod.sign}${mod.value}`,
  )}
  <button
    type="button"
    class="ddb-roll-button ddb-roll-attack"
    data-action="ddbRollAttack"
    data-activity-id={attackActivity?.id}
    data-tooltip={label}
    aria-label={label}
  >
    <span class="sign">{mod.sign}</span><span class="value">{mod.value}</span>
  </button>
{:else if identified && rowContext?.save?.ability}
  <span
    class="ddb-roll-save"
    data-tooltip={rowContext.save.abilityTitle ?? rowContext.save.ability}
  >
    <span class="ability">{rowContext.save.ability}</span>
    <span class="value">{rowContext.save.dc?.value ?? '—'}</span>
  </span>
{:else}
  <span class="color-text-disabled"
    >{identified ? '—' : localize('TIDY5E.Table.UnidentifiedPlaceholder')}</span
  >
{/if}
