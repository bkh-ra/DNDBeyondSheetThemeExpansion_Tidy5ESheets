// DDB-FORK: the DDB sheet's hint-tooltip switch (Preferences > Tooltips) also
// covers these rich tooltips; see src/sheets/ddb/features/tooltips/ddb-tooltip-gate.ts.
import { isDdbHintTooltipSuppressed } from 'src/sheets/ddb/features/tooltips/ddb-tooltip-gate';

export class Tooltip {
  static show(target: HTMLElement, markup: string, theme: string) {
    if (isDdbHintTooltipSuppressed(target)) {
      return; // DDB-FORK
    }

    game.tooltip.activate(target, {
      html: markup,
      cssClass: `tidy5e-sheet application quadrone tooltip themed theme-${theme}`,
    });
  }
  static hide() {
    game.tooltip.deactivate();
  }
}
