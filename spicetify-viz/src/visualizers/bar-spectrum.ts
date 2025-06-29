import { z } from 'zod';
import { BaseVisualizer } from './base';
import { settingsSchema } from '../core/settings';
import { Theme } from '../core/types';

type BarSpectrumSettings = z.infer<typeof settingsSchema.shape['bar-spectrum']>;

export class BarSpectrumVisualizer extends BaseVisualizer {
    private lastValues: number[] = [];
    private barWidth = 0;

    public draw(theme: Theme, settings: unknown) {
        const vizSettings = settings as BarSpectrumSettings;
        this.audio.getFrequencyData(this.dataArray);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const barCount = vizSettings.mirror ? vizSettings.barCount / 2 : vizSettings.barCount;
        if (this.lastValues.length !== vizSettings.barCount) {
            this.lastValues = new Array(vizSettings.barCount).fill(0);
        }
        
        const effectiveBarCount = Math.floor(barCount);
        this.barWidth = this.canvas.width / vizSettings.barCount - vizSettings.gap;
        
        this.ctx.fillStyle = theme.primary;

        for (let i = 0; i < effectiveBarCount; i++) {
            const dataIndex = Math.floor(this.dataArray.length / effectiveBarCount * i);
            let barHeight = this.dataArray[dataIndex] / 255 * this.canvas.height;

            const smoothedHeight = this.lastValues[i] * vizSettings.smoothing + barHeight * (1 - vizSettings.smoothing);
            barHeight = smoothedHeight > 2 ? smoothedHeight : 2; // min height of 2px

            this.lastValues[i] = barHeight - vizSettings.gravity;
            if (this.lastValues[i] < 0) this.lastValues[i] = 0;

            let x = (this.barWidth + vizSettings.gap) * i;
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

            this.ctx.fillRect(x, y, this.barWidth, barHeight);

            if (vizSettings.mirror) {
                const mirrorX = this.canvas.width - x - this.barWidth;
                this.ctx.fillRect(mirrorX, y, this.barWidth, barHeight);
            }
        }
    }
} 