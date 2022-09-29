import { context, describe, it } from '@ephox/bedrock-client';
import { Optional } from '@ephox/katamari';
import { assert } from 'chai';

import * as Boxes from 'ephox/alloy/alien/Boxes';
import * as DockingPositions from 'ephox/alloy/behaviour/docking/DockingPositions';

describe('DockingPositionTest', () => {

  // For simplicity, we ignore the x axis
  const x = 0;
  const width = 1000;

  context('No scrollable context', () => {
    it('dock-to-top', () => {
      const dtpContext: DockingPositions.DockingPositionContext = {
        optOffsetParentBox: Optional.none(),
        getBodyBox: () => {
          throw new Error('not required');
        },
        viewport: Boxes.bounds(x, 100, width, 600),
        optViewportScroll: Optional.none(),
        offsetParentIsScroll: false,
        scrollContainsOffsetParent: false,
        getWinBox: () => Boxes.bounds(x, 0, width, 1000)
      };

      const actual = DockingPositions.dockToTop(dtpContext);
      assert.equal(actual, { location: 'top', position: 'relative', topY: 10 });
    });
  });
});
