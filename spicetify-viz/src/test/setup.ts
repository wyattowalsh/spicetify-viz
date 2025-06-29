import { vi } from 'vitest';

// Mock Spicetify modules
vi.mock('spicetify-viz/src/core/listeners', () => ({
  __esModule: true,
  default: vi.fn(),
}));

// Mock Spicetify globals
const spicetifyMock = {
  LocalStorage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
  Player: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    data: {},
  },
  Platform: {
    History: {
      listen: vi.fn(),
    }
  }
};

// @ts-expect-error - Mocking Spicetify global
global.Spicetify = spicetifyMock; 