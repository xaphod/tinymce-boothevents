import { Adt, Optional } from '@ephox/katamari';
import { SugarElement, SugarPosition } from '@ephox/sugar';

import { Bounds } from '../../alien/Boxes';
import * as Behaviour from '../../api/behaviour/Behaviour';
import { AlloyComponent } from '../../api/component/ComponentApi';
import { PositionCss } from '../../positioning/view/PositionCss';
import { BehaviourState } from '../common/BehaviourState';

export type DockingMode = 'top' | 'bottom';

export interface InitialDockingPosition {
  hasLeftCss: boolean;
  hasRightCss: boolean;
  hasTopCss: boolean;
  hasBottomCss: boolean;
  positionCss: string;
  x: number;
  y: number;
}

type StaticMorph<T> = () => T;
type AbsoluteMorph<T> = (pos: PositionCss) => T;
type FixedMorph<T> = (pos: PositionCss) => T;

export interface MorphAdt {
  fold: <T> (
    statics: StaticMorph<T>,
    absolute: AbsoluteMorph<T>,
    fixed: FixedMorph<T>
  ) => T;
  match: <T> (branches: {
    static: StaticMorph<T>;
    absolute: AbsoluteMorph<T>;
    fixed: FixedMorph<T>;
  }) => T;
  log: (label: string) => void;
}

export interface MorphConstructor {
  static: StaticMorph<MorphAdt>;
  absolute: AbsoluteMorph<MorphAdt>;
  fixed: FixedMorph<MorphAdt>;
}

export const morphAdt: MorphConstructor = Adt.generate([
  { static: [ ] },
  { absolute: [ 'positionCss' ] },
  { fixed: [ 'positionCss' ] }
]);

export interface DockingBehaviour extends Behaviour.AlloyBehaviour<DockingConfigSpec, DockingConfig> {
  config: (config: DockingConfigSpec) => Behaviour.NamedConfiguredBehaviour<DockingConfigSpec, DockingConfig>;
  refresh: (component: AlloyComponent) => void;
  reset: (component: AlloyComponent) => void;
  isDocked: (component: AlloyComponent) => boolean;
  getModes: (component: AlloyComponent) => DockingMode[];
  setModes: (component: AlloyComponent, modes: DockingMode[]) => void;
  getInitialPosition: (component: AlloyComponent) => Optional<InitialDockingPosition>;
  forceDockToTop: (component: AlloyComponent) => void;
  forceDockToBottom: (component: AlloyComponent) => void;
  forceRestore: (component: AlloyComponent) => void;
  clearOriginal: (component: AlloyComponent) => void;
}

export interface DockingContext {
  fadeInClass: string;
  fadeOutClass: string;
  transitionClass: string;
  lazyContext: (component: AlloyComponent) => Optional<Bounds>;
  onShow: (component: AlloyComponent) => void;
  onShown: (component: AlloyComponent) => void;
  onHide: (component: AlloyComponent) => void;
  onHidden: (component: AlloyComponent) => void;
}

export interface DockingConfig extends Behaviour.BehaviourConfigDetail {
  contextual: Optional<DockingContext>;
  lazyViewport: (component: AlloyComponent) => ScrollableBounds;
  modes: DockingMode[];
  onDocked: (component: AlloyComponent) => void;
  onUndocked: (component: AlloyComponent) => void;
  dockingStyle: DockingStyle;
}

export interface DockingState extends BehaviourState {
  isDocked: () => boolean;
  setDocked: (docked: boolean) => void;
  getInitialPos: () => Optional<InitialDockingPosition>;
  setInitialPos: (bounds: InitialDockingPosition) => void;
  clearInitialPos: () => void;
  isVisible: () => boolean;
  setVisible: (visible: boolean) => void;
  getModes: () => DockingMode[];
  setModes: (modes: DockingMode[]) => void;
}

export interface DockingConfigSpec extends Behaviour.BehaviourConfigSpec {
  contextual?: {
    fadeInClass: string;
    fadeOutClass: string;
    transitionClass: string;
    lazyContext: (component: AlloyComponent) => Optional<Bounds>;
    onShow?: (component: AlloyComponent) => void;
    onShown?: (component: AlloyComponent) => void;
    onHide?: (component: AlloyComponent) => void;
    onHidden?: (component: AlloyComponent) => void;
  };
  lazyViewport?: (component: AlloyComponent) => ScrollableBounds;
  modes?: DockingMode[];
  onDocked?: (comp: AlloyComponent) => void;
  onUndocked?: (comp: AlloyComponent) => void;
}

export interface ScrollableBounds {
  bounds: Bounds;
  scroll: Optional<{
    offsets: SugarPosition;
    element: SugarElement<HTMLElement>;
  }>;
}

export type DockingMorpher = (elem: SugarElement<HTMLElement>, viewport: ScrollableBounds, state: DockingState) => Optional<MorphAdt>;

export interface DockingStyle {
  // Should we consider putting sticky here?
  type: 'fixed' | 'scrolling-absolute';
  adaptiveFallback: Optional<DockingMorpher>;
  morphToDocked: DockingMorpher;
  calculateBox: (elem: SugarElement<HTMLElement>) => Bounds;
}

export interface InScrollContainerDockingStyle {
  type: 'scrolling-absolute';
  adaptiveFallback: Optional<DockingMorpher>;
}

export interface FixedDockingStyle {
  type: 'fixed-docking-style';
  lazyViewport?: (comp: AlloyComponent) => Bounds;
}
