<!--
  DDB-FORK: Hit Points block in the quick-info band.

  Layout mirrors design/captures/athelstan/*/01-actions.png: a compact
  HEAL / amount / DAMAGE applicator down the left edge, then a three-column
  readout (CURRENT "/" MAX ... TEMP) with the "HIT POINTS" title centred
  underneath. Every piece is in normal flow — the only absolutely positioned
  children are the SVG frame and the config cog.

  Inline editing follows the quadrone health parts
  (src/sheets/quadrone/actor/parts/ActorHealthBar.svelte): a TextInputQuadrone
  bound to the actor field, with delta changes enabled for current HP and temp
  HP. Max HP is only editable while the sheet is unlocked, mirroring how the
  classic sheet treats system.attributes.hp.max as an override field; when
  locked it renders as text plus the dnd5e hit-points config control.

  The applicator uses the dnd5e Actor5e#applyDamage API: a bare number is taken
  as a delta with resistances ignored (`options.ignore ??= true` in the system),
  positive for damage and negative for healing — the same call core dnd5e makes
  from `modifyTokenAttribute` for HP bar drags.
-->
<script lang="ts">
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import DdbDeathSaves from './DdbDeathSaves.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let appId = $derived(context.actor.uuid.slugify());

  let hpValue = $derived(context.system.attributes?.hp?.value ?? 0);
  let hpMax = $derived(context.system.attributes?.hp?.max ?? 0);
  let effectiveMaxHp = $derived(
    context.system.attributes?.hp?.effectiveMax ?? hpMax,
  );
  let hpTemp = $derived(context.system.attributes?.hp?.temp ?? 0);
  let hpTempMax = $derived(context.system.attributes?.hp?.tempmax ?? 0);

  /**
   * Quadrone badges the HP readout whenever the effective max differs from the
   * rolled/derived max (CharacterSheet.svelte `max-hp-override-container`).
   * Derived from the two maxima rather than from `tempmax` so any other source
   * of an altered max still shows, and so a player — who never unlocks the
   * sheet — can see that their maximum has been changed.
   */
  let maxHpAltered = $derived(effectiveMaxHp !== hpMax);

  let maxHpDelta = $derived(effectiveMaxHp - hpMax);

  /** Amount typed into the quick-adjust field. Empty means "do nothing". */
  let amount = $state<number | null>(null);

  let applyAmount = $derived(
    typeof amount === 'number' && Number.isFinite(amount) && amount > 0
      ? Math.floor(amount)
      : 0,
  );

  let canApply = $derived(context.editable && applyAmount > 0);

  /** `sign` is 1 for damage and -1 for healing, per Actor5e#applyDamage. */
  async function applyHealthDelta(sign: 1 | -1) {
    if (!canApply) {
      return;
    }

    await context.actor.applyDamage(sign * applyAmount);

    amount = null;
  }
</script>

<!--
  The panel surface is plain CSS here, not an SVG frame: this block is the only
  quick-info box whose root is a flex container laying out two real children
  (applicator + readout), and an absolutely positioned SVG behind a flex root
  did not reliably cover the full fixed width. A background + 1px border on the
  root is size-independent, so both interior modes always sit on the panel.
-->
<!-- `editable` drives the readout's edit affordance: the hairline under CURRENT
     / MAX / TEMP has to be identical across the three, and MAX renders as a
     span rather than an input whenever the sheet is locked. See
     `.ddb-hp-block__value` in quick-info.css. -->
<section
  class={['ddb-hp-block', { editable: context.editable }]}
  data-tidy-sheet-part="ddb-hp-block"
>
  {#if context.editable}
    <div class="ddb-hp-block__applicator">
      <button
        type="button"
        class="ddb-hp-block__apply ddb-hp-block__apply--heal"
        aria-label={localize('DND5E.ActionHeal')}
        data-tooltip="DND5E.ActionHeal"
        disabled={!canApply}
        onclick={() => applyHealthDelta(-1)}
      >
        {localize('DND5E.ActionHeal')}
      </button>
      <input
        class="ddb-hp-block__apply-amount"
        type="number"
        min="0"
        step="1"
        inputmode="numeric"
        aria-label={localize('DND5E.HitPoints')}
        bind:value={amount}
      />
      <button
        type="button"
        class="ddb-hp-block__apply ddb-hp-block__apply--damage"
        aria-label={localize('DND5E.Damage')}
        data-tooltip="DND5E.Damage"
        disabled={!canApply}
        onclick={() => applyHealthDelta(1)}
      >
        {localize('DND5E.Damage')}
      </button>
    </div>
  {/if}

  <div class="ddb-hp-block__readout">
    {#if context.showDeathSaves}
      <!-- Same panel, same footprint — DDB swaps the interior, not the box. -->
      <DdbDeathSaves />
    {:else}
      <div class="ddb-hp-block__fields">
        <div class="ddb-hp-block__field ddb-hp-block__field--current">
          <span class="ddb-hp-block__label">{localize('DND5E.Current')}</span>
          {#if context.editable}
            <TextInputQuadrone
              id="{appId}-ddb-hp-value"
              document={context.actor}
              field="system.attributes.hp.value"
              class="ddb-hp-block__input"
              value={hpValue}
              selectOnFocus={true}
              enableDeltaChanges={true}
              blurAfterChange={true}
              aria-label={localize('DND5E.HitPointsCurrent')}
            />
          {:else}
            <span class="ddb-hp-block__value">{hpValue}</span>
          {/if}
        </div>

        <span class="ddb-hp-block__separator" aria-hidden="true">/</span>

        <div class="ddb-hp-block__field ddb-hp-block__field--max">
          <span class="ddb-hp-block__label">{localize('DND5E.Max')}</span>
          {#if context.editable && context.unlocked}
            <TextInputQuadrone
              id="{appId}-ddb-hp-max"
              document={context.actor}
              field="system.attributes.hp.max"
              class="ddb-hp-block__input"
              value={hpMax}
              selectOnFocus={true}
              saveEmptyAsNull={true}
              blurAfterChange={true}
              aria-label={localize('DND5E.HitPointsMax')}
            />
          {:else}
            <span class="ddb-hp-block__value">
              {effectiveMaxHp}{#if maxHpAltered}<sup
                  class={[
                    'ddb-hp-block__max-delta',
                    maxHpDelta < 0 ? 'reduced' : 'increased',
                  ]}
                  data-tooltip="DND5E.HitPointsTempMax"
                  >{maxHpDelta < 0 ? '-' : '+'}{Math.abs(
                    maxHpDelta,
                  )}</sup
                >{/if}
            </span>
          {/if}
        </div>

        <div class="ddb-hp-block__field ddb-hp-block__field--temp">
          <span class="ddb-hp-block__label">{localize('DND5E.Temp')}</span>
          {#if context.editable}
            <TextInputQuadrone
              id="{appId}-ddb-hp-temp"
              document={context.actor}
              field="system.attributes.hp.temp"
              class="ddb-hp-block__input"
              value={hpTemp}
              selectOnFocus={true}
              enableDeltaChanges={true}
              blurAfterChange={true}
              aria-label={localize('DND5E.HitPointsTemp')}
            />
          {:else}
            <span class="ddb-hp-block__value">{hpTemp}</span>
          {/if}
        </div>

        <!--
          Temp max is an edit-mode-only override, matching the quadrone HP
          overlay's "Max" field (system.attributes.hp.tempmax). Hidden in play
          mode so the readout keeps DDB's three-figure shape.
        -->
        {#if context.editable && context.unlocked}
          <div
            class="ddb-hp-block__field ddb-hp-block__field--tempmax"
            data-tooltip="DND5E.HitPointsTempMax"
          >
            <!-- Abbreviated so the four figures still fit the fixed panel;
                 the full string stays on the tooltip and the aria-label. -->
            <span class="ddb-hp-block__label">+{localize('DND5E.Max')}</span>
            <TextInputQuadrone
              id="{appId}-ddb-hp-tempmax"
              document={context.actor}
              field="system.attributes.hp.tempmax"
              class="ddb-hp-block__input"
              value={hpTempMax}
              selectOnFocus={true}
              blurAfterChange={true}
              aria-label={localize('DND5E.HitPointsTempMax')}
            />
          </div>
        {/if}
      </div>
    {/if}

    <h2 class="ddb-hp-block__title">
      {localize(
        context.showDeathSaves ? 'DND5E.DeathSave' : 'DND5E.HitPoints',
      )}
    </h2>
  </div>

  <!--
    Controls stacked in the panel's top-right corner. Mirrors the quadrone
    vitals row: the skull reveals/hides the death-save tray (and right-click
    resets the tallies), and edit mode swaps in the hit-point and death-save
    config cogs.
  -->
  <div class="ddb-hp-block__controls">
    {#if context.editable && !context.unlocked}
      <button
        type="button"
        class={[
          'ddb-hp-block__config',
          'ddb-hp-block__death-toggle',
          { active: context.showDeathSaves },
        ]}
        aria-label={localize(
          context.showDeathSaves ? 'DND5E.DeathSaveHide' : 'DND5E.DeathSaveShow',
        )}
        data-tooltip={context.showDeathSaves
          ? 'DND5E.DeathSaveHide'
          : 'DND5E.DeathSaveShow'}
        onclick={() => context.actor.sheet.toggleDeathSaves()}
        oncontextmenu={(ev) => {
          ev.preventDefault();
          (async () => {
            await context.actor.update({
              'system.attributes.death.success': 0,
              'system.attributes.death.failure': 0,
            });
          })();
        }}
      >
        <i class="fas fa-skull"></i>
      </button>
    {/if}
    {#if context.unlocked}
      <button
        type="button"
        class="ddb-hp-block__config"
        aria-label={localize('DND5E.HitPointsConfig')}
        data-tooltip="DND5E.HitPointsConfig"
        data-action="showConfiguration"
        data-config="hitPoints"
      >
        <i class="fas fa-cog"></i>
      </button>
      <button
        type="button"
        class="ddb-hp-block__config"
        aria-label={localize('DND5E.DeathSaveConfigure')}
        data-tooltip="DND5E.DeathSaveConfigure"
        data-action="showConfiguration"
        data-config="death"
      >
        <i class="fas fa-skull"></i>
      </button>
    {/if}
  </div>
</section>
