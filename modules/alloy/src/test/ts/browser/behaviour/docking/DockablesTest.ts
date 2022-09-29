import { ApproxStructure, Assertions } from '@ephox/agar';
import { beforeEach, context, describe, it } from '@ephox/bedrock-client';
import { Optional } from '@ephox/katamari';
import { assert } from 'chai';

import { Bounds } from 'ephox/alloy/alien/Boxes';
import * as GuiFactory from 'ephox/alloy/api/component/GuiFactory';
import { TestStore } from 'ephox/alloy/api/testhelpers/TestHelpers';
import * as Dockables from 'ephox/alloy/behaviour/docking/Dockables';
import * as DockingStates from 'ephox/alloy/behaviour/docking/DockingState';
import { DockingContext, DockingState } from 'ephox/alloy/behaviour/docking/DockingTypes';

describe('Dockables', () => {

  const bounds = (x: number, y: number, w: number, h: number): Bounds => ({
    x,
    y,
    width: w,
    height: h,
    right: x + w,
    bottom: y + h
  });

  const buildContext = (store: TestStore): DockingContext => {
    return {
      fadeInClass: 'fade-in',
      fadeOutClass: 'fade-out',
      transitionClass: 'transition',
      lazyContext: Optional.none,
      onHidden: store.adder('onHidden'),
      onHide: store.adder('onHide'),
      onShown: store.adder('onShown'),
      onShow: store.adder('onShow'),
    };
  };

  context('appear', () => {
    const store = TestStore();
    const contextualInfo = buildContext(store);

    beforeEach(() => {
      store.clear();
    });

    it('basic test', () => {
      const component = GuiFactory.build({
        dom: {
          tag: 'div',
          classes: [ 'fade-out' ]
        }
      });

      Dockables.appear(component, contextualInfo);
      store.assertEq('onShow should have fired', [ 'onShow' ]);
      Assertions.assertStructure(
        'Post-appear',
        ApproxStructure.build((s, str, arr) => {
          return s.element('div', {
            classes: [
              arr.not('fade-out'),
              arr.has('fade-in'),
              arr.has('transition')
            ]
          });
        }),
        component.element
      );
    });
  });

  context('disappear', () => {
    const store = TestStore();
    const contextualInfo = buildContext(store);

    beforeEach(() => {
      store.clear();
    });

    it('basic test', () => {
      const component = GuiFactory.build({
        dom: {
          tag: 'div',
          classes: [ 'fade-in' ]
        }
      });

      Dockables.disappear(component, contextualInfo);
      store.assertEq('onShow should have fired', [ 'onHide' ]);
      Assertions.assertStructure(
        'Post-appear',
        ApproxStructure.build((s, str, arr) => {
          return s.element('div', {
            classes: [
              arr.not('fade-in'),
              arr.has('fade-out'),
              arr.has('transition')
            ]
          });
        }),
        component.element
      );
    });
  });

  context('getMorph', () => {
    context('modes: top', () => {

      const buildState = (store: TestStore): DockingState => DockingStates.init({
        modes: [ 'top' ],
      } as any);

      const buildViewport = () => ({
        bounds: bounds(100, 50, 500, 400),
        scroll: Optional.none()
      });

      const buildComp = (position: 'absolute' | 'fixed' | 'static' ) => GuiFactory.build({
        dom: {
          tag: 'div',
          styles: {
            position
          }
        }
      });

      it('is fixed -> but attempt to restore to original absolute should fail (it is above screen still)', () => {
        const store = TestStore();
        const state = buildState(store);
        const viewport = buildViewport();
        const component = buildComp('fixed');

        state.setInitialPos({
          hasBottomCss: false,
          hasTopCss: false,
          hasLeftCss: true,
          hasRightCss: false,
          positionCss: 'absolute',
          x: 10,
          y: 5
        });

        const actual = Dockables.getMorph(component, viewport, state);
        actual.each(
          (_) => {
            assert.fail('Should not morph into the other thing as there is no room');
          }
        );
      });

      it('is fixed -> but attempt to restore to original absolute should fail (it is above screen still2)', () => {
        const store = TestStore();
        const state = buildState(store);
        const viewport = buildViewport();
        const component = buildComp('fixed');

        state.setInitialPos({
          hasLeftCss: true,
          hasRightCss: false,
          hasTopCss: false,
          hasBottomCss: false,
          positionCss: 'absolute',
          x: 10,
          y: 150
        });

        const actual = Dockables.getMorph(component, viewport, state);
        actual.each(
          (a) => {
            a.log('morphing');
            assert.fail('Should not morph into the other thing as there is no room: ' + JSON.stringify(a));
          }
        );

        // Basic stuff
        /*
        // Original: absolute, (x: 10, y: 5, w: 15, h: 5)
        // Viewport
        // No offset parent
        */

        // Other basic stuff.
      });
    });

  });

  // context('disappear', () => {

  // });

  // context('isPartiallyVisible', () => {

  // });

  // context('getMorph', () => {

  // });

  // context('getMorphToOriginal', () => {

  // });
});
