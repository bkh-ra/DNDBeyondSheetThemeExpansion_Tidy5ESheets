<!--
  DDB-FORK: The DDB header banner — the top strip of the D&D Beyond-style
  character sheet.

  Element order follows design/GROUPINGS.md `ct-character-header-desktop`:
    [ tidbits group: portrait + name/species/class/level + MANAGE chip ]
    [ flexible gap ]
    [ short rest ] [ long rest ]
    [ campaign ]
    [ controls (DDB's "builder" slot; here: edit-mode toggle + sheet settings) ]

  MANAGE (ddb-next Wave 4): DDB's small outline chip beside the character
  tidbits (`ddbc-character-tidbits__menu-callout`). It opens
  `DdbManageMenu.svelte` - Sheet Settings, Level Up, Configure Token,
  Export / Import Data, Change Sheet Appearance, Preferences. The banner clips
  its overflow (fixed strip, ellipsised name), so the popover is rendered as a
  sibling of the `<header>`, inside `.ddb-header-banner-host` (an unpositioned
  wrapper - see manage.css for why), and places itself under the chip.

  DDB's campaign play/share links stay omitted (D&D Beyond site features with
  no Foundry equivalent); the campaign slot renders the Foundry world name.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import DdbHeaderControls from './DdbHeaderControls.svelte';
  import DdbHeaderTidbits from './DdbHeaderTidbits.svelte';
  import DdbManageMenu from './DdbManageMenu.svelte';
  import DdbPortrait from './DdbPortrait.svelte';
  import DdbRestButtons from './DdbRestButtons.svelte';

  const localize = FoundryAdapter.localize;

  // The Foundry world stands in for DDB's campaign. Hidden when unavailable.
  let campaignName = $derived<string | undefined>(game.world?.title);

  let manageOpen = $state(false);

  let manageTrigger = $state<HTMLButtonElement>();

  const manageMenuId = `ddb-manage-menu-${foundry.utils.randomID()}`;

  function closeManage(returnFocus: boolean) {
    manageOpen = false;

    if (returnFocus) {
      manageTrigger?.focus();
    }
  }

  /**
   * Menu-button keys: ArrowDown / ArrowUp open the menu as well (focus then
   * moves into it); Escape closes an open menu while the chip has focus.
   */
  function onManageTriggerKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      manageOpen = true;
    } else if (event.key === 'Escape' && manageOpen) {
      event.preventDefault();
      event.stopPropagation();
      manageOpen = false;
    }
  }
</script>

<div class="ddb-header-banner-host" data-tidy-sheet-part="ddb-header-banner-host">
  <header class="ddb-header-banner" data-tidy-sheet-part="ddb-header-banner">
    <div class="ddb-header-group ddb-header-group-tidbits">
      <DdbPortrait />
      <DdbHeaderTidbits />
      <button
        bind:this={manageTrigger}
        type="button"
        class={['ddb-manage-trigger', { open: manageOpen }]}
        data-tidy-sheet-part="ddb-manage-trigger"
        aria-haspopup="menu"
        aria-expanded={manageOpen}
        aria-controls={manageOpen ? manageMenuId : undefined}
        onclick={() => (manageOpen = !manageOpen)}
        onkeydown={onManageTriggerKeydown}
      >
        <span class="ddb-manage-trigger-label">
          {localize('TIDY5E.DdbLayout.Manage.Title')}
        </span>
        <i class="fa-solid fa-caret-down ddb-manage-trigger-caret" aria-hidden="true"></i>
      </button>
    </div>

    <div class="ddb-header-group ddb-header-group-gap"></div>

    <div class="ddb-header-group ddb-header-group-rest">
      <DdbRestButtons />
    </div>

    {#if campaignName}
      <div class="ddb-header-group ddb-header-group-campaign">
        <div class="ddb-header-campaign" data-tooltip={campaignName}>
          <span class="ddb-header-campaign-label">
            {localize('TIDY5E.DdbLayout.Campaign')}
          </span>
          <span class="ddb-header-campaign-name">{campaignName}</span>
        </div>
      </div>
    {/if}

    <div class="ddb-header-group ddb-header-group-controls">
      <DdbHeaderControls />
    </div>
  </header>

  {#if manageOpen}
    <DdbManageMenu
      id={manageMenuId}
      anchor={manageTrigger}
      onclose={closeManage}
    />
  {/if}
</div>
