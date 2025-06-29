import React, { useEffect, useRef } from 'react';
import { signal, useSignalEffect } from '@preact/signals-react';

import { audio } from './core/audio';
import { themeService } from './core/theme';
import { visualizers } from './visualizers';
import { defaultSettings, settingsSchema } from './core/settings';
import { VisualizerInstance } from './core/types';

const activeVisualizerId = signal(Object.keys(visualizers)[0]);
const settings = signal(defaultSettings);

const App = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const visualizerRef = useRef<VisualizerInstance | null>(null);

    useSignalEffect(() => {
        const id = activeVisualizerId.value;
        const viz = visualizers[id as keyof typeof visualizers];
        if (canvasRef.current && viz) {
            // Cleanup previous visualizer
            if (visualizerRef.current) {
                visualizerRef.current.onDeactivated();
            }
            // Create new instance
            const instance = new viz.visualizer(canvasRef.current, audio);
            visualizerRef.current = instance;
            instance.onActivated();
            instance.onResize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
        }
    });

    useEffect(() => {
        audio.connect();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const observer = new ResizeObserver(() => {
            if (visualizerRef.current) {
                visualizerRef.current.onResize(canvas.clientWidth, canvas.clientHeight);
            }
        });
        observer.observe(canvas);
        
        let animationFrameId: number;
        const render = () => {
            if (visualizerRef.current) {
                const currentTheme = themeService.theme.value;
                const currentSettings = settings.value[activeVisualizerId.value as keyof typeof settings.value];
                visualizerRef.current.draw(currentTheme, currentSettings);
            }
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            observer.disconnect();
            if (visualizerRef.current) {
                visualizerRef.current.onDeactivated();
            }
        };
    }, []);

    return (
        <div className="sv-w-full sv-h-full sv-relative">
            <canvas ref={canvasRef} className="sv-w-full sv-h-full" />
            <SettingsPanel />
        </div>
    );
};

const SettingsPanel = () => {
    // Read the current values directly. The parent `App` component will re-render on change.
    const vizId = activeVisualizerId.value;
    const currentSettings = settings.value;

    const schema = settingsSchema.shape[vizId as keyof typeof visualizers]?.shape;

    const handleSettingChange = (viz: string, key: string, value: any) => {
        const newSettings = JSON.parse(JSON.stringify(settings.value));
        (newSettings as any)[viz][key] = value;
        settings.value = newSettings;
    };
    
    return (
        <div className="sv-absolute sv-bottom-4 sv-right-4 sv-bg-black/50 sv-p-4 sv-rounded-lg sv-text-white sv-flex sv-flex-col sv-gap-4 max-w-xs w-full">
            <div>
                <label htmlFor="visualizer-select" className="sv-font-bold">Visualizer</label>
                <select 
                    id="visualizer-select"
                    value={vizId} 
                    onChange={e => activeVisualizerId.value = e.target.value}
                    className="sv-bg-neutral-800 sv-text-white sv-w-full sv-p-1 sv-rounded"
                >
                    {Object.entries(visualizers).map(([id, { name }]) => (
                        <option key={id} value={id}>{name}</option>
                    ))}
                </select>
            </div>

            {schema && Object.entries(schema).map(([key, value]) => {
                const settingDef = value as any;
                const currentVal = (currentSettings as any)[vizId][key];
                const inputId = `${vizId}-${key}`;
                
                return (
                    <div key={key}>
                        <label htmlFor={inputId} className="sv-text-sm">{settingDef.description}</label>
                        {settingDef._def.typeName === 'ZodNumber' && (
                            <div className="sv-flex sv-items-center sv-gap-2">
                                <input
                                    id={inputId}
                                    type="range"
                                    min={settingDef._def.checks.find((c: any) => c.kind === 'min')?.value}
                                    max={settingDef._def.checks.find((c: any) => c.kind === 'max')?.value}
                                    step={settingDef._def.checks.find((c: any) => c.kind === 'step')?.value}
                                    value={currentVal}
                                    onChange={e => handleSettingChange(vizId, key, parseFloat(e.target.value))}
                                    className="sv-w-full"
                                />
                                <span className="sv-text-xs sv-w-8">{currentVal.toFixed(1)}</span>
                            </div>
                        )}
                        {settingDef._def.typeName === 'ZodBoolean' && (
                             <input
                                id={inputId}
                                type="checkbox"
                                checked={currentVal}
                                onChange={e => handleSettingChange(vizId, key, e.target.checked)}
                                className="sv-h-4 sv-w-4"
                            />
                        )}
                        {settingDef._def.typeName === 'ZodEnum' && (
                            <select 
                                id={inputId}
                                value={currentVal}
                                onChange={e => handleSettingChange(vizId, key, e.target.value)}
                                className="sv-bg-neutral-800 sv-text-white sv-w-full sv-p-1 sv-rounded"
                            >
                                {settingDef._def.values.map((val: string) => (
                                    <option key={val} value={val}>{val}</option>
                                ))}
                            </select>
                        )}
                    </div>
                );
            })}
        </div>
    )
}

export default App;
