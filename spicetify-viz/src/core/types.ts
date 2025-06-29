import { z } from 'zod';
import { settingsSchema } from './settings';
import { audio } from './audio';

export type Theme = {
  primary: string;
  secondary: string;
  accent: string;
  all: string[];
};

export type Settings = z.infer<typeof settingsSchema>;
export type AudioService = typeof audio;

export interface Visualizer {
  new (canvas: HTMLCanvasElement, audio: AudioService): VisualizerInstance;
}

export interface VisualizerInstance {
  draw(theme: Theme, settings: unknown): void;
  onActivated(): void;
  onDeactivated(): void;
  onResize(width: number, height: number): void;
} 