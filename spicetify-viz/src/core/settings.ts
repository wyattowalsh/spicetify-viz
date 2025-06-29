import { z } from 'zod';
import { signal, Signal } from '@preact/signals-react';

// Helper to generate a default settings object from the schema
function getDefaults<S extends z.AnyZodObject>(schema: S): z.infer<S> {
    return Object.fromEntries(
        Object.entries(schema.shape).map(([key, value]) => {
            const schemaType = value as z.ZodType;
            if (schemaType instanceof z.ZodObject) {
                return [key, getDefaults(schemaType)];
            }
            if ('defaultValue' in schemaType._def) {
                return [key, schemaType._def.defaultValue];
            }
            return [key, undefined];
        }),
    ) as z.infer<S>;
}

export const settingsSchema = z.object({
    visualizer: z.enum(['Bar Spectrum']).default('Bar Spectrum').describe('Active Visualizer'),
    global: z.object({
        amplitude: z.number().min(0.1).max(5.0).default(1.0).describe('Master Amplitude'),
    }),
    'bar-spectrum': z.object({
        barCount: z.number().min(16).max(1024).step(16).default(128).describe('Bar Count'),
        gap: z.number().min(0).max(20).step(1).default(2).describe('Gap'),
        logarithmic: z.boolean().default(true).describe('Logarithmic Scale'),
        mirror: z.boolean().default(false).describe('Mirror'),
        barAlignment: z.enum(['center', 'bottom', 'top']).default('center').describe('Bar Alignment'),
        smoothing: z.number().min(0).max(0.99).step(0.01).default(0.8).describe('Smoothing'),
        gravity: z.number().min(0).max(10).step(0.1).default(2.0).describe('Gravity'),
    }),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingKey = keyof Settings;

export const defaultSettings = getDefaults(settingsSchema);

export const settingsSignal: Signal<Settings> = signal(defaultSettings);

function loadSettings(): Settings {
    const storedSettings = Spicetify.LocalStorage.get('spicetify-viz-settings');
    if (!storedSettings) return defaultSettings;

    try {
        const parsed = JSON.parse(storedSettings);
        return settingsSchema.deepPartial().parse(parsed) as Settings;
    } catch (e) {
        console.error('Spicetify-Viz: Failed to parse settings, falling back to defaults.', e);
        return defaultSettings;
    }
}

export class SettingsService {
    constructor() {
        this.init();
    }

    private init() {
        const loadedSettings = loadSettings();
        const mergedSettings = {
            ...defaultSettings,
            ...loadedSettings,
            global: { ...defaultSettings.global, ...loadedSettings.global },
            'bar-spectrum': { ...defaultSettings['bar-spectrum'], ...loadedSettings['bar-spectrum'] },
        };
        settingsSignal.value = mergedSettings;
    }

    public setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
        const newSettings = { ...settingsSignal.peek(), [key]: value };
        settingsSignal.value = newSettings;
        Spicetify.LocalStorage.set('spicetify-viz-settings', JSON.stringify(newSettings));
    }
}

export const getSetting = <K extends SettingKey>(key: K): Settings[K] => {
    return settingsSignal.value[key];
};

export const getSettings = <T extends SettingKey>(keys: T[]): Pick<Settings, T> => {
    const result: Partial<Pick<Settings, T>> = {};
    for (const key of keys) {
        result[key] = settingsSignal.value[key];
    }
    return result as Pick<Settings, T>;
}; 