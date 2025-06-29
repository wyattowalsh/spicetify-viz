import { z } from 'zod';
import { BaseVisualizer } from './base';
import { settingsSchema } from '../core/settings';
import { Theme } from '../core/types';
import { AudioService } from '../core/audio';

type BarSpectrumSettings = z.infer<typeof settingsSchema.shape['bar-spectrum']>;

export class BarSpectrumVisualizer extends BaseVisualizer {
    private lastValues: number[] = [];

    constructor(canvas: HTMLCanvasElement, audioService: AudioService) {
        super(canvas, audioService);
    }

    public draw(theme: Theme, settings: unknown) {
        const vizSettings = settings as BarSpectrumSettings;
        this.audio.getFrequencyData(this.dataArray);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const barCount = vizSettings.barCount;
        if (this.lastValues.length !== barCount) {
            this.lastValues = new Array(barCount).fill(0);
        }
        
        const availableWidth = vizSettings.mirror ? this.canvas.width / 2 : this.canvas.width;
        const barWidth = (availableWidth / barCount) - vizSettings.gap;
        
        this.ctx.fillStyle = theme.primary;

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(this.dataArray.length / barCount * i);
            let barHeight = (this.dataArray[dataIndex] / 255) * this.canvas.height;

            // Apply smoothing and gravity
            const smoothedHeight = this.lastValues[i] * vizSettings.smoothing + barHeight * (1 - vizSettings.smoothing);
            barHeight = smoothedHeight > 2 ? smoothedHeight : 2;

            this.lastValues[i] = barHeight - vizSettings.gravity;
            if (this.lastValues[i] < 0) this.lastValues[i] = 0;

            const x = (barWidth + vizSettings.gap) * i;
            let y;

            switch(vizSettings.barAlignment) {
                case 'top':
                    y = 0;
                    break;
                case 'bottom':
                    y = this.canvas.height - barHeight;
                    break;
                case 'center':
                default:
                    y = (this.canvas.height - barHeight) / 2;
                    break;
            }

            this.ctx.fillRect(x, y, barWidth, barHeight);

            if (vizSettings.mirror) {
                const mirrorX = this.canvas.width - x - barWidth;
                this.ctx.fillRect(mirrorX, y, barWidth, barHeight);
            }
        }
    }
} 