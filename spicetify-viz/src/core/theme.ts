import { signal } from '@preact/signals-react';
import { Theme } from './types';
import { defaultSettings } from './settings';

const defaultTheme: Theme = {
    primary: 'hsl(0, 0%, 100%)',
    secondary: 'hsl(0, 0%, 80%)',
    accent: 'hsl(210, 100%, 70%)',
    all: ['hsl(0, 0%, 100%)', 'hsl(0, 0%, 80%)', 'hsl(210, 100%, 70%)'],
};

class ThemeService {
    public theme = signal<Theme>(defaultTheme);

    constructor() {
        Spicetify.Player.addEventListener('songchange', this.onSongChange.bind(this));
        // Initial call
        this.onSongChange();
    }

    private async onSongChange() {
        const data = Spicetify.Player.data;
        if (!data || !data.item) {
            this.theme.value = defaultTheme;
            return;
        }

        const uri = data.item.metadata.image_url;
        if (!uri) {
            this.theme.value = defaultTheme;
            return;
        }

        try {
            const colors = await this.extractColorsFromUri(uri);
            this.theme.value = {
                primary: this.toHslString(colors[0]),
                secondary: this.toHslString(colors[1]),
                accent: this.toHslString(colors[2]),
                all: colors.map(c => this.toHslString(c)),
            };
        } catch (error) {
            console.error('Spicetify-viz: Failed to extract theme from album art', error);
            this.theme.value = defaultTheme;
        }
    }

    private toHslString(hsl: { h: number; s: number; l: number }): string {
        return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }

    // Placeholder for a real color quantization algorithm (e.g., Median Cut)
    private async extractColorsFromUri(uri: string): Promise<{ h: number; s: number; l: number }[]> {
        return new Promise((resolve) => {
            // This is a placeholder. A real implementation would use a canvas
            // to sample the image data and a color quantization algorithm.
            setTimeout(() => {
                resolve([
                    { h: Math.random() * 360, s: 100, l: 70 },
                    { h: Math.random() * 360, s: 90, l: 60 },
                    { h: Math.random() * 360, s: 80, l: 50 },
                ]);
            }, 100);
        });
    }
}

export const themeService = new ThemeService(); 