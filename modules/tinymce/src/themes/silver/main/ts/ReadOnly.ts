import { AlloyComponent, Behaviour, Channels, Disabling, Gui, Receiving } from '@ephox/alloy';
import { FieldSchema, StructureSchema } from '@ephox/boulder';
import { Arr } from '@ephox/katamari';

import Editor from 'tinymce/core/api/Editor';

import * as Options from './api/Options';

export const ReadOnlyChannel = 'silver.readonly';

export interface ReadOnlyData {
  readonly: boolean;
}

export interface ReadOnlyUiReferences {
  readonly mainUi: {
    readonly outerContainer: AlloyComponent;
    readonly mothership: Gui.GuiSystem;
  };
  readonly uiMotherships: Gui.GuiSystem[];
}

const ReadOnlyDataSchema = StructureSchema.objOf([
  FieldSchema.requiredBoolean('readonly')
]);

const broadcastReadonly = (uiRefs: ReadOnlyUiReferences, readonly: boolean): void => {
  const motherships = [
    uiRefs.mainUi.mothership,
    ...uiRefs.uiMotherships
  ];

  if (readonly) {
    const dismissData = {
      target: uiRefs.mainUi.outerContainer.element
    };

    // We want to close all popups if we are setting read-only
    // Should we only do this if we aren't already in read-only? Or is that an unnecessary
    // optimisation?
    Arr.each(motherships, (m) => {
      m.broadcastOn([ Channels.dismissPopups() ], dismissData);
    });
  }

  Arr.each(motherships, (m) => {
    m.broadcastOn([ ReadOnlyChannel ], { readonly });
  });
};

const setupReadonlyModeSwitch = (editor: Editor, uiRefs: ReadOnlyUiReferences): void => {
  editor.on('init', () => {
    // Force an update of the ui components disabled states if in readonly mode
    if (editor.mode.isReadOnly()) {
      broadcastReadonly(uiRefs, true);
    }
  });

  editor.on('SwitchMode', () => broadcastReadonly(uiRefs, editor.mode.isReadOnly()));

  if (Options.isReadOnly(editor)) {
    editor.mode.set('readonly');
  }
};

const receivingConfig = (): Behaviour.NamedConfiguredBehaviour<any, any> => Receiving.config({
  channels: {
    [ReadOnlyChannel]: {
      schema: ReadOnlyDataSchema,
      onReceive: (comp, data: ReadOnlyData) => {
        Disabling.set(comp, data.readonly);
      }
    }
  }
});

export {
  ReadOnlyDataSchema,
  setupReadonlyModeSwitch,
  receivingConfig,
  broadcastReadonly
};
