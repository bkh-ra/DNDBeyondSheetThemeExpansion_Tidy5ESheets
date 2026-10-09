<!--
  DDB-FORK: D&D Beyond's spellcasting header for the Spells tab (ddb-next
  Wave 3): per spellcasting class, MODIFIER / SPELL ATTACK / SAVE DC (and
  PREPARED where the class prepares a fixed number), plus MANAGE SPELLS.

  Data: `context.spellcasting`, the same entries quadrone's spellbook footer
  cards render (ActorSpellbookFooter -> SpellcastingClassSummaryCard). This
  strip replaces those cards on the DDB sheet; actions-spells.css hides
  `.spellbook-footer .spellcasting-cards` but keeps the rest of the footer.

  MANAGE SPELLS opens the sheet's own dialog (features/spells/
  ddb-manage-spells.ts, user request 2026-10-09): the character's spells by
  level with Remove, and "Add spells..." into dnd5e's Compendium Browser for
  the class (spell list + slot-level lock) with anything already on the sheet
  skipped. The world setting ddbPlayersCanManageSpells lets a GM lock players
  out of adding and removing there. (Wave 3 sent the button straight to the
  browser, which knew nothing about the sheet.)

  DOM contract: div.ddb-spellcasting-strip >
    section.ddb-spellcasting-card[data-class-identifier][data-ability] >
      .ddb-spellcasting-stat[data-stat="modifier" | "attack" | "dc" |
        "prepared"] > .value + .label
      button.ddb-manage-spells[data-class-identifier]
-->
<script lang="ts">
  import { useTabStripHeight } from './tab-strip.svelte';
  import { openManageSpells } from '../../features/spells/ddb-manage-spells';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { SpellcastingClassContext } from 'src/types/types';

  const localize = FoundryAdapter.localize;

  let context = $derived(getCharacterSheetQuadroneContext());

  let classes = $derived(
    (context.spellcasting ?? []).filter(
      (info): info is SpellcastingClassContext =>
        info.type === 'class' || info.type === 'subclass',
    ),
  );

  let busy = $state(false);

  /** Pinned strip slot (tab-strips.css section 0); height published for the pills. */
  const stripHeight = useTabStripHeight();

  async function manageSpells(info: SpellcastingClassContext) {
    const sheet: any = context.sheet ?? context.actor.sheet;

    if (busy || !sheet) {
      return;
    }

    busy = true;

    try {
      await openManageSpells(sheet, context.actor, info);
    } finally {
      busy = false;
    }
  }
</script>

{#if classes.length}
  <div
    class={['ddb-spellcasting-strip', 'ddb-tab-strip', { multiclass: classes.length > 1 }]}
    data-tidy-sheet-part="ddb-spellcasting-strip"
    {@attach stripHeight}
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
            onclick={() => manageSpells(info)}
          >
            {localize('TIDY5E.DdbLayout.Spells.ManageSpells')}
          </button>
        {/if}
      </section>
    {/each}
  </div>
{/if}
