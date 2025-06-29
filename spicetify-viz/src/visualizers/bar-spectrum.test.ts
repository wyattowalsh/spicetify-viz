import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BarSpectrumVisualizer } from './bar-spectrum';
import { AudioService } from '../core/audio';
import { defaultSettings, settingsSignal } from '../core/settings';
import { Theme } from '../core/types';

// Mock canvas context
const mockCtx = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
} as unknown as CanvasRenderingContext2D;

// Mock services
vi.mock('../core/audio');

const mockTheme: Theme = {
    primary: 'white',
    secondary: 'grey',
    accent: 'blue',
    all: ['white', 'grey', 'blue'],
};

describe('BarSpectrumVisualizer', () => {
  let audioService: AudioService;
  let canvas: HTMLCanvasElement;
  let analyser: AnalyserNode;

  beforeEach(() => {
    vi.clearAllMocks();
    settingsSignal.value = defaultSettings;

    analyser = {
        frequencyBinCount: defaultSettings['bar-spectrum'].barCount
    } as AnalyserNode;

    audioService = new AudioService();
    vi.mocked(audioService.getAnalyser).mockReturnValue(analyser);
    vi.mocked(audioService.getFrequencyData).mockImplementation((array: Uint8Array) => {
        array.fill(128);
    });
    
    canvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      width: 1024,
      height: 512,
    } as unknown as HTMLCanvasElement;

    // Mock getContext to return our mock
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);
  });

  it('should be instantiable', () => {
    const viz = new BarSpectrumVisualizer(canvas, audioService);
    expect(viz).toBeInstanceOf(BarSpectrumVisualizer);
  });

  it('should call clearRect on each draw frame', () => {
    const viz = new BarSpectrumVisualizer(canvas, audioService);
    viz.draw(mockTheme, defaultSettings['bar-spectrum']);
    expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
  });

  it('should draw the correct number of bars', () => {
    const viz = new BarSpectrumVisualizer(canvas, audioService);
    viz.draw(mockTheme, defaultSettings['bar-spectrum']);
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(defaultSettings['bar-spectrum'].barCount);
  });

  it('should draw mirrored bars when mirror setting is true', () => {
    const mirroredSettings = { ...defaultSettings['bar-spectrum'], mirror: true };
    const viz = new BarSpectrumVisualizer(canvas, audioService);
    viz.draw(mockTheme, mirroredSettings);

    expect(mockCtx.fillRect).toHaveBeenCalledTimes(defaultSettings['bar-spectrum'].barCount * 2);
  });
}); 