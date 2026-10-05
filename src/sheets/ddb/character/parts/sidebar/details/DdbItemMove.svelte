<!--
  DDB-FORK: "Move to" for a physical item in the detail pane — DDB's item pane
  move control. A plain select of every container on the actor (plus "no
  container"); choosing one writes `system.container`, the same field Tidy's
  drag-and-drop between containers writes.

  The item itself and, for a container, everything nested inside it are not
  offered, so the move can never create a containment loop.
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import { DDB_LANG } from 'src/sheets/ddb/ddb-constants';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { Item5e } from 'src/types/item.types';
  import { error } from 'src/utils/logging';

  interface Props {
    item: Item5e;
    /** Bumped by the pane when the item updates. */
    revision: number;
  }

  let { item, revision }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  let current = $derived.by<string>(() => {
    revision;
    context;
    return item.system?.container ?? '';
  });

  let destinations = $derived.by(() => {
    revision;

    const excluded = new Set<string>([item.id]);

    if (item.type === CONSTANTS.ITEM_TYPE_CONTAINER) {
      const nested = item.system?.allContainedItems;
      if (nested && typeof nested[Symbol.iterator] === 'function') {
        for (const contained of nested) {
          excluded.add(contained.id);
        }
      }
    }

    const containers: Item5e[] = context.actor.itemTypes?.container ?? [];

    return containers
      .filter((container) => !excluded.has(container.id))
      .toSorted((left, right) =>
        (left.name ?? '').localeCompare(right.name ?? '', game.i18n.lang),
      );
  });

  const selectId = $derived(`${context.appId}-ddb-detail-move-${item.id}`);

  async function onMove(
    event: Event & { currentTarget: EventTarget & HTMLSelectElement },
  ) {
    const select = event.currentTarget;
    const value = select.value;

    if (value === current) {
      return;
    }

    try {
      await item.update({ 'system.container': value || null });
    } catch (e) {
      error('Unable to move the item.', true, e);
      select.value = current;
    }
  }
</script>

<div class="ddb-detail-move-row">
  <label class="ddb-detail-move-label" for={selectId}>
    {ddbLocalize(DDB_LANG.DETAIL_MOVE)}
  </label>
  <select
    id={selectId}
    class="ddb-detail-move"
    value={current}
    onchange={onMove}
    disabled={!context.editable}
  >
    <option value="">{ddbLocalize(DDB_LANG.DETAIL_MOVE_NONE)}</option>
    {#each destinations as container (container.id)}
      <option value={container.id}>{container.name}</option>
    {/each}
  </select>
</div>
