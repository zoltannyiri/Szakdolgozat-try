// Minimális DOM/mockok Angular nélkül is futó unitokhoz

// matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: any) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

// Blob/URL mock a letöltéshez
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock');
}
if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = jest.fn();
}

// Audio mock (play/pause ne dobjon)
class MockAudioElement {
  src = '';
  currentTime = 0;
  duration = 120;
  paused = true;
  volume = 0.7;
  ontimeupdate: any;
  play = jest.fn().mockImplementation(() => { this.paused = false; return Promise.resolve(); });
  pause = jest.fn().mockImplementation(() => { this.paused = true; });
  load = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
}
Object.defineProperty(window, 'HTMLAudioElement', { value: MockAudioElement });
