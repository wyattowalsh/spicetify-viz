import { z } from 'zod';

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

export const defaultSettings = getDefaults(settingsSchema); 