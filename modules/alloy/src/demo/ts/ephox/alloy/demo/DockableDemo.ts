import { Optional } from '@ephox/katamari';
import { Class, Css, DomEvent, SelectorFind, SugarElement, SugarPosition } from '@ephox/sugar';

import * as Boxes from 'ephox/alloy/alien/Boxes';
import * as AddEventsBehaviour from 'ephox/alloy/api/behaviour/AddEventsBehaviour';
import { AllowBubbling } from 'ephox/alloy/api/behaviour/AllowBubbling';
import * as Behaviour from 'ephox/alloy/api/behaviour/Behaviour';
import { Docking } from 'ephox/alloy/api/behaviour/Docking';
import { Dragging } from 'ephox/alloy/api/behaviour/Dragging';
import { AlloyComponent } from 'ephox/alloy/api/component/ComponentApi';
import { SimpleOrSketchSpec } from 'ephox/alloy/api/component/SpecTypes';
import * as AlloyEvents from 'ephox/alloy/api/events/AlloyEvents';
import * as SystemEvents from 'ephox/alloy/api/events/SystemEvents';
import * as Attachment from 'ephox/alloy/api/system/Attachment';
import * as Gui from 'ephox/alloy/api/system/Gui';
import { Button } from 'ephox/alloy/api/ui/Button';
import * as HtmlDisplay from 'ephox/alloy/demo/HtmlDisplay';

export default (): void => {
  const gui = Gui.create();
  const body = SugarElement.fromDom(document.body);
  Class.add(gui.element, 'gui-root-demo-container');
  // Css.set(gui.element, 'direction', 'rtl');

  Attachment.attachSystem(body, gui);
  // Css.set(body, 'margin-top', '2000px');
  Css.set(body, 'padding-bottom', '2000px');

  /* As of alloy 3.51.0, alloy root contains must be told about scroll events */
  DomEvent.bind(SugarElement.fromDom(window), 'scroll', (evt) => {
    // gui.broadcastEvent(SystemEvents.windowScroll(), evt);
  });

  const listenToContainerScroll = false;
  const hideWhenContextGone = false;

  const toggleButton = (boxId: number) => {

    const runOnComp = (dockingApi: (comp: AlloyComponent) => void) => () => {
      const comp = gui.getByDom(SelectorFind.first('.docking-' + boxId).getOrDie()).getOrDie();
      dockingApi(comp);
    };

    const apiButton = (label: string, dockingApi: (comp: AlloyComponent) => void) => {
      return Button.sketch({
        dom: {
          tag: 'button',
          innerHtml: label
        },
        action: runOnComp(dockingApi)
      });
    };

    return {
      dom: {
        tag: 'div',
        classes: [ `button-container-${boxId}` ],
        styles: {
          'position': 'fixed',
          'bottom': '0px',
          'left': `${(boxId - 1) * 350}px`,
          'padding': '1em',
          'background-color': 'black',
          'color': 'white',
          'z-index': '150'
        }
      },
      components: [
        {
          dom: {
            tag: 'span',
            styles: {
              'font-size': '1.5em',
              'font-weight': 'bold'
            },
            innerHtml: `(${boxId})`
          }
        },
        apiButton('Top', Docking.forceDockToTop),
        apiButton('Bottom', Docking.forceDockToBottom),
        apiButton('Undock', Docking.forceRestore),
        apiButton('Refresh', Docking.refresh),
        apiButton('Reset', Docking.reset)
      ]
    };
  };

  const dockingStyles = {
    'background': '#cadbee',
    'width': '400px',
    'height': '50px',
    'border': '2px solid black',
    'z-index': '100'
  };

  const example1 = () => {
    const boxId = 1;
    return {
      dom: {
        tag: 'div',
        classes: [ 'docking-example' ]
      },
      components: [
        {
          dom: {
            tag: 'h3',
            innerHtml: '(1) The blue panel will always stay on screen as long as the red rectangle is on screen'
          }
        },
        toggleButton(boxId),
        {
          uid: `panel-container-${boxId}`,
          dom: {
            tag: 'div',
            styles: {
              'background': 'red',
              'margin-top': '1400px',
              'width': '500px',
              'height': '3600px',
              'z-index': '50'
            }
          },
          components: [
            {
              dom: {
                tag: 'div',
                classes: [ `docking-${boxId}` ],
                styles: {
                  ...dockingStyles,
                  top: '2500px',
                  left: '150px'
                }
              },
              behaviours: Behaviour.derive([
                Docking.config({
                  ...(hideWhenContextGone ? {
                    contextual: {
                      transitionClass: 'demo-alloy-dock-transition',
                      fadeOutClass: 'demo-alloy-dock-fade-out',
                      fadeInClass: 'demo-alloy-dock-fade-in',
                      lazyContext: (component) => component.getSystem().getByUid(
                        `panel-container-${boxId}`
                      ).toOptional().map((comp) => Boxes.box(comp.element))
                    }
                  } : { })
                })
              ]),
              eventOrder: {
                [SystemEvents.windowScroll()]: [ 'dragging', 'docking' ]
              }
            }
          ]
        }
      ]
    };
  };

  const example2 = () => {
    const boxId = 2;
    return {
      dom: {
        tag: 'div',
        classes: [ 'docking-example' ]
      },
      components: [
        {
          dom: {
            tag: 'h3',
            innerHtml: '(2) Docking with scrollable containers'
          }
        },
        toggleButton(boxId),
        {
          uid: `scrollable-container-${boxId}`,
          dom: {
            tag: 'div',
            classes: [ 'scroller' ],
            styles: {
              background: 'purple',
              height: '400px',
              overflow: 'auto'
            }
          },
          behaviours: Behaviour.derive([
            AllowBubbling.config({
              events: [
                {
                  native: 'scroll',
                  simulated: 'bubbled.scroll'
                }
              ]
            }),
            AddEventsBehaviour.config('gravy', [
              AlloyEvents.run('bubbled.scroll', (comp, se) => {
                if (listenToContainerScroll) {
                  comp.getSystem().broadcastEvent(SystemEvents.windowScroll(), se.event);
                }
              })
            ])
          ]),
          components: [
            {
              uid: `panel-in-scroller-${boxId}`,
              dom: {
                tag: 'div',
                styles: {
                  'background': 'red',
                  'margin-top': '1000px',
                  'margin-bottom': '200px',
                  'width': '500px',
                  'height': '3600px',
                  'position': 'relative',
                  'z-index': '50'
                }
              },
              components: [
                {
                  dom: {
                    tag: 'div',
                    classes: [ `docking-${boxId}` ],
                    styles: {
                      ...dockingStyles,
                      'top': '200px',
                      'left': '150px',
                      'z-index': '100'
                    }
                  },
                  behaviours: Behaviour.derive([
                    Dragging.config({
                      mode: 'mouse',
                      blockerClass: 'blocker'
                    }),

                    Docking.config({
                      lazyViewport: (comp) => {
                        const scroller = comp.getSystem().getByUid(
                          `scrollable-container-${boxId}`
                        ).getOrDie();
                        return {
                          bounds: Boxes.restrictToWindow(
                            Boxes.box(scroller.element)
                          ),
                          scroll: Optional.some({
                            element: scroller.element,
                            offsets: SugarPosition(
                              scroller.element.dom.scrollLeft,
                              scroller.element.dom.scrollTop
                            )
                          })
                        };
                      },

                      ...(hideWhenContextGone ? {
                        contextual: {
                          transitionClass: 'demo-alloy-dock-transition',
                          fadeOutClass: 'demo-alloy-dock-fade-out',
                          fadeInClass: 'demo-alloy-dock-fade-in',
                          lazyContext: (component) => {
                            console.log('lazyContext');
                            return component.getSystem()
                              .getByUid(`panel-in-scroller-${boxId}`)
                              .toOptional()
                              .map((c) => Boxes.box(c.element));
                          }
                        }
                      } : { })
                    })
                  ]),
                  eventOrder: {
                    [SystemEvents.windowScroll()]: [ 'dragging', 'docking' ]
                  }
                }
              ]
            }
          ]
        } as SimpleOrSketchSpec

      ]
    };
  };

  const example3 = () => {
    const boxId = 3;
    return {
      dom: {
        tag: 'div',
        classes: [ 'docking-example' ]
      },
      components: [
        {
          dom: {
            tag: 'h3',
            innerHtml: '(3) Docking with a scrollable container that is the offset parent'
          }
        },
        toggleButton(boxId),
        {
          uid: `scrollable-container-${boxId}`,
          dom: {
            tag: 'div',
            classes: [ `scroller-${boxId}` ],
            styles: {
              background: 'purple',
              height: '400px',
              overflow: 'auto',
              position: 'relative'
            }
          },
          behaviours: Behaviour.derive([
            AllowBubbling.config({
              events: [
                {
                  native: 'scroll',
                  simulated: 'bubbled.scroll'
                }
              ]
            }),
            AddEventsBehaviour.config('gravy', [
              AlloyEvents.run('bubbled.scroll', (comp, se) => {
                if (listenToContainerScroll) {
                  comp.getSystem().broadcastEvent(SystemEvents.windowScroll(), se.event);
                }
              })
            ])
          ]),
          components: [
            {
              uid: `panel-in-scroller-${boxId}`,
              dom: {
                tag: 'div',
                styles: {
                  'background': 'red',
                  'margin-top': '1400px',
                  'margin-bottom': '500px',
                  'width': '500px',
                  'height': '3600px',
                  'z-index': '50'
                }
              },
              components: [
                {
                  dom: {
                    tag: 'div',
                    classes: [ `docking-${boxId}` ],
                    styles: {
                      ...dockingStyles,
                      position: 'absolute',
                      top: '200px',
                      left: '150px'
                    }
                  },
                  behaviours: Behaviour.derive([
                    Dragging.config({
                      mode: 'mouse',
                      blockerClass: 'blocker'
                    }),

                    Docking.config({
                      lazyViewport: (comp) => {
                        const scroller = comp.getSystem().getByUid(
                          `scrollable-container-${boxId}`
                        ).getOrDie();
                        return {
                          bounds: Boxes.box(scroller.element),
                          scroll: Optional.some({
                            element: scroller.element,
                            offsets: SugarPosition(
                              scroller.element.dom.scrollLeft,
                              scroller.element.dom.scrollTop
                            )
                          })
                        };
                      },

                      ...(hideWhenContextGone ? {
                        contextual: {
                          transitionClass: 'demo-alloy-dock-transition',
                          fadeOutClass: 'demo-alloy-dock-fade-out',
                          fadeInClass: 'demo-alloy-dock-fade-in',
                          lazyContext: (component) => {
                            console.log('lazyContext');
                            return component.getSystem()
                              .getByUid(
                                `panel-in-scroller-${boxId}`
                              )
                              .toOptional()
                              .map((c) => Boxes.box(c.element));
                          }
                        }
                      } : { })
                    })
                  ]),
                  eventOrder: {
                    [SystemEvents.windowScroll()]: [ 'dragging', 'docking' ]
                  }
                }
              ]
            }
          ]
        } as SimpleOrSketchSpec
      ]
    };
  };

  const example4 = () => {
    const boxId = 4;
    return {
      dom: {
        tag: 'div',
        classes: [ 'docking-example' ]
      },
      components: [
        {
          dom: {
            tag: 'h3',
            innerHtml: '(4) Docking with scrollable containers but no sink'
          }
        },
        toggleButton(boxId),
        {
          uid: `scrollable-container-${boxId}-no-sink`,
          dom: {
            tag: 'div',
            classes: [ 'scroller' ],
            styles: {
              background: 'purple',
              height: '400px',
              overflow: 'auto',
              // transform: 'translate(0px, 0px)'
            }
          },
          behaviours: Behaviour.derive([
            AllowBubbling.config({
              events: [
                {
                  native: 'scroll',
                  simulated: 'bubbled.scroll'
                }
              ]
            }),
            AddEventsBehaviour.config('gravy', [
              AlloyEvents.run('bubbled.scroll', (comp, se) => {
                if (listenToContainerScroll) {
                  comp.getSystem().broadcastEvent(SystemEvents.windowScroll(), se.event);
                }
              })
            ])
          ]),
          components: [
            {
              dom: {
                tag: 'div',
                styles: {
                  'background': 'red',
                  'margin-top': '1400px',
                  'margin-bottom': '500px',
                  'width': '500px',
                  'height': '3600px',
                  'z-index': '50'
                }
              },
              components: [
                {
                  dom: {
                    tag: 'div',
                    styles: {
                      background: 'black',
                      opacity: '0.5',
                      height: '75px',
                      width: '400px'
                    }
                  }
                },
                {
                  dom: {
                    tag: 'div',
                    classes: [ `docking-${boxId}` ],
                    styles: {
                      ...dockingStyles
                    }
                  },
                  behaviours: Behaviour.derive([
                    Dragging.config({
                      mode: 'mouse',
                      blockerClass: 'blocker'
                    }),

                    Docking.config({
                      lazyViewport: (comp) => {
                        const scroller = comp.getSystem().getByUid(
                          `scrollable-container-${boxId}-no-sink`
                        ).getOrDie();
                        return {
                          bounds: Boxes.box(scroller.element),
                          scroll: Optional.some({
                            element: scroller.element,
                            offsets: SugarPosition(
                              scroller.element.dom.scrollLeft,
                              scroller.element.dom.scrollTop
                            )
                          })
                        };
                      },

                      ...(hideWhenContextGone ? {
                        contextual: {
                          transitionClass: 'demo-alloy-dock-transition',
                          fadeOutClass: 'demo-alloy-dock-fade-out',
                          fadeInClass: 'demo-alloy-dock-fade-in',
                          lazyContext: (component) => {
                            console.log('lazyConext');
                            return component.getSystem()
                              .getByUid(
                                `panel-in-scroller-${boxId}`
                              )
                              .toOptional()
                              .map((comp) => {
                                console.log('comp', comp.element);
                                const scroller = comp.getSystem().getByUid(
                                  `scrollable-container-${boxId}-no-sink`
                                ).getOrDie();
                                const raw = scroller.element.dom as HTMLElement;
                                return Boxes.translate(
                                  Boxes.box(comp.element),
                                  raw.scrollLeft,
                                  raw.scrollTop
                                );
                              });
                          }
                        }
                      } : { })
                    })
                  ]),
                  eventOrder: {
                    [SystemEvents.windowScroll()]: [ 'dragging', 'docking' ]
                  }
                }
              ]
            }
          ]
        } as SimpleOrSketchSpec
      ]
    };
  };

  HtmlDisplay.section(
    gui,
    'The blue panel will always stay on screen as long as the red rectangle is on screen',
    {
      dom: {
        tag: 'div',
      },
      components: [
        ...(false ? [ example1() ] : [ ]),
        example2(),
        example3(),
        example4()
      ]
    }

  );
};
