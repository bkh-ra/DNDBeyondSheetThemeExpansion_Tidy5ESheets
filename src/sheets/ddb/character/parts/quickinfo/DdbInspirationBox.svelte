<!--
  DDB-FORK: "Heroic Inspiration" box in the quick-info band.

  Toggle logic is lifted straight from
  src/sheets/quadrone/actor/character-parts/InspirationBadge.svelte:
    - no inspiration source configured -> boolean toggle on
      system.attributes.inspiration
    - banked inspiration source configured -> value with -/+ controls driven by
      inspirationSource.change()
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import DdbStatBoxShape from 'src/sheets/ddb/svg/DdbStatBoxShape.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let inspirationSource = $derived(context.inspirationSource);

  let inspired = $derived(!!context.system.attributes.inspiration);

  let banked = $derived(
    !!inspirationSource && inspirationSource.max > 0
      ? inspirationSource
      : undefined,
  );

  let active = $derived(banked ? banked.value > 0 : inspired);
</script>

<section
  class={['ddb-inspiration-box', { inspired: active }]}
  data-tidy-sheet-part="inspiration-tracker-container"
>
  <!--
    Full-height 70 x 80 octagon, the same frame PROFICIENCY and SPEED carry, so
    the band is one rhythm: the tile used to be a 52px frame with its caps label
    hanging outside and underneath it, which left it ~25px shorter than its
    neighbours and made it the only box whose label was not inside its own
    outline (live design review). The label is now pinned inside the frame; see
    quick-info.css.
  -->
  <DdbStatBoxShape width={70} height={80} />
  {#if banked}
    <div class="ddb-inspiration-box__content">
      <button
        type="button"
        class="ddb-inspiration-box__token-button"
        aria-label={localize('DND5E.Inspiration')}
        data-tooltip={localize('DND5E.Inspiration')}
        data-tidy-sheet-part="banked-inspiration-value"
      >
        {@render token()}
        <span class="ddb-inspiration-box__level">{banked.value}</span>
      </button>
      <div
        class="ddb-inspiration-box__controls"
        data-tidy-sheet-part="banked-inspiration-controls-container"
      >
        <button
          type="button"
          class="ddb-inspiration-box__step"
          aria-label={localize('TIDY5E.InspirationRemove')}
          data-tooltip={localize('TIDY5E.InspirationRemove')}
          disabled={banked.value === 0}
          onclick={() => banked?.change(-1)}
          data-tidy-sheet-part="banked-inspiration-decrementer"
        >
          <i class="fas fa-hexagon-minus"></i>
        </button>
        <button
          type="button"
          class="ddb-inspiration-box__step"
          aria-label={localize('TIDY5E.InspirationAdd')}
          data-tooltip={localize('TIDY5E.InspirationAdd')}
          disabled={banked.value === banked.max}
          onclick={() => banked?.change(1)}
          data-tidy-sheet-part="banked-inspiration-incrementer"
        >
          <i class="fas fa-hexagon-plus"></i>
        </button>
      </div>
    </div>
  {:else}
    <button
      type="button"
      class="ddb-inspiration-box__content ddb-inspiration-box__toggle"
      aria-label={localize('DND5E.Inspiration')}
      data-tooltip={localize('DND5E.Inspiration')}
      onclick={() =>
        context.actor.update({
          ['system.attributes.inspiration']: !inspired,
        })}
      disabled={!context.actor.isOwner}
      data-tidy-sheet-part="inspiration-tracker-toggle"
    >
      {@render token()}
    </button>
  {/if}
  <!-- dnd5e's `DND5E.Inspiration` is "Heroic Inspiration"; the caps transform
       and the frame's width balance it onto two lines inside the octagon. -->
  <span class="ddb-inspiration-box__label">
    {localize('DND5E.Inspiration')}
  </span>
</section>

<!--
  Original "spark" token: a four-point star over a shallow arc, drawn from
  scratch. Colour comes from currentColor so the CSS drives light/dark/active.
-->
{#snippet token()}
  <svg
    class="ddb-inspiration-box__token"
    viewBox="0 0 50 30"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      class="ddb-inspiration-box__token-star"
      d="M 25 3 L 28.5 13.5 L 39 17 L 28.5 20.5 L 25 31 L 21.5 20.5 L 11 17 L 21.5 13.5 Z"
    />
    <path
      class="ddb-inspiration-box__token-arc"
      fill="none"
      vector-effect="non-scaling-stroke"
      d="M 4 25 C 10 12 40 12 46 25"
    />
  </svg>
{/snippet}
