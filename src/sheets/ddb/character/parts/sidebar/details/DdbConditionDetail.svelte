<!--
  DDB-FORK: condition detail in the sidebar pane — the condition's name and
  icon, the character's current exhaustion level where it applies, and the
  enriched rules page (`CONFIG.DND5E.conditionTypes[key].reference`).

  Wave 2 ships the view; Wave 5 adds the triggers on the condition chips and
  picker rows (`data-ddb-detail="condition:<key>"`) and the exhaustion table.
-->
<script lang="ts">
  import type { ConditionType } from 'src/foundry/config.types';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { DdbDetailStat } from 'src/sheets/ddb/features/detail/detail-stats';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import DdbDetailHeader from './DdbDetailHeader.svelte';
  import DdbDetailRuleText from './DdbDetailRuleText.svelte';
  import DdbDetailStatStrip from './DdbDetailStatStrip.svelte';

  interface Props {
    key: string;
  }

  let { key }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let config = $derived(
    (
      CONFIG.DND5E.conditionTypes as unknown as Record<
        string,
        ConditionType | undefined
      >
    )[key],
  );

  let name = $derived(config?.name ? localize(config.name) : key);

  let stats = $derived.by(() => {
    const result: DdbDetailStat[] = [];

    if (key === 'exhaustion') {
      const level = context.system?.attributes?.exhaustion;
      if (typeof level === 'number') {
        result.push({
          key: 'level',
          label: localize('DND5E.Level'),
          value: String(level),
        });
      }
    }

    return result;
  });
</script>

<article class="ddb-detail ddb-condition-detail" data-condition={key}>
  <DdbDetailHeader
    {name}
    img={config?.img}
    subtitle={localize('DND5E.Rule.Type.Condition')}
  />

  <DdbDetailStatStrip {stats} />

  <DdbDetailRuleText reference={config?.reference} />
</article>
