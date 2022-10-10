import { AlloyComponent, AlloyTriggers, Composing, ModalDialog } from '@ephox/alloy';
import { Dialog, DialogManager } from '@ephox/bridge';
import { Fun, Id, Optional } from '@ephox/katamari';

import { UiFactoryBackstage } from '../../backstage/Backstage';
import { formSetInitialData } from '../general/FormEvents';
import { renderModalBody } from './SilverDialogBody';
import * as SilverDialogCommon from './SilverDialogCommon';
import { SilverDialogEvents } from './SilverDialogEvents';
import { renderModalFooter } from './SilverDialogFooter';
import { DialogAccess, getDialogApi } from './SilverDialogInstanceApi';

interface RenderedDialog<T extends Dialog.DialogData> {
  readonly dialog: AlloyComponent;
  readonly instanceApi: Dialog.DialogInstanceApi<T>;
  readonly setInitialData: (data: any) => void;
}

const getDialogSizeClasses = (size: Dialog.DialogSize): string[] => {
  switch (size) {
    case 'large':
      return [ 'tox-dialog--width-lg' ];
    case 'medium':
      return [ 'tox-dialog--width-md' ];
    default:
      return [];
  }
};

const renderDialog = <T extends Dialog.DialogData>(dialogInit: DialogManager.DialogInit<T>, extra: SilverDialogCommon.WindowExtra<T>, backstage: UiFactoryBackstage): RenderedDialog<T> => {
  const dialogId = Id.generate('dialog');
  const internalDialog = dialogInit.internalDialog;
  const header = SilverDialogCommon.getHeader(internalDialog.title, dialogId, backstage);

  const body = renderModalBody({
    body: internalDialog.body,
    initialData: internalDialog.initialData
  }, dialogId, backstage);

  const storedMenuButtons = SilverDialogCommon.mapMenuButtons(internalDialog.buttons);

  const objOfCells = SilverDialogCommon.extractCellsToObject(storedMenuButtons);

  const footer = renderModalFooter({
    buttons: storedMenuButtons
  }, dialogId, backstage);

  const dialogEvents = SilverDialogEvents.initDialog<T>(
    () => instanceApi,
    SilverDialogCommon.getEventExtras(() => dialog, backstage.shared.providers, extra),
    backstage.shared.getSink
  );

  const dialogSize = getDialogSizeClasses(internalDialog.size);

  const spec = {
    id: dialogId,
    header,
    body,
    footer: Optional.some(footer),
    extraClasses: dialogSize,
    extraBehaviours: [],
    extraStyles: {}
  };

  const dialog: AlloyComponent = SilverDialogCommon.renderModalDialog(spec, dialogInit, dialogEvents, backstage);

  const modalAccess = ((): DialogAccess => {
    const getForm = (): AlloyComponent => {
      const outerForm = ModalDialog.getBody(dialog);
      return Composing.getCurrent(outerForm).getOr(outerForm);
    };

    return {
      getId: Fun.constant(dialogId),
      getRoot: Fun.constant(dialog),
      getBody: () => ModalDialog.getBody(dialog),
      getFooter: () => ModalDialog.getFooter(dialog),
      getFormWrapper: getForm
    };
  })();

  // TODO: Get the validator from the dialog state.
  const instanceApi = getDialogApi<T>(modalAccess, extra.redial, objOfCells);

  const setInitialData = (data: any) => {
    instanceApi.setData(data);
    AlloyTriggers.emit(modalAccess.getFormWrapper(), formSetInitialData);
  };

  return {
    dialog,
    instanceApi,
    setInitialData
  };
};

export {
  renderDialog
};
