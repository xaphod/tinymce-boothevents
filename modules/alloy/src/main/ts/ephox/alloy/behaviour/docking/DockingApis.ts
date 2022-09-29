import { Arr, Fun } from '@ephox/katamari';
import { Classes, Css } from '@ephox/sugar';

import * as Boxes from '../../alien/Boxes';
import { AlloyComponent } from '../../api/component/ComponentApi';
import { applyPositionCss, PositionCss } from '../../positioning/view/PositionCss';
import * as Dockables from './Dockables';
import * as DockingPositions from './DockingPositions';
import { DockingConfig, DockingMode, DockingState, MorphAdt, ScrollableBounds } from './DockingTypes';

const morphToStatic = (component: AlloyComponent, config: DockingConfig, state: DockingState): void => {
  state.setDocked(false);
  Arr.each([ 'left', 'right', 'top', 'bottom', 'position' ], (prop) => Css.remove(component.element, prop));
  config.onUndocked(component);
};

const morphToCoord = (component: AlloyComponent, config: DockingConfig, state: DockingState, position: PositionCss): void => {
  // Because of adaptive-absolute, fixed isn't the only "docking" now. But if we have a prior position,
  // then we are docked, because that should be cleared when we undock
  const isDocked = state.getInitialPos().isSome();
  state.setDocked(isDocked);
  applyPositionCss(component.element, position);
  const method = isDocked ? config.onDocked : config.onUndocked;
  method(component);
};

const updateVisibility = (component: AlloyComponent, config: DockingConfig, state: DockingState, scrollableViewport: ScrollableBounds, morphToDocked: boolean = false): void => {
  config.contextual.each((contextInfo) => {
    // Make the dockable component disappear if the context is outside the viewport
    contextInfo.lazyContext(component).each((box) => {
      const isVisible = Dockables.isPartiallyVisible(box, scrollableViewport);
      if (isVisible !== state.isVisible()) {
        state.setVisible(isVisible);

        // If morphing to docked and the context isn't visible then immediately set
        // the fadeout class and don't worry about transitioning, as the context
        // would never have been in view while docked
        if (morphToDocked && !isVisible) {
          Classes.add(component.element, [ contextInfo.fadeOutClass ]);
          contextInfo.onHide(component);
        } else {
          const method = isVisible ? Dockables.appear : Dockables.disappear;
          method(component, contextInfo);
        }
      }
    });
  });
};

const applyMorph = (component: AlloyComponent, config: DockingConfig, state: DockingState, viewport: ScrollableBounds, morph: MorphAdt) => {
  morph.fold(
    () => morphToStatic(component, config, state),
    (position) => {
      // Hack to include an update of visibility because adaptive-absolute is now a dockable class
      if (state.isDocked()) {
        updateVisibility(component, config, state, viewport, true);
      }
      morphToCoord(component, config, state, position);
    },
    (position) => {
      updateVisibility(component, config, state, viewport, true);
      morphToCoord(component, config, state, position);
    }
  );
};

const refreshInternal = (component: AlloyComponent, config: DockingConfig, state: DockingState): void => {
  // Absolute coordinates (considers scroll)
  const viewport = config.lazyViewport(component);
  // If docked then check if we need to hide/show the component
  const isDocked = state.getInitialPos().isSome();
  if (isDocked) {
    updateVisibility(component, config, state, viewport);
  }

  Dockables.getMorph(component, viewport, state).each((morph) => {
    applyMorph(component, config, state, viewport, morph);
  });
};

const resetInternal = (component: AlloyComponent, config: DockingConfig, state: DockingState): void => {
  // Morph back to the original position
  const elem = component.element;
  state.setDocked(false);
  Dockables.getMorphToOriginal(component, config.lazyViewport(component), state).each((morph) => {
    morph.fold(
      () => morphToStatic(component, config, state),
      (position) => morphToCoord(component, config, state, position),
      Fun.noop
    );
  });

  // Remove contextual visibility classes
  state.setVisible(true);
  config.contextual.each((contextInfo) => {
    Classes.remove(elem, [ contextInfo.fadeInClass, contextInfo.fadeOutClass, contextInfo.transitionClass ]);
    contextInfo.onShow(component);
  });

  // Apply docking again to reset the position
  refresh(component, config, state);
};

const refresh = (component: AlloyComponent, config: DockingConfig, state: DockingState): void => {
  // Ensure the component is attached to the document/world, if not then do nothing as we can't
  // check if the component should be docked or not when in a detached state
  if (component.getSystem().isConnected()) {
    refreshInternal(component, config, state);
  }
};

const reset = (component: AlloyComponent, config: DockingConfig, state: DockingState): void => {
  // If the component is not docked then there's no need to reset the state,
  // so only reset when docked
  if (state.isDocked()) {
    resetInternal(component, config, state);
  }
};

const isDocked = (component: AlloyComponent, config: DockingConfig, state: DockingState): boolean =>
  state.isDocked();

const setModes = (component: AlloyComponent, config: DockingConfig, state: DockingState, modes: DockingMode[]): void =>
  state.setModes(modes);

const getModes = (component: AlloyComponent, config: DockingConfig, state: DockingState): DockingMode[] =>
  state.getModes();

const forceDockWith = (component: AlloyComponent, config: DockingConfig, state: DockingState, dockAction: (context: DockingPositions.DockingPositionContext) => DockingPositions.DockingLocationDetails) => {
  const originalBox = Boxes.box(component.element);
  const scrollableBounds = config.lazyViewport(component);
  const originalBoxWithScroll = scrollableBounds.scroll.map(
    (scroll) => Boxes.translate(originalBox, scroll.offsets.left, scroll.offsets.top)
  ).getOr(originalBox);

  // We only store the values if we aren't already "docked"
  Dockables.storePriorIfNone(component.element, originalBoxWithScroll, state);
  state.getInitialPos().each(
    (initialPos) => {
      const dockingContext = DockingPositions.deriveContext(component.element, scrollableBounds);
      const dockingLocation = dockAction(dockingContext);
      const dockingPosAndBox = {
        originalBox: originalBoxWithScroll,
        ...initialPos
      };

      Dockables.getDockingMorph(dockingContext, dockingLocation, dockingPosAndBox).each(
        (morph) => {
          applyMorph(component, config, state, scrollableBounds, morph);

          // INVESTIGATE: Do we setDocked to true here?
          state.setDocked(true);
        }
      );
    }
  );
};

const forceDockToTop = (component: AlloyComponent, config: DockingConfig, state: DockingState): void => {
  forceDockWith(component, config, state, DockingPositions.dockToTop);
};

const forceDockToBottom = (component: AlloyComponent, config: DockingConfig, state: DockingState): void => {
  forceDockWith(component, config, state, DockingPositions.dockToBottom);
};

const forceRestore = (component: AlloyComponent, config: DockingConfig, state: DockingState): void => {
  const scrollableBounds = config.lazyViewport(component);
  Dockables.getMorphToOriginal(component, scrollableBounds, state).each((morph) => {
    state.setDocked(false);
    morph.log('restoration');
    applyMorph(component, config, state, scrollableBounds, morph);
  });
};

const clearOriginal = (component: AlloyComponent, config: DockingConfig, state: DockingState): void => {
  state.clearInitialPos();
};

export { refresh, reset, isDocked, getModes, setModes, forceDockToTop, forceDockToBottom, forceRestore, clearOriginal };
