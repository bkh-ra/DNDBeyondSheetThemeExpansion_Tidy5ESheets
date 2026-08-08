<!--
  DDB-FORK: The DEFENSES / CONDITIONS strip that sits at the top of the DDB
  primary box, above the tab strip.

  Layout mirrors D&D Beyond's `ct-conditions-defenses` component: two labelled
  groups side by side inside one bordered box. Defenses come from the actor's
  damage/condition trait sets (dr/di/ci/dv); conditions come from
  `context.conditions`, with exhaustion rendered as "Exhaustion (Level N)".

  Toggling a condition uses the same handler as
  `src/sheets/quadrone/actor/parts/ConditionToggleQuadrone.svelte`.
-->
<script lang="ts">
  import Dnd5eIcon from 'src/components/icon/Dnd5eIcon.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { Dnd5eActorCondition } from 'src/foundry/foundry-and-system';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { ActorTraitContext } from 'src/types/types';
  import { debug, error } from 'src/utils/logging';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  /**
   * Localize a key, falling back to plain English when the key is not present
   * in the active translation (Foundry echoes unknown keys verbatim).
   */
  function localizeOr(key: string, fallback: string): string {
    const localized = localize(key);
    return localized === key ? fallback : localized;
  }

  type DefenseGroup = {
    key: string;
    iconClass: string;
    cssClass: string;
    label: string;
  };

  type DefenseChip = DefenseGroup & {
    entry: ActorTraitContext;
  };

  let defenseGroups = $derived<DefenseGroup[]>([
    {
      key: 'dr',
      iconClass: 'fa-solid fa-shield-halved',
      cssClass: 'resistance',
      label: localizeOr('DND5E.Resistances', 'Resistances'),
    },
    {
      key: 'di',
      iconClass: 'fa-solid fa-shield',
      cssClass: 'immunity',
      label: localizeOr('DND5E.TraitDIPlural.other', 'Damage Immunities'),
    },
    {
      key: 'ci',
      iconClass: 'fa-solid fa-shield-virus',
      cssClass: 'condition-immunity',
      label: localizeOr('DND5E.TraitCIPlural.other', 'Condition Immunities'),
    },
    {
      key: 'dv',
      iconClass: 'fa-solid fa-heart-crack',
      cssClass: 'vulnerability',
      label: localizeOr('DND5E.Vulnerabilities', 'Vulnerabilities'),
    },
  ]);

  let defenses = $derived<DefenseChip[]>(
    defenseGroups.flatMap((group) =>
      (context.traits?.[group.key] ?? []).map((entry) => ({
        ...group,
        entry,
      })),
    ),
  );

  let exhaustionLevel = $derived(
    Number(context.system?.attributes?.exhaustion ?? 0),
  );

  function isConditionActive(condition: Dnd5eActorCondition): boolean {
    return (
      !condition.disabled ||
      (condition.id === 'exhaustion' && exhaustionLevel > 0)
    );
  }

  function conditionLabel(condition: Dnd5eActorCondition): string {
    if (condition.id === 'exhaustion' && exhaustionLevel > 0) {
      return `${condition.name} (${localizeOr('DND5E.Level', 'Level')} ${exhaustionLevel})`;
    }

    return condition.name;
  }

  let activeConditions = $derived(
    (context.conditions ?? []).filter(isConditionActive),
  );

  let managingConditions = $state(false);

  // Copied from ConditionToggleQuadrone.svelte so both sheets behave identically.
  async function handleConditionToggle(condition: Dnd5eActorCondition) {
    try {
      await FoundryAdapter.toggleCondition(context.actor, condition);
    } catch (e) {
      error('An error occurred while toggling a condition', false, e);
      debug('Condition toggle error troubleshooting info', {
        condition,
      });
      context.actor.sheet.render();
    }
  }

  function defenseTooltip(chip: DefenseChip): string {
    const parenthetical = chip.entry.parenthetical
      ? ` (${chip.entry.parenthetical})`
      : '';

    return `${chip.label}: ${chip.entry.label}${parenthetical}`;
  }

  let noneLabel = $derived(localizeOr('DND5E.None', 'None'));
</script>

<div
  class="ddb-conditions-defenses"
  data-tidy-sheet-part="ddb-conditions-defenses"
>
  <section class="ddb-cd-group ddb-defenses">
    <h3 class="ddb-cd-label">
      {localizeOr('DND5E.Defenses', 'Defenses')}
    </h3>
    {#if defenses.length}
      <ul class="ddb-defense-list">
        {#each defenses as chip (`${chip.key}-${chip.entry.key ?? chip.entry.label}`)}
          <li
            class={['ddb-defense', chip.cssClass, chip.entry.cssClass]}
            data-tooltip={defenseTooltip(chip)}
            data-tooltip-direction="UP"
          >
            <i class={['ddb-defense-icon', chip.iconClass]}></i>
            {#if chip.entry.icons?.length}
              {#each chip.entry.icons as icon}
                <i
                  class={['ddb-defense-type-icon', icon.icon]}
                  data-tooltip={icon.label}
                ></i>
              {/each}
            {/if}
            <span class="ddb-defense-label">
              {chip.entry.label}{#if chip.entry.parenthetical}&nbsp;({chip.entry
                  .parenthetical}){/if}
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <span class="ddb-cd-empty">{noneLabel}</span>
    {/if}
  </section>

  <section class="ddb-cd-group ddb-conditions">
    <div class="ddb-cd-header">
      <h3 class="ddb-cd-label">
        {localize('DND5E.Conditions')}
      </h3>
      {#if context.editable}
        <button
          type="button"
          class="ddb-conditions-manage"
          aria-expanded={managingConditions}
          aria-label={localize('DND5E.Conditions')}
          data-tooltip={localize('DND5E.Conditions')}
          onclick={() => (managingConditions = !managingConditions)}
        >
          <i
            class={managingConditions
              ? 'fa-solid fa-xmark'
              : 'fa-solid fa-plus'}
          ></i>
        </button>
      {/if}
    </div>

    {#if activeConditions.length}
      <ul class="ddb-condition-list">
        {#each activeConditions as condition (condition.id)}
          <li class="ddb-condition active">
            {#if context.editable}
              <button
                type="button"
                class="ddb-condition-toggle"
                data-tooltip={condition.name}
                data-tooltip-direction="UP"
                aria-pressed="true"
                onclick={() => handleConditionToggle(condition)}
              >
                {conditionLabel(condition)}
              </button>
            {:else}
              <span
                class="ddb-condition-name"
                data-tooltip={condition.name}
                data-tooltip-direction="UP"
              >
                {conditionLabel(condition)}
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <span class="ddb-cd-empty">{noneLabel}</span>
    {/if}

    {#if managingConditions && context.editable}
      <ul class="ddb-condition-picker">
        {#each context.conditions ?? [] as condition (condition.id)}
          {@const active = isConditionActive(condition)}
          <li>
            <button
              type="button"
              class={['ddb-condition-chip', { active }]}
              aria-pressed={active}
              data-condition-id={condition.id}
              data-tooltip={condition.name}
              data-tooltip-direction="UP"
              onclick={() => handleConditionToggle(condition)}
            >
              <Dnd5eIcon src={condition.icon} />
              <span class="truncate">{conditionLabel(condition)}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
