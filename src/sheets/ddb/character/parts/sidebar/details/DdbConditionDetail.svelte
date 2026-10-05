<!--
  DDB-FORK: condition detail in the sidebar pane — the condition's name and
  icon, an Apply / Remove control, the character's exhaustion level table
  where it applies, and the enriched rules page
  (`CONFIG.DND5E.conditionTypes[key].reference`).

  Opened by the info triggers on the condition chips and picker rows
  (`data-ddb-detail="condition:<key>"`, DdbConditionsDefensesStrip.svelte).
  The key is a status id: dnd5e condition types resolve through
  `CONFIG.DND5E.conditionTypes`, and anything else the picker lists (core and
  module statuses such as `dead`, `bloodied`, cover) falls back to its
  `CONFIG.statusEffects` entry, which carries the same name / img / reference.

  APPLY / REMOVE calls `Actor#toggleStatusEffect(key)` (dnd5e's override keeps
  `exclusiveGroup` statuses exclusive). The label follows what the toggle will
  actually do: core removes the status's own effect when it exists (the static
  `_id`, or any single-status effect for statuses without one), so a status
  that is only IMPLIED by another condition (incapacitated under paralyzed)
  still offers Apply. Only owners see it. Exhaustion has no toggle: it is a
  level, set with the stepper on the conditions strip.

  EXHAUSTION TABLE (modern rules, `FoundryAdapter.checkIfModernRules`): one
  row per level, computed from `conditionTypes.exhaustion.reduction` — exactly
  what dnd5e subtracts (`addRollExhaustion`, the movement reduction) — with
  the actor's current level highlighted. The last level is death (dnd5e adds
  the `dead` status at `levels`). Legacy rules have no reduction formula; the
  2014 level table is part of the rules page shown below.

  HEADER: DdbDetailHeader's markup and classes (so the pane styles it the
  same), except for the icon. Status icons are monochrome SVG glyphs drawn for
  the token HUD — Blinded is a WHITE eye (`fill: var(--icon-fill, #fff)`)
  under a red slash — so an `<img>` showed only the slash on the light pane.
  `<dnd5e-icon>` inlines the SVG and recolours it through `--icon-fill`, the
  element the condition picker already uses.

  Hooks: root `article.ddb-condition-detail[data-condition=<key>]` with
  `data-active`; toggle `[data-condition-action="apply|remove"]`; table
  `table.ddb-exhaustion-table[data-rules="modern"]`, rows `tr[data-level]`,
  current row `tr.current[aria-current="true"]`.
-->
<script lang="ts">
  import Dnd5eIcon from 'src/components/icon/Dnd5eIcon.svelte';
  import type { ConditionType } from 'src/foundry/config.types';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import type { DdbDetailStat } from 'src/sheets/ddb/features/detail/detail-stats';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { formatAsModifier } from 'src/utils/formatting';
  import { debug, error } from 'src/utils/logging';
  import DdbDetailRuleText from './DdbDetailRuleText.svelte';
  import DdbDetailStatStrip from './DdbDetailStatStrip.svelte';

  interface Props {
    key: string;
  }

  let { key }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  type StatusEffectConfig = {
    id: string;
    _id?: string;
    name?: string;
    img?: string;
    reference?: string;
  };

  let config = $derived(
    (
      CONFIG.DND5E.conditionTypes as unknown as Record<
        string,
        ConditionType | undefined
      >
    )[key],
  );

  /** The registered status (`CONFIG.statusEffects` is walked as an array). */
  let status = $derived(
    (
      Array.from(CONFIG.statusEffects ?? []) as unknown as StatusEffectConfig[]
    ).find((entry) => entry?.id === key),
  );

  let name = $derived(localize(config?.name ?? status?.name ?? key));

  let img = $derived(config?.img ?? status?.img);

  let reference = $derived(config?.reference ?? status?.reference);

  let isExhaustion = $derived(key === 'exhaustion');

  let exhaustionLevel = $derived(
    Number(context.system?.attributes?.exhaustion ?? 0) || 0,
  );

  /** Re-read on every sheet render; effects are not reactive themselves. */
  let active = $derived.by(() => {
    context;
    return isExhaustion
      ? exhaustionLevel > 0
      : !!context.actor.statuses?.has?.(key);
  });

  /** True when `toggleStatusEffect(key)` would delete an effect. */
  let toggleRemoves = $derived.by(() => {
    context;
    const effects = context.actor.effects;

    if (!status || !effects) {
      return false;
    }

    if (status._id) {
      return effects.has(status._id);
    }

    return effects.some(
      (effect: any) => effect.statuses?.size === 1 && effect.statuses.has(key),
    );
  });

  let canToggle = $derived(context.owner && !isExhaustion && !!status);

  let busy = $state(false);

  async function toggle() {
    if (!canToggle || busy) {
      return;
    }

    busy = true;

    try {
      await context.actor.toggleStatusEffect(key);
    } catch (e) {
      error('An error occurred while toggling a condition', false, e);
      debug('Condition toggle error troubleshooting info', { key });
    } finally {
      busy = false;
    }
  }

  let modernRules = $derived(FoundryAdapter.checkIfModernRules(context.actor));

  /** Speed reductions are defined in feet; show them in the actor's unit. */
  function formatSpeedReduction(feet: number): string {
    const units = context.system?.attributes?.movement?.units;

    try {
      if (units && units !== 'ft') {
        const converted = dnd5e.utils.convertLength(feet, 'ft', units);
        return dnd5e.utils.formatLength(converted, units);
      }
      return dnd5e.utils.formatLength(feet, 'ft');
    } catch {
      return `${feet} ${localize('DND5E.DistFtAbbr')}`;
    }
  }

  type ExhaustionRow = {
    level: number;
    rolls: string;
    speed: string;
    dead: boolean;
  };

  let exhaustionRows = $derived.by<ExhaustionRow[]>(() => {
    if (!isExhaustion || !modernRules) {
      return [];
    }

    const levels = Number(config?.levels ?? 6);
    const reduction = config?.reduction;

    if (!reduction || !Number.isFinite(levels) || levels < 1) {
      return [];
    }

    return Array.from({ length: levels }, (_, index) => {
      const level = index + 1;
      return {
        level,
        rolls: formatAsModifier(-(reduction.rolls ?? 0) * level),
        speed: `-${formatSpeedReduction((reduction.speed ?? 0) * level)}`,
        dead: level >= levels,
      };
    });
  });

  let stats = $derived.by(() => {
    const result: DdbDetailStat[] = [];

    if (isExhaustion) {
      result.push({
        key: 'level',
        label: localize('DND5E.Level'),
        value: String(exhaustionLevel),
      });
    }

    return result;
  });

  let deadLabel = $derived(localize('EFFECT.DND5E.StatusDead'));
</script>

{#snippet toggleAction()}
  <button
    type="button"
    class={[
      'ddb-detail-button',
      'ddb-condition-detail__toggle',
      { 'ddb-detail-button--primary': !toggleRemoves },
    ]}
    data-condition-action={toggleRemoves ? 'remove' : 'apply'}
    disabled={busy}
    onclick={toggle}
  >
    <i class={toggleRemoves ? 'fa-solid fa-xmark' : 'fa-solid fa-plus'}
    ></i>
    {localize(
      toggleRemoves
        ? 'TIDY5E.DdbLayout.Condition.Remove'
        : 'TIDY5E.DdbLayout.Condition.Apply',
    )}
  </button>
{/snippet}

<article
  class={[
    'ddb-detail',
    'ddb-condition-detail',
    { 'ddb-condition-detail--active': active },
  ]}
  data-condition={key}
  data-active={active}
>
  <header class="ddb-detail-header">
    {#if img?.endsWith('.svg')}
      <Dnd5eIcon class="ddb-detail-img ddb-condition-detail__icon" src={img} />
    {:else if img}
      <img class="ddb-detail-img" src={img} alt="" />
    {/if}
    <div class="ddb-detail-heading">
      <h3 class="ddb-detail-name">{name}</h3>
      <div class="ddb-detail-subtitle">
        {localize('DND5E.Rule.Type.Condition')}
      </div>
    </div>
  </header>

  <!-- No actions row at all when there is nothing to toggle (exhaustion,
       non-owners). -->
  {#if canToggle}
    <div class="ddb-detail-actions">
      {@render toggleAction()}
    </div>
  {/if}

  <DdbDetailStatStrip {stats} />

  {#if exhaustionRows.length}
    <table class="ddb-exhaustion-table" data-rules="modern">
      <thead>
        <tr>
          <th scope="col">
            {localize('TIDY5E.DdbLayout.Condition.Exhaustion.Level')}
          </th>
          <th scope="col">
            {localize('TIDY5E.DdbLayout.Condition.Exhaustion.Effect')}
          </th>
        </tr>
      </thead>
      <tbody>
        {#each exhaustionRows as row (row.level)}
          {@const current = row.level === exhaustionLevel}
          <tr
            class={{ current }}
            data-level={row.level}
            aria-current={current ? 'true' : undefined}
          >
            <th scope="row" class="ddb-exhaustion-table__level">
              {row.level}
              {#if current}
                <span class="ddb-exhaustion-table__current">
                  {localize('TIDY5E.DdbLayout.Condition.Exhaustion.Current')}
                </span>
              {/if}
            </th>
            <td class="ddb-exhaustion-table__effect">
              <span data-effect="rolls">d20 {row.rolls}</span>
              <span data-effect="speed"
                >{localize('DND5E.Speed')} {row.speed}</span
              >
              {#if row.dead}
                <span data-effect="dead" class="ddb-exhaustion-table__dead"
                  >{deadLabel}</span
                >
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <DdbDetailRuleText {reference} />
</article>
