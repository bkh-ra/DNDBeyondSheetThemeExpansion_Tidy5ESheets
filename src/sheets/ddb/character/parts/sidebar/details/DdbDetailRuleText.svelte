<!--
  DDB-FORK: the "Rules" block of a skill / ability / save / tool / condition
  detail: the referenced rules page, fetched and enriched once per session
  (`features/detail/rule-text.ts`).
-->
<script lang="ts">
  import { DDB_LANG } from 'src/sheets/ddb/ddb-constants';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import { loadReferenceHtml } from 'src/sheets/ddb/features/detail/rule-text';

  interface Props {
    /** Uuid of the rules page (or base item) to show. */
    reference?: string | null;
    /** Section heading; defaults to "Rules". */
    title?: string;
  }

  let { reference, title }: Props = $props();

  let html = $state<string | null>(null);
  let loading = $state(false);

  $effect(() => {
    const uuid = reference;
    let cancelled = false;

    html = null;
    loading = !!uuid;

    if (!uuid) {
      return;
    }

    loadReferenceHtml(uuid).then((result) => {
      if (!cancelled) {
        html = result;
        loading = false;
      }
    });

    return () => {
      cancelled = true;
    };
  });
</script>

<section class="ddb-detail-rules" data-reference={reference || null}>
  <h4 class="ddb-detail-section-title">
    {title ?? ddbLocalize(DDB_LANG.DETAIL_RULES)}
  </h4>
  {#if loading}
    <div class="ddb-detail-loading" aria-busy="true">
      <i class="fas fa-spinner fa-spin-pulse"></i>
    </div>
  {:else if html}
    <div class="ddb-detail-rules-text editor-rendered-content user-select-text">
      {@html html}
    </div>
  {:else}
    <p class="ddb-detail-muted">
      {ddbLocalize(DDB_LANG.DETAIL_RULES_UNAVAILABLE)}
    </p>
  {/if}
</section>
