import { Arr } from '@ephox/katamari';

import AstNode from '../api/html/Node';
import Schema from '../api/html/Schema';
import * as NodeType from '../dom/NodeType';

// Hacky thing to inject `data-mce-block` internal attributes on elements that are block like transparent elements
export const update = (schema: Schema, root: Element, context: string): void => {
  const transparentSelector = Object.keys(schema.getTransparentElements()).join(',');
  const blocksSelector = Object.keys(schema.getBlockElements()).join(',');
  const isBlockRoot = context in schema.getBlockElements() || context === 'body';

  Arr.each(root.querySelectorAll(transparentSelector), (anchor) => {
    // Probably more cases here
    if ((isBlockRoot && anchor.parentElement === root) || anchor.querySelectorAll(blocksSelector).length > 0) {
      anchor.setAttribute('data-mce-block', 'true');
    } else {
      anchor.removeAttribute('data-mce-block');
    }
  });
};

export const isTransparentBlock = (schema: Schema, node: Node): boolean => NodeType.isElement(node) && node.nodeName in schema.getTransparentElements() && node.hasAttribute('data-mce-block');
export const isTransparentInline = (schema: Schema, node: Node): boolean => NodeType.isElement(node) && node.nodeName in schema.getTransparentElements() && !node.hasAttribute('data-mce-block');

export const isTransparentAstBlock = (schema: Schema, node: AstNode): boolean => node.type === 1 && node.name in schema.getTransparentElements() && node.attr('data-mce-block') !== undefined;
export const isTransparentAstInline = (schema: Schema, node: AstNode): boolean => node.type === 1 && node.name in schema.getTransparentElements() && node.attr('data-mce-block') === undefined;
