<!--
  DDB-FORK: the class header for the Features & Traits tab (user request
  2026-10-05): one card per class item with its subclass ("Paladin / Oath of
  Vengeance"), level and hit die, in the tab's header area like the Spells
  tab's spellcasting strip (DdbSpellcastingStrip). Multiclass actors get one
  card per class, highest level first.

  The class and subclass names are detail triggers (`data-ddb-detail=
  "item:<uuid>"`, routed by DdbCharacterSheet's capture listener into the
  Details pane, whose Open Sheet button reaches the full item sheet), like
  the skill chips and condition chips elsewhere on the sheet.

  Data: `actor.itemTypes.class` / `.subclass`; dnd5e pairs them through the
  class item's `subclass` getter, with `system.classIdentifier` as the
  fallback.

  DOM contract: div.ddb-tab-strip.ddb-class-strip[data-tidy-sheet-part="ddb-class-strip"] >
    section.ddb-tab-strip-card.ddb-class-card[data-class-identifier][data-class-item-id] >
      img.ddb-class-img
      .ddb-tab-strip-card-header > button.ddb-class-name[data-ddb-detail]
        + button.ddb-subclass-name[data-ddb-detail] (or span.ddb-subclass-name.empty)
      .ddb-tab-strip-stats > .ddb-tab-strip-stat[data-stat="level" | "hit-die"] > .value + .label
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';

  const localize = FoundryAdapter.localize;

  let context = $derived(getCharacterSheetQuadroneContext());

  type ClassEntry = {
    cls: any;
    subclass: any | undefined;
    levels: number;
    hitDie: string;
  };

  let classes = $derived.by((): ClassEntry[] => {
    const actor: any = context.actor;
    const classItems: any[] = actor?.itemTypes?.class ?? [];
    const subclasses: any[] = actor?.itemTypes?.subclass ?? [];

    return [...classItems]
      .sort(
        (a, b) =>
          Number(b.system?.levels ?? 0) - Number(a.system?.levels ?? 0) ||
          String(a.name).localeCompare(String(b.name)),
      )
      .map((cls) => ({
        cls,
        subclass:
          cls.subclass ??
          subclasses.find(
            (s) => s.system?.classIdentifier === cls.system?.identifier,
          ),
        levels: Number(cls.system?.levels ?? 0),
        hitDie: String(
          cls.system?.hd?.denomination ?? cls.system?.hitDice ?? '',
        ),
      }));
  });
</script>

{#if classes.length}
  <div
    class={['ddb-tab-strip', 'ddb-class-strip', { multiclass: classes.length > 1 }]}
    data-tidy-sheet-part="ddb-class-strip"
  >
    {#each classes as entry (entry.cls.id)}
      <section
        class="ddb-tab-strip-card ddb-class-card"
        data-class-identifier={entry.cls.system?.identifier}
        data-class-item-id={entry.cls.id}
        aria-label={entry.cls.name}
      >
        <img class="ddb-class-img" src={entry.cls.img} alt="" />
        <header class="ddb-tab-strip-card-header">
          <button
            type="button"
            class="ddb-tab-strip-title ddb-class-name"
            data-ddb-detail="item:{entry.cls.uuid}"
            data-tooltip={localize('TYPES.Item.class')}
          >
            {entry.cls.name}
          </button>
          {#if entry.subclass}
            <button
              type="button"
              class="ddb-tab-strip-subtitle ddb-subclass-name"
              data-ddb-detail="item:{entry.subclass.uuid}"
              data-tooltip={localize('TYPES.Item.subclass')}
            >
              {entry.subclass.name}
            </button>
          {:else}
            <span class="ddb-tab-strip-subtitle ddb-subclass-name empty"
              >{localize('TYPES.Item.subclass')}: &mdash;</span
            >
          {/if}
        </header>
        <div class="ddb-tab-strip-stats">
          <div class="ddb-tab-strip-stat" data-stat="level">
            <span class="value">{entry.levels}</span>
            <span class="label">{localize('DND5E.Level')}</span>
          </div>
          {#if entry.hitDie}
            <div class="ddb-tab-strip-stat" data-stat="hit-die">
              <span class="value">{entry.hitDie}</span>
              <span class="label">{localize('DND5E.HitDice')}</span>
            </div>
          {/if}
        </div>
      </section>
    {/each}
  </div>
{/if}
