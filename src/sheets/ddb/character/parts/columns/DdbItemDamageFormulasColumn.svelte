<!--
  DDB-FORK: the DDB "DAMAGE" cell (column key `ddbFormula`, ddb-next Wave 3).

  Quadrone's ItemDamageFormulasColumn reads `item.labels.damages`, which drops
  the activity each formula belongs to, so it cannot roll. This cell walks the
  item's visible activities instead (deduplicated by label, as dnd5e's
  `Item5e#_prepareLabels` does) and renders ONE BUTTON PER FORMULA:
    button.ddb-roll-button.ddb-roll-damage[data-action="ddbRollDamage"]
      [data-activity-id] -> Tidy5eCharacterSheetDdb.#ddbRollDamage
  The first two show; a `+N` control under them (a.ddb-formula-more, like
  quadrone's `.remaining-damages-count`) opens the row summary, which lists
  them all.
-->
<script lang="ts">
  import Dnd5eIcon from 'src/components/icon/Dnd5eIcon.svelte';
  import type { TidyTableToggleSummaryFunction } from 'src/components/table-quadrone/TidyItemTableRow.svelte';
  import { CONSTANTS } from 'src/constants';
  import { Actions } from 'src/features/actions/actions.svelte';
  import { Activities } from 'src/features/activities/activities';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { Tooltip } from 'src/tooltips/Tooltip';
  import type { Item5e } from 'src/types/item.types';
  import { error } from 'src/utils/logging';
  import { getContext } from 'svelte';

  type Props = {
    rowDocument: Item5e;
    rowContext?: any;
    /** How many formula buttons show before the `+N` control. */
    maxShown?: number;
  };

  let { rowDocument, rowContext, maxShown = 2 }: Props = $props();

  const localize = FoundryAdapter.localize;

  const damageHealingTypeIcons = Actions.damageAndHealingTypesIconSrcMap;

  let toggleSummary = getContext<TidyTableToggleSummaryFunction | undefined>(
    CONSTANTS.SVELTE_CONTEXT.TIDY_TABLE_TOGGLE_SUMMARY,
  );

  let identified = $derived(rowDocument?.system?.identified !== false);

  type FormulaEntry = {
    activityId: string;
    formula: string;
    label: string;
    damageType: string | null;
  };

  /** Quadrone's trim: drop flavor text and spacing noise from the formula. */
  function getTrimmedExpression(formula: string) {
    try {
      return new Roll(formula).terms.map((t: any) => t.expression).join(' ');
    } catch (e) {
      error(
        'An error occurred while preparing a damage formula for the DDB formula column',
        false,
        { error: e, rowDocument },
      );
    }
    return formula;
  }

  let entries = $derived.by<FormulaEntry[]>(() => {
    // The item is not reactive; rowContext is rebuilt with every prepared
    // context, so reading it ties this list to sheet renders.
    void rowContext;

    if (!identified || !rowDocument?.system?.activities) {
      return [];
    }

    const seen = new Set<string>();
    const result: FormulaEntry[] = [];

    for (const activity of Activities.getVisibleActivities(
      rowDocument,
      rowDocument.system.activities,
    ) ?? []) {
      if (typeof activity?.rollDamage !== 'function') {
        continue;
      }

      for (const damage of activity.labels?.damage ?? []) {
        if (!damage?.formula || seen.has(damage.label)) {
          continue;
        }

        seen.add(damage.label);
        result.push({
          activityId: activity.id,
          formula: getTrimmedExpression(damage.formula),
          label: damage.label ?? damage.formula,
          damageType: damage.damageType ?? null,
        });
      }
    }

    return result;
  });

  let shown = $derived(entries.slice(0, maxShown));
  let remaining = $derived(Math.max(entries.length - maxShown, 0));

  function openSummary() {
    toggleSummary?.(true);
    Tooltip.hide();
  }
</script>

{#if shown.length}
  <div class="ddb-formulas">
    {#each shown as entry (entry.activityId + entry.label)}
      {const icon = $derived(
        entry.damageType ? damageHealingTypeIcons[entry.damageType] : undefined,
      )}
      <div class="ddb-formula-line">
        <button
          type="button"
          class="ddb-roll-button ddb-roll-damage"
          data-action="ddbRollDamage"
          data-activity-id={entry.activityId}
          data-tooltip={entry.label}
          aria-label={entry.label}
        >
          <span class="formula">{entry.formula}</span>
          {#if icon}
            <span class="damage-icon" aria-hidden="true">
              <Dnd5eIcon src={icon} />
            </span>
          {/if}
        </button>
      </div>
    {/each}
    {#if remaining > 0}
      <!-- Under the boxes, inside the cell: beside them it pushed past the
           column edge into the next cell (wave 3 image review). -->
      <!-- svelte-ignore a11y_missing_attribute -->
      <a
        role="button"
        tabindex="0"
        class="ddb-formula-more"
        data-tooltip={entries
          .slice(maxShown)
          .map((e) => e.label)
          .join(', ')}
        onclick={openSummary}
        onkeydown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            openSummary();
          }
        }}>+{remaining}</a
      >
    {/if}
  </div>
{:else}
  <span class="color-text-disabled"
    >{identified ? '—' : localize('TIDY5E.Table.UnidentifiedPlaceholder')}</span
  >
{/if}
