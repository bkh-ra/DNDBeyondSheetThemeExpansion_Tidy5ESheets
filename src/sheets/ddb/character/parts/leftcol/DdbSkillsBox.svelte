<!--
  DDB-FORK: SKILLS box (the tall second column of the left group).

  Column order is DDB's: PROF | MOD | SKILL | BONUS. Roll wiring, proficiency
  cycling and the unlocked-mode ability picker are taken from
  `src/sheets/quadrone/actor/parts/skills/SkillsCard.svelte`; only the
  presentation differs (bordered bonus chip, CSS pip, no passive column — the
  passives live in the Senses box on this layout).

  DETAILS (Wave 2): the bonus chip doubles as the skill's detail trigger — a
  transparent `button.ddb-detail-trigger[data-ddb-detail="skill:<key>"]`
  overlaid on the bonus cell (the chip itself is untouched, so nothing moves),
  handled by the sheet root's capture listener. The skill NAME keeps rolling
  unless the user prefers `skillClick: 'details'` (handled in the sheet's
  `_roll` seam).
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { CONSTANTS } from 'src/constants';
  import SelectQuadrone from 'src/components/inputs/SelectQuadrone.svelte';
  import SelectOptions from 'src/components/inputs/SelectOptions.svelte';
  import { getModifierData } from 'src/utils/formatting';
  import { isNil } from 'src/utils/data';
  import { SettingsProvider } from 'src/settings/settings.svelte';
  import { TidyFlags } from 'src/foundry/TidyFlags';
  import { DDB_CONSTANTS, DDB_LANG } from 'src/sheets/ddb/ddb-constants';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import { DdbPreferences } from 'src/sheets/ddb/DdbPreferences';
  import DdbBox from './DdbBox.svelte';
  import DdbProficiencyPip from './DdbProficiencyPip.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let detailsEnabled = $derived(
    DdbPreferences.fromUserPreferences(context.userPreferences)
      .detailsPaneEnabled,
  );

  /*
    DDB-FORK (F10): honor `TidyFlags.skillsExpanded`, exactly as
    `quadrone/actor/parts/skills/SkillsCard.svelte:42-50` does — collapsed
    shows proficient skills only. Without this the left column and the DDB
    sidebar's Skills & Traits card (which hosts the quadrone SkillsCard) could
    show two disagreeing lists on one sheet.

    `localExpanded` reproduces SkillsCardHeader's optimistic toggle for viewers
    who cannot write the flag; the effect clears it whenever the stored value
    changes, so a toggle made anywhere else on the sheet always wins — the same
    net behavior as quadrone re-passing its `expanded` prop.
  */
  let flagExpanded = $derived(
    TidyFlags.skillsExpanded.get(context.actor) ?? true,
  );

  let localExpanded = $state<boolean | undefined>(undefined);

  $effect(() => {
    flagExpanded;
    localExpanded = undefined;
  });

  let expanded = $derived(localExpanded ?? flagExpanded);

  let skills = $derived(
    expanded ? context.skills : context.skills.filter((s) => s.proficient !== 0),
  );

  let expandCollapseLabel = $derived(
    expanded
      ? localize('TIDY5E.Ddb.Skills.ShowProficientOnly')
      : localize('TIDY5E.Ddb.Skills.ShowAll'),
  );

  async function toggleExpanded() {
    const newValue = !expanded;
    localExpanded = newValue;

    if (context.editable) {
      await TidyFlags.skillsExpanded.set(context.actor, newValue);
    }
  }

  let references = $derived(
    SettingsProvider.settings.referenceTooltipSkill.get()
      ? context.skills.reduce<Record<string, string>>((prev, skill) => {
          const ref = CONFIG.DND5E.skills[skill.key]?.reference;
          if (!isNil(ref, '')) {
            prev[skill.key] = ref;
          }
          return prev;
        }, {})
      : {},
  );
</script>

<DdbBox
  class={['ddb-skills-box', { unlocked: context.unlocked }]}
  title={localize('DND5E.Skills')}
  sheetPart="ddb-skills-box"
>
  <div class="ddb-skills-header">
    <span class="ddb-skills-col-prof">{localize('TIDY5E.AbbrProficiency')}</span>
    <!-- Abbreviated, like DDB's own "MOD": the ability column is only wide
         enough for the three-letter abbreviations it holds. -->
    <span class="ddb-skills-col-mod">{localize('TIDY5E.AbbrMod')}</span>
    <!-- DDB-FORK (F10): the SKILL column label doubles as the expand/collapse
         control, the DDB-token equivalent of quadrone's SkillsCardHeader. -->
    <span class="ddb-skills-col-skill">
      <button
        type="button"
        class="ddb-skills-expand"
        aria-expanded={expanded}
        aria-label={expandCollapseLabel}
        data-tooltip={expandCollapseLabel}
        onclick={toggleExpanded}
      >
        {localize('DND5E.Skill')}
        <i class={['fa-solid fa-angle-right', { expanded }]}></i>
      </button>
    </span>
    <span class="ddb-skills-col-bonus">{localize('DND5E.Bonus')}</span>
    {#if context.unlocked}
      <span class="ddb-skills-col-config" aria-hidden="true"></span>
    {/if}
  </div>

  <ul
    class="ddb-skills-list"
    data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.SKILLS_LIST}
  >
    {#each skills as skill (skill.key)}
      {@const modifier = getModifierData(skill.total)}
      <li
        class="ddb-skill-row"
        data-reference-tooltip={references[skill.key]}
        data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.SKILL_CONTAINER}
        data-key={skill.key}
      >
        <span class="ddb-skills-col-prof">
          <DdbProficiencyPip
            actor={context.actor}
            aria-label={localize(skill.hover)}
            data-tooltip=""
            disabled={!context.unlocked}
            path="system.skills.{skill.key}.value"
            type="skill"
            value={context.unlocked ? (skill.source?.value ?? 0) : skill.value}
          />
        </span>

        <span class="ddb-skills-col-mod">
          {#if context.unlocked}
            <SelectQuadrone
              document={context.actor}
              field="system.skills.{skill.key}.ability"
              value={skill.baseAbility}
              class="ddb-skill-ability-select"
            >
              <SelectOptions
                data={context.config.abilities}
                labelProp="abbreviation"
              />
            </SelectQuadrone>
          {:else}
            <!--
              Locked mode: the abbreviation opens the skill-roll context menu
              (roll with a different ability), exactly as SkillsCard does.
            -->
            <button
              type="button"
              class="ddb-skill-ability ddb-skill-ability-button"
              data-action="showContextMenu"
              data-target-selector="[data-context-menu]"
              data-context-menu={CONSTANTS.CONTEXT_MENU_TYPE_SKILL_ROLL}
            >
              {skill.abbreviation}
            </button>
          {/if}
        </span>

        <button
          type="button"
          class="ddb-skills-col-skill ddb-skill-name"
          data-action="roll"
          data-type="skill"
          data-key={skill.key}
          data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.SKILL_ROLLER}
          data-tidy-draggable
          data-context-menu={CONSTANTS.CONTEXT_MENU_TYPE_KEYED_FAVORITE}
          data-has-roll-modes
          disabled={!context.owner}
        >
          {skill.label}
        </button>

        <span class="ddb-skills-col-bonus">
          <span class="ddb-skill-bonus ddb-chip ddb-chip-value">
            <span class="ddb-sign">{modifier.sign}</span>{modifier.value}
          </span>
          {#if detailsEnabled}
            <button
              type="button"
              class="ddb-detail-trigger ddb-detail-trigger--overlay"
              data-ddb-detail="skill:{skill.key}"
              data-tidy-sheet-part={DDB_CONSTANTS.SHEET_PARTS.DETAIL_TRIGGER}
              aria-label={ddbLocalize(DDB_LANG.DETAIL_SHOW, {
                name: skill.label,
              })}
            ></button>
          {/if}
        </span>

        {#if context.unlocked}
          <span class="ddb-skills-col-config">
            <button
              type="button"
              class="ddb-gear"
              aria-label={localize('DND5E.SkillConfigure')}
              data-tooltip="DND5E.SkillConfigure"
              data-action="showConfiguration"
              data-config="skill"
              data-key={skill.key}
            >
              <i class="fa-solid fa-cog"></i>
            </button>
          </span>
        {/if}
      </li>
    {/each}
  </ul>

  {#snippet gear()}
    {#if context.unlocked}
      <button
        type="button"
        class="ddb-gear"
        aria-label={localize('DND5E.Skills')}
        data-action="showConfiguration"
        data-config="skills"
      >
        <i class="fa-solid fa-cog"></i>
      </button>
    {/if}
  {/snippet}
</DdbBox>
