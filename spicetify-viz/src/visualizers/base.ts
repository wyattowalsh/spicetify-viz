import { AudioService, Theme } from '../core/types';

export abstract class BaseVisualizer {
    protected canvas: HTMLCanvasElement;
    protected ctx: CanvasRenderingContext2D;
    protected audio: AudioService;
    protected dataArray: Uint8Array;

    constructor(canvas: HTMLCanvasElement, audio: AudioService) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.audio = audio;

        const analyser = this.audio.getAnalyser();
        this.dataArray = new Uint8Array(analyser.frequencyBinCount);
    }

    public abstract draw(theme: Theme, settings: unknown): void;

    public onActivated(): void {
        // Optional: for one-time setup
    }

    public onDeactivated(): void {
        // Optional: for cleanup
    }

    public onResize(width: number, height: number): void {
        this.canvas.width = width * window.devicePixelRatio;
        this.canvas.height = height * window.devicePixelRatio;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
} 