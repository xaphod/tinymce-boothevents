import { Optional } from '@ephox/katamari';
import { Compare, SugarBody, SugarElement, SugarPosition } from '@ephox/sugar';

import * as Boxes from '../../alien/Boxes';
import * as OffsetOrigin from '../../alien/OffsetOrigin';
// import * as DockingFixedMorph from './DockingFixedMorph';
import { ScrollableBounds } from './DockingTypes';

export interface DockingPositionContext {
  readonly optOffsetParentBox: Optional<Boxes.Bounds>;
  // getBodyBox is only used when no offset parent
  readonly getBodyBox: () => Boxes.Bounds;
  readonly viewport: Boxes.Bounds;
  readonly optViewportScroll: Optional<SugarPosition>;
  readonly offsetParentIsScroll: boolean;
  readonly scrollContainsOffsetParent: boolean;
  // readonly originalPos: Omit<InitialDockingPosition, 'style'>;
  // getWinBox is only used when there is no scrolling context
  readonly getWinBox: () => Boxes.Bounds;
}

export interface DockToTopDetails {
  location: 'top';
  position: string;
  topY: number;
}

export interface DockToBottomDetails {
  location: 'bottom';
  position: string;
  bottomY: number;
}

export interface NoDockDetails {
  location: 'no-dock';
}

export type DockingLocationDetails = DockToTopDetails | DockToBottomDetails | NoDockDetails;

export const deriveContext = (
  dockingElem: SugarElement<HTMLElement>,
  scrollableViewport: ScrollableBounds
): DockingPositionContext => {
  // This is going to get things and stuff from DOM stuff.
  const optOffsetParent = OffsetOrigin.getOffsetParent(dockingElem);
  const optOffsetParentBox = optOffsetParent.map(Boxes.box);
  const getBodyBox = () => Boxes.box(SugarBody.body());
  const getWinBox = () => Boxes.win();

  return scrollableViewport.scroll.fold(
    () => {
      return {
        optOffsetParentBox,
        getBodyBox,
        getWinBox,
        viewport: scrollableViewport.bounds,
        optViewportScroll: Optional.none(),
        offsetParentIsScroll: false,
        scrollContainsOffsetParent: false,
        // originalPos
      };
    },
    (scroll) => {
      const offsetParentIsScroll = optOffsetParent.exists((op) => Compare.eq(op, scroll.element));
      // Optimisation: if the offset parent is the scroll, the the scroll can't contain the offset parent
      const scrollContainsOffsetParent = !offsetParentIsScroll && optOffsetParent.exists(
        (op) => Compare.contains(scroll.element, op)
      );

      return {
        optOffsetParentBox,
        getBodyBox,
        getWinBox,
        viewport: scrollableViewport.bounds,
        optViewportScroll: Optional.some(scroll.offsets),
        offsetParentIsScroll,
        scrollContainsOffsetParent,
      };
    }
  );
};

export const dockToTop = (context: DockingPositionContext): DockToTopDetails => {
  // Firstly, if we don't have blah and blah, do blah.
  return context.optViewportScroll.fold(
    () => {
      // We don't have any scrolling at all, so we just need to use normal fixed positioning.
      const newY = context.viewport.y - context.getWinBox().y;
      return {
        location: 'top',
        position: 'fixed',
        topY: newY
      };
    },
    (scroll: SugarPosition) => {
      // Now, we check if there is an offset parent, but there is a scrollable.
      return context.optOffsetParentBox.fold(
        () => {
          // This case is rare (for offsetParent not to be body). I think some browsers might
          // do if for fixed positioned things? Investigate.
          const newY = context.viewport.y - context.getBodyBox().y;
          return {
            location: 'top',
            position: 'absolute',
            topY: newY
          };
        },
        (offsetParentBox) => {
          if (context.offsetParentIsScroll) {
            console.log('offset parent is scroll');
            return {
              location: 'top',
              position: 'absolute',
              topY: scroll.top
            };
          } else if (context.scrollContainsOffsetParent) {
            console.log('offset parent is contained by scroll');
            const deltaFromOffsetParent = context.viewport.y - offsetParentBox.y;
            const newY = deltaFromOffsetParent;
            return {
              location: 'top',
              position: 'absolute',
              topY: newY
            };
          } else {
            console.log('offset parent is outside scroll');
            const newY = context.viewport.y - context.getBodyBox().y;
            return {
              location: 'top',
              position: 'absolute',
              topY: newY
            };
          }
        }
      );
    }
  );
};

export const dockToBottom = (context: DockingPositionContext): DockToBottomDetails => {
  // Firstly, if we don't have blah and blah, do blah.
  return context.optViewportScroll.fold(
    () => {
      // We don't have any scrolling at all, so we just need to use normal fixed positioning.
      const newY = context.getWinBox().bottom - context.viewport.bottom;
      return {
        location: 'bottom',
        position: 'fixed',
        bottomY: newY
      };
    },
    (scroll: SugarPosition) => {
      return context.optOffsetParentBox.fold(
        () => {
          // Not sure about this. Not sure what the values should be in this case.
          return {
            location: 'bottom',
            position: 'absolute',
            bottomY: context.getBodyBox().y + (context.getWinBox().bottom - context.viewport.bottom)
          };
        },
        (offsetParentBox) => {
          if (context.offsetParentIsScroll) {

            // Let's start with bottom: 0px. This is the right location, but only
            // when scroll is 0. As soon as scroll isn't 0, it's in the wrong location.
            // However, do we just need to add scroll? No, we don't need to *add* scroll,
            // we need to subtract scroll. Because as we scroll the page, the bottom
            // value goes up. To make it go down, we need negative values.
            return {
              location: 'bottom',
              position: 'absolute',
              bottomY: -scroll.top
            };
          } else if (context.scrollContainsOffsetParent) {

            // Let's start with the last approach, because that worked quite well.
            // If we set bottom to 0 px, what happens?

            // So that puts it in the offset parent, and you need to scroll down to the
            // bottom of the offset parent (using the scrolling element) to see it. So if
            // we want it to show on our current screen, that's not going to be very useful.

            // But we can work out how far away that is. If we subtract the entire height of the
            // offset parent, that should put it at the top of the offset parent (within the scroller).
            // Let's see about that. Yep, that puts it just above.

            // None of these values are really all that relevant to the current position in the scroller.
            // In fact, there is nothing to say that the current position doesn't require rising even further
            // than the top of the offset parent.

            // So if the offset parent was 1500px down the page, and had 2000px after it in the full
            // scrollable area, and the scroll of the container was 50px, what would happen?

            // Well, the bottom is measured from the offset parent, so to get to the top, we would subtract
            // the offset parent's height. That would put us just above the offset parent. Then we'd subtract the
            // offset parent's top (ignoring scroll), and then we'd add the scroller's scroll and then the
            // scroller's height

            /*
            The commented out bottomY and bottomY2 are just showing the whole working. bottomY3 is the simplified response.

              The offsetParentBox.y considers the context.viewport.y, so we want to subtract that first.
              const offsetTop = offsetParentBox.y + scroll.top - context.viewport.y;

              const bottomY =
                offsetParentBox.height // move to just above the offset parent
                + offsetTop // move to just above the scroller's top
                - context.viewport.height // move to the bottom of the start of the scroller
                - scroll.top; // move to the current scroll position

              const bottomY2 =
                offsetParentBox.height
                + offsetParentBox.y
                + scroll.top
                - context.viewport.y
                - context.viewport.height
                - scroll.top;

            */

            // This is just simplified from above:
            const bottomY =
              offsetParentBox.bottom - context.viewport.bottom;

            return {
              location: 'bottom',
              position: 'absolute',
              bottomY
            };
          } else {
            // So, basically, if bottom is 0px, then this will be at the bottom of the *unscrolled* offset
            // parent. If the offset parent was the body, then as you scroll the window, the bottom of 0 px
            // moves up the page. So we need to use bottom to be negative by the amount of scroll in that case,
            // but in the general case, we just have to *add* the boundingClientRect top (which is the box - scroll)
            const offsetParentBoxWithoutScroll = Boxes.translate(
              offsetParentBox,
              -window.scrollX,
              -window.scrollY
            );

            console.log({
              offsetParentBox,
              offsetParentBoxWithoutScroll
            });

            // With bottom: 0px, that gets us to the bottom of the window. Now, we need to rise by the difference
            // between the bottom of the window, and the viewport.

            console.log('offset parent is outside scroll');
            return {
              location: 'bottom',
              position: 'absolute',
              bottomY: offsetParentBoxWithoutScroll.y + (context.getWinBox().bottom - context.viewport.bottom)
            };
          }
        }
      );
    }
  );
};
