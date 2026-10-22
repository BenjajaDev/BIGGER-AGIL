/** Layout and browser primitives missing from jsdom, for tests of the real drag sensors. */
export function installKitchenDragGeometry() {
  Object.defineProperty(document, 'getAnimations', { configurable: true, value: () => [] });
  if (!('getAnimations' in Element.prototype))
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
  if (!('setPointerCapture' in Element.prototype))
    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      configurable: true,
      value: () => undefined,
    });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    },
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private stopped = false;
      constructor(private callback: IntersectionObserverCallback) {}
      observe(element: Element) {
        queueMicrotask(() => {
          if (this.stopped) return;
          const rect = element.getBoundingClientRect();
          this.callback(
            [
              {
                target: element,
                boundingClientRect: rect,
                intersectionRect: rect,
                isIntersecting: true,
                intersectionRatio: 1,
                rootBounds: null,
                time: performance.now(),
              },
            ],
            this as unknown as IntersectionObserver,
          );
        });
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        this.stopped = true;
      }
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: media.includes('prefers-reduced-motion'),
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  if (!('scrollIntoView' in Element.prototype))
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => undefined,
    });
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => undefined);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const column = this.closest('[data-kitchen-status]');
    const status = column?.getAttribute('data-kitchen-status');
    const index = status === 'preparing' ? 1 : status === 'ready' ? 2 : 0;
    const left = index * 320;
    if (this.matches('[data-kitchen-status]')) return new DOMRect(left, 0, 300, 600);
    if (this.matches('[data-drag-handle]')) return new DOMRect(left + 240, 70, 48, 48);
    const article = this.closest<HTMLElement>('[data-order-id]');
    if (article) {
      const [x = '0', y = '0'] = article.style.getPropertyValue('--dnd-translate').split(' ');
      return new DOMRect(left + 10 + (parseFloat(x) || 0), 60 + (parseFloat(y) || 0), 280, 150);
    }
    return new DOMRect(0, 0, 960, 600);
  });
  const elementsAt = (x: number, y: number) =>
    [...document.querySelectorAll('[data-kitchen-status]')].filter((column) => {
      const rect = column.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: (x: number, y: number) => elementsAt(x, y)[0] ?? null,
  });
  Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: elementsAt });
}
