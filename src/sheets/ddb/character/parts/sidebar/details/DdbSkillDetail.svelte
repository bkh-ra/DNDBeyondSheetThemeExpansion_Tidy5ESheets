<!--
  DDB-FORK: skill / tool detail in the sidebar pane.

  Values come from the sheet's prepared `context.skills` / `context.tools`
  (the same entries the SKILLS and PROFICIENCIES boxes render). The Roll
  button carries the sheet's own `roll` action contract (`data-action="roll"
  data-type="skill|tool" data-key`), so it rolls through `#roll` exactly as
  the left column does. The rules text is the skill's rules page
  (`CONFIG.DND5E.skills[key].reference`) or, for a tool, its base item.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { DdbDetailStat } from 'src/sheets/ddb/features/detail/detail-stats';
  import { getToolReferenceUuid } from 'src/sheets/ddb/features/detail/rule-text';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { formatAsModifier } from 'src/utils/formatting';
  import DdbDetailHeader from './DdbDetailHeader.svelte';
  import DdbDetailRuleText from './DdbDetailRuleText.svelte';
  import DdbDetailStatStrip from './DdbDetailStatStrip.svelte';

  interface Props {
    kind: 'skill' | 'tool';
    key: string;
  }

  let { kind, key }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let entry = $derived(
    kind === 'skill'
      ? context.skills.find((skill) => skill.key === key)
      : context.tools.find((tool) => tool.key === key),
  );

  let name = $derived.by(() => {
    if (entry?.label) {
      return entry.label;
    }

    if (kind === 'skill') {
      return localize(CONFIG.DND5E.skills[key]?.label ?? key);
    }

    return dnd5e.documents.Trait.keyLabel(key, { trait: 'tool' }) ?? key;
  });

  let img = $derived(
    kind === 'skill' ? CONFIG.DND5E.skills[key]?.icon : undefined,
  );

  let abilityLabel = $derived(
    entry?.ability ? CONFIG.DND5E.abilities[entry.ability]?.label : undefined,
  );

  let subtitle = $derived(
    [
      abilityLabel ? localize(abilityLabel) : '',
      localize(kind === 'skill' ? 'DND5E.Skill' : 'DND5E.ToolCheck'),
    ]
      .filter((part) => part !== '')
      .join(' • '),
  );

  let stats = $derived.by(() => {
    if (!entry) {
      return [];
    }

    const result: DdbDetailStat[] = [
      {
        key: 'modifier',
        label: localize('DND5E.Modifier'),
        value: formatAsModifier(entry.total),
      },
    ];

    if (kind === 'skill' && 'passive' in entry) {
      result.push({
        key: 'passive',
        label: localize('DND5E.Passive'),
        value: String(entry.passive),
      });
    }

    if (abilityLabel) {
      result.push({
        key: 'ability',
        label: localize('DND5E.Ability'),
        value: localize(abilityLabel),
      });
    }

    if (entry.hover) {
      result.push({
        key: 'proficiency',
        label: localize('DND5E.Proficiency'),
        value: localize(entry.hover),
      });
    }

    return result;
  });

  let reference = $derived(
    kind === 'skill'
      ? CONFIG.DND5E.skills[key]?.reference
      : getToolReferenceUuid(key),
  );
</script>

<article class={['ddb-detail', 'ddb-skill-detail', `ddb-skill-detail--${kind}`]}>
  <DdbDetailHeader {name} {img} {subtitle}>
    {#snippet actions()}
      <button
        type="button"
        class="ddb-detail-button ddb-detail-button--primary ddb-detail-roll"
        data-action="roll"
        data-type={kind}
        data-key={key}
        data-has-roll-modes
        disabled={!context.owner}
      >
        <i class="fa-solid fa-dice-d20"></i>
        {localize('DND5E.Roll')}
      </button>
    {/snippet}
  </DdbDetailHeader>

  <DdbDetailStatStrip {stats} />

  <DdbDetailRuleText {reference} />
</article>
