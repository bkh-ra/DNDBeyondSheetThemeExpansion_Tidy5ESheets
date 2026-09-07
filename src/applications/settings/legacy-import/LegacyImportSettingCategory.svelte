<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { LegacyImportApplication } from './LegacyImportApplication.svelte';
  import type {
    LegacyImportCategory,
    LegacyImportSettingItem,
  } from './legacy-import-service';

  interface Props {
    app: LegacyImportApplication;
    category: LegacyImportCategory<LegacyImportSettingItem>;
  }

  let { app, category }: Props = $props();

  const localize = FoundryAdapter.localize;

  let expanded = $derived(app.expandedCategories[category.id] === true);

  let canExpand = $derived(
    category.items.length > 0 || category.skipped.length > 0,
  );
</script>

<section class="legacy-import-category">
  <button
    type="button"
    class="legacy-import-category-header"
    disabled={!canExpand}
    aria-expanded={expanded}
    onclick={() => app.toggleCategory(category.id)}
  >
    <i
      class={[
        'legacy-import-caret fa-solid',
        expanded ? 'fa-caret-down' : 'fa-caret-right',
        { 'legacy-import-caret-hidden': !canExpand },
      ]}
    ></i>
    <span class="legacy-import-category-title">
      {localize(`TIDY5E.LegacyImport.Category.${category.id}.label`)}
    </span>
    <span class="legacy-import-category-count">
      {localize('TIDY5E.LegacyImport.Category.count', {
        count: category.writeCount,
      })}
    </span>
    {#if category.skipped.length}
      <span class="legacy-import-category-skipped">
        {localize('TIDY5E.LegacyImport.Category.skippedCount', {
          count: category.skipped.length,
        })}
      </span>
    {/if}
  </button>

  <p class="settings-description legacy-import-category-hint">
    {localize(`TIDY5E.LegacyImport.Category.${category.id}.hint`)}
  </p>

  {#if expanded}
    <div class="legacy-import-category-body">
      {#if category.items.length}
        <ul class="legacy-import-list">
          {#each category.items as item (item.key)}
            <li>
              <span class="legacy-import-list-key">{item.key}</span>
              <span class="legacy-import-list-preview settings-description">
                {item.preview}
              </span>
              {#if item.requiresReload}
                <span class="legacy-import-badge">
                  {localize('TIDY5E.LegacyImport.Item.requiresReload')}
                </span>
              {/if}
              {#each item.rewrites as rewrite (rewrite.property)}
                <span class="legacy-import-badge">
                  {localize('TIDY5E.LegacyImport.Item.pathRewritten', {
                    property: rewrite.property,
                    to: rewrite.to,
                  })}
                </span>
              {/each}
            </li>
          {/each}
        </ul>
      {/if}

      {#if category.skipped.length}
        <h4 class="legacy-import-skipped-header">
          {localize('TIDY5E.LegacyImport.Skipped.header')}
        </h4>
        <ul class="legacy-import-list legacy-import-list-skipped">
          {#each category.skipped as skip, index (index)}
            <li>
              <span class="legacy-import-list-key">{skip.target}</span>
              <span class="settings-description">
                {localize(`TIDY5E.LegacyImport.Skip.${skip.reason}`)}{skip.detail
                  ? ` (${skip.detail})`
                  : ''}
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</section>
