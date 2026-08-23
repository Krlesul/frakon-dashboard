export {};

declare global {
  interface Element {
    attachShadow(this: Element, init: ShadowRootInit): ShadowRoot;
  }
}
