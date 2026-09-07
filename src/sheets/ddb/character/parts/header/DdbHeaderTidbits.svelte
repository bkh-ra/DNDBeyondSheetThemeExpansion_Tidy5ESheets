<!--
  DDB-FORK: Name + species/class/level tidbits for the DDB header banner.

  Mirrors DDB's `ct-character-header-info` block (design/GROUPINGS.md):
    Athelstan
    Elf  Cleric 9
    Level 9

  Data prep is copied from the quadrone subtitle component
  (src/sheets/quadrone/actor/character-parts/CharacterSubtitle.svelte):
  the species fallback chain, the `context.classes` entries (name + levels +
  spellcasting ability/DC) and the XP block with its editable value and meter.
  The editable name and XP inputs reuse TextInputQuadrone exactly as the
  quadrone character sheet header does.

  Height budget: the banner is a fixed strip, so both additions are
  height-neutral. The spellcasting DC rides inside the existing class span, and
  the XP meter is a 2px track absolutely positioned under the level row (it
  lives in the banner's own bottom padding rather than adding a flow row).
-->
<script lang="ts">
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  // Copied from quadrone CharacterSubtitle: race may be an embedded item
  // (with `name`) or a plain string on older/imported actors.
  let species = $derived.by<string | undefined>(() => {
    if (context.system.details.race?.name) {
      return context.system.details.race.name;
    } else if (context.system.details.race) {
      return context.system.details.race;
    }
  });

  let level = $derived(context.system.details.level ?? 0);

  // XP is optional: hide the whole block when the world/actor has no XP data.
  let xp = $derived(context.system.details?.xp);

  let showXp = $derived(
    context.enableXp && !!xp && Number.isFinite(xp.max) && xp.max > 0,
  );

  /** Clamped so a fractional/overflowing pct can never widen the track. */
  let xpPct = $derived(Math.clamp(xp?.pct ?? 0, 0, 100));

  let appId = $derived(context.actor.uuid.slugify());
</script>

<div class="ddb-header-tidbits" data-tidy-sheet-part="ddb-header-tidbits">
  <div class="ddb-header-name-row">
    {#if context.unlocked}
      <TextInputQuadrone
        field="name"
        document={context.actor}
        value={context.actor.name}
        class="ddb-character-name"
        data-tidy-sheet-part="actor-name"
        data-tooltip={context.actor.name}
        data-tooltip-direction="UP"
      />
    {:else}
      <!--
        The tooltip carries the full name for the truncated case. Direction UP
        so it never lands on the species/class/DC line directly beneath it —
        hovering the name to read it was covering the very row it belongs with.
      -->
      <!-- DDB-FORK (matrix-sheet 6.3): the locked name is also the copy-name
           affordance quadrone offers at CharacterSheet.svelte:159, routed
           through the same registered `copyInnerText` action. -->
      <h1
        class="ddb-character-name"
        data-tidy-sheet-part="actor-name"
        data-action="copyInnerText"
        data-tooltip={context.actor.name}
        data-tooltip-direction="UP"
      >
        {context.actor.name}
      </h1>
    {/if}
  </div>

  <div class="ddb-header-summary" data-tidy-sheet-part="ddb-header-summary">
    {#if species}
      <span class="ddb-header-species">{species}</span>
    {/if}
    {#each context.classes as entry (entry.uuid)}
      <span class="ddb-header-class">
        <span class="ddb-header-class-name">{entry.name}</span>
        <span class="ddb-header-class-level">{entry.levels}</span>
        <!--
          Per-class spell save DC, as quadrone's subtitle renders it. `ability`
          is already the localized uppercase abbreviation
          (Tidy5eActorSheetQuadroneBase._getClassesAndOrphanedSubclasses).
        -->
        {#if entry.spellcasting?.ability}
          <span class="ddb-header-class-dc">
            <span class="ddb-header-class-dc-label">
              {entry.spellcasting.ability}
              {localize('DND5E.AbbreviationDC')}
            </span>
            <span class="ddb-header-class-dc-value">
              {entry.spellcasting.dc}
            </span>
          </span>
        {/if}
      </span>
    {/each}
  </div>

  <div class="ddb-header-level-row">
    <span class="ddb-header-level">
      <span class="ddb-header-level-label">{localize('DND5E.Level')}</span>
      <span class="ddb-header-level-value">{level}</span>
    </span>
    {#if showXp}
      <span class="ddb-header-xp">
        <span class="ddb-header-xp-label">
          {localize('DND5E.ExperiencePoints.Abbreviation')}
        </span>
        <!--
          Editable in unlocked mode, exactly as the quadrone subtitle does it:
          same component, same field, same delta/select-on-focus behaviour.
        -->
        {#if context.unlocked}
          <TextInputQuadrone
            id="{appId}-ddb-header-xp"
            document={context.actor}
            field="system.details.xp.value"
            value={xp.value}
            class="ddb-header-xp-input"
            enableDeltaChanges={true}
            selectOnFocus={true}
            blurAfterChange={true}
            aria-label={localize('DND5E.ExperiencePoints.Label')}
          />
        {:else}
          <span class="ddb-header-xp-value">
            {FoundryAdapter.formatNumber(xp.value)}
          </span>
        {/if}
        <span class="ddb-header-xp-separator">/</span>
        <span class="ddb-header-xp-max">
          {FoundryAdapter.formatNumber(xp.max)}
        </span>
      </span>

      <!--
        DDB's thin progress rule under the level line. Absolutely positioned so
        it costs the fixed-height banner no vertical space; hidden while
        unlocked, matching quadrone (the meter would fight the input row).
      -->
      {#if !context.unlocked}
        <div
          class="ddb-header-xp-bar"
          data-tidy-sheet-part="xp-bar"
          role="progressbar"
          aria-label={localize('DND5E.ExperiencePoints.Progress')}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={xpPct}
        >
          <span class="ddb-header-xp-bar-fill" style="width: {xpPct}%"></span>
        </div>
      {/if}
    {/if}
  </div>
</div>
