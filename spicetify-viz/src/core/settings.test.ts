import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsService, getSetting, settingsSchema, defaultSettings, settingsSignal } from './settings';

// Mock Spicetify global
const Spicetify = global.Spicetify;

describe('SettingsService', () => {
  beforeEach(() => {
    // Reset mocks and signal before each test
    vi.mocked(Spicetify.LocalStorage.get).mockClear();
    vi.mocked(Spicetify.LocalStorage.set).mockClear();
    settingsSignal.value = defaultSettings;
  });

  it('should be defined', () => {
    expect(SettingsService).toBeDefined();
  });

  describe('getSetting', () => {
    it('should return the default value if local storage is empty', () => {
      vi.mocked(Spicetify.LocalStorage.get).mockReturnValue(null);
      new SettingsService(); // Initialize to load settings
      const visualizer = getSetting('visualizer');
      expect(visualizer).toBe(defaultSettings.visualizer);
    });

    it('should return the stored value if local storage has it', () => {
      const storedSettings = { visualizer: 'Bar Spectrum' };
      vi.mocked(Spicetify.LocalStorage.get).mockReturnValue(JSON.stringify(storedSettings));
      
      new SettingsService();
      
      const visualizer = getSetting('visualizer');
      expect(visualizer).toBe('Bar Spectrum');
    });

    it('should return default for a specific nested setting if not in local storage', () => {
        const storedSettings = { visualizer: 'Bar Spectrum' }; // Does not contain 'barCount'
        vi.mocked(Spicetify.LocalStorage.get).mockReturnValue(JSON.stringify(storedSettings));
        
        new SettingsService();
        
        const barCount = getSetting('bar-spectrum').barCount;
        expect(barCount).toBe(defaultSettings['bar-spectrum'].barCount);
    });
  });

  describe('setSetting', () => {
    it('should call LocalStorage.set with the updated settings object', () => {
      const service = new SettingsService();
      
      const newSettings = {
        ...settingsSignal.peek(),
        visualizer: 'Bar Spectrum' as const,
      };
      
      service.setSetting('visualizer', 'Bar Spectrum');

      expect(Spicetify.LocalStorage.set).toHaveBeenCalledWith(
        'spicetify-viz-settings',
        JSON.stringify(newSettings)
      );
    });
  });
}); 