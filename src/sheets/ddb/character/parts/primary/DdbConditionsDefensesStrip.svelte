<!--
  DDB-FORK: The DEFENSES / CONDITIONS strip that sits at the top of the DDB
  primary box, above the tab strip.

  Layout mirrors D&D Beyond's `ct-conditions-defenses` component: two labelled
  groups side by side inside one bordered box. Defenses come from the actor's
  damage/condition trait sets (dr/di/ci/dv/dm); conditions come from the union of
  `context.conditions` and `CONFIG.statusEffects`, with exhaustion rendered as
  "Exhaustion (Level N)".

  Toggling a dnd5e condition uses the same handler as
  `src/sheets/quadrone/actor/parts/ConditionToggleQuadrone.svelte`; everything
  else routes through `Actor#toggleStatusEffect`.
-->
<script lang="ts">
  import Dnd5eIcon from 'src/components/icon/Dnd5eIcon.svelte';
  import { CONSTANTS } from 'src/constants';
  import { clickOutside } from 'src/events/clickOutside.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { Dnd5eActorCondition } from 'src/foundry/foundry-and-system';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { ActorTraitContext } from 'src/types/types';
  import { isNil } from 'src/utils/data';
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
    /**
     * Damage modification (flat +/- per damage type). Quadrone renders these as
     * pills alongside the other defenses in `CharacterTraitPills.svelte`; the
     * icon is the same one that component uses. Entries carry `sign`/`value`
     * from `Tidy5eActorSheetQuadroneBase._prepareTraits`, and their own
     * `cssClass` ('negative' for extra damage taken, 'positive' for less).
     */
    {
      key: 'dm',
      iconClass: 'fa-solid fa-heart-circle-plus',
      cssClass: 'modification',
      label: localizeOr(
        'DND5E.DamageModification.Label',
        'Damage Modification',
      ),
    },
  ]);

  /**
   * Edit-mode configuration targets: one config control per damage/condition
   * trait, matching `character-parts/traits/CharacterTraitPills.svelte`.
   */
  let defenseConfigs = $derived<DefenseGroup[]>(defenseGroups);

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

  function conditionLabel(entry: { statusId: string; name: string }): string {
    if (entry.statusId === 'exhaustion' && exhaustionLevel > 0) {
      return `${entry.name} (${localizeOr('DND5E.Level', 'Level')} ${exhaustionLevel})`;
    }

    return entry.name;
  }

  /**
   * A single toggleable entry in the CONDITIONS control.
   *
   * `condition` is present only for entries that came from `context.conditions`
   * (i.e. `CONFIG.DND5E.conditionTypes`); those keep going through
   * `FoundryAdapter.toggleCondition` so exhaustion and dnd5e's static effect ids
   * behave exactly as before. Everything else is a bare `CONFIG.statusEffects`
   * entry — core statuses plus anything modules or the user registered — and is
   * toggled with `Actor#toggleStatusEffect`.
   */
  type ToggleableCondition = {
    key: string;
    statusId: string;
    name: string;
    icon: string | undefined;
    active: boolean;
    condition?: Dnd5eActorCondition;
  };

  /**
   * Shape of a `CONFIG.statusEffects` entry, widened past `config.types.ts`:
   * Foundry v14 allows `hud` to be an object, and third-party statuses may omit
   * `_id`. In v14 `CONFIG.statusEffects` is a Proxy over an array (it answers to
   * both numeric indices and status ids), so it must be walked as an array —
   * `Object.entries()` would be ambiguous.
   */
  type StatusEffectConfig = {
    id: string;
    name: string;
    img?: string;
    _id?: string;
    pseudo?: boolean;
    hud?: boolean | { actorTypes?: string[] };
  };

  /**
   * `Actor#statuses` is the Set of status ids contributed by *active* (enabled,
   * unsuppressed) effects; Foundry rebuilds it during `applyActiveEffects`.
   * It is the reliable active check for statuses that dnd5e knows nothing about.
   */
  let actorStatuses = $derived<Set<string>>(
    context.actor?.statuses ?? new Set<string>(),
  );

  /**
   * Mirrors Foundry's own Token HUD filter: `hud: false` hides system-managed
   * statuses (dnd5e flags the encumbrance effects that way), and `hud.actorTypes`
   * restricts a status to specific actor sub-types.
   */
  function isHudVisible(status: StatusEffectConfig): boolean {
    if (status.hud === false) {
      return false;
    }

    const actorTypes =
      typeof status.hud === 'object' ? status.hud?.actorTypes : undefined;

    return (
      !Array.isArray(actorTypes) || actorTypes.includes(context.actor.type)
    );
  }

  let allConditions = $derived.by<ToggleableCondition[]>(() => {
    const entries: ToggleableCondition[] = [];

    // dnd5e condition types (already pseudo-filtered by ConditionsAndEffects).
    const seenStatusIds = new Set<string>();
    const seenEffectIds = new Set<string>();

    for (const condition of context.conditions ?? []) {
      seenStatusIds.add(condition.id);
      seenEffectIds.add(dnd5e.utils.staticID(`dnd5e${condition.id}`));

      entries.push({
        key: `dnd5e:${condition.id}`,
        statusId: condition.id,
        name: condition.name,
        icon: condition.icon,
        active: isConditionActive(condition),
        condition,
      });
    }

    // Everything else registered in the world: core statuses, module statuses,
    // and user-defined ones. dnd5e re-registers its own condition types here
    // with the same `id` and `_id = staticID('dnd5e' + id)`, so dedupe on both.
    const statusEffects = Array.from(
      CONFIG.statusEffects ?? [],
    ) as unknown as StatusEffectConfig[];

    for (const status of statusEffects) {
      if (!status?.id || status.pseudo || !isHudVisible(status)) {
        continue;
      }

      if (
        seenStatusIds.has(status.id) ||
        (!!status._id && seenEffectIds.has(status._id))
      ) {
        continue;
      }

      seenStatusIds.add(status.id);

      entries.push({
        key: `status:${status.id}`,
        statusId: status.id,
        // dnd5e localizes these at i18nInit, but modules that register later
        // may still hand us a raw key; localize() is a no-op on plain text.
        name: localize(status.name ?? status.id),
        icon: status.img,
        active: actorStatuses.has(status.id),
      });
    }

    return entries.sort((a, b) => a.name.localeCompare(b.name));
  });

  let activeConditions = $derived(allConditions.filter((c) => c.active));

  let managingConditions = $state(false);
  let conditionFilter = $state('');

  let filteredConditions = $derived.by(() => {
    const needle = conditionFilter.trim().toLocaleLowerCase();

    return needle === ''
      ? allConditions
      : allConditions.filter((c) =>
          c.name.toLocaleLowerCase().includes(needle),
        );
  });

  function closeConditionMenu() {
    managingConditions = false;
  }

  /*
    DDB-FORK (matrix-sheet 6.16): the picker had no focus entry, so the
    condition control could be opened but not operated from the keyboard.
    Opening it now moves focus into the search field, and Escape (below) still
    closes it.
  */
  let conditionSearchInput = $state<HTMLInputElement>();

  /** The + / x control that opens the picker; Escape hands focus back to it. */
  let conditionManageButton = $state<HTMLButtonElement>();

  let conditionOptionsList = $state<HTMLUListElement>();

  $effect(() => {
    if (managingConditions) {
      conditionSearchInput?.focus();
    }
  });

  /**
   * Escape closes the picker from anywhere inside it and returns focus to the
   * trigger. The trigger stays rendered while the picker unmounts, so focusing
   * it first keeps focus from falling back to the document body.
   */
  function closeConditionMenuFromKeyboard(event: KeyboardEvent) {
    event.stopPropagation();
    closeConditionMenu();
    conditionManageButton?.focus();
  }

  /**
   * DDB-FORK: roving focus over the option buttons, per the ARIA menu pattern.
   * ArrowDown / ArrowUp step through them and wrap at either end; Home / End
   * jump to the first / last. Re-queried on every key press because the search
   * filter changes which options exist.
   */
  function focusConditionOption(
    target: 'next' | 'previous' | 'first' | 'last',
    from: Element | null,
  ) {
    const options = Array.from(
      conditionOptionsList?.querySelectorAll<HTMLButtonElement>(
        '.ddb-condition-option',
      ) ?? [],
    );

    if (!options.length) {
      return;
    }

    const current = options.indexOf(from as HTMLButtonElement);
    const last = options.length - 1;

    const indices = {
      first: 0,
      last,
      // `current` is -1 when focus is not on an option yet.
      next: (current + 1) % options.length,
      previous: current <= 0 ? last : current - 1,
    };

    options[indices[target]].focus();
  }

  /** Keys on an option button: Escape plus the full roving-focus set. */
  function onConditionOptionKeydown(event: KeyboardEvent) {
    let move: 'next' | 'previous' | 'first' | 'last';

    switch (event.key) {
      case 'Escape':
        closeConditionMenuFromKeyboard(event);
        return;
      case 'ArrowDown':
        move = 'next';
        break;
      case 'ArrowUp':
        move = 'previous';
        break;
      case 'Home':
        move = 'first';
        break;
      case 'End':
        move = 'last';
        break;
      default:
        return;
    }

    event.preventDefault();
    focusConditionOption(move, event.currentTarget as Element);
  }

  /**
   * Keys in the search field: Escape, and ArrowDown / ArrowUp to enter the
   * option list at its first / last entry. Home / End stay with the text
   * field, where they move the caret.
   */
  function onConditionSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeConditionMenuFromKeyboard(event);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusConditionOption(
        event.key === 'ArrowDown' ? 'first' : 'last',
        null,
      );
    }
  }

  /**
   * Exhaustion is a level, not a toggle. Quadrone sets it from the vitals row
   * (ActorExhaustionBar -> `system.attributes.exhaustion`); the DDB strip owns
   * the equivalent track because exhaustion reads as a condition here.
   */
  let exhaustionLevels = $derived(
    (context.config.conditionTypes?.exhaustion?.levels ?? 6) + 1,
  );

  async function setExhaustionLevel(level: number) {
    await context.actor.update({
      'system.attributes.exhaustion': level,
    });
  }

  /**
   * dnd5e conditions keep Tidy's handler (copied from
   * ConditionToggleQuadrone.svelte) so both sheets behave identically. Anything
   * that only exists in `CONFIG.statusEffects` goes through Foundry's
   * `Actor#toggleStatusEffect(statusId, {active, overlay})`, which dnd5e
   * overrides to honor `exclusiveGroup` (e.g. the cover statuses).
   */
  async function handleConditionToggle(entry: ToggleableCondition) {
    try {
      if (entry.condition) {
        await FoundryAdapter.toggleCondition(context.actor, entry.condition);
      } else {
        await context.actor.toggleStatusEffect(entry.statusId);
      }
    } catch (e) {
      error('An error occurred while toggling a condition', false, e);
      debug('Condition toggle error troubleshooting info', {
        condition: entry,
      });
      context.actor.sheet.render();
    }
  }

  /** `sign` + `value`, present on damage-modification entries only. */
  function defenseAmount(entry: ActorTraitContext): string {
    return isNil(entry.value, '')
      ? ''
      : `${entry.sign ?? ''}${String(entry.value)}`;
  }

  function defenseTooltip(chip: DefenseChip): string {
    const parenthetical = chip.entry.parenthetical
      ? ` (${chip.entry.parenthetical})`
      : '';

    const amount = defenseAmount(chip.entry);

    return `${chip.label}: ${chip.entry.label}${amount ? ` ${amount}` : ''}${parenthetical}`;
  }

  let noneLabel = $derived(localizeOr('DND5E.None', 'None'));
</script>

<div
  class="ddb-conditions-defenses"
  data-tidy-sheet-part="ddb-conditions-defenses"
>
  <section class="ddb-cd-group ddb-defenses">
    <div class="ddb-cd-header">
      <h3 class="ddb-cd-label">
        {localizeOr('DND5E.Defenses', 'Defenses')}
      </h3>
      {#if context.unlocked}
        <div class="ddb-cd-configs">
          {#each defenseConfigs as group (group.key)}
            {@const tooltip = localize('DND5E.ProficiencyConfigureTitle', {
              label: group.label,
            })}
            <button
              type="button"
              class="ddb-cd-config"
              aria-label={tooltip}
              data-tooltip={tooltip}
              data-tooltip-direction="UP"
              data-action="showConfiguration"
              data-trait={group.key}
            >
              <i class={group.iconClass}></i>
            </button>
          {/each}
        </div>
      {/if}
    </div>
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
            {#if defenseAmount(chip.entry)}
              <span class="ddb-defense-value">{defenseAmount(chip.entry)}</span>
            {/if}
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
          bind:this={conditionManageButton}
          type="button"
          class="ddb-conditions-manage"
          aria-expanded={managingConditions}
          aria-haspopup="true"
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
        {#each activeConditions as entry (entry.key)}
          <!--
            DDB-FORK (matrix-client N3): "Show Condition reference tooltip"
            populates `condition.reference` (ConditionsAndEffects.ts:36-40) and
            quadrone turns the row into a rule link with it
            (ActorConditionsQuadrone.svelte:31-39). Same hooks here, so the
            user setting reaches the always-visible DDB strip; the chip's own
            look is preserved in primary-box.css.
          -->
          {@const reference = entry.condition?.reference}
          <li
            class={['ddb-condition', 'active', { 'content-link': !!reference }]}
            data-uuid={reference}
            data-condition-id={entry.statusId}
          >
            {#if context.editable}
              <!-- DDB-FORK (matrix-sheet 6.16): keep quadrone's
                   `condition-toggle` sheet part so modules that key on it find
                   the DDB strip's toggles too
                   (cf. ConditionToggleQuadrone.svelte:33). -->
              <button
                type="button"
                class="ddb-condition-toggle"
                data-tooltip={entry.name}
                data-tooltip-direction="UP"
                data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.CONDITION_TOGGLE}
                aria-pressed="true"
                onclick={() => handleConditionToggle(entry)}
              >
                {conditionLabel(entry)}
              </button>
            {:else}
              <span
                class="ddb-condition-name"
                data-tooltip={entry.name}
                data-tooltip-direction="UP"
              >
                {conditionLabel(entry)}
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <span class="ddb-cd-empty">{noneLabel}</span>
    {/if}

    <!-- Always on while editable, as quadrone's vitals row offers its
         exhaustion control (CharacterSheet.svelte: `context.editable ||
         exhaustionLevel > 0`). A viewer who cannot edit still reads the level
         from the "Exhaustion (Level N)" condition entry above. -->
    {#if context.editable}
      <div
        class="ddb-exhaustion-track"
        role="group"
        aria-label={localize('DND5E.Exhaustion')}
      >
        <span class="ddb-exhaustion-label">
          {localize('DND5E.Exhaustion')}
        </span>
        {#each Array(exhaustionLevels) as _, i}
          {@const tooltip = localize('DND5E.ExhaustionLevel', { n: i })}
          <button
            type="button"
            class={['ddb-exhaustion-step', { active: i === exhaustionLevel }]}
            aria-label={tooltip}
            aria-pressed={i === exhaustionLevel}
            data-tooltip={tooltip}
            data-tooltip-direction="UP"
            onclick={() => setExhaustionLevel(i)}
          >
            {i}
          </button>
        {/each}
      </div>
    {/if}

    <!--
      The strip lives in a fixed-height row, so the full condition list is a
      popover (absolutely positioned, scrolls internally) rather than inline
      content that would grow the strip.
    -->
    {#if managingConditions && context.editable}
      <!--
        DDB-FORK (matrix-sheet 6.16): the popover was one element with
        role="menu", a search field nested inside it (invalid ARIA) and no
        focus entry, so the condition control could be opened but not operated
        from the keyboard. The menu role now belongs to the option list alone,
        opening the popover moves focus to the search field, the arrow keys
        (plus Home / End on an option) move between options, and Escape closes
        it from either the field or an option and returns focus to the + / x
        trigger.
      -->
      <div
        class="ddb-condition-picker"
        role="group"
        aria-label={localize('DND5E.Conditions')}
        use:clickOutside={{ callback: closeConditionMenu }}
      >
        <input
          bind:this={conditionSearchInput}
          type="search"
          class="ddb-condition-search"
          placeholder={localize('TIDY5E.Search')}
          aria-label={localize('TIDY5E.Search')}
          onkeydown={onConditionSearchKeydown}
          bind:value={conditionFilter}
        />
        <ul
          bind:this={conditionOptionsList}
          class="ddb-condition-options"
          role="menu"
          aria-label={localize('DND5E.Conditions')}
        >
          {#each filteredConditions as entry (entry.key)}
            <li role="none">
              <button
                type="button"
                role="menuitemcheckbox"
                class={['ddb-condition-option', { active: entry.active }]}
                aria-checked={entry.active}
                data-condition-id={entry.statusId}
                onkeydown={onConditionOptionKeydown}
                onclick={() => handleConditionToggle(entry)}
              >
                <i
                  class={[
                    'ddb-condition-check',
                    entry.active
                      ? 'fa-solid fa-square-check'
                      : 'fa-regular fa-square',
                  ]}
                ></i>
                {#if entry.icon?.endsWith('.svg')}
                  <Dnd5eIcon
                    class="ddb-condition-option-icon"
                    src={entry.icon}
                  />
                {:else if entry.icon}
                  <img
                    class="ddb-condition-option-icon"
                    src={entry.icon}
                    alt=""
                  />
                {/if}
                <span class="truncate">{conditionLabel(entry)}</span>
              </button>
            </li>
          {:else}
            <li class="ddb-condition-empty">{noneLabel}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>
</div>
