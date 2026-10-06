// DDB-FORK: mechanical rename only (SHEET_CSS_CLASS); no behaviour change
import type { InfoCardState } from 'src/components/info-card/info-card.svelte';
import { CONSTANTS } from 'src/constants';
import { getSvelteApplicationMixin } from 'src/mixins/SvelteApplicationMixin.svelte';
import type { ApplicationConfiguration } from 'src/types/application.types';
import { mount } from 'svelte';
import DetachedInfoCard from './DetachedInfoCard.svelte';

export class DetachedInfoCardApplication extends getSvelteApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  #cardState: InfoCardState<any>;

  constructor(
    cardState: InfoCardState<any>,
    options?: Partial<ApplicationConfiguration>
  ) {
    super(options);

    this.#cardState = cardState;
  }

  static DEFAULT_OPTIONS: Partial<
    ApplicationConfiguration & { dragDrop: Partial<DragDropConfiguration>[] }
  > = {
    classes: [
      CONSTANTS.SHEET_CSS_CLASS,
      'application-shell',
      'tidy-info-card-application',
      CONSTANTS.SHEET_LAYOUT_CLASSIC,
    ],
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      resizable: true,
      controls: [],
    },
    position: {
      width: 280,
      height: 460,
    },
    actions: {},
    submitOnClose: false,
  };

  _createComponent(node: HTMLElement): Record<string, any> {
    const component = mount(DetachedInfoCard, {
      target: node,
      props: {
        cardState: this.#cardState,
      },
    });

    return component;
  }

  async _prepareContext() {
    return {};
  }
}
