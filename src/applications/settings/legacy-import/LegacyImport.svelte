<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { LegacyImportApplication } from './LegacyImportApplication.svelte';
  import LegacyImportSettingCategory from './LegacyImportSettingCategory.svelte';
  import LegacyImportDocumentCategory from './LegacyImportDocumentCategory.svelte';

  interface Props {
    app: LegacyImportApplication;
  }

  let { app }: Props = $props();

  const localize = FoundryAdapter.localize;

  let plan = $derived(app.plan);

  let progressPercent = $derived(
    app.progress && app.progress.total > 0
      ? Math.round((app.progress.current / app.progress.total) * 100)
      : 0,
  );

  let hasPlan = $derived(plan.totalWrites > 0);
</script>

<div class="dialog-content-container flexcol legacy-import">
  <h2 class="settings-header">
    {localize('TIDY5E.LegacyImport.heading')}
  </h2>
  <p class="settings-description">
    {localize('TIDY5E.LegacyImport.description')}
  </p>

  {#if !app.isGm}
    <p class="legacy-import-callout legacy-import-callout-warning">
      <i class="fa-solid fa-triangle-exclamation"></i>
      {localize('TIDY5E.LegacyImport.notGm')}
    </p>
  {/if}

  <section class="legacy-import-options">
    <label class="legacy-import-option">
      <input
        type="checkbox"
        disabled={app.busy}
        checked={app.importOptions.includeBookkeepingSettings}
        onchange={(ev) =>
          app.setOption(
            'includeBookkeepingSettings',
            ev.currentTarget.checked,
          )}
      />
      <span>
        <span class="legacy-import-option-label">
          {localize('TIDY5E.LegacyImport.Options.includeBookkeeping.label')}
        </span>
        <span class="settings-description">
          {localize('TIDY5E.LegacyImport.Options.includeBookkeeping.hint')}
        </span>
      </span>
    </label>

    <label class="legacy-import-option">
      <input
        type="checkbox"
        disabled={app.busy}
        checked={app.importOptions.includeClientSettings}
        onchange={(ev) =>
          app.setOption('includeClientSettings', ev.currentTarget.checked)}
      />
      <span>
        <span class="legacy-import-option-label">
          {localize('TIDY5E.LegacyImport.Options.includeClientSettings.label')}
        </span>
        <span class="settings-description">
          {localize('TIDY5E.LegacyImport.Options.includeClientSettings.hint')}
        </span>
      </span>
    </label>
  </section>

  {#if hasPlan}
    <p class="legacy-import-total">
      {localize('TIDY5E.LegacyImport.Plan.total', {
        count: plan.totalWrites,
      })}
    </p>
  {:else}
    <p class="legacy-import-callout">
      <i class="fa-solid fa-circle-check"></i>
      {localize(
        plan.legacyDataFound
          ? 'TIDY5E.LegacyImport.Plan.emptyAlreadyImported'
          : 'TIDY5E.LegacyImport.Plan.emptyNoLegacyData',
      )}
    </p>
  {/if}

  {#if plan.requiresReload}
    <p class="legacy-import-callout legacy-import-callout-warning">
      <i class="fa-solid fa-rotate"></i>
      {localize('TIDY5E.LegacyImport.Plan.reloadRequired')}
    </p>
  {/if}

  <div class="legacy-import-categories">
    <LegacyImportSettingCategory {app} category={plan.worldSettings} />
    <LegacyImportSettingCategory {app} category={plan.userSettings} />
    <LegacyImportSettingCategory {app} category={plan.clientSettings} />
    <LegacyImportDocumentCategory {app} category={plan.actors} />
    <LegacyImportDocumentCategory {app} category={plan.items} />
    <LegacyImportDocumentCategory {app} category={plan.users} />
  </div>

  <section class="legacy-import-notes">
    <h3>{localize('TIDY5E.LegacyImport.Notes.header')}</h3>
    <ul class="settings-description">
      <li>{localize('TIDY5E.LegacyImport.Notes.nonDestructive')}</li>
      <li>{localize('TIDY5E.LegacyImport.Notes.compendia')}</li>
      <li>{localize('TIDY5E.LegacyImport.Notes.sheetClass')}</li>
      <li>{localize('TIDY5E.LegacyImport.Notes.clientPerBrowser')}</li>
      <li>{localize('TIDY5E.LegacyImport.Notes.otherUsers')}</li>
    </ul>
  </section>

  {#if app.progress}
    <section class="legacy-import-progress">
      <div
        class="legacy-import-progress-bar"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progressPercent}
      >
        <div
          class="legacy-import-progress-fill"
          style="inline-size: {progressPercent}%"
        ></div>
      </div>
      <span class="settings-description">
        {localize('TIDY5E.LegacyImport.Progress.label', {
          current: app.progress.current,
          total: app.progress.total,
          target: app.progress.label,
        })}
      </span>
    </section>
  {/if}

  {#if app.result}
    {@const result = app.result}
    <section class="legacy-import-summary">
      <h3>{localize('TIDY5E.LegacyImport.Summary.header')}</h3>
      <ul>
        <li>
          {localize('TIDY5E.LegacyImport.Category.worldSettings.label')}: {result
            .counts.worldSettings}
        </li>
        <li>
          {localize('TIDY5E.LegacyImport.Category.userSettings.label')}: {result
            .counts.userSettings}
        </li>
        <li>
          {localize('TIDY5E.LegacyImport.Category.clientSettings.label')}: {result
            .counts.clientSettings}
        </li>
        <li>
          {localize('TIDY5E.LegacyImport.Category.actors.label')}: {result.counts
            .actors}
        </li>
        <li>
          {localize('TIDY5E.LegacyImport.Category.items.label')}: {result.counts
            .items}
        </li>
        <li>
          {localize('TIDY5E.LegacyImport.Category.users.label')}: {result.counts
            .users}
        </li>
        <li>
          {localize('TIDY5E.LegacyImport.Summary.documents', {
            documents: result.documentsUpdated,
            embedded: result.embeddedItemsUpdated,
          })}
        </li>
      </ul>

      {#if result.requiresReload}
        <p class="legacy-import-callout legacy-import-callout-warning">
          <i class="fa-solid fa-rotate"></i>
          {localize('TIDY5E.LegacyImport.Summary.reloadRequired')}
        </p>
      {/if}

      {#if result.errors.length}
        <h4 class="legacy-import-error-header">
          {localize('TIDY5E.LegacyImport.Summary.errors', {
            count: result.errors.length,
          })}
        </h4>
        <ul class="legacy-import-errors">
          {#each result.errors as importError, index (index)}
            <li>
              <span class="legacy-import-error-target">{importError.target}</span
              >
              <span class="settings-description">{importError.message}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="settings-description">
          {localize('TIDY5E.LegacyImport.Summary.noErrors')}
        </p>
      {/if}
    </section>
  {/if}
</div>

<div class="button-bar">
  <button
    type="button"
    class="button button-secondary button-large"
    disabled={app.busy}
    onclick={() => app.refreshPlan()}
  >
    <i class="fa-solid fa-arrows-rotate"></i>
    {localize('TIDY5E.LegacyImport.Buttons.refresh')}
  </button>
  <button
    type="button"
    class={[
      'button button-large',
      app.canImport ? 'button-primary' : 'button-secondary',
    ]}
    disabled={!app.canImport}
    onclick={() => app.confirmAndImport()}
  >
    <i class="fa-solid fa-file-import"></i>
    {localize('TIDY5E.LegacyImport.Buttons.import')}
  </button>
</div>

<style lang="css">
  .legacy-import {
    padding-block: var(--t5e-size-2x) var(--t5e-size-4x);
    padding-inline: var(--t5e-size-4x);
    gap: var(--t5e-size-2x);
  }

  .legacy-import-options {
    display: flex;
    flex-direction: column;
    gap: var(--t5e-size-1x);
  }

  .legacy-import-option {
    display: flex;
    align-items: flex-start;
    gap: var(--t5e-size-1x);
    cursor: pointer;
  }

  .legacy-import-option > span {
    display: flex;
    flex-direction: column;
  }

  .legacy-import-option-label {
    font-weight: 600;
  }

  .legacy-import-callout {
    display: flex;
    align-items: baseline;
    gap: var(--t5e-size-1x);
    margin: 0;
  }

  .legacy-import-callout-warning {
    color: var(--t5e-color-gold);
  }

  .legacy-import-total {
    margin: 0;
    font-weight: 600;
  }

  .legacy-import-categories {
    display: flex;
    flex-direction: column;
    gap: var(--t5e-size-1x);
  }

  /*
    The category cards live in child components, so their shared styles are
    written here as scoped-ancestor `:global()` rules rather than duplicated in
    both `LegacyImportSettingCategory` and `LegacyImportDocumentCategory`.
  */
  .legacy-import :global(.legacy-import-category) {
    border: var(--t5e-size-1) solid var(--t5e-table-row-divider);
    border-radius: var(--t5e-size-halfx);
    padding-block: var(--t5e-size-1x);
    padding-inline: var(--t5e-size-2x);
  }

  .legacy-import :global(.legacy-import-category-header) {
    display: flex;
    align-items: center;
    gap: var(--t5e-size-1x);
    inline-size: 100%;
    background: none;
    border: none;
    padding: 0;
    text-align: start;
    cursor: pointer;
  }

  .legacy-import :global(.legacy-import-category-header:disabled) {
    cursor: default;
    opacity: 0.75;
  }

  .legacy-import :global(.legacy-import-caret) {
    inline-size: var(--t5e-size-2x);
    flex: 0 0 auto;
  }

  .legacy-import :global(.legacy-import-caret-hidden) {
    visibility: hidden;
  }

  .legacy-import :global(.legacy-import-category-title) {
    flex: 1;
    font-weight: 600;
  }

  .legacy-import :global(.legacy-import-category-count),
  .legacy-import :global(.legacy-import-category-skipped),
  .legacy-import :global(.legacy-import-badge) {
    flex: 0 0 auto;
    font-size: var(--font-size-11);
    padding-block: 0;
    padding-inline: var(--t5e-size-1x);
    border-radius: var(--t5e-size-halfx);
    background: var(--t5e-component-field-background);
    white-space: nowrap;
  }

  .legacy-import :global(.legacy-import-category-hint) {
    margin: 0;
    padding-inline-start: var(--t5e-size-3x);
  }

  .legacy-import :global(.legacy-import-category-body) {
    padding-inline-start: var(--t5e-size-3x);
    padding-block-start: var(--t5e-size-1x);
  }

  .legacy-import :global(.legacy-import-list) {
    margin: 0;
    padding-inline-start: var(--t5e-size-2x);
    list-style: none;
    max-block-size: 16rem;
    overflow-y: auto;
  }

  .legacy-import :global(.legacy-import-list-embedded) {
    max-block-size: none;
    overflow-y: visible;
    padding-inline-start: var(--t5e-size-3x);
  }

  .legacy-import :global(.legacy-import-list li) {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--t5e-size-1x);
  }

  .legacy-import :global(.legacy-import-list-key) {
    font-weight: 600;
  }

  .legacy-import :global(.legacy-import-list-preview) {
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .legacy-import :global(.legacy-import-skipped-header) {
    margin-block: var(--t5e-size-1x) var(--t5e-size-halfx);
  }

  .legacy-import-notes ul {
    margin: 0;
    padding-inline-start: var(--t5e-size-4x);
  }

  .legacy-import-progress-bar {
    block-size: var(--t5e-size-1x);
    border-radius: var(--t5e-size-halfx);
    background: var(--t5e-component-field-background);
    overflow: hidden;
  }

  .legacy-import-progress-fill {
    block-size: 100%;
    background: var(--t5e-theme-color-highlight, currentColor);
    transition: inline-size 100ms linear;
  }

  .legacy-import-summary ul,
  .legacy-import-errors {
    margin: 0;
    padding-inline-start: var(--t5e-size-4x);
  }

  .legacy-import-errors li {
    display: flex;
    flex-direction: column;
  }

  .legacy-import-error-target {
    font-weight: 600;
  }
</style>
