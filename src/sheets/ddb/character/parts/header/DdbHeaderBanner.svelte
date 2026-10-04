<!--
  DDB-FORK: The DDB header banner — the top strip of the D&D Beyond-style
  character sheet.

  Element order follows design/GROUPINGS.md `ct-character-header-desktop`:
    [ tidbits group: portrait + name/species/class/level ]
    [ flexible gap ]
    [ short rest ] [ long rest ]
    [ campaign ]
    [ controls (DDB's "builder" slot; here: edit-mode toggle + sheet settings) ]

  DDB's "MANAGE" chip and the campaign play/share links are intentionally
  omitted — they are D&D Beyond site features with no Foundry equivalent.
  The campaign slot renders the Foundry world name instead.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import DdbHeaderControls from './DdbHeaderControls.svelte';
  import DdbHeaderTidbits from './DdbHeaderTidbits.svelte';
  import DdbPortrait from './DdbPortrait.svelte';
  import DdbRestButtons from './DdbRestButtons.svelte';

  const localize = FoundryAdapter.localize;

  // The Foundry world stands in for DDB's campaign. Hidden when unavailable.
  let campaignName = $derived<string | undefined>(game.world?.title);
</script>

<header class="ddb-header-banner" data-tidy-sheet-part="ddb-header-banner">
  <div class="ddb-header-group ddb-header-group-tidbits">
    <DdbPortrait />
    <DdbHeaderTidbits />
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
