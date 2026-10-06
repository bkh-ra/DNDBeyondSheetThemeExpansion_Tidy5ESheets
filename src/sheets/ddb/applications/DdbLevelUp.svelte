<!--
  DDB-FORK (ddb-next Wave 4): body of `DdbLevelUpDialog` - class select,
  levels to add, Apply.

  DOM contract: `select[name="classId"]`, `select[name="levels"]`,
  `button[data-ddb-level-up-apply]`; with no class item, `.ddb-level-up-empty`.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { DdbLevelUpDialog } from './DdbLevelUpDialog.svelte';
  import { untrack } from 'svelte';

  interface Props {
    app: DdbLevelUpDialog;
  }

  let { app }: Props = $props();

  const localize = FoundryAdapter.localize;

  let context = $derived(app._context.data);

  const idPrefix = `ddb-level-up-${foundry.utils.randomID()}`;

  let classId = $state(untrack(() => app._context.data?.defaultClassId ?? ''));

  let levels = $state(1);

  // A class deleted while the dialog is open falls back to the default.
  $effect(() => {
    if (context && !context.classes.some((c) => c.id === classId)) {
      untrack(() => (classId = context.defaultClassId));
    }
  });

  /** How many levels may still be added before the level cap. */
  let headroom = $derived(
    context ? Math.max(0, context.maxLevel - context.level) : 0,
  );

  // Keep the chosen count valid if the level changes underneath.
  $effect(() => {
    if (levels > headroom) {
      untrack(() => (levels = Math.max(1, headroom)));
    }
  });

  let selectedClass = $derived(context?.classes.find((c) => c.id === classId));

  let applying = $state(false);

  async function apply() {
    if (applying || !selectedClass || headroom < 1) {
      return;
    }

    applying = true;

    try {
      await app.apply(classId, levels);
    } finally {
      applying = false;
    }
  }
</script>

<div class="ddb-level-up" data-tidy-sheet-part="ddb-level-up">
  {#if !context?.classes.length}
    <p class="ddb-level-up-empty">
      {localize('TIDY5E.DdbLayout.LevelUp.NoClass')}
    </p>
  {:else}
    <div class="ddb-prefs-row">
      <label class="ddb-prefs-label" for="{idPrefix}-class">
        {localize('TIDY5E.DdbLayout.LevelUp.Class')}
      </label>
      <div class="ddb-prefs-control">
        <select id="{idPrefix}-class" name="classId" bind:value={classId}>
          {#each context.classes as option (option.id)}
            <option value={option.id}>
              {option.name} ({option.levels})
            </option>
          {/each}
        </select>
      </div>
    </div>

    <div class="ddb-prefs-row">
      <label class="ddb-prefs-label" for="{idPrefix}-levels">
        {localize('TIDY5E.DdbLayout.LevelUp.Levels')}
      </label>
      <div class="ddb-prefs-control">
        <select
          id="{idPrefix}-levels"
          name="levels"
          bind:value={levels}
          disabled={headroom < 1}
        >
          {#each Array.fromRange(Math.max(headroom, 1), 1) as count (count)}
            <option value={count}>+{count}</option>
          {/each}
        </select>
      </div>
    </div>

    <p class="ddb-level-up-summary" data-ddb-level-up-summary>
      <span class="ddb-level-up-from">
        {localize('DND5E.LevelNumber', { level: context.level })}
      </span>
      <i class="fa-solid fa-arrow-right-long" aria-hidden="true"></i>
      <span class="ddb-level-up-to">
        {localize('DND5E.LevelNumber', {
          level: Math.min(context.maxLevel, context.level + levels),
        })}
      </span>
      {#if selectedClass}
        <span class="ddb-level-up-class">
          {selectedClass.name}
          {selectedClass.levels} &rarr; {selectedClass.levels + levels}
        </span>
      {/if}
    </p>

    <div class="ddb-prefs-actions">
      <button
        type="button"
        class="ddb-level-up-apply"
        data-ddb-level-up-apply
        disabled={applying || headroom < 1 || !selectedClass}
        onclick={apply}
      >
        <i class="fa-solid fa-circle-up" aria-hidden="true"></i>
        {localize('TIDY5E.DdbLayout.LevelUp.Apply')}
      </button>
    </div>
  {/if}
</div>
