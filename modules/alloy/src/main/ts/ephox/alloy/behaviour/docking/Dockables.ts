import { Arr, Fun, Optional, Optionals } from '@ephox/katamari';
import { Class, Compare, Css, Height, SugarBody, SugarElement, SugarPosition, Width } from '@ephox/sugar';

import * as Boxes from '../../alien/Boxes';
import * as OffsetOrigin from '../../alien/OffsetOrigin';
import { AlloyComponent } from '../../api/component/ComponentApi';
import { NuPositionCss } from '../../positioning/view/PositionCss';
import * as DockingPositions from './DockingPositions';
import { DockingContext, DockingState, InitialDockingPosition, MorphAdt, morphAdt, ScrollableBounds } from './DockingTypes';

const appear = (component: AlloyComponent, contextualInfo: DockingContext): void => {
  const elem = component.element;
  Class.add(elem, contextualInfo.transitionClass);
  Class.remove(elem, contextualInfo.fadeOutClass);
  Class.add(elem, contextualInfo.fadeInClass);
  contextualInfo.onShow(component);
};

const disappear = (component: AlloyComponent, contextualInfo: DockingContext): void => {
  const elem = component.element;
  Class.add(elem, contextualInfo.transitionClass);
  Class.remove(elem, contextualInfo.fadeInClass);
  Class.add(elem, contextualInfo.fadeOutClass);
  contextualInfo.onHide(component);
};

const isPartiallyVisible = (box: Boxes.Bounds, scrollableViewport: ScrollableBounds): boolean =>
  box.y < scrollableViewport.bounds.bottom && box.bottom > scrollableViewport.bounds.y;

const isTopCompletelyVisible = (box: Boxes.Bounds, viewport: Boxes.Bounds): boolean =>
  box.y >= viewport.y;

const isBottomCompletelyVisible = (box: Boxes.Bounds, viewport: Boxes.Bounds): boolean =>
  box.bottom <= viewport.bottom;

// This is used to retrieve the position before we moved to fixed.
const getPrior = (elem: SugarElement<HTMLElement>, state: DockingState): Optional<{ originalBox: Boxes.Bounds } & InitialDockingPosition> =>

  state.getInitialPos().map(
    // Only supports position absolute.
    (dockingPos) => {
      return {
        originalBox: Boxes.bounds(
          dockingPos.x,
          dockingPos.y,
          Width.get(elem),
          Height.get(elem)
        ),
        ...dockingPos
      };
    }
  );

// This is used to store the position before we moved to fixed.
const storePrior = (elem: SugarElement<HTMLElement>, box: Boxes.Bounds, state: DockingState): void => {
  state.setInitialPos({
    // These styles are only used, not because their values are considered, but because
    // they are used to determine whether those properties should be set (is it left or right aligned etc.)
    // The actual values seem to be ignored.
    hasLeftCss: Css.getRaw(elem, 'left').isSome(),
    hasRightCss: Css.getRaw(elem, 'right').isSome(),
    hasTopCss: Css.getRaw(elem, 'top').isSome(),
    hasBottomCss: Css.getRaw(elem, 'bottom').isSome(),
    positionCss: Css.get(elem, 'position') || 'static',
    x: box.x,
    y: box.y
  });
};

// This is used to store the position before we moved to fixed.
const storePriorIfNone = (elem: SugarElement<HTMLElement>, box: Boxes.Bounds, state: DockingState): void => {
  state.getInitialPos().fold(
    () => storePrior(elem, box, state),
    () => Fun.noop
  );
};

const revertToOriginal = (elem: SugarElement<HTMLElement>, box: Boxes.Bounds, scrollableViewport: ScrollableBounds, state: DockingState): Optional<MorphAdt> =>
  // Here, we are getting a position that was calculated, therefore did not consider any offset parents. It also
  // had the value of whatever scroll was at the time.
  state.getInitialPos().bind((originalPos) => {
    state.clearInitialPos();
    elem.dom.removeAttribute('data-bounds');

    switch (originalPos.positionCss) {
      case 'static':
        return Optional.some(morphAdt.static());

      case 'absolute':
        const optOffsetParent = OffsetOrigin.getOffsetParent(elem);
        const offsetBox = optOffsetParent
          .map(Boxes.box)
          .getOrThunk(
            () => Boxes.box(SugarBody.body()
            )
          );

        // for example 2, this needs to subtract the scroll, but for example 3, it should not
        const offsetParentIsScrollable = scrollableViewport.scroll.exists(
          (scroll) => optOffsetParent.exists(
            (op) => Compare.eq(op, scroll.element)
          )
        );

        const scrollY = offsetParentIsScrollable ? 0 : scrollableViewport.scroll.map((s) => s.offsets.top).getOr(0);
        return Optional.some(morphAdt.absolute(NuPositionCss(
          'absolute',
          Optionals.someIf(originalPos.hasLeftCss, box.x - offsetBox.x),
          Optionals.someIf(originalPos.hasTopCss, box.y - scrollY - (offsetBox.y)),
          Optionals.someIf(originalPos.hasRightCss, offsetBox.right - box.right),
          Optionals.someIf(originalPos.hasBottomCss, offsetBox.bottom - box.bottom)
        )));

      default:
        return Optional.none<MorphAdt>();
    }
  });

const getDockingLocation = (dockingContext: DockingPositions.DockingPositionContext, state: DockingState, visibility: { top: boolean; bottom: boolean }): DockingPositions.DockingLocationDetails => {
  const dockingModes = state.getModes();
  if (!visibility.top && Arr.contains(dockingModes, 'top')) {
    return DockingPositions.dockToTop(dockingContext);
  } else if (!visibility.bottom && Arr.contains(dockingModes, 'bottom')) {
    return DockingPositions.dockToBottom(dockingContext);
  } else {
    return {
      location: 'no-dock'
    };
  }
};

const getDockingMorph = (
  dockingContext: DockingPositions.DockingPositionContext,
  dockingLocation: DockingPositions.DockingLocationDetails,
  dockingPosAndBox: { originalBox: Boxes.Bounds } & InitialDockingPosition
): Optional<MorphAdt> => {
  // NOTE: The "left" and "right" handling here are quite naive, and are unlikely to be considering all of the
  // cases. It's likely that this is "good enough" because Docking currently only works on the y axis, and just
  // has to preserve whatever x was. So all this is doing is considering the offsetParent modifications required
  // when setting CSS positions.
  const offsetBox = dockingContext.optOffsetParentBox.getOrThunk(dockingContext.getBodyBox);
  const optLeft = Optionals.someIf(dockingPosAndBox.hasLeftCss, dockingPosAndBox.originalBox.x - offsetBox.x);
  const optRight = Optionals.someIf(dockingPosAndBox.hasRightCss, offsetBox.right - dockingPosAndBox.originalBox.right);

  switch (dockingLocation.location) {
    case 'top': {
      return Optional.some(
        morphAdt.absolute(
          NuPositionCss(
            dockingLocation.position,
            optLeft,
            Optional.some(dockingLocation.topY),
            optRight,
            Optional.none()
          )
        )
      );
    }

    case 'bottom': {
      return Optional.some(
        morphAdt.absolute(
          NuPositionCss(
            dockingLocation.position,
            optLeft,
            Optional.none(),
            optRight,
            Optional.some(dockingLocation.bottomY)
          )
        )
      );
    }

    default: {
      return Optional.none();
    }
  }
};
const getMorph = (component: AlloyComponent, scrollableViewport: ScrollableBounds, state: DockingState): Optional<MorphAdt> => {
  const elem = component.element;

  // We are using adaptive docking if our viewport is scrollable
  const adaptiveDocking = scrollableViewport.scroll.isSome();

  // Importantly, we consider the scroll values of the viewport here. But why is that important?
  // Because, there are three things we are comparing:
  // * current element box
  // * current viewport
  // * original position if element is currently docked
  //
  // So if we were just comparing current element box and the current viewport, the scroll values are going to be the same, so
  // there is no reason to include them (as they cancel each other out). However, because we are also comparing with the original
  // position, we need to consider the scroll. This is because the original position might have had a different scroll value to the
  // current scroll. So to compare across all of these values, we need to include the scroll. QED.
  const viewportScroll = scrollableViewport.scroll.map((s) => s.offsets).getOrThunk(() => SugarPosition(0, 0));
  const currentElemBox = Boxes.translate(
    Boxes.box(elem),
    viewportScroll.left,
    viewportScroll.top
  );

  // As above, we consider the viewport's scroll when getting the bounds of the viewport
  const viewportBounds = scrollableViewport.scroll.map(
    (scroller) => Boxes.translate(
      scrollableViewport.bounds,
      scroller.offsets.left,
      scroller.offsets.top
    )
  ).getOr(scrollableViewport.bounds);

  // So when considering how we should respond to this "potentially-triggering-a-morph" event, we need to first know what state
  // we are in. Remember, there are just two states, though Docking's configuration does make those states rather customisable
  //
  // (1) original
  // (2) docked
  //
  // There is an invariant that *should* hold that any element in a docked state **must** have a saved prior original position. So
  // we can determine if we are in (2) based on the presence of that value.
  return getPrior(elem, state).fold(
    () => {
      // We don't have an initial position yet, so we aren't docked. See if we need
      // to dock now, because the element has gone out of bounds?
      const topCompletelyVisible = isTopCompletelyVisible(currentElemBox, viewportBounds);
      const bottomCompletelyVisible = isBottomCompletelyVisible(currentElemBox, viewportBounds);

      const dockingContext = DockingPositions.deriveContext(elem, scrollableViewport);
      const dockingLocation = getDockingLocation(dockingContext, state, {
        top: topCompletelyVisible,
        bottom: bottomCompletelyVisible
      });

      if (dockingLocation.location !== 'no-dock') {
        // We are about to move from being in our "original" state, to our "docked" state, so we want to backup
        // the location, so that we can restore it later. Importantly, this location / box **must** consider
        // the current scroll, which currentElemBox already does.
        storePrior(elem, currentElemBox, state);
        return getPrior(elem, state).bind(
          (dockingPosAndBox) => getDockingMorph(dockingContext, dockingLocation, dockingPosAndBox)
        );
      } else {
        return Optional.none();
      }
    },

    (dockingPosAndBox) => {
      // If we have an initialPos, we are docked. So we need to see if we can get out of
      // being docked, or if not, if we need to adjust our docking position
      // This will be inefficient while I'm streamlining it.
      const topCompletelyVisible = isTopCompletelyVisible(dockingPosAndBox.originalBox, viewportBounds);
      const bottomCompletelyVisible = isBottomCompletelyVisible(dockingPosAndBox.originalBox, viewportBounds);

      if (topCompletelyVisible && bottomCompletelyVisible) {
        // We can restore now.
        return revertToOriginal(elem, dockingPosAndBox.originalBox, scrollableViewport, state);

      // If we can't restore the original (because it still isn't on screen), then what we
      // do is dependent on whether or not we have configured "adaptive-docking". If "adaptive-docking"
      // is on, we stay in docked mode, but we adjust the position of our docked mode.
      } else if (adaptiveDocking) {

        const dockingContext = DockingPositions.deriveContext(elem, scrollableViewport);
        const dockingLocation = getDockingLocation(dockingContext, state, {
          top: topCompletelyVisible,
          bottom: bottomCompletelyVisible
        });

        // Because, we are in adaptive-docking mode, it is *critical* that we don't actually
        // save our current position. We want to keep the original position the position we were
        // in *before* we entered docking in the first place. So just return the morph without
        // backing up the position.
        return getDockingMorph(dockingContext, dockingLocation, dockingPosAndBox);
      } else {
        return Optional.none();
      }
    }
  );
};

// This basically just forces going back to the original, even if it isn't visible.
const getMorphToOriginal = (component: AlloyComponent, scrollableViewport: ScrollableBounds, state: DockingState): Optional<MorphAdt> => {
  const elem = component.element;
  // Find the prior position, and restore it. It does not matter if it is visible.
  return getPrior(elem, state).bind((dockingPos) => revertToOriginal(elem, dockingPos.originalBox, scrollableViewport, state));
};

export {
  appear,
  disappear,
  isPartiallyVisible,
  getMorph,
  getMorphToOriginal,
  getDockingMorph,

  storePrior,
  storePriorIfNone
};
