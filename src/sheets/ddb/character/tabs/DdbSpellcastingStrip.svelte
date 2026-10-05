<!--
  DDB-FORK: D&D Beyond's spellcasting header for the Spells tab (ddb-next
  Wave 3): per spellcasting class, MODIFIER / SPELL ATTACK / SAVE DC (and
  PREPARED where the class prepares a fixed number), plus MANAGE SPELLS.

  Data: `context.spellcasting`, the same entries quadrone's spellbook footer
  cards render (ActorSpellbookFooter -> SpellcastingClassSummaryCard). This
  strip replaces those cards on the DDB sheet; actions-spells.css hides
  `.spellbook-footer .spellcasting-cards` but keeps the rest of the footer.

  MANAGE SPELLS opens dnd5e's Compendium Browser in selection mode, locked to
  spells on the class's spell list (`spelllist: { 'class:<id>': 1 }`, the
  filter dnd5e 5.3 registers for spells; spells have no `class` filter) up to
  the highest slot level the actor has, and
  creates the chosen spells through the sheet's own drop pipeline with
  `system.sourceItem = 'class:<id>'` (dnd5e 5.3's successor of the
  deprecated `sourceClass`, which it migrates to exactly that string).

  DOM contract: div.ddb-spellcasting-strip >
    section.ddb-spellcasting-card[data-class-identifier][data-ability] >
      .ddb-spellcasting-stat[data-stat="modifier" | "attack" | "dc" |
        "prepared"] > .value + .label
      button.ddb-manage-spells[data-class-identifier]
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { SpellcastingClassContext } from 'src/types/types';
  import { error } from 'src/utils/logging';

  const localize = FoundryAdapter.localize;

  let context = $derived(getCharacterSheetQuadroneContext());

  let classes = $derived(
    (context.spellcasting ?? []).filter(
      (info): info is SpellcastingClassContext =>
        info.type === 'class' || info.type === 'subclass',
    ),
  );

  let busy = $state(false);

  /**
   * The highest spell level the actor has slots for (leveled or pact), so the
   * browser offers what can actually be cast, as D&D Beyond's list does.
   * 0 = no slots at all: no level lock then (a slotless caster may still be
   * adding spells for later levels).
   */
  function maxSlotLevel(): number {
    let max = 0;

    for (const [key, slot] of Object.entries<any>(
      context.actor.system.spells ?? {},
    )) {
      if (!(Number(slot?.max) > 0)) {
        continue;
      }

      const level = Number(slot.level ?? key.replace(/^spell/, ''));
      if (Number.isFinite(level)) {
        max = Math.max(max, level);
      }
    }

    return max;
  }

  async function manageSpells(info: SpellcastingClassContext, event: Event) {
    const sheet: any = context.sheet ?? context.actor.sheet;

    if (busy || !context.editable || !sheet) {
      return;
    }

    busy = true;

    try {
      const sourceItem = `class:${info.classIdentifier}`;

      const additional: Record<string, any> = {
        spelllist: { [sourceItem]: 1 },
      };

      const maxLevel = maxSlotLevel();
      if (maxLevel > 0) {
        additional.level = { min: 0, max: maxLevel };
      }

      const selected: Set<string> | null =
        await dnd5e.applications.CompendiumBrowser.select(
          {
            filters: {
              locked: {
                documentClass: 'Item',
                types: new Set([CONSTANTS.ITEM_TYPE_SPELL]),
                additional,
              },
            },
            selection: { min: 1 },
            tab: 'spells',
          },
          sheet._detachOptions?.() ?? {},
        );

      if (!selected?.size) {
        return;
      }

      const documents = await Promise.all(
        [...selected].map((uuid) => fromUuid(uuid)),
      );

      const itemData = documents
        .filter((doc: any) => doc?.type === CONSTANTS.ITEM_TYPE_SPELL)
        .map((doc: any) => {
          const data = game.items.fromCompendium(doc);
          foundry.utils.setProperty(data, 'system.sourceItem', sourceItem);
          return data;
        });

      if (itemData.length) {
        await sheet._onDropItemCreate(itemData, event, 'copy');
      }
    } catch (e) {
      error('Manage Spells failed', false, e);
    } finally {
      busy = false;
    }
  }
</script>

{#if classes.length}
  <div
    class={['ddb-spellcasting-strip', { multiclass: classes.length > 1 }]}
    data-tidy-sheet-part="ddb-spellcasting-strip"
  >
    {#each classes as info (info.uuid ?? info.classIdentifier)}
      <section
        class={['ddb-spellcasting-card', { primary: info.primary }]}
        data-class-identifier={info.classIdentifier}
        data-ability={info.ability.key}
        aria-label={info.name}
      >
        <header class="ddb-spellcasting-card-header">
          <span class="ddb-spellcasting-class-name">{info.name}</span>
          <span
            class="ddb-spellcasting-ability"
            data-tooltip={localize('DND5E.SpellAbility') +
              ': ' +
              info.ability.label}>{info.ability.abbreviation}</span
          >
        </header>
        <div class="ddb-spellcasting-stats">
          <div class="ddb-spellcasting-stat" data-stat="modifier">
            <span class="value"
              ><span class="sign">{info.ability.mod.sign}</span
              >{info.ability.mod.value}</span
            >
            <span class="label"
              >{localize('TIDY5E.DdbLayout.Spells.Modifier')}</span
            >
          </div>
          <div class="ddb-spellcasting-stat" data-stat="attack">
            <span class="value"
              ><span class="sign">{info.attack.mod.sign}</span
              >{info.attack.mod.value}</span
            >
            <span class="label"
              >{localize('TIDY5E.DdbLayout.Spells.SpellAttack')}</span
            >
          </div>
          <div class="ddb-spellcasting-stat" data-stat="dc">
            <span class="value">{info.save}</span>
            <span class="label">{localize('TIDY5E.DdbLayout.Spells.SaveDC')}</span
            >
          </div>
          {#if info.prepared?.max}
            <div class="ddb-spellcasting-stat" data-stat="prepared">
              <span class="value"
                >{info.prepared.value}<span class="max"
                  >/{info.prepared.max}</span
                ></span
              >
              <span class="label"
                >{localize('TIDY5E.DdbLayout.Spells.Prepared')}</span
              >
            </div>
          {/if}
        </div>
        {#if context.editable}
          <button
            type="button"
            class="ddb-manage-spells"
            data-class-identifier={info.classIdentifier}
            disabled={busy}
            onclick={(event) => manageSpells(info, event)}
          >
            {localize('TIDY5E.DdbLayout.Spells.ManageSpells')}
          </button>
        {/if}
      </section>
    {/each}
  </div>
{/if}
