<!--
  DDB-FORK: the PARTY view of the DDB Inventory tab (ddb-next Wave 6): the
  primary party's (`game.actors.party`) inventory, shown inside the character
  sheet. DdbInventoryTab only offers it when the party exists and the user can
  observe it.

  Sections come from `Inventory.getDefaultInventorySections(party, ...)` and
  the shared `InventoryTables`, exactly as the group sheet builds them
  (Tidy5eMultiActorSheetQuadroneBase._prepareItems), sorted / hidden per the
  party's own section configuration.

  Read-only unless the user owns the party. The tables read `editable` /
  `unlocked` / `document` from the sheet context, so this view provides a
  PARTY-scoped copy of the character's context to its subtree (svelte
  context), with editable = owns the party and unlocked = that AND the
  character sheet is in edit mode.

  The character sheet is still the Application around these rows, and its
  form / action handlers resolve a row's item with `actor.items.get(id)` and
  fall back to the CHARACTER when that misses. The guard on this view keeps
  those handlers away from party rows:
    - data-action clicks: uuid-based actions (showDocument, editDocument,
      deleteDocument) pass through; increase / decrease (quantity) and
      transfer-currency are applied to the party's documents here; every
      other action is swallowed.
    - change events of form-routed inputs ([data-name] / [name]) are applied
      to the party item here and never reach the character form.
    - double-click / middle-click open the party item's own sheet.
    - dragstart: the character sheet finds no item, so this view supplies
      the party item's drag data; the drop itself stays Tidy's (dropping on
      the character's Equipment view is the character sheet's _onDrop).
    - drops ON this view go to the party sheet's _onDrop (owners only) and
      never fall through to the character.

  DOM contract:
    div.tab-content.ddb-inventory-view.ddb-inventory-party-view
      [data-tidy-sheet-part="ddb-inventory-party-view"]
      [data-ddb-inventory-view="party"][data-party-id]
      [data-ddb-party-editable="true" | "false"]
      > header.ddb-inventory-view-header
      > .ddb-inventory-party-contents (tables)
      > .ddb-inventory-party-currency.currency-container
-->
<script lang="ts">
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import { CONSTANTS } from 'src/constants';
  import { Activities } from 'src/features/activities/activities';
  import { Container } from 'src/features/containers/Container';
  import type { InlineToggleService } from 'src/features/expand-collapse/InlineToggleService.svelte';
  import type { CoarseReactivityProvider } from 'src/features/reactivity/CoarseReactivityProvider.svelte';
  import { Inventory } from 'src/features/sections/Inventory';
  import { SheetSections } from 'src/features/sections/SheetSections';
  import { UserSheetPreferencesService } from 'src/features/user-preferences/SheetPreferencesService';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { TidyFlags } from 'src/foundry/TidyFlags';
  import { InventoryRowActionRuntime } from 'src/runtime/table-row-actions/InventoryRowActionRuntime.svelte';
  import InventoryTables from 'src/sheets/quadrone/shared/InventoryTables.svelte';
  import type { CurrencyContext, Item5e } from 'src/types/item.types';
  import type {
    Actor5e,
    CharacterSheetQuadroneContext,
    InventorySection,
  } from 'src/types/types';
  import {
    applyNumberInputConstraints,
    processInputChangeDelta,
    shouldParseInputDelta,
  } from 'src/utils/form';
  import { error } from 'src/utils/logging';
  import { getContext, setContext, tick, untrack } from 'svelte';

  interface Props {
    party: Actor5e;
    /** Bumped by DdbInventoryTab when the party or its items change. */
    revision: number;
    /** Called after new rows are in the DOM (re-binds drag and drop). */
    onContentChanged?: () => void;
  }

  let { party, revision, onContentChanged }: Props = $props();

  const localize = FoundryAdapter.localize;

  // The character's context provider, captured BEFORE this component replaces
  // the context key for its children.
  const characterProvider = getContext<
    CoarseReactivityProvider<CharacterSheetQuadroneContext>
  >(CONSTANTS.SVELTE_CONTEXT.CONTEXT);

  const inlineToggleService = getContext<InlineToggleService>(
    CONSTANTS.SVELTE_CONTEXT.INLINE_TOGGLE_SERVICE,
  );

  let characterContext = $derived(characterProvider.data);

  let owner = $derived(revision >= 0 && party.isOwner === true);
  let editable = $derived(owner);
  let unlocked = $derived(editable && characterContext.unlocked);

  type PartyInventory = {
    sections: InventorySection[];
    itemContext: Record<string, any>;
    currencies: CurrencyContext[];
  };

  let partyInventory = $state<PartyInventory | undefined>();

  let partyContext = $derived({
    ...characterContext,
    actor: party,
    document: party,
    owner,
    editable,
    unlocked,
    itemContext: partyInventory?.itemContext ?? {},
    inventory: partyInventory?.sections ?? [],
  } as CharacterSheetQuadroneContext);

  setContext(CONSTANTS.SVELTE_CONTEXT.CONTEXT, {
    get data() {
      return partyContext;
    },
  });

  async function preparePartyInventory(
    target: Actor5e,
    sheet: any,
    options: { editable: boolean; owner: boolean; unlocked: boolean },
  ): Promise<PartyInventory> {
    const sectionOptions = { canCreate: false };
    const inventory = Inventory.getDefaultInventorySections(
      target,
      options,
      sectionOptions,
    );
    const inventoryTypes = Inventory.getInventoryTypes();
    const itemContext: Record<string, any> = {};
    // The context menu resolves rows against the character, so the row
    // "..." button would open nothing for a party item.
    const menuAction = (CONFIG as any).TIDY5E?.features?.rowActions?.inventory
      ?.menu;

    for (const item of target.items as Iterable<Item5e>) {
      if (item.dependentOrigin?.active === false) {
        continue;
      }

      const ctx: Record<string, any> = (itemContext[item.id] = {});

      ctx.attunement = FoundryAdapter.getAttunementContext(item);
      ctx.isStack = item.system.quantity > 1;

      const weight = await item.system.totalWeight;
      ctx.totalWeight =
        typeof weight === 'number' ? weight.toNearest(0.1) : weight;

      if (item.type === CONSTANTS.ITEM_TYPE_CONTAINER) {
        ctx.containerCapacity = await Container.computeCapacity(item);
        ctx.containerContents = await Container.getContainerContents(
          sheet,
          item,
          options,
        );
      }

      if (item.system.activities) {
        ctx.activities = Activities.getVisibleActivities(
          item,
          item.system.activities,
        )?.map((activity: any) =>
          Activities.getActivityItemContext(
            sheet,
            activity,
            options.unlocked,
            options.editable,
          ),
        );
      }

      ctx.rowActions = InventoryRowActionRuntime.getRowActions({
        app: sheet,
        data: options,
        rowDocument: item,
        sheetDocument: target,
      } as any).filter((action: unknown) => action !== menuAction);

      const isWithinContainer = target.items.has(item.system.container);

      if (!isWithinContainer && Inventory.isItemInventoryType(item)) {
        Inventory.applyInventoryItemToSection({
          sheetDocument: target,
          columnOptions: options,
          tabId: CONSTANTS.TAB_ACTOR_INVENTORY,
          inventory,
          item,
          defaultInventoryTypes: inventoryTypes,
          customSectionOptions: sectionOptions,
        });
      }
    }

    const sections = SheetSections.configureInventory(
      Object.values(inventory),
      CONSTANTS.TAB_ACTOR_INVENTORY,
      UserSheetPreferencesService.getByType(target.type),
      TidyFlags.sectionConfig.get(target)?.[CONSTANTS.TAB_ACTOR_INVENTORY],
    );

    const currencies: CurrencyContext[] = Object.keys(
      CONFIG.DND5E.currencies,
    ).map((key) => ({
      key,
      value: (target.system.currency?.[key] ?? 0) as number,
      abbr:
        CONFIG.DND5E.currencies[key as keyof typeof CONFIG.DND5E.currencies]
          ?.abbreviation ?? key,
    }));

    return { sections, itemContext, currencies };
  }

  $effect(() => {
    revision;
    const target = party;
    const options = { editable, owner, unlocked };
    const sheet = untrack(() => characterContext.sheet);
    let cancelled = false;

    preparePartyInventory(target, sheet, options)
      .then(async (prepared) => {
        if (cancelled) {
          return;
        }

        partyInventory = prepared;
        await tick();
        onContentChanged?.();
      })
      .catch((e) =>
        error('Unable to prepare the party inventory.', false, e),
      );

    return () => {
      cancelled = true;
    };
  });

  let itemCount = $derived(
    partyInventory?.sections.reduce((n, s) => n + s.items.length, 0) ?? 0,
  );

  /* ---------------------------------------------------------------- */
  /*  Guard: keep the character sheet's handlers off party rows        */
  /* ---------------------------------------------------------------- */

  const PASS_THROUGH_ACTIONS = new Set([
    'showDocument',
    'editDocument',
    'deleteDocument',
  ]);

  function resolveItem(target: EventTarget | null): Item5e | undefined {
    const element = target instanceof Element ? target : null;
    const itemId = element?.closest<HTMLElement>('[data-item-id]')?.dataset
      .itemId;
    return itemId ? party.items.get(itemId) : undefined;
  }

  async function adjustProperty(actionEl: HTMLElement, amount: number) {
    const item = resolveItem(actionEl);
    const prop = actionEl.dataset.property;

    if (!item || !prop) {
      return;
    }

    const input =
      actionEl.parentElement?.querySelector<HTMLInputElement>('input');
    let value =
      Number(FoundryAdapter.getProperty<number>(item, prop) ?? 0) + amount;
    value = applyNumberInputConstraints(value, input);

    const min = Number(input?.getAttribute('min'));
    if (input?.hasAttribute('min') && !isNaN(min)) {
      value = Math.max(min, value);
    }

    if (!isNaN(value)) {
      await item.update({ [prop]: value });
    }
  }

  async function transferCurrency(actionEl: HTMLElement) {
    const container = party.items.get(actionEl.dataset.itemId ?? '');

    if (!container) {
      return;
    }

    const containerUpdate: Record<string, number> = {};
    const partyUpdate: Record<string, number> = {};

    for (const key of Object.keys(CONFIG.DND5E.currencies)) {
      const amount = container.system.currency?.[key] ?? 0;
      if (amount > 0) {
        containerUpdate[`system.currency.${key}`] = 0;
        partyUpdate[`system.currency.${key}`] =
          (party.system.currency?.[key] ?? 0) + amount;
      }
    }

    await Promise.all([
      container.update(containerUpdate),
      party.update(partyUpdate),
    ]);
  }

  async function applyFieldChange(input: HTMLInputElement) {
    const item = resolveItem(input);
    const prop = input.dataset.name;

    if (!item || !prop) {
      return;
    }

    const current = FoundryAdapter.getProperty(item, prop);

    if (!editable) {
      input.value = `${current ?? ''}`;
      return;
    }

    let value: string | number = input.value;

    if (shouldParseInputDelta(input)) {
      value = processInputChangeDelta(input.value, item, prop);
      if (isNaN(value)) {
        input.value = `${current ?? ''}`;
        return;
      }
    }

    await item.update({ [prop]: value });
  }

  function openItemSheet(item: Item5e) {
    item.sheet?.render({ force: true });
  }

  function guardPartyEvents(node: HTMLElement) {
    const onClick = (event: MouseEvent) => {
      const origin = event.target instanceof Element ? event.target : null;
      const actionEl = origin?.closest<HTMLElement>('[data-action]');

      if (!actionEl || !node.contains(actionEl)) {
        return;
      }

      const action = actionEl.dataset.action ?? '';

      if (PASS_THROUGH_ACTIONS.has(action)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (!editable) {
        return;
      }

      if (action === 'increase' || action === 'decrease') {
        adjustProperty(actionEl, action === 'increase' ? 1 : -1);
      } else if (action === 'transfer-currency') {
        transferCurrency(actionEl);
      }
    };

    const onChange = (event: Event) => {
      const input = event.target;

      if (
        !(input instanceof HTMLInputElement) ||
        !input.matches('[data-name], [name]')
      ) {
        return;
      }

      event.stopPropagation();

      if (input.matches('[data-name]')) {
        applyFieldChange(input);
      }
    };

    const onOpen = (event: MouseEvent) => {
      if (event.type === 'pointerdown' && event.button !== 1) {
        return;
      }

      // Controls keep their own gestures (Tidy's dblclick skips them too);
      // a middle-click opens the item from anywhere but a field.
      const origin = event.target instanceof Element ? event.target : null;
      const controls =
        event.type === 'dblclick'
          ? 'input, select, textarea, button, a, [contenteditable], [data-action]'
          : 'input, select, textarea, [contenteditable]';
      if (origin?.closest(controls)) {
        return;
      }

      const item = resolveItem(event.target);

      if (!item) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openItemSheet(item);
    };

    const onDragStart = (event: DragEvent) => {
      const item = resolveItem(event.target);

      if (!item || !event.dataTransfer || event.dataTransfer.items.length) {
        return;
      }

      event.dataTransfer.setData(
        'text/plain',
        JSON.stringify(item.toDragData()),
      );
      event.stopPropagation();
    };

    node.addEventListener('click', onClick);
    node.addEventListener('change', onChange);
    node.addEventListener('dblclick', onOpen);
    node.addEventListener('pointerdown', onOpen);
    node.addEventListener('dragstart', onDragStart);

    return () => {
      node.removeEventListener('click', onClick);
      node.removeEventListener('change', onChange);
      node.removeEventListener('dblclick', onOpen);
      node.removeEventListener('pointerdown', onOpen);
      node.removeEventListener('dragstart', onDragStart);
    };
  }

  async function onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!editable) {
      return;
    }

    const sheet = party.sheet as any;

    if (typeof sheet?._onDrop === 'function') {
      await sheet._onDrop(event);
    }
  }
</script>

<div
  role="region"
  aria-label={party.name}
  class={[
    'tab-content ddb-inventory-view ddb-inventory-party-view',
    { 'read-only': !editable },
  ]}
  data-tidy-sheet-part="ddb-inventory-party-view"
  data-ddb-inventory-view="party"
  data-party-id={party.id}
  data-ddb-party-editable={editable}
  {@attach guardPartyEvents}
  ondrop={onDrop}
>
  <header class="ddb-inventory-view-header">
    <!-- svelte-ignore a11y_missing_attribute -->
    <a
      class="ddb-inventory-view-title"
      role="button"
      tabindex="0"
      data-action="showDocument"
      data-uuid={party.uuid}
    >
      <img class="ddb-inventory-view-image" src={party.img} alt="" />
      <span class="ddb-inventory-view-name">{party.name}</span>
      <span class="ddb-inventory-view-count">{itemCount}</span>
    </a>
    {#if !editable}
      <span
        class="ddb-inventory-view-readonly"
        data-tooltip={localize('OWNERSHIP.OBSERVER')}
        aria-label={localize('OWNERSHIP.OBSERVER')}
      >
        <i class="fa-solid fa-lock"></i>
      </span>
    {/if}
  </header>

  {#if partyInventory}
    <div
      role="region"
      class="ddb-inventory-party-contents"
      data-party-id={party.id}
    >
      <InventoryTables
        sections={partyInventory.sections}
        {editable}
        itemContext={partyInventory.itemContext}
        {inlineToggleService}
        searchCriteria=""
        sheetDocument={party}
      />
      {#if itemCount === 0}
        <p class="ddb-inventory-view-empty">{localize('DND5E.None')}</p>
      {/if}
    </div>

    <div class="ddb-inventory-party-currency currency-container">
      <span class="ddb-inventory-currency-label">
        {localize('DND5E.Currency')}
      </span>
      {#each partyInventory.currencies as currency (currency.key)}
        <label class="input-group">
          <i class="currency {currency.key}" aria-label={currency.key}></i>
          <TextInputQuadrone
            document={party}
            field="system.currency.{currency.key}"
            id="{characterContext.appId}-ddb-inventory-party-currency-{currency.key}"
            value={currency.value}
            enableDeltaChanges={true}
            selectOnFocus={true}
            disabled={!editable}
            class="currency-item uninput currency-{currency.key}"
            placeholder="0"
          />
          <span class="denomination {currency.key}" data-denom={currency.key}>
            {currency.abbr}
          </span>
        </label>
      {/each}
    </div>
  {:else}
    <div class="ddb-inventory-view-loading" aria-busy="true">
      <i class="fas fa-spinner fa-spin-pulse"></i>
    </div>
  {/if}
</div>
