<!--
  DDB-FORK: Hit Points block in the quick-info band.

  P1 scope: CURRENT / MAX / TEMP only. The HEAL and DAMAGE quick-apply inputs
  that DDB shows on the left of this block are P4.

  Inline editing follows the quadrone health parts
  (src/sheets/quadrone/actor/parts/ActorHealthBar.svelte): a TextInputQuadrone
  bound to the actor field, with delta changes enabled for current HP and temp
  HP. Max HP is only editable while the sheet is unlocked, mirroring how the
  classic sheet treats system.attributes.hp.max as an override field; when
  locked it renders as text plus the dnd5e hit-points config control.
-->
<script lang="ts">
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import DdbStatBoxShape from 'src/sheets/ddb/svg/DdbStatBoxShape.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let appId = $derived(context.actor.uuid.slugify());

  let hpValue = $derived(context.system.attributes?.hp?.value ?? 0);
  let hpMax = $derived(context.system.attributes?.hp?.max ?? 0);
  let effectiveMaxHp = $derived(
    context.system.attributes?.hp?.effectiveMax ?? hpMax,
  );
  let hpTemp = $derived(context.system.attributes?.hp?.temp ?? 0);
</script>

<section class="ddb-hp-block">
  <DdbStatBoxShape width={317} height={89} />
  <h2 class="ddb-hp-block__title">{localize('DND5E.HitPoints')}</h2>
  <div class="ddb-hp-block__fields">
    <div class="ddb-hp-block__field ddb-hp-block__field--current">
      <span class="ddb-hp-block__label">
        {localize('DND5E.HitPointsCurrent')}
      </span>
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

    <span class="ddb-hp-block__separator">/</span>

    <div class="ddb-hp-block__field ddb-hp-block__field--max">
      <span class="ddb-hp-block__label">{localize('DND5E.HitPointsMax')}</span>
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
        <span class="ddb-hp-block__value">{effectiveMaxHp}</span>
      {/if}
    </div>

    <div class="ddb-hp-block__field ddb-hp-block__field--temp">
      <span class="ddb-hp-block__label">{localize('DND5E.HitPointsTemp')}</span>
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
    {/if}
  </div>
</section>
