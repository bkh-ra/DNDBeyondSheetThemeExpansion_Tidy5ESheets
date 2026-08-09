<!--
  DDB-FORK: Generic notched stat box for the quick-info band
  (PROFICIENCY / BONUS, WALKING / SPEED, INITIATIVE, ...).

  DDB stacks three pieces of text inside the frame: a small heading above the
  value, the big value itself, and a small label beneath it — see the
  ct-proficiency-bonus-box / ct-speed-box structure in design/GROUPINGS.md.

  When `onclick` is provided (or the caller passes a `data-action`), the inner
  stack renders as a button so the box is rollable; otherwise it is inert.
  Extra attributes are spread onto the interactive element, which is how the
  band wires the initiative box to the sheet's `roll` action.
-->
<script lang="ts">
  import type { ClassValue, HTMLButtonAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import DdbStatBoxShape from 'src/sheets/ddb/svg/DdbStatBoxShape.svelte';

  type Props = {
    class?: ClassValue;
    /** Small all-caps text above the value. */
    heading?: string;
    /** The figure shown in the middle of the box. */
    value?: string | number;
    /** Small unit suffix rendered next to the value (e.g. "ft."). */
    unit?: string;
    /** Small all-caps text below the value. */
    label?: string;
    /** Tooltip for the whole box. Localization keys are resolved by Foundry. */
    tooltip?: string;
    /** Intrinsic frame width, in px. */
    width?: number;
    /** Intrinsic frame height, in px. */
    height?: number;
    /**
     * Frame silhouette. `octagon` is the band treatment (label inside the
     * frame); `hex` is the squat, raked-end shape the combat row uses for the
     * boxes whose label rides above the frame. See DdbStatBoxShape.
     */
    variant?: 'octagon' | 'hex';
    /** Extra content rendered inside the frame (e.g. a config button). */
    children?: Snippet;
  } & HTMLButtonAttributes;

  let {
    class: cssClass,
    heading,
    value,
    unit,
    label,
    tooltip,
    /* 80 matches the widened HEROIC INSPIRATION octagon so the band trio reads
     * as one equal set (round-4 eval finding: 70/70/80 looked mismatched). The
     * combat-row hexes pass their own explicit 60x48. */
    width = 80,
    height = 80,
    variant = 'octagon',
    children,
    ...rest
  }: Props = $props();

  let interactive = $derived(!!rest.onclick || !!rest['data-action']);
</script>

<section class={['ddb-stat-box', cssClass]} data-tooltip={tooltip}>
  <DdbStatBoxShape {width} {height} {variant} />
  {#if interactive}
    <button type="button" class="ddb-stat-box__content" {...rest}>
      {#if heading}
        <span class="ddb-stat-box__heading">{heading}</span>
      {/if}
      <span class="ddb-stat-box__value">
        {value}{#if unit}<span class="ddb-stat-box__unit">{unit}</span>{/if}
      </span>
      {#if label}
        <span class="ddb-stat-box__label">{label}</span>
      {/if}
    </button>
  {:else}
    <div class="ddb-stat-box__content">
      {#if heading}
        <span class="ddb-stat-box__heading">{heading}</span>
      {/if}
      <span class="ddb-stat-box__value">
        {value}{#if unit}<span class="ddb-stat-box__unit">{unit}</span>{/if}
      </span>
      {#if label}
        <span class="ddb-stat-box__label">{label}</span>
      {/if}
    </div>
  {/if}
  {@render children?.()}
</section>
