import '@testing-library/jest-dom';

// Mock matchMedia used by some components/charts
if (typeof window !== 'undefined') {
  window.matchMedia =
    window.matchMedia ||
    function matchMedia(query: string): MediaQueryList {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as MediaQueryList;
    };
}
