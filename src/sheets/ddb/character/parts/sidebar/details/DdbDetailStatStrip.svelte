<!--
  DDB-FORK: the detail pane's stat strip — DDB's compact "CASTING TIME /
  RANGE / COMPONENTS / DURATION …" grid. Entries come pre-built from
  `features/detail/detail-stats.ts`; empty values never reach this component.
  Each entry carries `data-stat=<key>` for styling and the audit harness.
-->
<script lang="ts">
  import type { DdbDetailStat } from 'src/sheets/ddb/features/detail/detail-stats';

  interface Props {
    stats: DdbDetailStat[];
  }

  let { stats }: Props = $props();
</script>

{#if stats.length}
  <dl class="ddb-detail-stats">
    {#each stats as stat (stat.key)}
      <div class="ddb-detail-stat" data-stat={stat.key}>
        <dt class="ddb-detail-stat-label">{stat.label}</dt>
        <dd class="ddb-detail-stat-value">{stat.value}</dd>
      </div>
    {/each}
  </dl>
{/if}
