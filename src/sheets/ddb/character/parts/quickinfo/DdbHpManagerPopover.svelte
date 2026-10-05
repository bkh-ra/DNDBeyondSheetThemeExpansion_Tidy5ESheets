<!--
  DDB-FORK: the Hit Points manager — D&D Beyond's "Hit Points" panel as a
  popover, opened from the HIT POINTS title button of DdbHpBlock.

  HP CHANGES: an amount, a Heal / Damage switch (in the order of the band's
  HEAL / DAMAGE buttons; Damage is the default) and a LIVE preview of what
  Apply will do. Until something is entered the preview line is neutral: the
  current figures only, no arrow.
    damage  temp HP absorbs first, the rest spills into current HP:
            newHp = clamp(hp - spill, 0, effectiveMax)
    heal    newHp = min(hp + amount, effectiveMax)
  That is exactly the arithmetic of dnd5e's `Actor5e#applyDamage` for a bare
  number (resistances, modification and threshold ignored, because the system
  sets `options.ignore ??= true` for numeric input), so the preview can never
  disagree with the result. Apply goes through `applyDamage` — the same call
  the band's quick applicator makes — so dnd5e's `preApplyDamage` /
  `applyDamage` hooks, and every module listening to them, still run.

  TEMP HP: applied after the damage / healing with `Actor5e#applyTempHP`,
  which only ever RAISES temp HP (temporary hit points do not stack); the
  preview mirrors that rule.

  RESTORE LIFE: offered at 0 HP or while the actor carries the `dead` status.
  It clears the death-save tallies, lifts current HP to 1 (never lowers it),
  removes a standalone `dead` effect and swaps the band back to the figures.

  HIT POINT FIELDS: dnd5e's overall HP bonus formula
  (`system.attributes.hp.bonuses.overall`) and the max override
  (`system.attributes.hp.max`, empty = computed), editable here in play mode
  too — the band itself only offers the max while the sheet is unlocked.

  Popover behaviour follows the condition picker in
  DdbConditionsDefensesStrip.svelte: opening focuses the first field, a click
  outside closes, Escape closes from anywhere inside and hands focus back to
  the title button. The Damage / Heal switch is a radio group with roving
  focus (arrow keys / Home / End). Enter in either number field applies.

  Hooks for tests and styling: root `[data-tidy-sheet-part="ddb-hp-manager"]`;
  fields `[data-hp-field="amount|temp|bonus|max"]`; mode radios
  `[data-hp-mode="damage|heal"]` with `aria-checked`; the preview
  `.ddb-hp-manager__preview` carries `data-hp-from / data-hp-to /
  data-temp-from / data-temp-to`; actions
  `[data-hp-action="apply|restore-life|close"]`.
-->
<script lang="ts">
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import { clickOutside } from 'src/events/clickOutside.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { error } from 'src/utils/logging';

  interface Props {
    /** Id of the popover root (the title button's `aria-controls`). */
    id: string;
    /**
     * Close request. `restoreFocus` is true for keyboard closes (Escape, the
     * close button), which hand focus back to the title button.
     */
    onclose: (options: { restoreFocus: boolean }) => void;
  }

  let { id, onclose }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let appId = $derived(context.actor.uuid.slugify());

  let hp = $derived(context.system.attributes?.hp);
  let hpValue = $derived(toInteger(hp?.value));
  let hpMax = $derived(toInteger(hp?.max));
  let effectiveMax = $derived(toInteger(hp?.effectiveMax ?? hp?.max));
  let hpTemp = $derived(toInteger(hp?.temp));

  /** Source values: the override and the formula, not the derived numbers. */
  let sourceHp = $derived(context.source?.attributes?.hp ?? {});
  let maxOverride = $derived(sourceHp.max ?? '');
  let overallBonus = $derived(sourceHp.bonuses?.overall ?? '');

  /**
   * Re-read on every sheet render (`context` changes on each one), so the
   * button appears as soon as the actor drops to 0 or gains `dead`.
   */
  let isDead = $derived.by(() => {
    context;
    return !!context.actor.statuses?.has?.('dead');
  });

  let canRestoreLife = $derived(hpValue <= 0 || isDead);

  type Mode = 'damage' | 'heal';
  /** Visual + roving order: HEAL first, as the band stacks HEAL over DAMAGE. */
  const MODES: readonly Mode[] = ['heal', 'damage'];

  let mode = $state<Mode>('damage');
  let amount = $state<number | null>(null);
  let tempAmount = $state<number | null>(null);
  let busy = $state(false);

  function toInteger(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : 0;
  }

  /** A positive whole number from a number field, or 0 for "nothing". */
  function positiveAmount(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : 0;
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  let applyAmount = $derived(positiveAmount(amount));
  let applyTemp = $derived(positiveAmount(tempAmount));

  /** What Apply will leave behind, per dnd5e's applyDamage + applyTempHP. */
  let preview = $derived.by(() => {
    let nextHp = hpValue;
    let nextTemp = hpTemp;

    if (applyAmount > 0) {
      if (mode === 'damage') {
        const absorbed = Math.min(Math.max(hpTemp, 0), applyAmount);
        nextTemp = hpTemp - absorbed;
        nextHp = clamp(hpValue - (applyAmount - absorbed), 0, effectiveMax);
      } else {
        nextHp = Math.min(hpValue + applyAmount, effectiveMax);
      }
    }

    if (applyTemp > nextTemp) {
      nextTemp = applyTemp;
    }

    return { hp: nextHp, temp: nextTemp };
  });

  let hasChanges = $derived(applyAmount > 0 || applyTemp > 0);
  let canApply = $derived(context.editable && hasChanges && !busy);

  let showTempPreview = $derived(hpTemp !== 0 || preview.temp !== hpTemp);

  let amountInput = $state<HTMLInputElement>();
  let modeButtons = $state<Record<Mode, HTMLButtonElement | undefined>>({
    damage: undefined,
    heal: undefined,
  });

  $effect(() => {
    amountInput?.focus();
  });

  async function apply() {
    if (!canApply) {
      return;
    }

    busy = true;

    try {
      if (applyAmount > 0) {
        // `sign` per Actor5e#applyDamage: positive damages, negative heals.
        await context.actor.applyDamage(
          mode === 'damage' ? applyAmount : -applyAmount,
        );
      }

      if (applyTemp > 0) {
        await context.actor.applyTempHP(applyTemp);
      }

      amount = null;
      tempAmount = null;
    } catch (e) {
      error('An error occurred while applying hit point changes', false, e);
    } finally {
      busy = false;
      amountInput?.focus();
    }
  }

  async function restoreLife() {
    if (!context.editable || busy) {
      return;
    }

    busy = true;

    try {
      const updates: Record<string, unknown> = {
        'system.attributes.death.success': 0,
        'system.attributes.death.failure': 0,
      };

      if (hpValue < 1) {
        updates['system.attributes.hp.value'] = 1;
      }

      await context.actor.update(updates);

      // Only a standalone `dead` effect can be lifted; a status derived from
      // max-level exhaustion stays until the exhaustion level drops.
      const hasDeadStatus = Array.from(CONFIG.statusEffects ?? []).some(
        (status: any) => status?.id === 'dead',
      );

      if (hasDeadStatus) {
        await context.actor.toggleStatusEffect('dead', { active: false });
      }

      // The band swapped to the death-save pips at 0 HP; alive again, it
      // should show the figures.
      const sheet = context.actor.sheet;
      if (sheet?._showDeathSaves) {
        sheet.toggleDeathSaves?.(false);
      }
    } catch (e) {
      error('An error occurred while restoring life', false, e);
    } finally {
      busy = false;
    }
  }

  function close(restoreFocus: boolean) {
    onclose({ restoreFocus });
  }

  /** Escape closes from anywhere inside the popover. */
  function onRootKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  }

  function onNumberKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      apply();
    }
  }

  /** Roving focus over the Damage / Heal radios (ARIA radio group). */
  function onModeKeydown(event: KeyboardEvent) {
    const current = MODES.indexOf(mode);
    const last = MODES.length - 1;
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = current >= last ? 0 : current + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = current <= 0 ? last : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    mode = MODES[next];
    modeButtons[mode]?.focus();
  }

  let modeLabels = $derived<Record<Mode, string>>({
    damage: localize('TIDY5E.DdbLayout.Hp.Damage'),
    heal: localize('TIDY5E.DdbLayout.Hp.Heal'),
  });

  let titleId = $derived(`${id}-title`);
</script>

<div
  {id}
  class="ddb-hp-manager"
  role="dialog"
  tabindex="-1"
  aria-modal="false"
  aria-labelledby={titleId}
  data-tidy-sheet-part="ddb-hp-manager"
  onkeydown={onRootKeydown}
  use:clickOutside={{ callback: () => close(false) }}
>
  <header class="ddb-hp-manager__header">
    <h3 id={titleId} class="ddb-hp-manager__title">
      {localize('TIDY5E.DdbLayout.Hp.Title')}
    </h3>
    <button
      type="button"
      class="ddb-hp-manager__close"
      aria-label={localize('TIDY5E.DdbLayout.Hp.Close')}
      data-tooltip={localize('TIDY5E.DdbLayout.Hp.Close')}
      data-hp-action="close"
      onclick={() => close(true)}
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
  </header>

  <dl class="ddb-hp-manager__summary">
    <div class="ddb-hp-manager__figure" data-hp-figure="current">
      <dt>{localize('TIDY5E.DdbLayout.Hp.Current')}</dt>
      <dd>{hpValue}</dd>
    </div>
    <div class="ddb-hp-manager__figure" data-hp-figure="max">
      <dt>{localize('TIDY5E.DdbLayout.Hp.Max')}</dt>
      <dd>{effectiveMax}</dd>
    </div>
    <div class="ddb-hp-manager__figure" data-hp-figure="temp">
      <dt>{localize('TIDY5E.DdbLayout.Hp.Temp')}</dt>
      <dd>{hpTemp}</dd>
    </div>
  </dl>

  <div class="ddb-hp-manager__changes">
    <label class="ddb-hp-manager__field" for="{appId}-ddb-hp-manager-amount">
      <span class="ddb-hp-manager__label">
        {localize('TIDY5E.DdbLayout.Hp.Amount')}
      </span>
      <input
        bind:this={amountInput}
        id="{appId}-ddb-hp-manager-amount"
        class="ddb-hp-manager__number"
        type="number"
        min="0"
        step="1"
        inputmode="numeric"
        data-hp-field="amount"
        bind:value={amount}
        onkeydown={onNumberKeydown}
      />
    </label>

    <div
      class="ddb-hp-manager__modes"
      role="radiogroup"
      aria-label="{modeLabels.damage} / {modeLabels.heal}"
    >
      {#each MODES as option (option)}
        <button
          bind:this={modeButtons[option]}
          type="button"
          role="radio"
          class={['ddb-hp-manager__mode', `ddb-hp-manager__mode--${option}`]}
          aria-checked={mode === option}
          tabindex={mode === option ? 0 : -1}
          data-hp-mode={option}
          onclick={() => (mode = option)}
          onkeydown={onModeKeydown}
        >
          {modeLabels[option]}
        </button>
      {/each}
    </div>

    <label class="ddb-hp-manager__field" for="{appId}-ddb-hp-manager-temp">
      <span class="ddb-hp-manager__label">
        {localize('TIDY5E.DdbLayout.Hp.Temp')}
      </span>
      <input
        id="{appId}-ddb-hp-manager-temp"
        class="ddb-hp-manager__number"
        type="number"
        min="0"
        step="1"
        inputmode="numeric"
        data-hp-field="temp"
        bind:value={tempAmount}
        onkeydown={onNumberKeydown}
      />
    </label>
  </div>

  <!-- Live region: screen readers hear the projected result as it changes. -->
  <p
    class={['ddb-hp-manager__preview', { pending: hasChanges }]}
    aria-live="polite"
    data-hp-from={hpValue}
    data-hp-to={preview.hp}
    data-temp-from={hpTemp}
    data-temp-to={preview.temp}
  >
    <span class="ddb-hp-manager__preview-label">
      {localize('TIDY5E.DdbLayout.Hp.Preview')}
    </span>
    {#if hasChanges}
      <span class="ddb-hp-manager__preview-part" data-preview="hp">
        {localize('DND5E.HP')}
        {hpValue} &rarr;
        <strong class={{ changed: preview.hp !== hpValue }}>{preview.hp}</strong>
      </span>
      {#if showTempPreview}
        <span class="ddb-hp-manager__preview-separator" aria-hidden="true"
          >&middot;</span
        >
        <span class="ddb-hp-manager__preview-part" data-preview="temp">
          {localize('TIDY5E.DdbLayout.Hp.Temp')}
          {hpTemp} &rarr;
          <strong class={{ changed: preview.temp !== hpTemp }}
            >{preview.temp}</strong
          >
        </span>
      {/if}
    {:else}
      <!-- Nothing entered: the figures as they stand, no projection. -->
      <span class="ddb-hp-manager__preview-part" data-preview="hp">
        {localize('DND5E.HP')}
        {hpValue}
      </span>
      {#if hpTemp !== 0}
        <span class="ddb-hp-manager__preview-separator" aria-hidden="true"
          >&middot;</span
        >
        <span class="ddb-hp-manager__preview-part" data-preview="temp">
          {localize('TIDY5E.DdbLayout.Hp.Temp')}
          {hpTemp}
        </span>
      {/if}
    {/if}
  </p>

  <div class="ddb-hp-manager__actions">
    {#if canRestoreLife}
      <button
        type="button"
        class="ddb-hp-manager__button ddb-hp-manager__restore"
        data-hp-action="restore-life"
        disabled={busy}
        onclick={restoreLife}
      >
        <i class="fa-solid fa-heart-pulse"></i>
        {localize('TIDY5E.DdbLayout.Hp.RestoreLife')}
      </button>
    {/if}
    <button
      type="button"
      class={[
        'ddb-hp-manager__button',
        'ddb-hp-manager__apply',
        `ddb-hp-manager__apply--${mode}`,
      ]}
      data-hp-action="apply"
      disabled={!canApply}
      onclick={apply}
    >
      {localize('TIDY5E.DdbLayout.Hp.Apply')}
    </button>
  </div>

  <div class="ddb-hp-manager__config">
    <label class="ddb-hp-manager__config-row" for="{appId}-ddb-hp-manager-max">
      <span class="ddb-hp-manager__label">
        {localize('TIDY5E.DdbLayout.Hp.MaxOverride')}
      </span>
      <TextInputQuadrone
        id="{appId}-ddb-hp-manager-max"
        document={context.actor}
        field="system.attributes.hp.max"
        class="ddb-hp-manager__text"
        value={maxOverride}
        placeholder={String(hpMax)}
        selectOnFocus={true}
        saveEmptyAsNull={true}
        data-hp-field="max"
      />
    </label>
    <label
      class="ddb-hp-manager__config-row"
      for="{appId}-ddb-hp-manager-bonus"
    >
      <span class="ddb-hp-manager__label">
        {localize('TIDY5E.DdbLayout.Hp.Bonus')}
      </span>
      <TextInputQuadrone
        id="{appId}-ddb-hp-manager-bonus"
        document={context.actor}
        field="system.attributes.hp.bonuses.overall"
        class="ddb-hp-manager__text"
        value={overallBonus}
        selectOnFocus={true}
        data-hp-field="bonus"
      />
    </label>
  </div>
</div>
