<!--
  DDB-FORK: ability / saving-throw detail in the sidebar pane.

  One view for both kinds: the ability's score, modifier, save and save
  proficiency from `context.abilities`, with a Check and a Save roll button.
  Both carry the sheet's own `roll` action contract — the save button adds
  the `saving-throw` class that routes `#roll` to `_rollSavingThrow`, the same
  contract as quadrone's AbilityScore and the DDB ability box. The kind only
  decides which roll leads and which rules page is shown (the ability's page,
  or the saving-throw rule for a save).
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { DdbDetailStat } from 'src/sheets/ddb/features/detail/detail-stats';
  import { getRuleReference } from 'src/sheets/ddb/features/detail/rule-text';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { formatAsModifier } from 'src/utils/formatting';
  import DdbDetailHeader from './DdbDetailHeader.svelte';
  import DdbDetailRuleText from './DdbDetailRuleText.svelte';
  import DdbDetailStatStrip from './DdbDetailStatStrip.svelte';

  interface Props {
    kind: 'ability' | 'save';
    key: string;
  }

  let { kind, key }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let ability = $derived(context.abilities.find((entry) => entry.key === key));
  let config = $derived(CONFIG.DND5E.abilities[key]);

  let name = $derived(localize(ability?.label ?? config?.label ?? key));

  let subtitle = $derived(
    localize(kind === 'save' ? 'DND5E.SavingThrow' : 'DND5E.ActionAbil'),
  );

  let checkLabel = $derived(localize('DND5E.ActionAbil'));
  let saveLabel = $derived(localize('DND5E.SavingThrow'));

  let stats = $derived.by(() => {
    if (!ability) {
      return [];
    }

    const result: DdbDetailStat[] = [
      {
        key: 'score',
        label: localize('DND5E.AbilityScore'),
        value: String(ability.value ?? ''),
      },
      {
        key: 'modifier',
        label: localize('DND5E.Modifier'),
        value: formatAsModifier(ability.mod),
      },
      {
        key: 'save',
        label: saveLabel,
        value: formatAsModifier(ability.save?.value ?? 0),
      },
    ];

    const proficiency = CONFIG.DND5E.proficiencyLevels[ability.proficient];
    if (proficiency) {
      result.push({
        key: 'saveProficiency',
        label: localize('DND5E.Proficiency'),
        value: localize(proficiency),
      });
    }

    return result;
  });

  let reference = $derived(
    kind === 'save'
      ? (getRuleReference('savingthrow', 'savingthrows') ?? config?.reference)
      : config?.reference,
  );
</script>

{#snippet checkButton(primary: boolean)}
  <button
    type="button"
    class={[
      'ddb-detail-button ddb-detail-roll ddb-detail-roll-check',
      { 'ddb-detail-button--primary': primary },
    ]}
    data-action="roll"
    data-type="ability"
    data-ability={key}
    data-has-roll-modes
    disabled={!context.owner}
  >
    <i class="fa-solid fa-dice-d20"></i>
    {checkLabel}
  </button>
{/snippet}

{#snippet saveButton(primary: boolean)}
  <button
    type="button"
    class={[
      'ddb-detail-button ddb-detail-roll ddb-detail-roll-save saving-throw',
      { 'ddb-detail-button--primary': primary },
    ]}
    data-action="roll"
    data-type="ability"
    data-ability={key}
    data-has-roll-modes
    disabled={!context.owner}
  >
    <i class="fa-solid fa-shield-heart"></i>
    {saveLabel}
  </button>
{/snippet}

<article
  class={['ddb-detail', 'ddb-ability-detail', `ddb-ability-detail--${kind}`]}
  data-ability={key}
>
  <DdbDetailHeader {name} img={config?.icon} {subtitle}>
    {#snippet actions()}
      {#if kind === 'save'}
        {@render saveButton(true)}
        {@render checkButton(false)}
      {:else}
        {@render checkButton(true)}
        {@render saveButton(false)}
      {/if}
    {/snippet}
  </DdbDetailHeader>

  <DdbDetailStatStrip {stats} />

  <DdbDetailRuleText {reference} />
</article>
