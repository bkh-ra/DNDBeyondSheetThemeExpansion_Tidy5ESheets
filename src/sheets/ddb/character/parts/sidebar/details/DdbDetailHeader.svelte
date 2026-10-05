<!--
  DDB-FORK: heading block shared by every detail view: image, name, subtitle,
  then an optional row of actions (Use / Roll / Open sheet / Favorite).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    name: string;
    img?: string | null;
    /** Plain-text subtitle. */
    subtitle?: string | null;
    /** Pre-rendered subtitle HTML (Tidy's item subtitles carry markup). */
    subtitleHtml?: string | null;
    /** Extra subtitle content (e.g. a link back to an activity's item). */
    subtitleExtra?: Snippet;
    actions?: Snippet;
  }

  let {
    name,
    img,
    subtitle,
    subtitleHtml,
    subtitleExtra,
    actions,
  }: Props = $props();
</script>

<header class="ddb-detail-header">
  {#if img}
    <img class="ddb-detail-img" src={img} alt="" />
  {/if}
  <div class="ddb-detail-heading">
    <h3 class="ddb-detail-name">{name}</h3>
    {#if subtitleHtml || subtitle || subtitleExtra}
      <div class="ddb-detail-subtitle">
        {#if subtitleHtml}
          {@html subtitleHtml}
        {:else if subtitle}
          {subtitle}
        {/if}
        {@render subtitleExtra?.()}
      </div>
    {/if}
  </div>
</header>

{#if actions}
  <div class="ddb-detail-actions">
    {@render actions()}
  </div>
{/if}
