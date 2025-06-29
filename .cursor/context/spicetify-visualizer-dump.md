This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
src/
  components/
    renderer/
      DebugVisualizer.tsx
      NCSVisualizer.tsx
      SpectrumVisualizer.tsx
    AnimatedCanvas.tsx
    LoadingIcon.tsx
  css/
    app.module.scss
    icon-active.svg
    icon-inactive.svg
    ncs-active.svg
    ncs-inactive.svg
  protobuf/
    ColorResult.ts
    defs.ts
  shaders/
    ncs-visualizer/
      blur.ts
      dot.ts
      finalize.ts
      particle.ts
  types/
    css-modules.d.ts
    fastnoise-lite.d.ts
    spicetify.d.ts
    types.d.ts
  app.tsx
  error.ts
  menu.tsx
  metadata.ts
  RhythmString.tsx
  settings.json
  utils.ts
  window.tsx
.gitattributes
.gitignore
.prettierrc
manifest.json
package.json
README.md
tsconfig.json
```

# Files

## File: src/components/renderer/DebugVisualizer.tsx
```typescript
import React, { useCallback, useContext, useMemo } from "react";
import AnimatedCanvas from "../AnimatedCanvas";
import { decibelsToAmplitude, binarySearchIndex, mapLinear } from "../../utils";
import { parseRhythmString, RhythmString } from "../../RhythmString";
import { ErrorHandlerContext, ErrorRecovery } from "../../error";
import { RendererProps } from "../../app";

type CanvasData = {
	barDuration: number;
	audioAnalysis?: SpotifyAudioAnalysis;
	rhythmString: RhythmString | null;
};

type RendererState =
	| {
			isError: true;
	  }
	| {
			isError: false;
	  };

type Area = { x: number; y: number; width: number; height: number };

type Section = {
	name: string;
	render: (
		ctx: CanvasRenderingContext2D,
		audio: { analysis: SpotifyAudioAnalysis; rhythm: RhythmString },
		time: { start: number; end: number; current: number },
		area: Area
	) => void;
} & (
	| {
			layer: "background" | "overlay";
	  }
	| {
			layer: "content";
			height: number;
	  }
);

const TIME_WINDOW = [1, 2];

const SECTION_SPACING = 20;
const SECTION_TITLE_SIZE = 20;
const SECTION_TITLE_SPACING = 10;
const SECTIONS: Section[] = [
	{
		name: "Beats",
		layer: "background",
		render: (ctx, audio, time, area) => {
			const start = binarySearchIndex(audio.analysis.beats, b => b.start, time.start);
			const end = binarySearchIndex(audio.analysis.beats, b => b.start, time.end);

			ctx.lineWidth = 1;
			ctx.strokeStyle = "#FFFFFF33";
			ctx.beginPath();
			for (let i = start; i <= end; i++) {
				const x = mapLinear(audio.analysis.beats[i].start, time.start, time.end, area.x, area.x + area.width);

				ctx.moveTo(x, area.y);
				ctx.lineTo(x, area.y + area.height);
			}
			ctx.stroke();
		}
	},
	{
		name: "Bars",
		layer: "background",
		render: (ctx, audio, time, area) => {
			const start = binarySearchIndex(audio.analysis.bars, b => b.start, time.start);
			const end = binarySearchIndex(audio.analysis.bars, b => b.start, time.end);

			ctx.lineWidth = 3;
			ctx.strokeStyle = "#FFFFFF66";
			ctx.beginPath();
			for (let i = start; i <= end; i++) {
				const x = mapLinear(audio.analysis.bars[i].start, time.start, time.end, area.x, area.x + area.width);

				ctx.moveTo(x, area.y);
				ctx.lineTo(x, area.y + area.height);
			}
			ctx.stroke();
		}
	},
	{
		name: "Position",
		layer: "overlay",
		render: (ctx, _audio, time, area) => {
			ctx.lineWidth = 5;
			ctx.strokeStyle = ctx.fillStyle = "white";
			ctx.beginPath();

			const x = mapLinear(time.current, time.start, time.end, area.x, area.x + area.width);

			ctx.moveTo(x, area.y);
			ctx.lineTo(x, area.y + area.height);
			ctx.stroke();

			const triangleSize = 10;

			ctx.beginPath();
			ctx.moveTo(x - triangleSize, area.y);
			ctx.lineTo(x + triangleSize, area.y);
			ctx.lineTo(x, area.y + triangleSize);
			ctx.lineTo(x - triangleSize, area.y);

			ctx.moveTo(x - triangleSize, area.y + area.height);
			ctx.lineTo(x + triangleSize, area.y + area.height);
			ctx.lineTo(x, area.y + area.height - triangleSize);
			ctx.lineTo(x - triangleSize, area.y + area.height);
			ctx.fill();
		}
	},
	{
		name: "Loudness",
		layer: "content",
		height: 1,
		render: (ctx, audio, time, area) => {
			const start = binarySearchIndex(audio.analysis.segments, b => b.start, time.start);
			const end = binarySearchIndex(audio.analysis.segments, b => b.start, time.end);

			const transformLoudness = (l: number) => decibelsToAmplitude(l);

			ctx.lineWidth = 2;
			ctx.strokeStyle = "white";
			ctx.beginPath();

			for (let i = start; i <= end + 1 && i < audio.analysis.segments.length; i++) {
				const segment = audio.analysis.segments[i];

				const xStart = mapLinear(segment.start, time.start, time.end, area.x, area.x + area.width);
				const yStart = mapLinear(transformLoudness(segment.loudness_start), 0, 1, area.y + area.height, area.y);
				const xMax = mapLinear(
					segment.start + segment.loudness_max_time,
					time.start,
					time.end,
					area.x,
					area.x + area.width
				);
				const yMax = mapLinear(transformLoudness(segment.loudness_max), 0, 1, area.y + area.height, area.y);

				if (i === start) {
					ctx.moveTo(xStart, yStart);
				} else {
					ctx.lineTo(xStart, yStart);
				}

				ctx.lineTo(xMax, yMax);

				if (i === audio.analysis.segments.length - 1) {
					const xEnd = mapLinear(segment.start + segment.duration, time.start, time.end, area.x, area.x + area.width);
					const yEnd = mapLinear(transformLoudness(segment.loudness_end), 0, 1, area.y + area.height, area.y);

					ctx.lineTo(xEnd, yEnd);
				}
			}

			ctx.stroke();
		}
	},
	{
		name: "Confidence",
		layer: "content",
		height: 0.25,
		render: (ctx, audio, time, area) => {
			const start = binarySearchIndex(audio.analysis.segments, b => b.start, time.start);
			const end = binarySearchIndex(audio.analysis.segments, b => b.start, time.end);

			ctx.beginPath();

			for (let i = start; i <= end; i++) {
				const segment = audio.analysis.segments[i];

				const xStart = mapLinear(segment.start, time.start, time.end, area.x, area.x + area.width);
				const xEnd = mapLinear(segment.start + segment.duration, time.start, time.end, area.x, area.x + area.width);

				ctx.fillStyle = `rgba(255, 255, 255, ${segment.confidence})`;
				ctx.fillRect(xStart, area.y, xEnd - xStart, area.height);
			}

			ctx.fill();
		}
	},
	{
		name: "Timbre",
		layer: "content",
		height: 1.5,
		render: (ctx, audio, time, area) => {
			const rowHeight = area.height / 12;

			const start = binarySearchIndex(audio.analysis.segments, b => b.start, time.start);
			const end = binarySearchIndex(audio.analysis.segments, b => b.start, time.end);

			for (let t = 0; t < 12; t++) {
				const goldenRatio = (Math.sqrt(5) - 1) / 2;
				const hue = t * goldenRatio;

				ctx.beginPath();

				for (let i = start; i <= end; i++) {
					const segment = audio.analysis.segments[i];
					const value = mapLinear(Math.tanh(0.02 * segment.timbre[t]), -1, 1, 0, 1);

					const xStart = mapLinear(segment.start, time.start, time.end, area.x, area.x + area.width);
					const xEnd = mapLinear(segment.start + segment.duration, time.start, time.end, area.x, area.x + area.width);

					const y = area.y + (t / 12) * area.height;

					ctx.fillStyle = `hsla(${hue * 360}, 100%, 70%, ${value})`;
					ctx.fillRect(xStart, y, xEnd - xStart, rowHeight);
				}

				ctx.fill();
			}
		}
	},
	{
		name: "Pitches",
		layer: "content",
		height: 1.5,
		render: (ctx, audio, time, area) => {
			const rowHeight = area.height / 12;

			const start = binarySearchIndex(audio.analysis.segments, b => b.start, time.start);
			const end = binarySearchIndex(audio.analysis.segments, b => b.start, time.end);

			for (let p = 0; p < 12; p++) {
				const hue = p / 12;

				ctx.beginPath();

				for (let i = start; i <= end; i++) {
					const segment = audio.analysis.segments[i];

					const xStart = mapLinear(segment.start, time.start, time.end, area.x, area.x + area.width);
					const xEnd = mapLinear(segment.start + segment.duration, time.start, time.end, area.x, area.x + area.width);

					const y = area.y + (p / 12) * area.height;

					ctx.fillStyle = `hsla(${hue * 360}, 100%, 70%, ${segment.pitches[p]})`;
					ctx.fillRect(xStart, y, xEnd - xStart, rowHeight);
				}

				ctx.fill();
			}
		}
	},
	{
		name: "Rhythm",
		layer: "content",
		height: 0.5,
		render: (ctx, audio, time, area) => {
			const markerHeight = area.height / audio.rhythm.length;
			const markerWidth = Math.min(markerHeight, 20);

			const timePad = (markerWidth / 2 / area.width) * (time.end - time.start);

			ctx.fillStyle = "white";
			ctx.beginPath();

			for (let c = audio.rhythm.length - 1; c >= 0; c--) {
				const start = binarySearchIndex(audio.rhythm[c], r => r, time.start - timePad);
				const end = binarySearchIndex(audio.rhythm[c], r => r, time.end + timePad);

				for (let i = start; i <= end; i++) {
					const x = mapLinear(audio.rhythm[c][i], time.start, time.end, area.x, area.x + area.width);
					const y = area.y + c * markerHeight;

					ctx.rect(x - markerWidth / 2, y, markerWidth, markerHeight);
				}
			}

			ctx.fill();
		}
	}
];

export default function DebugVisualizer(props: RendererProps) {
	const onError = useContext(ErrorHandlerContext);

	const barDuration = useMemo(() => {
		if (!props.audioAnalysis) return 1;
		return props.audioAnalysis.bars.reduce((acc, val) => acc + val.duration, 0) / props.audioAnalysis.bars.length;
	}, [props.audioAnalysis]);

	const rhythmString = useMemo(() => {
		if (!props.audioAnalysis) return null;
		return parseRhythmString(props.audioAnalysis.track.rhythmstring);
	}, [props.audioAnalysis]);

	const onInit = useCallback((ctx: CanvasRenderingContext2D | null): RendererState => {
		if (!ctx) {
			onError("Error: 2D rendering is not supported", ErrorRecovery.NONE);
			return { isError: true };
		}

		return {
			isError: false
		};
	}, []);

	const onResize = useCallback((ctx: CanvasRenderingContext2D | null, state: RendererState) => {
		if (state.isError || !ctx) return;
	}, []);

	const onRender = useCallback((ctx: CanvasRenderingContext2D | null, data: CanvasData, state: RendererState) => {
		if (state.isError || !ctx || !data.audioAnalysis || !data.rhythmString) return;

		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		const progress = Spicetify.Player.getProgress() / 1000;
		const windowStart = progress - TIME_WINDOW[0] * data.barDuration;
		const windowEnd = progress + TIME_WINDOW[1] * data.barDuration;
		const time = {
			start: windowStart,
			end: windowEnd,
			current: progress
		};

		const renderTitle = (title: string, y: number, height: number) => {
			ctx.save();

			ctx.font = `${SECTION_TITLE_SIZE}px sans-serif`;
			ctx.textAlign = "center";
			ctx.fillStyle = "white";

			ctx.rotate((Math.PI * 3) / 2);
			ctx.fillText(title, -(y + height / 2), SECTION_TITLE_SIZE, height);

			ctx.restore();
		};

		const renderSection = (section: Section, area: Area) => {
			ctx.save();

			ctx.beginPath();
			ctx.rect(area.x, area.y, area.width, area.height);
			ctx.clip();

			section.render(ctx, { analysis: data.audioAnalysis!, rhythm: data.rhythmString! }, time, area);

			ctx.restore();
		};

		for (const section of SECTIONS) {
			if (section.layer !== "background") continue;

			renderSection(section, {
				x: SECTION_TITLE_SIZE + SECTION_TITLE_SPACING,
				y: 0,
				width: ctx.canvas.width - SECTION_TITLE_SIZE - SECTION_TITLE_SPACING,
				height: ctx.canvas.height
			});
		}

		const contentSections = SECTIONS.filter(s => s.layer === "content");

		const contentSpace = ctx.canvas.height - SECTION_SPACING * (contentSections.length - 1);
		const totalHeight = contentSections.reduce((acc, val) => acc + val.height, 0);

		let currentHeight = 0;
		let currentCount = 0;

		for (const section of contentSections) {
			const yStart = mapLinear(currentHeight, 0, totalHeight, 0, contentSpace) + currentCount * SECTION_SPACING;
			const yEnd =
				mapLinear(currentHeight + section.height, 0, totalHeight, 0, contentSpace) + currentCount * SECTION_SPACING;

			currentHeight += section.height;
			currentCount++;

			renderSection(section, {
				x: SECTION_TITLE_SIZE + SECTION_TITLE_SPACING,
				y: yStart,
				width: ctx.canvas.width - SECTION_TITLE_SIZE - SECTION_TITLE_SPACING,
				height: yEnd - yStart
			});

			renderTitle(section.name, yStart, yEnd - yStart);

			if (currentCount < contentSections.length) {
				ctx.lineWidth = 1;
				ctx.strokeStyle = "#AAAAAA";

				ctx.beginPath();
				ctx.moveTo(SECTION_SPACING / 2, yEnd + SECTION_SPACING / 2);
				ctx.lineTo(ctx.canvas.width - SECTION_SPACING / 2, yEnd + SECTION_SPACING / 2);
				ctx.stroke();
			}
		}

		for (const section of SECTIONS) {
			if (section.layer !== "overlay") continue;

			renderSection(section, {
				x: SECTION_TITLE_SIZE + SECTION_TITLE_SPACING,
				y: 0,
				width: ctx.canvas.width - SECTION_TITLE_SIZE - SECTION_TITLE_SPACING,
				height: ctx.canvas.height
			});
		}
	}, []);

	return (
		<AnimatedCanvas
			isEnabled={props.isEnabled}
			data={{ audioAnalysis: props.audioAnalysis, rhythmString, barDuration }}
			contextType="2d"
			onInit={onInit}
			onResize={onResize}
			onRender={onRender}
			style={{
				width: "100%",
				height: "100%"
			}}
		/>
	);
}
```

## File: src/components/renderer/NCSVisualizer.tsx
```typescript
import React, { useCallback, useContext, useMemo } from "react";
import AnimatedCanvas from "../AnimatedCanvas";
import {
	sampleAmplitudeMovingAverage,
	decibelsToAmplitude,
	mapLinear,
	integrateLinearSegment,
	sampleAccumulatedIntegral
} from "../../utils";
import {
	vertexShader as PARTICLE_VERT_SHADER,
	fragmentShader as PARTICLE_FRAG_SHADER
} from "../../shaders/ncs-visualizer/particle";
import { vertexShader as DOT_VERT_SHADER, fragmentShader as DOT_FRAG_SHADER } from "../../shaders/ncs-visualizer/dot";
import { vertexShader as BLUR_VERT_SHADER, fragmentShader as BLUR_FRAG_SHADER } from "../../shaders/ncs-visualizer/blur";
import {
	vertexShader as FINALIZE_VERT_SHADER,
	fragmentShader as FINALIZE_FRAG_SHADER
} from "../../shaders/ncs-visualizer/finalize";
import { ErrorHandlerContext, ErrorRecovery } from "../../error";
import { RendererProps } from "../../app";

type CanvasData = {
	themeColor: Spicetify.Color;
	seed: number;
	amplitudeCurve: CurveEntry[];
};

type RendererState =
	| {
			isError: true;
	  }
	| {
			isError: false;
			particleShader: WebGLProgram;
			dotShader: WebGLProgram;
			blurShader: WebGLProgram;
			finalizeShader: WebGLProgram;
			viewportSize: number;
			particleTextureSize: number;

			inPositionLoc: number;
			inPositionLocDot: number;
			inPositionLocBlur: number;
			inPositionLocFinalize: number;

			uNoiseOffsetLoc: WebGLUniformLocation;
			uAmplitudeLoc: WebGLUniformLocation;
			uSeedLoc: WebGLUniformLocation;
			uDotSpacingLoc: WebGLUniformLocation;
			uDotOffsetLoc: WebGLUniformLocation;
			uSphereRadiusLoc: WebGLUniformLocation;
			uFeatherLoc: WebGLUniformLocation;
			uNoiseFrequencyLoc: WebGLUniformLocation;
			uNoiseAmplitudeLoc: WebGLUniformLocation;

			uDotCountLoc: WebGLUniformLocation;
			uDotRadiusLoc: WebGLUniformLocation;
			uDotRadiusPXLoc: WebGLUniformLocation;
			uParticleTextureLoc: WebGLUniformLocation;

			uBlurRadiusLoc: WebGLUniformLocation;
			uBlurDirectionLoc: WebGLUniformLocation;
			uBlurInputTextureLoc: WebGLUniformLocation;

			uOutputColorLoc: WebGLUniformLocation;
			uBlurredTextureLoc: WebGLUniformLocation;
			uOriginalTextureLoc: WebGLUniformLocation;

			quadBuffer: WebGLBuffer;

			particleFramebuffer: WebGLFramebuffer;
			particleTexture: WebGLTexture;
			dotFramebuffer: WebGLFramebuffer;
			dotTexture: WebGLTexture;
			blurXFramebuffer: WebGLFramebuffer;
			blurXTexture: WebGLTexture;
			blurYFramebuffer: WebGLFramebuffer;
			blurYTexture: WebGLTexture;
	  };

export default function NCSVisualizer(props: RendererProps) {
	const onError = useContext(ErrorHandlerContext);

	const amplitudeCurve = useMemo(() => {
		if (!props.audioAnalysis) return [{ x: 0, y: 0 }];

		const segments = props.audioAnalysis.segments;

		const amplitudeCurve: CurveEntry[] = segments.flatMap(segment =>
			segment.loudness_max_time
				? [
						{ x: segment.start, y: decibelsToAmplitude(segment.loudness_start) },
						{ x: segment.start + segment.loudness_max_time, y: decibelsToAmplitude(segment.loudness_max) }
					]
				: [{ x: segment.start, y: decibelsToAmplitude(segment.loudness_start) }]
		);

		if (segments.length) {
			amplitudeCurve[0].accumulatedIntegral = 0;
			for (let i = 1; i < amplitudeCurve.length; i++) {
				const prev = amplitudeCurve[i - 1];
				const curr = amplitudeCurve[i];
				curr.accumulatedIntegral = (prev.accumulatedIntegral ?? 0) + integrateLinearSegment(prev, curr);
			}

			const lastSegment = segments[segments.length - 1];
			amplitudeCurve.push({
				x: lastSegment.start + lastSegment.duration,
				y: decibelsToAmplitude(lastSegment.loudness_end)
			});
		}

		return amplitudeCurve;
	}, [props.audioAnalysis]);

	const seed = props.audioAnalysis?.meta.timestamp ?? 0;

	const onInit = useCallback((gl: WebGL2RenderingContext | null): RendererState => {
		if (!gl) {
			onError("Error: WebGL2 is not supported", ErrorRecovery.NONE);
			return { isError: true };
		}

		if (!gl.getExtension("EXT_color_buffer_float")) {
			onError(`Error: Rendering to floating-point textures is not supported`, ErrorRecovery.NONE);
			return { isError: true };
		}

		const createShader = (type: number, source: string, name: string) => {
			const shader = gl.createShader(type)!;
			gl.shaderSource(shader, source);
			gl.compileShader(shader);

			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
				const msg = `Error: Failed to compile '${name}' shader`;
				const log = gl.getShaderInfoLog(shader);
				console.error(`[Visualizer] ${msg}`, log);

				onError(msg, ErrorRecovery.NONE);
				return null;
			}

			return shader;
		};

		const createProgram = (vertShader: WebGLShader, fragShader: WebGLShader, name: string) => {
			const shader = gl.createProgram()!;
			gl.attachShader(shader, vertShader);
			gl.attachShader(shader, fragShader);
			gl.linkProgram(shader);

			if (!gl.getProgramParameter(shader, gl.LINK_STATUS) && !gl.isContextLost()) {
				const msg = `Error: Failed to link '${name}' shader`;
				const log = gl.getProgramInfoLog(shader);
				console.error(`[Visualizer] ${msg}`, log);

				onError(msg, ErrorRecovery.NONE);
				return null;
			}

			return shader;
		};

		const createFramebuffer = (filter: number) => {
			const framebuffer = gl.createFramebuffer()!;
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

			const texture = gl.createTexture()!;
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

			return { framebuffer, texture };
		};

		const particleVertShader = createShader(gl.VERTEX_SHADER, PARTICLE_VERT_SHADER, "particle vertex");
		if (!particleVertShader) return { isError: true };
		const particleFragShader = createShader(gl.FRAGMENT_SHADER, PARTICLE_FRAG_SHADER, "particle fragment");
		if (!particleFragShader) return { isError: true };
		const particleShader = createProgram(particleVertShader, particleFragShader, "particle");
		if (!particleShader) return { isError: true };

		const inPositionLoc = gl.getAttribLocation(particleShader, "inPosition")!;
		const uNoiseOffsetLoc = gl.getUniformLocation(particleShader, "uNoiseOffset")!;
		const uAmplitudeLoc = gl.getUniformLocation(particleShader, "uAmplitude")!;
		const uSeedLoc = gl.getUniformLocation(particleShader, "uSeed")!;
		const uDotSpacingLoc = gl.getUniformLocation(particleShader, "uDotSpacing")!;
		const uDotOffsetLoc = gl.getUniformLocation(particleShader, "uDotOffset")!;
		const uSphereRadiusLoc = gl.getUniformLocation(particleShader, "uSphereRadius")!;
		const uFeatherLoc = gl.getUniformLocation(particleShader, "uFeather")!;
		const uNoiseFrequencyLoc = gl.getUniformLocation(particleShader, "uNoiseFrequency")!;
		const uNoiseAmplitudeLoc = gl.getUniformLocation(particleShader, "uNoiseAmplitude")!;

		const dotVertShader = createShader(gl.VERTEX_SHADER, DOT_VERT_SHADER, "dot vertex");
		if (!dotVertShader) return { isError: true };
		const dotFragShader = createShader(gl.FRAGMENT_SHADER, DOT_FRAG_SHADER, "dot fragment");
		if (!dotFragShader) return { isError: true };
		const dotShader = createProgram(dotVertShader, dotFragShader, "dot");
		if (!dotShader) return { isError: true };

		const inPositionLocDot = gl.getAttribLocation(dotShader, "inPosition")!;
		const uDotCountLoc = gl.getUniformLocation(dotShader, "uDotCount")!;
		const uDotRadiusLoc = gl.getUniformLocation(dotShader, "uDotRadius")!;
		const uDotRadiusPXLoc = gl.getUniformLocation(dotShader, "uDotRadiusPX")!;
		const uParticleTextureLoc = gl.getUniformLocation(dotShader, "uParticleTexture")!;

		const blurVertShader = createShader(gl.VERTEX_SHADER, BLUR_VERT_SHADER, "blur vertex");
		if (!blurVertShader) return { isError: true };
		const blurFragShader = createShader(gl.FRAGMENT_SHADER, BLUR_FRAG_SHADER, "blur fragment");
		if (!blurFragShader) return { isError: true };
		const blurShader = createProgram(blurVertShader, blurFragShader, "blur");
		if (!blurShader) return { isError: true };

		const inPositionLocBlur = gl.getAttribLocation(blurShader, "inPosition")!;
		const uBlurRadiusLoc = gl.getUniformLocation(blurShader, "uBlurRadius")!;
		const uBlurDirectionLoc = gl.getUniformLocation(blurShader, "uBlurDirection")!;
		const uBlurInputTextureLoc = gl.getUniformLocation(blurShader, "uInputTexture")!;

		const finalizeVertShader = createShader(gl.VERTEX_SHADER, FINALIZE_VERT_SHADER, "finalize vertex");
		if (!finalizeVertShader) return { isError: true };
		const finalizeFragShader = createShader(gl.FRAGMENT_SHADER, FINALIZE_FRAG_SHADER, "finalize fragment");
		if (!finalizeFragShader) return { isError: true };
		const finalizeShader = createProgram(finalizeVertShader, finalizeFragShader, "finalize");
		if (!finalizeShader) return { isError: true };

		const inPositionLocFinalize = gl.getAttribLocation(finalizeShader, "inPosition")!;
		const uOutputColorLoc = gl.getUniformLocation(finalizeShader, "uOutputColor")!;
		const uBlurredTextureLoc = gl.getUniformLocation(finalizeShader, "uBlurredTexture")!;
		const uOriginalTextureLoc = gl.getUniformLocation(finalizeShader, "uOriginalTexture")!;

		const { framebuffer: particleFramebuffer, texture: particleTexture } = createFramebuffer(gl.NEAREST);
		const { framebuffer: dotFramebuffer, texture: dotTexture } = createFramebuffer(gl.NEAREST);
		const { framebuffer: blurXFramebuffer, texture: blurXTexture } = createFramebuffer(gl.LINEAR);
		const { framebuffer: blurYFramebuffer, texture: blurYTexture } = createFramebuffer(gl.NEAREST);

		const quadBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
		// prettier-ignore
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            -1, 1,
            1, 1,
            1, -1
        ]), gl.STATIC_DRAW);

		gl.enable(gl.BLEND);
		gl.blendEquation(gl.MAX);

		return {
			isError: false,
			particleShader,
			dotShader,
			blurShader,
			finalizeShader,
			viewportSize: 0,
			particleTextureSize: 0,

			inPositionLoc,
			inPositionLocDot,
			inPositionLocBlur,
			inPositionLocFinalize,

			uNoiseOffsetLoc,
			uAmplitudeLoc,
			uSeedLoc,
			uDotSpacingLoc,
			uDotOffsetLoc,
			uSphereRadiusLoc,
			uFeatherLoc,
			uNoiseFrequencyLoc,
			uNoiseAmplitudeLoc,

			uDotCountLoc,
			uDotRadiusLoc,
			uDotRadiusPXLoc,
			uParticleTextureLoc,

			uBlurRadiusLoc,
			uBlurDirectionLoc,
			uBlurInputTextureLoc,

			uOutputColorLoc,
			uBlurredTextureLoc,
			uOriginalTextureLoc,

			quadBuffer,

			particleFramebuffer,
			particleTexture,
			dotFramebuffer,
			dotTexture,
			blurXFramebuffer,
			blurXTexture,
			blurYFramebuffer,
			blurYTexture
		};
	}, []);

	const onResize = useCallback((gl: WebGL2RenderingContext | null, state: RendererState) => {
		if (state.isError || !gl) return;

		state.viewportSize = Math.min(gl.canvas.width, gl.canvas.height);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		gl.bindTexture(gl.TEXTURE_2D, state.dotTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, state.viewportSize, state.viewportSize, 0, gl.RED, gl.UNSIGNED_BYTE, null);

		gl.bindTexture(gl.TEXTURE_2D, state.blurXTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, state.viewportSize, state.viewportSize, 0, gl.RED, gl.UNSIGNED_BYTE, null);

		gl.bindTexture(gl.TEXTURE_2D, state.blurYTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, state.viewportSize, state.viewportSize, 0, gl.RED, gl.UNSIGNED_BYTE, null);
	}, []);

	const onRender = useCallback((gl: WebGL2RenderingContext | null, data: CanvasData, state: RendererState) => {
		if (state.isError || !gl) return;

		const progress = Spicetify.Player.getProgress() / 1000;

		const uNoiseOffset = (0.5 * progress + sampleAccumulatedIntegral(data.amplitudeCurve, progress)) * 75 * 0.01;
		const uAmplitude = sampleAmplitudeMovingAverage(data.amplitudeCurve, progress, 0.15);
		const uSeed = data.seed;
		const uDotCount = 322;
		const uDotRadius = 0.9 / uDotCount;
		const uDotRadiusPX = uDotRadius * 0.5 * state.viewportSize;
		const uDotSpacing = 0.9;
		const uDotOffset = -0.9 / 2;
		const uSphereRadius = mapLinear(uAmplitude, 0, 1, 0.75 * 0.9, 0.9);
		const uFeather = Math.pow(uAmplitude + 3, 2) * (45 / 1568);
		const uNoiseFrequency = 4;
		const uNoiseAmplitude = 0.32 * 0.9;

		if (state.particleTextureSize !== uDotCount) {
			state.particleTextureSize = uDotCount;

			gl.bindTexture(gl.TEXTURE_2D, state.particleTexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, uDotCount, uDotCount, 0, gl.RG, gl.FLOAT, null);
		}

		// calculate particle positions
		gl.disable(gl.BLEND);
		gl.bindFramebuffer(gl.FRAMEBUFFER, state.particleFramebuffer);
		gl.viewport(0, 0, uDotCount, uDotCount);

		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(state.particleShader);
		gl.uniform1f(state.uNoiseOffsetLoc, uNoiseOffset);
		gl.uniform1f(state.uAmplitudeLoc, uAmplitude);
		gl.uniform1i(state.uSeedLoc, uSeed);
		gl.uniform1f(state.uDotSpacingLoc, uDotSpacing);
		gl.uniform1f(state.uDotOffsetLoc, uDotOffset);
		gl.uniform1f(state.uSphereRadiusLoc, uSphereRadius);
		gl.uniform1f(state.uFeatherLoc, uFeather);
		gl.uniform1f(state.uNoiseFrequencyLoc, uNoiseFrequency);
		gl.uniform1f(state.uNoiseAmplitudeLoc, uNoiseAmplitude);

		gl.bindBuffer(gl.ARRAY_BUFFER, state.quadBuffer);
		gl.enableVertexAttribArray(state.inPositionLoc);
		gl.vertexAttribPointer(state.inPositionLoc, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		// render dots
		gl.enable(gl.BLEND);
		gl.bindFramebuffer(gl.FRAMEBUFFER, state.dotFramebuffer);
		gl.viewport(0, 0, state.viewportSize, state.viewportSize);

		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(state.dotShader);
		gl.uniform1i(state.uDotCountLoc, uDotCount);
		gl.uniform1f(state.uDotRadiusLoc, uDotRadius);
		gl.uniform1f(state.uDotRadiusPXLoc, uDotRadiusPX);
		gl.uniform1i(state.uParticleTextureLoc, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, state.particleTexture);

		gl.bindBuffer(gl.ARRAY_BUFFER, state.quadBuffer);
		gl.enableVertexAttribArray(state.inPositionLocDot);
		gl.vertexAttribPointer(state.inPositionLocDot, 2, gl.FLOAT, false, 0, 0);

		gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, uDotCount * uDotCount);

		// blur in X direction
		gl.bindFramebuffer(gl.FRAMEBUFFER, state.blurXFramebuffer);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(state.blurShader);
		gl.uniform1f(state.uBlurRadiusLoc, 0.01 * state.viewportSize);
		gl.uniform2f(state.uBlurDirectionLoc, 1 / state.viewportSize, 0);
		gl.uniform1i(state.uBlurInputTextureLoc, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, state.dotTexture);

		gl.bindBuffer(gl.ARRAY_BUFFER, state.quadBuffer);
		gl.enableVertexAttribArray(state.inPositionLocBlur);
		gl.vertexAttribPointer(state.inPositionLocBlur, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		// blur in Y direction
		gl.bindFramebuffer(gl.FRAMEBUFFER, state.blurYFramebuffer);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.uniform2f(state.uBlurDirectionLoc, 0, 1 / state.viewportSize);
		gl.bindTexture(gl.TEXTURE_2D, state.blurXTexture);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// combine blurred and original
		gl.useProgram(state.finalizeShader);
		gl.uniform3f(
			state.uOutputColorLoc,
			data.themeColor.rgb.r / 255,
			data.themeColor.rgb.g / 255,
			data.themeColor.rgb.b / 255
		);
		gl.uniform1i(state.uBlurredTextureLoc, 0);
		gl.uniform1i(state.uOriginalTextureLoc, 1);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, state.blurYTexture);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, state.dotTexture);

		gl.bindBuffer(gl.ARRAY_BUFFER, state.quadBuffer);
		gl.enableVertexAttribArray(state.inPositionLocFinalize);
		gl.vertexAttribPointer(state.inPositionLocFinalize, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}, []);

	return (
		<AnimatedCanvas
			isEnabled={props.isEnabled}
			data={{ themeColor: props.themeColor, seed, amplitudeCurve }}
			contextType="webgl2"
			onInit={onInit}
			onResize={onResize}
			onRender={onRender}
			style={{
				width: "100%",
				height: "100%",
				objectFit: "contain"
			}}
			sizeConstraint={(width, height) => {
				const size = Math.min(width, height);
				return { width: size, height: size };
			}}
		/>
	);
}
```

## File: src/components/renderer/SpectrumVisualizer.tsx
```typescript
import React, { useCallback, useContext, useMemo } from "react";
import AnimatedCanvas from "../AnimatedCanvas";
import { decibelsToAmplitude, binarySearchIndex, sampleSegmentedFunction, smoothstep, mapLinear } from "../../utils";
import { parseRhythmString } from "../../RhythmString";
import { ErrorHandlerContext, ErrorRecovery } from "../../error";
import { RendererProps } from "../../app";

type CanvasData = {
	themeColor: Spicetify.Color;
	spectrumData: { x: number; y: number }[][];
};

type RendererState =
	| {
			isError: true;
	  }
	| {
			isError: false;
	  };

export default function SpectrumVisualizer(props: RendererProps) {
	const onError = useContext(ErrorHandlerContext);

	const spectrumData = useMemo(() => {
		if (!props.audioAnalysis) return [];

		if (props.audioAnalysis.track.rhythm_version !== 1) {
			onError(
				`Error: Unsupported rhythmstring version ${props.audioAnalysis.track.rhythm_version}`,
				ErrorRecovery.SONG_CHANGE
			);
			return [];
		}

		const segments = props.audioAnalysis.segments;
		const rhythm = parseRhythmString(props.audioAnalysis.track.rhythmstring);

		if (segments.length === 0 || rhythm.length === 0) return [];

		const RHYTHM_WEIGHT = 0.4;
		const RHYTHM_OFFSET = 0.2;
		const FALLOFF_SPEED = 0.4;

		const rhythmWindowSize = (RHYTHM_WEIGHT / Math.sqrt(2)) * 8;

		const channelCount = 12 * rhythm.length;
		const channelSegments: number[][] = [];

		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			const amplitudeStart = decibelsToAmplitude(segment.loudness_start);
			const amplitudeMax = decibelsToAmplitude(segment.loudness_max);
			const peakPosition = segment.start + segment.loudness_max_time;
			const pitches = segment.pitches;

			const rhythmWindowStart = peakPosition - rhythmWindowSize;
			const rhythmWindowEnd = peakPosition + rhythmWindowSize;
			const frequencies = rhythm.map(channel => {
				const start = binarySearchIndex(channel, e => e, rhythmWindowStart);
				const end = binarySearchIndex(channel, e => e, rhythmWindowEnd);

				return (
					channel
						.slice(start, end)
						.map(e => Math.exp(-Math.pow((e - peakPosition) / RHYTHM_WEIGHT, 2)))
						.reduce((a, b) => a + b, 0) + RHYTHM_OFFSET
				);
			});

			const frequenciesMax = Math.max(...frequencies);
			for (let i = 0; i < frequencies.length; i++) frequencies[i] /= frequenciesMax;

			const channels: number[] = Array(channelCount);
			for (let j = 0; j < frequencies.length; j++) {
				const pitchVariation = mapLinear(j, 0, frequencies.length - 1, 0.2, 0.6);

				for (let k = 0; k < 12; k++) {
					const frequency = sampleSegmentedFunction(
						[...frequencies.entries()],
						e => e[0],
						e => e[1],
						smoothstep,
						j + k / 12
					);
					const pitchAvg = pitches.reduce((a, b) => a + b, 0) / pitches.length;
					const pitch = pitches[k] * pitchVariation + pitchAvg * (1 - pitchVariation);
					channels[12 * j + k] = frequency * pitch;
				}
			}

			channelSegments.push([segment.start, ...channels.map(c => c * amplitudeStart)]);
			channelSegments.push([peakPosition, ...channels.map(c => c * amplitudeMax)]);

			if (i == segments.length - 1) {
				const amplitudeEnd = decibelsToAmplitude(segment.loudness_end);
				channelSegments.push([segment.start + segment.duration, ...channels.map(c => c * amplitudeEnd)]);
			}
		}

		const spectrumData: { x: number; y: number }[][] = Array(channelCount)
			.fill(0)
			.map(_ => Array(channelSegments.length));
		for (let i = 0; i < channelCount; i++) {
			let channelIndex = 0;
			let prevSegment = { x: 0, y: 0 };
			let prevPeak = { x: 0, y: 0 };

			for (let j = 0; j < channelSegments.length; j++) {
				const currentSegment = { x: channelSegments[j][0], y: channelSegments[j][i + 1] };
				const currentEnd = currentSegment.x + currentSegment.y / FALLOFF_SPEED;
				const prevPeakEnd = prevPeak.x + prevPeak.y / FALLOFF_SPEED;

				if (currentEnd > prevPeakEnd) {
					if (prevPeak.x !== prevSegment.x) {
						const m1 = (currentSegment.y - prevSegment.y) / (currentSegment.x - prevSegment.x);
						const b1 = prevSegment.y - m1 * prevSegment.x;
						const m2 = -FALLOFF_SPEED;
						const b2 = prevPeak.y - m2 * prevPeak.x;

						const cx = (b2 - b1) / (m1 - m2);
						const cy = m1 * cx + b1;

						spectrumData[i][channelIndex] = { x: cx, y: cy };
						channelIndex++;
					}

					prevPeak = currentSegment;

					spectrumData[i][channelIndex] = currentSegment;
					channelIndex++;
				}

				prevSegment = currentSegment;
			}

			spectrumData[i].length = channelIndex;
		}

		return spectrumData;
	}, [props.audioAnalysis]);

	const onInit = useCallback((ctx: CanvasRenderingContext2D | null): RendererState => {
		if (!ctx) {
			onError("Error: 2D rendering is not supported", ErrorRecovery.NONE);
			return { isError: true };
		}

		return {
			isError: false
		};
	}, []);

	const onResize = useCallback((ctx: CanvasRenderingContext2D | null, state: RendererState) => {
		if (state.isError || !ctx) return;
	}, []);

	const onRender = useCallback((ctx: CanvasRenderingContext2D | null, data: CanvasData, state: RendererState) => {
		if (state.isError || !ctx) return;

		const progress = Spicetify.Player.getProgress() / 1000;
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.fillStyle = data.themeColor.toCSS(Spicetify.Color.CSSFormat.HEX);

		const barCount = data.spectrumData.length;
		const barWidth = (ctx.canvas.width / barCount) * 0.7;
		const spaceWidth = (ctx.canvas.width - barWidth * barCount) / (barCount + 1);

		for (let i = 0; i < barCount; i++) {
			const value = sampleSegmentedFunction(
				data.spectrumData[i],
				x => x.x,
				x => x.y,
				x => x,
				progress
			);
			ctx.fillRect(
				spaceWidth * (i + 1) + barWidth * i,
				ctx.canvas.height - value * ctx.canvas.height,
				barWidth,
				value * ctx.canvas.height
			);
		}
	}, []);

	return (
		<AnimatedCanvas
			isEnabled={props.isEnabled}
			data={{ themeColor: props.themeColor, spectrumData }}
			contextType="2d"
			onInit={onInit}
			onResize={onResize}
			onRender={onRender}
			style={{
				width: "100%",
				height: "100%"
			}}
		/>
	);
}
```

## File: src/components/AnimatedCanvas.tsx
```typescript
import React, { useRef, useEffect, useState, useCallback } from "react";

interface ContextTypeMap {
	"2d": CanvasRenderingContext2D;
	webgl: WebGLRenderingContext;
	webgl2: WebGL2RenderingContext;
	bitmaprenderer: ImageBitmapRenderingContext;
}

export default function AnimatedCanvas<T, U, V extends keyof ContextTypeMap>(props: {
	contextType: V;
	onInit: (ctx: ContextTypeMap[V] | null) => U;
	onResize: (ctx: ContextTypeMap[V] | null, state: U) => void;
	onRender: (ctx: ContextTypeMap[V] | null, data: T, state: U, time: number) => void;

	style?: React.CSSProperties;
	sizeConstraint?: (width: number, height: number) => { width: number; height: number };

	data: T;
	isEnabled: boolean;
}) {
	const { contextType, onInit, onResize, onRender, style, data, isEnabled } = props;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [state, setState] = useState<U | null>(null);

	const updateResolution = useCallback((canvas: HTMLCanvasElement, win: Window) => {
		const screenWidth = Math.round(canvas.clientWidth * window.devicePixelRatio);
		const screenHeight = Math.round(canvas.clientHeight * window.devicePixelRatio);

		const { width: newWidth, height: newHeight } = props.sizeConstraint?.(screenWidth, screenHeight) ?? {
			width: screenWidth,
			height: screenHeight
		};

		if (canvas.width === newWidth && canvas.height === newHeight) return;
		canvas.width = newWidth;
		canvas.height = newHeight;
	}, []);

	useEffect(() => {
		if (!onInit) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const win = canvas.ownerDocument.defaultView;
		if (!win) return;

		const context = canvas.getContext(contextType) as ContextTypeMap[V] | null;

		const state = onInit(context);
		updateResolution(canvas, win);
		onResize(context, state);
		setState(state);

		return () => setState(null);
	}, [contextType, onInit]);

	useEffect(() => {
		if (!isEnabled || !state || !onRender) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const win = canvas.ownerDocument.defaultView;
		if (!win) return;

		const context = canvas.getContext(contextType) as ContextTypeMap[V] | null;

		let requestId = 0;
		const wrapper = (time: number) => {
			if (!state) return;

			onRender(context, data, state, time);
			requestId = win.requestAnimationFrame(wrapper);
		};

		requestId = win.requestAnimationFrame(wrapper);
		return () => {
			if (requestId) win.cancelAnimationFrame(requestId);
		};
	}, [contextType, onRender, data, state, isEnabled]);

	useEffect(() => {
		if (!canvasRef.current) return;

		const win = canvasRef.current.ownerDocument.defaultView;
		if (!win) return;

		const resizeObserver = new win.ResizeObserver(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const win = canvas.ownerDocument.defaultView;
			if (!win) return;

			updateResolution(canvas, win);

			const context = canvas.getContext(contextType) as ContextTypeMap[V] | null;
			if (context && state) onResize(context, state);
		});

		resizeObserver.observe(canvasRef.current);
		return () => resizeObserver.disconnect();
	}, [contextType, onResize, state]);

	return (
		<canvas
			ref={canvasRef}
			style={{
				...(style || {}),
				...(isEnabled ? {} : { visibility: "hidden" })
			}}
		/>
	);
}
```

## File: src/components/LoadingIcon.tsx
```typescript
import React from "react";

export default function LoadingIcon() {
	return (
		<svg width="100px" height="100px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
			<circle cx="50" cy="50" r="0" fill="none" stroke="currentColor" stroke-width="2">
				<animate
					attributeName="r"
					repeatCount="indefinite"
					dur="1s"
					values="0;40"
					keyTimes="0;1"
					keySplines="0 0.2 0.8 1"
					calcMode="spline"
					begin="0s"
				/>
				<animate
					attributeName="opacity"
					repeatCount="indefinite"
					dur="1s"
					values="1;0"
					keyTimes="0;1"
					keySplines="0.2 0 0.8 1"
					calcMode="spline"
					begin="0s"
				/>
			</circle>
			<circle cx="50" cy="50" r="0" fill="none" stroke="currentColor" stroke-width="2">
				<animate
					attributeName="r"
					repeatCount="indefinite"
					dur="1s"
					values="0;40"
					keyTimes="0;1"
					keySplines="0 0.2 0.8 1"
					calcMode="spline"
					begin="-0.5s"
				/>
				<animate
					attributeName="opacity"
					repeatCount="indefinite"
					dur="1s"
					values="1;0"
					keyTimes="0;1"
					keySplines="0.2 0 0.8 1"
					calcMode="spline"
					begin="-0.5s"
				/>
			</circle>
		</svg>
	);
}
```

## File: src/css/app.module.scss
```scss
:global(.visualizer-container) {
	// fill available space
	position: absolute;
	inset: 0;
}

:global(.visualizer-container) > *:not(.main_menu_button) {
	position: absolute;

	top: 50%;
	left: 50%;
	translate: -50% -50%;
}

.main_menu_button {
	position: absolute;
	top: 10px;
	right: 10px;
}

.error_container {
	max-width: 50%;

	display: flex;
	flex-direction: column;

	align-items: center;
	gap: 2rem;
}

.error_message {
	font-size: 24px;
	font-weight: 700;

	text-align: center;
}
```

## File: src/css/icon-active.svg
```
<svg viewBox="0 0 24 24" fill="currentColor" stroke-width="0">
	<path d="M 18.300781 2.6855469C 17.469782 2.6855469 16.800781 3.3545477 16.800781 4.1855469L 16.800781 19.814453C 16.800781 20.645452 17.469782 21.314453 18.300781 21.314453C 19.13178 21.314453 19.800781 20.645452 19.800781 19.814453L 19.800781 4.1855469C 19.800781 3.3545477 19.13178 2.6855469 18.300781 2.6855469zM 5.6992188 4.8125C 4.8682196 4.8125 4.1992188 5.4815008 4.1992188 6.3125L 4.1992188 17.6875C 4.1992187 18.518499 4.8682196 19.1875 5.6992188 19.1875C 6.5302179 19.1875 7.1992188 18.518499 7.1992188 17.6875L 7.1992188 6.3125C 7.1992188 5.4815008 6.5302179 4.8125 5.6992188 4.8125zM 14.099609 6.2675781C 13.26861 6.2675781 12.599609 6.936579 12.599609 7.7675781L 12.599609 16.232422C 12.599609 17.063421 13.26861 17.732422 14.099609 17.732422C 14.930609 17.732422 15.599609 17.063421 15.599609 16.232422L 15.599609 7.7675781C 15.599609 6.936579 14.930609 6.2675781 14.099609 6.2675781zM 1.5 8C 0.66900083 8 0 8.6690008 0 9.5L 0 14.5C 0 15.330999 0.66900083 16 1.5 16C 2.3309992 16 3 15.330999 3 14.5L 3 9.5C 3 8.6690008 2.3309992 8 1.5 8zM 22.5 8.90625C 21.669001 8.90625 21 9.5752508 21 10.40625L 21 13.59375C 21 14.424749 21.669001 15.09375 22.5 15.09375C 23.330999 15.09375 24 14.424749 24 13.59375L 24 10.40625C 24 9.5752508 23.330999 8.90625 22.5 8.90625zM 9.9003906 9.6523438C 9.0693915 9.6523438 8.4003906 10.321345 8.4003906 11.152344L 8.4003906 12.847656C 8.4003906 13.678655 9.0693915 14.347656 9.9003906 14.347656C 10.73139 14.347656 11.400391 13.678655 11.400391 12.847656L 11.400391 11.152344C 11.400391 10.321345 10.73139 9.6523438 9.9003906 9.6523438z" />
</svg>
```

## File: src/css/icon-inactive.svg
```
<svg viewBox="0 0 24 24" fill="currentColor" stroke-width="0">
	<path d="M 18.599609 2.6855469C 18.04561 2.6855469 17.599609 3.1315474 17.599609 3.6855469L 17.599609 20.314453C 17.599609 20.868453 18.04561 21.314453 18.599609 21.314453C 19.153609 21.314453 19.599609 20.868453 19.599609 20.314453L 19.599609 3.6855469C 19.599609 3.1315474 19.153609 2.6855469 18.599609 2.6855469zM 5.4003906 4.8125C 4.8463912 4.8125 4.4003906 5.2585006 4.4003906 5.8125L 4.4003906 18.1875C 4.4003906 18.741499 4.8463912 19.1875 5.4003906 19.1875C 5.9543901 19.1875 6.4003906 18.741499 6.4003906 18.1875L 6.4003906 5.8125C 6.4003906 5.2585006 5.9543901 4.8125 5.4003906 4.8125zM 14.199219 6.2675781C 13.645219 6.2675781 13.199219 6.7135787 13.199219 7.2675781L 13.199219 16.732422C 13.199219 17.286421 13.645219 17.732422 14.199219 17.732422C 14.753218 17.732422 15.199219 17.286421 15.199219 16.732422L 15.199219 7.2675781C 15.199219 6.7135787 14.753218 6.2675781 14.199219 6.2675781zM 1 8C 0.44600055 8 0 8.4460006 0 9L 0 15C 0 15.553999 0.44600055 16 1 16C 1.5539994 16 2 15.553999 2 15L 2 9C 2 8.4460006 1.5539994 8 1 8zM 23 8.90625C 22.446001 8.90625 22 9.3522506 22 9.90625L 22 14.09375C 22 14.647749 22.446001 15.09375 23 15.09375C 23.553999 15.09375 24 14.647749 24 14.09375L 24 9.90625C 24 9.3522506 23.553999 8.90625 23 8.90625zM 9.8007812 9.6523438C 9.2467818 9.6523438 8.8007812 10.098344 8.8007812 10.652344L 8.8007812 13.347656C 8.8007812 13.901656 9.2467818 14.347656 9.8007812 14.347656C 10.354781 14.347656 10.800781 13.901656 10.800781 13.347656L 10.800781 10.652344C 10.800781 10.098344 10.354781 9.6523438 9.8007812 9.6523438z" />
</svg>
```

## File: src/css/ncs-active.svg
```
<svg viewBox="0 0 256 256" fill="currentColor" stroke-width="0">
	<path d="M 127.99805 0C 125.79146 6.6496985e-05 123.59738 0.055214536 121.41797 0.16601562C 119.23856 0.27681672 117.07337 0.4432692 114.92383 0.66210938C 112.77429 0.88094956 110.64041 1.1523787 108.52344 1.4765625C 106.40646 1.8007463 104.30632 2.1786369 102.22461 2.6054688C 100.1429 3.0323005 98.078909 3.508372 96.035156 4.0351562C 93.991403 4.5619406 91.967944 5.1376774 89.964844 5.7617188C 87.961744 6.3857602 85.979283 7.0587409 84.019531 7.7773438C 82.05978 8.4959467 80.122692 9.2617962 78.208984 10.072266C 76.295277 10.882734 74.405984 11.737079 72.541016 12.636719C 70.676047 13.536358 68.835018 14.480682 67.021484 15.466797C 65.207951 16.452911 63.421513 17.480887 61.662109 18.550781C 59.902707 19.620675 58.171327 20.731835 56.46875 21.882812C 54.766173 23.033791 53.092274 24.225711 51.449219 25.455078C 49.806163 26.684445 48.19412 27.950801 46.613281 29.255859C 45.032443 30.560919 43.482722 31.903193 41.966797 33.28125C 40.45087 34.659307 38.96785 36.075079 37.519531 37.523438C 36.071214 38.971797 34.657311 40.452785 33.279297 41.96875C 31.901282 43.484715 30.558922 45.034359 29.253906 46.615234C 27.948892 48.196111 26.682446 49.810034 25.453125 51.453125C 24.223804 53.096216 23.03179 54.768092 21.880859 56.470703C 20.72993 58.173314 19.618673 59.906579 18.548828 61.666016C 17.478983 63.425451 16.450908 65.211825 15.464844 67.025391C 14.47878 68.838955 13.534353 70.677971 12.634766 72.542969C 11.735178 74.407967 10.880728 76.299155 10.070312 78.212891C 9.2598967 80.126626 8.4939384 82.063659 7.7753906 84.023438C 7.0568429 85.983217 6.3857033 87.965625 5.7617188 89.96875C 5.1377343 91.971875 4.5618822 93.995287 4.0351562 96.039062C 3.5084304 98.082839 3.0302874 100.14678 2.6035156 102.22852C 2.1767439 104.31024 1.8006846 106.41036 1.4765625 108.52734C 1.1524404 110.64434 0.88088629 112.77818 0.66210938 114.92773C 0.44333247 117.07729 0.27675184 119.24245 0.16601562 121.42188C 0.055279416 123.60129 0 125.79536 0 128.00195C 0 130.2072 0.055412676 132.40004 0.16601562 134.57812C 0.27661858 136.75622 0.44164101 138.92012 0.66015625 141.06836C 0.87867149 143.2166 1.1508725 145.34915 1.4746094 147.46484C 1.7983463 149.58054 2.1752946 151.6793 2.6015625 153.75977C 3.0278304 155.84023 3.5031887 157.90276 4.0292969 159.94531C 4.555405 161.98786 5.1306485 164.00977 5.7539062 166.01172C 6.3771641 168.01366 7.0498613 169.99449 7.7675781 171.95312C 8.485295 173.91177 9.2491084 175.84906 10.058594 177.76172C 10.868079 179.67438 11.722531 181.56376 12.621094 183.42773C 13.519656 185.29172 14.462316 187.12878 15.447266 188.94141C 16.432215 190.75402 17.458697 192.54221 18.527344 194.30078C 19.59599 196.05935 20.705817 197.78842 21.855469 199.49023C 23.005121 201.19206 24.195861 202.86542 25.423828 204.50781C 26.651795 206.15021 27.917112 207.76347 29.220703 209.34375C 30.524295 210.92403 31.865663 212.47086 33.242188 213.98633C 34.618713 215.50179 36.031747 216.98564 37.478516 218.43359C 38.925283 219.88156 40.405601 221.29411 41.919922 222.67188C 43.434242 224.04965 44.981364 225.39236 46.560547 226.69727C 48.139729 228.00216 49.751225 229.26871 51.392578 230.49805C 53.033931 231.72738 54.705417 232.91923 56.40625 234.07031C 58.107083 235.22139 59.83808 236.33221 61.595703 237.40234C 63.353326 238.47248 65.137496 239.50178 66.949219 240.48828C 68.760941 241.47478 70.599759 242.41818 72.462891 243.31836C 74.326022 244.21854 76.213151 245.07555 78.125 245.88672C 80.036849 246.69788 81.973765 247.46413 83.931641 248.18359C 85.889517 248.90306 87.869881 249.5761 89.871094 250.20117C 91.872306 250.82625 93.893689 251.40365 95.935547 251.93164C 97.977405 252.45964 100.03933 252.93701 102.11914 253.36523C 104.19896 253.79346 106.29703 254.17228 108.41211 254.49805C 110.52719 254.82382 112.65899 255.09774 114.80664 255.31836C 116.95429 255.53898 119.11738 255.70557 121.29492 255.81836C 123.47246 255.93114 125.66441 255.98993 127.86914 255.99219A 127.9999 127.99993 0 0 0 128 256A 127.9999 127.99993 0 0 0 128.12695 255.99219C 130.33094 255.99019 132.52242 255.93089 134.69922 255.81836C 136.87601 255.70578 139.03863 255.5387 141.18555 255.31836C 143.33246 255.09801 145.46378 254.82542 147.57812 254.5C 149.69248 254.17458 151.79003 253.79696 153.86914 253.36914C 155.94825 252.94132 158.00765 252.46307 160.04883 251.93555C 162.09 251.40802 164.11273 250.83157 166.11328 250.20703C 168.11384 249.58249 170.09353 248.91028 172.05078 248.19141C 174.00803 247.47253 175.94226 246.70701 177.85352 245.89648C 179.76476 245.08597 181.65306 244.22956 183.51562 243.33008C 185.3782 242.43059 187.21419 241.48771 189.02539 240.50195C 190.83659 239.51619 192.62176 238.48732 194.37891 237.41797C 196.13604 236.34862 197.866 235.23814 199.56641 234.08789C 201.2668 232.93764 202.9391 231.748 204.58008 230.51953C 206.22106 229.29107 207.83129 228.0247 209.41016 226.7207C 210.98901 225.41671 212.53672 224.07606 214.05078 222.69922C 215.56485 221.32238 217.04561 219.90988 218.49219 218.46289C 219.93876 217.0159 221.35016 215.53399 222.72656 214.01953C 224.10297 212.50507 225.4445 210.95814 226.74805 209.37891C 228.05159 207.79966 229.31693 206.18822 230.54492 204.54688C 231.77292 202.90554 232.96352 201.23396 234.11328 199.5332C 235.26304 197.83245 236.37257 196.10318 237.44141 194.3457C 238.51025 192.58822 239.5382 190.80175 240.52344 188.99023C 241.50867 187.17873 242.45067 185.34138 243.34961 183.47852C 244.24855 181.61565 245.1041 179.72793 245.91406 177.81641C 246.72402 175.90487 247.48874 173.96923 248.20703 172.01172C 248.92532 170.0542 249.59677 168.07503 250.2207 166.07422C 250.84464 164.07341 251.42037 162.05117 251.94727 160.00977C 252.47416 157.96835 252.95174 155.90746 253.37891 153.82812C 253.80608 151.7488 254.18306 149.65168 254.50781 147.53711C 254.83257 145.42254 255.10652 143.28969 255.32617 141.14258C 255.54583 138.99546 255.71235 136.83323 255.82422 134.65625C 255.93609 132.47927 255.99275 130.28814 255.99414 128.08398A 127.9999 127.99993 0 0 0 256 128A 127.9999 127.99993 0 0 0 255.84766 122.08203C 255.82236 121.52965 255.78621 120.98024 255.75391 120.42969A 127.9999 127.99993 0 0 0 255.42383 116.09766C 255.36883 115.50353 255.31898 114.90817 255.25586 114.31641A 127.9999 127.99993 0 0 0 254.57031 108.92188A 127.9999 127.99993 0 0 0 254.56836 108.9082C 254.45569 108.15724 254.31317 107.41659 254.1875 106.66992A 127.9999 127.99993 0 0 0 253.61328 103.4668C 253.4269 102.50966 253.22521 101.55879 253.01758 100.60938A 127.9999 127.99993 0 0 0 252.43164 98.070312C 252.1922 97.073876 251.956 96.077107 251.69336 95.089844A 127.9999 127.99993 0 0 0 251.04688 92.822266C 250.54669 91.07361 250.01337 89.340384 249.44141 87.623047A 127.9999 127.99993 0 0 0 248.5957 85.126953C 248.28763 84.262245 247.96471 83.404888 247.63867 82.548828A 127.9999 127.99993 0 0 0 246.50195 79.666016C 246.20053 78.929134 245.90258 78.190903 245.58789 77.460938A 127.9999 127.99993 0 0 0 243.39062 72.607422A 127.9999 127.99993 0 0 0 243.36133 72.542969C 243.36033 72.540369 243.35842 72.537756 243.35742 72.535156A 127.9999 127.99993 0 0 0 240.67773 67.306641C 240.53698 67.046232 240.39249 66.788625 240.25 66.529297A 127.9999 127.99993 0 0 0 237.56445 61.863281C 237.49585 61.750084 237.42827 61.636407 237.35938 61.523438A 127.9999 127.99993 0 0 0 228.65039 48.957031A 127.9999 127.99993 0 0 0 218.50781 37.519531A 127.9999 127.99993 0 0 0 207.07227 27.371094A 127.9999 127.99993 0 0 0 194.50781 18.660156C 194.36944 18.575706 194.23054 18.492146 194.0918 18.408203A 127.9999 127.99993 0 0 0 189.59375 15.820312C 189.26848 15.641095 188.94612 15.457712 188.61914 15.28125A 127.9999 127.99993 0 0 0 183.53711 12.675781A 127.9999 127.99993 0 0 0 183.51953 12.667969C 183.3199 12.571529 183.11428 12.486055 182.91406 12.390625A 127.9999 127.99993 0 0 0 178.61328 10.441406C 177.80104 10.090597 176.97901 9.7601314 176.1582 9.4257812A 127.9999 127.99993 0 0 0 173.64844 8.4335938C 172.67724 8.0618289 171.70304 7.6982021 170.7207 7.3496094A 127.9999 127.99993 0 0 0 168.79688 6.6972656C 166.68541 5.9858012 164.55147 5.3271523 162.39258 4.7246094A 127.9999 127.99993 0 0 0 160.99414 4.328125C 159.91011 4.0389352 158.8158 3.776816 157.7207 3.515625A 127.9999 127.99993 0 0 0 155.57812 3.0214844C 154.51512 2.787325 153.44965 2.5610078 152.37695 2.3535156A 127.9999 127.99993 0 0 0 149.85156 1.9023438C 148.64344 1.693818 147.43423 1.490722 146.21484 1.3164062A 127.9999 127.99993 0 0 0 141.81641 0.75585938C 141.10035 0.67874395 140.37967 0.61990762 139.66016 0.5546875A 127.9999 127.99993 0 0 0 135.77539 0.2578125C 135.11385 0.21801414 134.45326 0.17616268 133.78906 0.14648438A 127.9999 127.99993 0 0 0 128.00781 0A 127.9999 127.99993 0 0 0 128 0A 127.9999 127.99993 0 0 0 127.99805 0zM 116.48438 14.001953C 117.29682 14.405092 118.06182 14.816924 118.90039 15.214844C 121.04274 16.231432 123.27112 17.230994 125.58789 18.208984C 127.90465 19.186973 130.30886 20.14514 132.80469 21.078125C 135.30052 22.011109 137.88882 22.919207 140.56836 23.800781C 143.2479 24.682355 146.01882 25.537569 148.88672 26.361328C 154.6045 28.003667 159.84522 29.620892 164.64844 31.216797C 167.05005 32.014749 169.34259 32.806722 171.53125 33.59375C 173.71991 34.380778 175.80471 35.162875 177.79102 35.939453C 179.7773 36.716032 181.66448 37.487414 183.45898 38.253906C 185.2535 39.020398 186.95539 39.782014 188.56836 40.539062C 190.18133 41.296118 191.70656 42.048914 193.14844 42.796875C 194.59031 43.544836 195.94885 44.287969 197.23047 45.027344C 198.51209 45.766712 199.71593 46.502936 200.84766 47.234375C 201.97938 47.965814 203.03901 48.692479 204.03125 49.416016C 205.0235 50.139555 205.94746 50.859739 206.81055 51.576172C 207.67363 52.292604 208.47585 53.005297 209.2207 53.714844C 209.96556 54.424395 210.65408 55.131039 211.29102 55.833984C 211.92794 56.536931 212.5133 57.236188 213.05273 57.933594C 213.59216 58.631003 214.08628 59.325625 214.53906 60.017578C 214.99185 60.709531 215.4033 61.398829 215.7793 62.085938C 216.53128 63.460167 217.13937 64.826267 217.64844 66.183594C 218.15751 67.540913 218.56787 68.890253 218.91797 70.234375C 219.61817 72.92261 220.08428 75.588528 220.65234 78.246094C 220.93637 79.57488 221.24613 80.901859 221.62305 82.228516C 221.99998 83.555163 222.44426 84.880776 222.99805 86.208984C 223.27494 86.873096 223.57925 87.537793 223.91602 88.203125C 224.25278 88.868457 224.622 89.534433 225.0293 90.201172C 225.4366 90.867905 225.88102 91.536149 226.36914 92.205078C 226.85726 92.874008 227.38907 93.543636 227.96875 94.214844C 229.92418 96.479023 231.7607 98.657003 233.48242 100.75391C 235.20414 102.8508 236.81109 104.86665 238.30859 106.80664C 239.37754 108.19144 240.32433 109.49344 241.2832 110.80273C 241.70407 113.60762 242.02612 116.44483 242.24219 119.3125C 242.45826 122.18017 242.56836 125.07835 242.56836 128.00195C 242.56836 130.0336 242.51476 132.05156 242.41016 134.05664C 242.30555 136.06172 242.14984 138.05327 241.94336 140.0293C 241.73688 142.00531 241.47944 143.96763 241.17383 145.91211C 240.86822 147.85659 240.51528 149.78291 240.11328 151.69336C 239.71128 153.60381 239.26127 155.49718 238.76562 157.37109C 238.26999 159.24502 237.72719 161.10064 237.14062 162.93555C 236.55407 164.77045 235.92278 166.58551 235.24805 168.37891C 234.57331 170.17229 233.85587 171.94396 233.0957 173.69336C 232.45173 174.31973 231.80774 174.94292 231.16211 175.59766C 229.34055 177.44493 227.51974 179.41299 225.73828 181.53906C 224.84754 182.6021 223.96734 183.70434 223.10156 184.85156C 222.23578 185.99878 221.38556 187.19057 220.55469 188.43164C 219.72384 189.6727 218.91294 190.96404 218.12695 192.30859C 217.34097 193.65315 216.57882 195.05008 215.84766 196.50781C 215.11651 197.96554 214.41637 199.4839 213.75 201.06445C 213.08364 202.64499 212.45099 204.28894 211.85938 206.00195C 211.84238 206.05085 211.82725 206.09186 211.81055 206.14062C 210.18552 207.88314 208.5072 209.575 206.77734 211.21289C 205.0475 212.85078 203.26502 214.43479 201.43555 215.96289C 199.60607 217.49099 197.72859 218.96187 195.80469 220.375C 193.88079 221.78813 191.91156 223.14255 189.89844 224.43555C 187.88531 225.72855 185.82958 226.96121 183.73242 228.12891C 181.63527 229.2966 179.4963 230.40028 177.32031 231.4375C 175.14433 232.47472 172.93126 233.44607 170.68164 234.34766C 168.43202 235.24924 166.14618 236.08103 163.82812 236.8418C 163.1445 236.56461 162.53388 236.28713 161.82227 236.01367C 159.57606 235.15052 157.18748 234.31307 154.63281 233.55273C 153.35547 233.17256 152.03625 232.8116 150.67383 232.47656C 149.31141 232.14153 147.90579 231.83243 146.45312 231.55469C 145.00048 231.27693 143.50135 231.02967 141.95312 230.82227C 140.4049 230.61489 138.80727 230.44658 137.1582 230.32227C 135.50912 230.19796 133.80791 230.11834 132.05273 230.08984C 130.29755 230.06154 128.48767 230.08386 126.62109 230.16406C 124.75454 230.24416 122.83087 230.38248 120.84766 230.58398C 118.86443 230.78547 116.82194 231.05112 114.7168 231.38672C 112.61163 231.72235 110.60423 232.0054 108.68945 232.23828C 106.77468 232.47117 104.95167 232.65392 103.2168 232.78906C 101.48193 232.92421 99.834966 233.01036 98.269531 233.05273C 96.704105 233.09513 95.220918 233.09257 93.814453 233.04688C 92.407978 233.00148 91.078287 232.9134 89.820312 232.78516C 88.562328 232.65692 87.375821 232.4893 86.255859 232.2832C 85.13589 232.07714 84.082269 231.83363 83.089844 231.55469C 82.097414 231.27576 81.166367 230.9601 80.291016 230.61328C 79.415653 230.26648 78.59689 229.88824 77.828125 229.47852C 77.05936 229.06879 76.340613 228.62781 75.667969 228.16016C 74.995331 227.69251 74.368246 227.19832 73.78125 226.67773C 73.194254 226.15713 72.646587 225.61155 72.134766 225.04297C 71.622941 224.47439 71.146376 223.88149 70.699219 223.26953C 70.252061 222.65757 69.834304 222.02654 69.441406 221.37695C 68.65561 220.07778 67.96767 218.70849 67.335938 217.28711C 66.704207 215.86572 66.129819 214.39245 65.568359 212.88867C 65.006901 211.3849 64.459739 209.85103 63.884766 208.30469C 63.309795 206.75834 62.707436 205.19949 62.035156 203.65039C 61.362894 202.10153 60.620947 200.56086 59.767578 199.04883C 59.340894 198.29282 58.886359 197.54371 58.398438 196.80469C 57.910517 196.06566 57.3892 195.33671 56.830078 194.61914C 56.270953 193.90156 55.674261 193.1948 55.033203 192.50391C 54.392148 191.81303 53.706118 191.13771 52.972656 190.47852C 52.239195 189.81929 51.457432 189.17726 50.621094 188.55469C 49.784755 187.93211 48.894997 187.329 47.945312 186.74805C 46.995621 186.16709 45.985617 185.60858 44.912109 185.07422C 43.83859 184.53986 42.701956 184.02965 41.494141 183.54688C 39.454173 182.73147 37.501899 181.89387 35.634766 181.03516C 33.767629 180.17645 31.98551 179.29724 30.285156 178.39844C 28.584803 177.49964 26.965406 176.5802 25.425781 175.64453C 24.607444 175.1472 23.869781 174.6318 23.095703 174.125C 22.320492 172.36131 21.588692 170.57437 20.900391 168.76562C 20.212088 166.95689 19.567287 165.12663 18.96875 163.27539C 18.370213 161.42415 17.816464 159.55134 17.310547 157.66016C 16.804629 155.76896 16.34599 153.85828 15.935547 151.92969C 15.525103 150.0011 15.163677 148.05523 14.851562 146.0918C 14.539447 144.12836 14.277338 142.14808 14.066406 140.15234C 13.855475 138.15661 13.694784 136.14463 13.587891 134.11914C 13.480998 132.09365 13.427734 130.05464 13.427734 128.00195C 13.427734 125.93024 13.482864 123.87212 13.591797 121.82812C 13.700726 119.78412 13.863216 117.7539 14.078125 115.74023C 14.293034 113.72658 14.560968 111.72875 14.878906 109.74805C 15.196846 107.76734 15.564401 105.8045 15.982422 103.85938C 16.400442 101.91424 16.867661 99.987015 17.382812 98.080078C 17.897965 96.173142 18.460979 94.286043 19.070312 92.419922C 19.679647 90.553801 20.336543 88.709405 21.037109 86.886719C 21.737677 85.064033 22.482635 83.262959 23.271484 81.486328C 24.671223 80.047232 26.139175 78.56292 27.740234 76.988281C 32.359656 72.445101 37.741614 67.364312 43.458984 61.910156C 46.317669 59.183068 49.261418 56.362511 52.234375 53.46875C 55.207331 50.574988 58.210981 47.607628 61.191406 44.587891C 64.171832 41.568151 67.128682 38.49563 70.009766 35.390625C 72.89085 32.285618 75.696159 29.149567 78.371094 26C 78.967086 25.298257 79.530771 24.595308 80.113281 23.892578C 81.520549 23.245308 82.943752 22.625091 84.380859 22.033203C 85.817968 21.441316 87.268716 20.878682 88.734375 20.34375C 90.200034 19.808818 91.678953 19.302575 93.171875 18.826172C 94.664797 18.349768 96.172513 17.902631 97.691406 17.486328C 99.210301 17.070026 100.74158 16.684707 102.28516 16.330078C 103.82873 15.975449 105.3842 15.650757 106.95117 15.359375C 108.51815 15.067993 110.09647 14.808594 111.68555 14.582031C 113.27463 14.355469 114.87448 14.162123 116.48438 14.001953zM 113.3457 32.564453C 113.21125 32.565041 113.07073 32.593085 112.92188 32.660156C 105.57379 34.073458 98.074637 35.491345 91.365234 38.949219C 89.213411 40.465475 87.770493 42.72233 85.949219 44.583984C 80.724297 50.36549 75.237809 55.904948 69.728516 61.414062C 60.898833 70.162858 51.788073 78.778888 42.851562 87.476562C 41.401768 88.935662 39.856068 90.331935 38.464844 91.830078C 30.686397 111.06177 29.382688 132.82518 34.705078 152.86719C 35.520324 155.98374 36.548571 159.03977 37.664062 162.06055C 41.96976 163.99537 46.356412 165.84919 50.525391 167.86914C 51.922998 168.55464 53.214712 169.20679 54.615234 169.97656C 61.485504 173.70112 67.804709 178.68953 72.285156 185.1543C 76.523599 191.11331 79.189543 197.97845 81.771484 204.76758C 82.883952 207.62984 84.133293 210.442 85.638672 213.12109C 88.165633 214.61019 91.145963 214.84933 94.009766 214.96875C 100.84802 215.28183 107.6332 214.03547 114.375 213.27148C 117.30727 212.89754 120.39112 212.55715 123.24609 212.33203C 124.69457 212.22471 126.12507 212.14414 127.49609 212.10156C 134.64434 211.98735 141.8046 212.57546 148.85352 213.75781C 153.93101 214.62012 158.91879 215.95144 163.79688 217.5957C 175.83508 212.98135 186.68312 205.58176 195.93359 196.65234C 197.31803 194.58845 197.79557 192.09037 199.03711 189.95117C 203.76801 180.21769 210.17822 171.33346 217.74023 163.60352C 223.36071 149.16332 225.85387 133.34783 223.81836 117.92383C 222.73926 115.97657 221.1882 114.34694 219.8418 112.58594C 215.30926 106.97 210.30416 101.57618 207.18555 94.992188C 204.8509 90.192413 203.66298 84.92806 202.63086 79.759766C 201.77384 75.924106 200.99883 71.854018 198.47266 68.708984C 196.84399 66.64739 194.6653 65.11735 192.58203 63.552734C 183.98132 57.35963 173.91374 53.731664 164.01758 50.191406C 153.27079 46.324266 142.26368 43.296197 131.45703 39.615234C 125.77409 37.669093 120.01178 35.506733 114.50195 32.976562C 114.10325 32.806892 113.74907 32.562689 113.3457 32.564453z" />
</svg>
```

## File: src/css/ncs-inactive.svg
```
<svg viewBox="0 0 256 256" fill="currentColor" stroke-width="0">
	<path d="M 127.99805,1.3897628e-6C 57.387077,0.00212929 9.4410044e-7,57.390462 9.4410046e-7,128.00189 9.4410046e-7,198.57009 57.317605,255.91973 127.86914,255.99206A 127.99999,127.99993 0 0 0 128,256a 127.99999,127.99993 0 0 0 0.12695,-0.008c 70.52763,-0.068 127.82253,-57.37514 127.86719,-127.90814a 127.99999,127.99993 0 0 0 0.006,-0.084 127.99999,127.99993 0 0 0 -0.15234,-5.91796c -0.0252,-0.55238 -0.0615,-1.1018 -0.0937,-1.65235a 127.99999,127.99993 0 0 0 -0.33008,-4.33203c -0.055,-0.59413 -0.10486,-1.18948 -0.16797,-1.78124a 127.99999,127.99993 0 0 0 -0.68555,-5.39453 127.99999,127.99993 0 0 0 -0.002,-0.0136c -0.11266,-0.75096 -0.25518,-1.49161 -0.38086,-2.23828a 127.99999,127.99993 0 0 0 -0.57422,-3.20312c -0.18638,-0.95714 -0.38807,-1.90799 -0.5957,-2.85742a 127.99999,127.99993 0 0 0 -0.58594,-2.539064c -0.23944,-0.996438 -0.47564,-1.993201 -0.73828,-2.980466a 127.99999,127.99993 0 0 0 -0.64649,-2.267579c -0.5002,-1.748662 -1.0335,-3.481869 -1.60546,-5.199214a 127.99999,127.99993 0 0 0 -0.84571,-2.496093c -0.30806,-0.86471 -0.63099,-1.722062 -0.95703,-2.578124a 127.99999,127.99993 0 0 0 -1.13686,-2.882882c -0.3014,-0.736883 -0.59937,-1.475112 -0.91406,-2.205078a 127.99999,127.99993 0 0 0 -2.19726,-4.853512 127.99999,127.99993 0 0 0 -0.0293,-0.06444c -0.001,-0.0026 -0.003,-0.0053 -0.004,-0.0079a 127.99999,127.99993 0 0 0 -2.67969,-5.228512c -0.14074,-0.26041 -0.28524,-0.518015 -0.42773,-0.777343a 127.99999,127.99993 0 0 0 -2.68555,-4.666013c -0.0685,-0.113197 -0.13618,-0.226885 -0.20507,-0.339855A 127.99999,127.99993 0 0 0 194.50781,18.660148c -0.13839,-0.08445 -0.27728,-0.168011 -0.41601,-0.251954a 127.99999,127.99993 0 0 0 -4.49805,-2.587888c -0.32527,-0.179218 -0.64763,-0.362596 -0.97461,-0.539062a 127.99999,127.99993 0 0 0 -5.08203,-2.605467 127.99999,127.99993 0 0 0 -0.0176,-0.0078c -0.19965,-0.09644 -0.40525,-0.181912 -0.60547,-0.277345A 127.99999,127.99993 0 0 0 178.61326,10.44139C 177.80101,10.090578 176.979,9.7601162 176.15818,9.425765a 127.99999,127.99993 0 0 0 -2.50976,-0.9921871c -0.9712,-0.3717692 -1.94539,-0.7353902 -2.92774,-1.0839838A 127.99999,127.99993 0 0 0 168.79686,6.697251c -2.11149,-0.7114666 -4.24541,-1.3701106 -6.4043,-1.9726554A 127.99999,127.99993 0 0 0 160.99414,4.3281241C 159.9101,4.0389329 158.8158,3.7768165 157.7207,3.5156246A 127.99999,127.99993 0 0 0 155.57813,3.0214843C 154.5151,2.7873241 153.44965,2.5610086 152.37695,2.3535158A 127.99999,127.99993 0 0 0 149.85156,1.9023442C 148.64344,1.6938179 147.43424,1.4907232 146.21484,1.316407A 127.99999,127.99993 0 0 0 141.8164,0.75586038c -0.71606,-0.0771159 -1.43672,-0.13595143 -2.15624,-0.20117168a 127.99999,127.99993 0 0 0 -3.88477,-0.29687487c -0.66155,-0.0397984 -1.32213,-0.0816497 -1.98633,-0.11132808A 127.99999,127.99993 0 0 0 128.00781,1.3897628e-6a 127.99999,127.99993 0 0 0 -0.008,0 127.99999,127.99993 0 0 0 -0.002,0zM 116.48437,14.001947c 0.81247,0.40314 1.57745,0.814971 2.41602,1.212891 2.14235,1.016591 4.37073,2.016146 6.6875,2.994139 2.31677,0.977992 4.72096,1.936151 7.2168,2.869139 2.49583,0.932988 5.08412,1.841078 7.76367,2.722655 2.67955,0.881577 5.45045,1.736785 8.31836,2.560546 5.7178,1.642345 10.95849,3.259558 15.76172,4.855466 4.80323,1.595908 9.16997,3.169491 13.14258,4.722654 3.97261,1.553162 7.55139,3.085501 10.77734,4.599606 3.22595,1.514112 6.09886,3.00953 8.66211,4.488281 2.56324,1.478743 4.81628,2.94159 6.80078,4.388668 1.9845,1.447082 3.69974,2.879726 5.18945,4.298825 1.48971,1.419106 2.75316,2.823933 3.83204,4.218748 1.07886,1.394823 1.97456,2.778118 2.72656,4.152342 0.75198,1.374232 1.36007,2.740326 1.86914,4.097656 0.50907,1.357326 0.91943,2.706654 1.26953,4.050778 0.7002,2.688245 1.16631,5.354141 1.73438,8.011714 0.28403,1.328791 0.59377,2.655763 0.97069,3.982422 0.37694,1.326655 0.82122,2.652248 1.37501,3.980464 0.55378,1.328224 1.21665,2.658708 2.03124,3.992188 0.81461,1.333474 1.78009,2.671248 2.93946,4.013668 3.91087,4.528374 7.34481,8.711803 10.33984,12.591793 1.06895,1.3848 2.01575,2.68678 2.97461,3.99609 0.84175,5.60978 1.28516,11.35197 1.28516,17.19921 0,16.2532 -3.39133,31.69615 -9.47266,45.69138 -0.64397,0.62637 -1.28796,1.24956 -1.93359,1.9043 -1.82156,1.84729 -3.64236,3.81533 -5.42383,5.9414 -0.89073,1.06304 -1.77094,2.16528 -2.63672,3.3125 -0.86578,1.14723 -1.71601,2.33901 -2.54687,3.58008 -0.83086,1.24106 -1.64175,2.53238 -2.42774,3.87695 -0.78598,1.34457 -1.54813,2.74149 -2.2793,4.19922 -0.73115,1.45773 -1.43128,2.97609 -2.09765,4.55663 -0.66637,1.58055 -1.299,3.22448 -1.89062,4.9375 -0.0169,0.0489 -0.032,0.0899 -0.0488,0.13867 -13.00028,13.94014 -29.43796,24.61498 -47.98243,30.70116 -0.68364,-0.27719 -1.29423,-0.55467 -2.00586,-0.82813 -2.24621,-0.86315 -4.63476,-1.7006 -7.18945,-2.46093 -2.55468,-0.76034 -5.27435,-1.44256 -8.17968,-1.99805 -1.45267,-0.27776 -2.95177,-0.52502 -4.5,-0.73242 -1.54824,-0.20739 -3.14585,-0.37569 -4.79493,-0.5 -1.64907,-0.12431 -3.35028,-0.20394 -5.10546,-0.23244 -1.7552,-0.0283 -3.56507,-0.006 -5.43165,0.0742 -1.86657,0.0801 -3.7902,0.21842 -5.77343,0.41992 -1.98324,0.20149 -4.0257,0.46713 -6.13086,0.80273 -2.10517,0.33562 -4.11257,0.61868 -6.02735,0.85157 -1.91478,0.23289 -3.73778,0.41564 -5.47265,0.55078 -1.73487,0.13515 -3.38183,0.22129 -4.947269,0.26366 -1.565435,0.0424 -3.048605,0.0396 -4.455077,-0.006 -1.406479,-0.0454 -2.736158,-0.13349 -3.99414,-0.26173 -1.257989,-0.12824 -2.444485,-0.29586 -3.564454,-0.50196 -1.119972,-0.20606 -2.173587,-0.44958 -3.166015,-0.72851 -0.992432,-0.27893 -1.92347,-0.59459 -2.798827,-0.94141 -0.875365,-0.34681 -1.694125,-0.72504 -2.462892,-1.13476 -0.768767,-0.40973 -1.487512,-0.85071 -2.160158,-1.31836 -0.672643,-0.46765 -1.29972,-0.96183 -1.886718,-1.48242 -0.586998,-0.52061 -1.134659,-1.06619 -1.646483,-1.63477 -1.023651,-1.13715 -1.907562,-2.36684 -2.693359,-3.66601 -0.785798,-1.29918 -1.473737,-2.66846 -2.105469,-4.08984 -0.631733,-1.42139 -1.206119,-2.89466 -1.76758,-4.39844 -0.56146,-1.50377 -1.108618,-3.03764 -1.683594,-4.58398 -0.574972,-1.54635 -1.17733,-3.1052 -1.84961,-4.6543 -0.672272,-1.54909 -1.414205,-3.08953 -2.267577,-4.60156 -0.853372,-1.51202 -1.819249,-2.99454 -2.937498,-4.42968 -0.559128,-0.71757 -1.155817,-1.42435 -1.796878,-2.11524 -0.641057,-0.69088 -1.327083,-1.36617 -2.060545,-2.02538 -0.733463,-0.65922 -1.51522,-1.30126 -2.351562,-1.92383 -0.836341,-0.62258 -1.726091,-1.22569 -2.675781,-1.80664 -0.949693,-0.58096 -1.959688,-1.13947 -3.033203,-1.67383 -1.073522,-0.53436 -2.21015,-1.04456 -3.41797,-1.52734 -2.039977,-0.81542 -3.992233,-1.65301 -5.859375,-2.51172 -1.867142,-0.85871 -3.64925,-1.73792 -5.349609,-2.63672 -1.70036,-0.8988 -3.319745,-1.81822 -4.859375,-2.7539 -0.81834,-0.49733 -1.555997,-1.01272 -2.330079,-1.51953 -6.201716,-14.10958 -9.667968,-29.70149 -9.667968,-46.12303 0,-16.57379 3.532928,-32.302511 9.84375,-46.515599 1.399743,-1.439103 2.867685,-2.923403 4.46875,-4.498044 4.619437,-4.543194 10.001358,-9.623942 15.71875,-15.078115 2.858695,-2.727094 5.802421,-5.547633 8.77539,-8.441404 2.972969,-2.893772 5.976594,-5.861107 8.957031,-8.880854 2.980437,-3.01975 5.937263,-6.092248 8.818359,-9.197262 2.881096,-3.105017 5.686383,-6.241044 8.361328,-9.39062 0.595964,-0.701519 1.159646,-1.404462 1.742159,-2.107194 11.258214,-5.178177 23.491868,-8.609258 36.371088,-9.890621z" />
</svg>
```

## File: src/protobuf/ColorResult.ts
```typescript
import { PBBool, PBUInt32, PBMessage, make } from "./defs";

const Color = PBMessage({
	rgb: make(1, PBUInt32),
	isFallback: make(2, PBBool)
});

export const ColorResult = PBMessage({
	colorRaw: make(1, Color),
	colorLight: make(2, Color),
	colorDark: make(3, Color)
});
```

## File: src/protobuf/defs.ts
```typescript
export class Reader {
	private buffer: Uint8Array;
	private offset: number;

	constructor(buffer: Uint8Array | DataView) {
		if (buffer instanceof DataView) buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

		this.buffer = buffer;
		this.offset = 0;
	}

	getVarIntView(): DataView {
		let end = this.offset;
		while (end < this.buffer.length - 1 && this.buffer[end] & 0x80) end++;
		end++;

		return this.getView(end - this.offset);
	}

	getVarInt(): bigint {
		if (this.isExhausted()) return 0n;

		let value = 0n;
		let shift = 0n;

		let byte: bigint;
		do {
			byte = BigInt(this.buffer[this.offset++]);

			value |= (byte & 0x7fn) << shift;
			shift += 7n;
		} while (byte & 0x80n && !this.isExhausted());

		return value;
	}

	getArray(n: number): Uint8Array {
		let amount = Math.min(n, this.buffer.length - this.offset);

		const value = this.buffer.slice(this.offset, this.offset + amount);
		this.offset += amount;
		return value;
	}

	getView(n: number): DataView {
		let amount = Math.min(n, this.buffer.length - this.offset);

		const value = new DataView(this.buffer.buffer, this.buffer.byteOffset + this.offset, amount);
		this.offset += amount;
		return value;
	}

	has(n: number): boolean {
		return this.buffer.length - this.offset >= n;
	}

	isExhausted(): boolean {
		return !this.has(1);
	}
}

function sign(x: bigint, n: number): bigint {
	return x & (1n << BigInt(n * 8 - 1)) ? x - (1n << BigInt(n * 8)) : x;
}

export enum PBBaseType {
	VarInt,
	Fixed4,
	Fixed8,
	LDelim
}

type PBValueSingle<T> = [PBBaseType, (view: DataView) => T];
type PBValueArray<T extends any[]> = [PBBaseType, (view: DataView) => T, true];
export type PBValue<T> = PBValueSingle<T> | (T extends any[] ? PBValueArray<T> : never);
export type PBValueTypeOf<T> = T extends PBValue<infer U> ? U : never;

function readValue<T>(reader: Reader, value: PBValue<T>): [true, T] | [false, undefined] {
	switch (value[0]) {
		case PBBaseType.Fixed4:
			return reader.has(4) ? [true, value[1](reader.getView(4))] : [false, undefined];
		case PBBaseType.Fixed8:
			return reader.has(8) ? [true, value[1](reader.getView(8))] : [false, undefined];
		case PBBaseType.VarInt:
			return [true, value[1](reader.getVarIntView())];
		case PBBaseType.LDelim:
			const length = Number(reader.getVarInt());
			return [true, value[1](reader.getView(length))];
	}
}

export function mapPBValue<U, V>(value: PBValue<U>, fn: (value: U) => V): PBValue<V> {
	return [value[0], view => fn(value[1](view))];
}

export const PBVarInt: PBValue<bigint> = [PBBaseType.VarInt, view => new Reader(view).getVarInt()];
export const PBBool: PBValue<boolean> = mapPBValue(PBVarInt, x => !!x);
export const PBUInt32: PBValue<number> = mapPBValue(PBVarInt, Number);
export const PBUInt64: PBValue<bigint> = PBVarInt;
export const PBInt32: PBValue<number> = mapPBValue(PBVarInt, x => Number(sign(x, 4)));
export const PBInt64: PBValue<bigint> = mapPBValue(PBVarInt, x => sign(x, 8));

export const PBFloat32: PBValue<number> = [PBBaseType.Fixed4, view => view.getFloat32(0, true)];
export const PBFloat64: PBValue<number> = [PBBaseType.Fixed8, view => view.getFloat64(0, true)];
export const PBFixed32: PBValue<number> = [PBBaseType.Fixed4, view => view.getUint32(0, true)];
export const PBFixed64: PBValue<bigint> = [PBBaseType.Fixed8, view => view.getBigUint64(0, true)];
export const PBSFixed32: PBValue<number> = [PBBaseType.Fixed4, view => view.getInt32(0, true)];
export const PBSFixed64: PBValue<bigint> = [PBBaseType.Fixed8, view => view.getBigInt64(0, true)];

export const PBString: PBValue<string> = [PBBaseType.LDelim, view => new TextDecoder().decode(view)];
export const PBBytes: PBValue<Uint8Array> = [
	PBBaseType.LDelim,
	view => new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
];

export function PBEnum<T>(values: Record<number, T>): PBValue<T> {
	return mapPBValue(PBVarInt, x => values[Number(x)]);
}

export function PBRepeated<T>(value: PBValue<T>): PBValue<T[]> {
	let newType = mapPBValue(value, x => [x]);
	newType[2] = true;

	return newType;
}

export function PBRepeatedPacked<T>(value: PBValue<T>): PBValue<T[]> {
	return [
		PBBaseType.LDelim,
		view => {
			const reader = new Reader(view);
			const values: T[] = [];

			while (!reader.isExhausted()) {
				const [success, result] = readValue(reader, value);
				if (!success) break;

				values.push(result);
			}

			return values;
		}
	];
}

function verifyType(tag: number, expected: PBBaseType): boolean {
	switch (expected) {
		case PBBaseType.VarInt:
			return (tag & 7) === 0;
		case PBBaseType.Fixed4:
			return (tag & 7) === 5;
		case PBBaseType.Fixed8:
			return (tag & 7) === 1;
		case PBBaseType.LDelim:
			return (tag & 7) === 2;
	}
}

type PBMessageFields<T extends Record<string, unknown>> = {
	[K in keyof T]: { id: number; value: PBValue<T[K]> };
};
type PBMessageFieldEntry<T> = { id: number; value: PBValue<T[keyof T]> };

export function make<T>(id: number, value: PBValue<T>): { id: number; value: PBValue<T> } {
	return { id, value };
}

export function PBMessage<T extends Record<string, unknown>>(fields: PBMessageFields<T>): PBValue<Partial<T>> {
	return [
		PBBaseType.LDelim,
		view => {
			const reader = new Reader(view);
			const message: Partial<T> = {};

			const fieldsArray = Object.entries<PBMessageFieldEntry<T>>(fields).map(([name, field]) => ({
				name: name as keyof T,
				...field
			}));

			while (!reader.isExhausted()) {
				const tag = Number(reader.getVarInt());
				const field = fieldsArray.find(f => f.id == tag >> 3);
				if (!field || !verifyType(tag, field.value[0])) break;

				const fieldType = field.value;

				const [success, value] = readValue(reader, fieldType);
				if (!success) break;

				if (fieldType[2]) {
					if (!message[field.name]) (message as any)[field.name] = [];
					(message[field.name] as any[]).push(value);
				} else {
					message[field.name] = value;
				}
			}

			return message;
		}
	];
}

export function parseProtobuf<T>(data: Uint8Array, type: PBValue<T>): T {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	return type[1](view);
}
```

## File: src/shaders/ncs-visualizer/blur.ts
```typescript
// https://developer.nvidia.com/gpugems/gpugems3/part-vi-gpu-computing/chapter-40-incremental-computation-gaussian
// https://github.com/mozilla/gecko-dev/blob/23808d46cde6155213b1230675b00a0a426f466e/gfx/wr/webrender/res/cs_blur.glsl#L140-L157

export const vertexShader = `#version 300 es

uniform float uBlurRadius;
uniform vec2 uBlurDirection;

in vec2 inPosition;

out vec2 fragUV;
flat out vec2 fragBlurDirection;
flat out int fragSupport;
flat out vec3 fragGaussCoefficients;

float calculateGaussianTotal(int support, vec3 fragGaussCoefficients) {
    float total = fragGaussCoefficients.x;
    for (int i = 1; i < support; i++) {
        fragGaussCoefficients.xy *= fragGaussCoefficients.yz;
        total += 2.0 * fragGaussCoefficients.x;
    }
    return total;
}

void main() {
    fragSupport = int(ceil(1.5 * uBlurRadius)) * 2;
    fragGaussCoefficients = vec3(1.0 / (sqrt(2.0 * 3.14159265) * uBlurRadius), exp(-0.5 / (uBlurRadius * uBlurRadius)), 0.0);
    fragGaussCoefficients.z = fragGaussCoefficients.y * fragGaussCoefficients.y;
    fragGaussCoefficients.x /= calculateGaussianTotal(fragSupport, fragGaussCoefficients);

    gl_Position = vec4(inPosition, 0.0, 1.0);
    fragUV = (inPosition + 1.0) / 2.0;
    fragBlurDirection = uBlurDirection;
}
`;
export const fragmentShader = `#version 300 es
precision highp float;

uniform sampler2D uInputTexture;

in vec2 fragUV;
flat in vec2 fragBlurDirection;
flat in int fragSupport;
flat in vec3 fragGaussCoefficients;

out float outColor;

void main() {
    vec3 gaussCoefficients = fragGaussCoefficients;
    outColor = gaussCoefficients.x * texture(uInputTexture, fragUV).r;

    for (int i = 1; i < fragSupport; i += 2) {
        gaussCoefficients.xy *= gaussCoefficients.yz;
        float coefficientSum = gaussCoefficients.x;
        gaussCoefficients.xy *= gaussCoefficients.yz;
        coefficientSum += gaussCoefficients.x;

        float pixelRatio = gaussCoefficients.x / coefficientSum;
        vec2 offset = (float(i) + pixelRatio) * fragBlurDirection;

        outColor += coefficientSum * (texture(uInputTexture, fragUV + offset).r + texture(uInputTexture, fragUV - offset).r);
    }
}
`;
```

## File: src/shaders/ncs-visualizer/dot.ts
```typescript
export const vertexShader = `#version 300 es

uniform int uDotCount;
uniform float uDotRadius;
uniform float uDotRadiusPX;

uniform sampler2D uParticleTexture;

in vec2 inPosition;

out vec2 fragUV;
out float fragDotRadiusPX;

void main() {
    ivec2 dotIndex = ivec2(gl_InstanceID % uDotCount, gl_InstanceID / uDotCount);
    vec2 dotCenter = texelFetch(uParticleTexture, dotIndex, 0).xy;

    gl_Position = vec4(dotCenter + inPosition * uDotRadius * (1.0 + 1.0 / uDotRadiusPX), 0.0, 1.0);
    fragUV = inPosition;
    fragDotRadiusPX = uDotRadiusPX + 1.0;
}
`;
export const fragmentShader = `#version 300 es
precision highp float;

in vec2 fragUV;
in float fragDotRadiusPX;
out float outColor;

void main() {
    float t = clamp((1.0 - length(fragUV)) * fragDotRadiusPX, 0.0, 1.0);
    outColor = t;
}
`;
```

## File: src/shaders/ncs-visualizer/finalize.ts
```typescript
export const vertexShader = `#version 300 es

uniform vec3 uOutputColor;
in vec2 inPosition;

out vec2 fragUV;
out vec3 fragOutputColor;

void main() {
    gl_Position = vec4(inPosition, 0.0, 1.0);
    fragUV = (inPosition + 1.0) / 2.0;
    fragOutputColor = uOutputColor;
}
`;
export const fragmentShader = `#version 300 es
precision highp float;

uniform sampler2D uBlurredTexture;
uniform sampler2D uOriginalTexture;

in vec2 fragUV;
in vec3 fragOutputColor;

out vec4 outColor;

void main() {
    float value = max(texture(uBlurredTexture, fragUV).r, texture(uOriginalTexture, fragUV).r);
    outColor = vec4(fragOutputColor * value, value);
}
`;
```

## File: src/shaders/ncs-visualizer/particle.ts
```typescript
export const vertexShader = `#version 300 es

in vec2 inPosition;
out vec2 fragUV;

void main() {
    gl_Position = vec4(inPosition, 0.0, 1.0);
    fragUV = (inPosition + 1.0) / 2.0;
}
`;
export const fragmentShader = `#version 300 es
precision highp float;

uniform float uNoiseOffset;
uniform float uAmplitude;
uniform int uSeed;

uniform float uDotSpacing;
uniform float uDotOffset;

uniform float uSphereRadius;
uniform float uFeather;

uniform float uNoiseFrequency;
uniform float uNoiseAmplitude;

in vec2 fragUV;
out vec2 outColor;

// https://github.com/Auburn/FastNoiseLite

const float FREQUENCY = 0.01;

const float GAIN = 0.5;
const float LACUNARITY = 1.5;
const float FRACTAL_BOUNDING = 1.0 / 1.75;

const ivec3 PRIMES = ivec3(501125321, 1136930381, 1720413743);

const float GRADIENTS_3D[] = float[](
    0., 1., 1., 0.,  0.,-1., 1., 0.,  0., 1.,-1., 0.,  0.,-1.,-1., 0.,
    1., 0., 1., 0., -1., 0., 1., 0.,  1., 0.,-1., 0., -1., 0.,-1., 0.,
    1., 1., 0., 0., -1., 1., 0., 0.,  1.,-1., 0., 0., -1.,-1., 0., 0.,
    0., 1., 1., 0.,  0.,-1., 1., 0.,  0., 1.,-1., 0.,  0.,-1.,-1., 0.,
    1., 0., 1., 0., -1., 0., 1., 0.,  1., 0.,-1., 0., -1., 0.,-1., 0.,
    1., 1., 0., 0., -1., 1., 0., 0.,  1.,-1., 0., 0., -1.,-1., 0., 0.,
    0., 1., 1., 0.,  0.,-1., 1., 0.,  0., 1.,-1., 0.,  0.,-1.,-1., 0.,
    1., 0., 1., 0., -1., 0., 1., 0.,  1., 0.,-1., 0., -1., 0.,-1., 0.,
    1., 1., 0., 0., -1., 1., 0., 0.,  1.,-1., 0., 0., -1.,-1., 0., 0.,
    0., 1., 1., 0.,  0.,-1., 1., 0.,  0., 1.,-1., 0.,  0.,-1.,-1., 0.,
    1., 0., 1., 0., -1., 0., 1., 0.,  1., 0.,-1., 0., -1., 0.,-1., 0.,
    1., 1., 0., 0., -1., 1., 0., 0.,  1.,-1., 0., 0., -1.,-1., 0., 0.,
    0., 1., 1., 0.,  0.,-1., 1., 0.,  0., 1.,-1., 0.,  0.,-1.,-1., 0.,
    1., 0., 1., 0., -1., 0., 1., 0.,  1., 0.,-1., 0., -1., 0.,-1., 0.,
    1., 1., 0., 0., -1., 1., 0., 0.,  1.,-1., 0., 0., -1.,-1., 0., 0.,
    1., 1., 0., 0.,  0.,-1., 1., 0., -1., 1., 0., 0.,  0.,-1.,-1., 0.
);

float smootherStep(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 smootherStep(vec3 coord) {
    return vec3(smootherStep(coord.x), smootherStep(coord.y), smootherStep(coord.z));
}

int hash(int seed, ivec3 primed) {
    return (seed ^ primed.x ^ primed.y ^ primed.z) * 0x27d4eb2d;
}

float gradCoord(int seed, ivec3 primed, vec3 d) {
    int hash = hash(seed, primed);
    hash ^= hash >> 15;
    hash &= 63 << 2;
    return d.x * GRADIENTS_3D[hash] + d.y * GRADIENTS_3D[hash | 1] + d.z * GRADIENTS_3D[hash | 2];
}

float perlinSingle(int seed, vec3 coord) {
    ivec3 coord0 = ivec3(floor(coord));
    vec3 d0 = coord - vec3(coord0);
    vec3 d1 = d0 - 1.0;
    vec3 s = smootherStep(d0);
    coord0 *= PRIMES;
    ivec3 coord1 = coord0 + PRIMES;
    float xf00 = mix(gradCoord(seed,                              coord0,                     d0), gradCoord(seed,          ivec3(coord1.x, coord0.yz),      vec3(d1.x, d0.yz)), s.x);
    float xf10 = mix(gradCoord(seed, ivec3(coord0.x, coord1.y, coord0.z), vec3(d0.x, d1.y, d0.z)), gradCoord(seed,          ivec3(coord1.xy, coord0.z),      vec3(d1.xy, d0.z)), s.x);
    float xf01 = mix(gradCoord(seed,          ivec3(coord0.xy, coord1.z),      vec3(d0.xy, d1.z)), gradCoord(seed, ivec3(coord1.x, coord0.y, coord1.z), vec3(d1.x, d0.y, d1.z)), s.x);
    float xf11 = mix(gradCoord(seed,          ivec3(coord0.x, coord1.yz),      vec3(d0.x, d1.yz)), gradCoord(seed,                              coord1,                     d1), s.x);
    float yf0 = mix(xf00, xf10, s.y);
    float yf1 = mix(xf01, xf11, s.y);
    return mix(yf0, yf1, s.z) * 0.964921414852142333984375f;
}

float fractalNoise(vec3 coord) {
    return perlinSingle(uSeed, coord) * FRACTAL_BOUNDING
        + perlinSingle(uSeed + 1, coord * LACUNARITY) * FRACTAL_BOUNDING * GAIN
        + perlinSingle(uSeed + 2, coord * LACUNARITY * LACUNARITY) * FRACTAL_BOUNDING * GAIN * GAIN;
}

void main() {
    float noise = fractalNoise(vec3(fragUV * uNoiseFrequency, uNoiseOffset)) * uNoiseAmplitude;
    vec3 dotCenter = vec3(fragUV * uDotSpacing + uDotOffset + noise, (noise + 0.5 * uNoiseAmplitude) * uAmplitude * 0.4);
    
    float distanceFromCenter = length(dotCenter);
    dotCenter /= distanceFromCenter;
    distanceFromCenter = min(uSphereRadius, distanceFromCenter);
    dotCenter *= distanceFromCenter;

    float featherRadius = uSphereRadius - uFeather;
    float featherStrength = 1.0 - clamp((distanceFromCenter - featherRadius) / uFeather, 0.0, 1.0);
    dotCenter *= featherStrength * (uSphereRadius / distanceFromCenter - 1.0) + 1.0;

    dotCenter.y *= -1.0;
    outColor = dotCenter.xy;
}
`;
```

## File: src/types/css-modules.d.ts
```typescript
declare module "*.module.css" {
	const classes: { [key: string]: string };
	export default classes;
}

declare module "*.module.scss" {
	const classes: { [key: string]: string };
	export default classes;
}
```

## File: src/types/fastnoise-lite.d.ts
```typescript
declare module "fastnoise-lite";

namespace FastNoise {
	enum NoiseType {
		OpenSimplex2,
		OpenSimplex2S,
		Cellular,
		Perlin,
		ValueCubic,
		Value
	}

	enum RotationType3D {
		None,
		ImproveXYPlanes,
		ImproveXZPlanes
	}

	enum FractalType {
		None,
		FBm,
		Ridged,
		PingPong,
		DomainWarpProgressive,
		DomainWarpIndependent
	}

	enum CellularDistanceFunction {
		Euclidean,
		EuclideanSq,
		Manhattan,
		Hybrid
	}

	enum CellularReturnType {
		CellValue,
		Distance,
		Distance2,
		Distance2Add,
		Distance2Sub,
		Distance2Mul,
		Distance2Div
	}

	enum DomainWarpType {
		OpenSimplex2,
		OpenSimplex2Reduced,
		BasicGrid
	}

	enum TransformType3D {
		None,
		ImproveXYPlanes,
		ImproveXZPlanes,
		DefaultOpenSimplex2
	}
}

class FastNoise {
	constructor(seed: number);

	SetSeed(seed: number): void;
	SetFrequency(frequency: number): void;
	SetNoiseType(noiseType: FastNoise.NoiseType): void;
	SetRotationType3D(rotationType3D: FastNoise.RotationType3D): void;
	SetFractalType(fractalType: FastNoise.FractalType): void;
	SetFractalOctaves(octaves: number): void;
	SetFractalLacunarity(lacunarity: number): void;
	SetFractalGain(gain: number): void;
	SetFractalWeightedStrength(weightedStrength: number): void;
	SetFractalPingPongStrength(pingPongStrength: number): void;
	SetCellularDistanceFunction(cellularDistanceFunction: FastNoise.CellularDistanceFunction): void;
	SetCellularReturnType(cellularReturnType: FastNoise.CellularReturnType): void;
	SetCellularJitter(cellularJitter: number): void;
	SetDomainWarpType(domainWarpType: FastNoise.DomainWarpType): void;
	SetDomainWarpAmp(domainWarpAmp: number): void;

	GetNoise(x: number, y: number, z?: number): number;
	DomainWrap(coord: Vector2 | Vector3): void;
}

class Vector2 {
	x: number;
	y: number;

	constructor(x: number, y: number);
}

class Vector3 {
	x: number;
	y: number;
	z: number;

	constructor(x: number, y: number, z: number);
}

export default FastNoise;
```

## File: src/types/spicetify.d.ts
```typescript
declare namespace Spicetify {
	type Icon =
		| "album"
		| "artist"
		| "block"
		| "brightness"
		| "car"
		| "chart-down"
		| "chart-up"
		| "check"
		| "check-alt-fill"
		| "chevron-left"
		| "chevron-right"
		| "chromecast-disconnected"
		| "clock"
		| "collaborative"
		| "computer"
		| "copy"
		| "download"
		| "downloaded"
		| "edit"
		| "enhance"
		| "exclamation-circle"
		| "external-link"
		| "facebook"
		| "follow"
		| "fullscreen"
		| "gamepad"
		| "grid-view"
		| "heart"
		| "heart-active"
		| "instagram"
		| "laptop"
		| "library"
		| "list-view"
		| "location"
		| "locked"
		| "locked-active"
		| "lyrics"
		| "menu"
		| "minimize"
		| "minus"
		| "more"
		| "new-spotify-connect"
		| "offline"
		| "pause"
		| "phone"
		| "play"
		| "playlist"
		| "playlist-folder"
		| "plus-alt"
		| "plus2px"
		| "podcasts"
		| "projector"
		| "queue"
		| "repeat"
		| "repeat-once"
		| "search"
		| "search-active"
		| "shuffle"
		| "skip-back"
		| "skip-back15"
		| "skip-forward"
		| "skip-forward15"
		| "soundbetter"
		| "speaker"
		| "spotify"
		| "subtitles"
		| "tablet"
		| "ticket"
		| "twitter"
		| "visualizer"
		| "voice"
		| "volume"
		| "volume-off"
		| "volume-one-wave"
		| "volume-two-wave"
		| "watch"
		| "x";
	type Variant =
		| "bass"
		| "forte"
		| "brio"
		| "altoBrio"
		| "alto"
		| "canon"
		| "celloCanon"
		| "cello"
		| "ballad"
		| "balladBold"
		| "viola"
		| "violaBold"
		| "mesto"
		| "mestoBold"
		| "metronome"
		| "finale"
		| "finaleBold"
		| "minuet"
		| "minuetBold";
	type SemanticColor =
		| "textBase"
		| "textSubdued"
		| "textBrightAccent"
		| "textNegative"
		| "textWarning"
		| "textPositive"
		| "textAnnouncement"
		| "essentialBase"
		| "essentialSubdued"
		| "essentialBrightAccent"
		| "essentialNegative"
		| "essentialWarning"
		| "essentialPositive"
		| "essentialAnnouncement"
		| "decorativeBase"
		| "decorativeSubdued"
		| "backgroundBase"
		| "backgroundHighlight"
		| "backgroundPress"
		| "backgroundElevatedBase"
		| "backgroundElevatedHighlight"
		| "backgroundElevatedPress"
		| "backgroundTintedBase"
		| "backgroundTintedHighlight"
		| "backgroundTintedPress"
		| "backgroundUnsafeForSmallTextBase"
		| "backgroundUnsafeForSmallTextHighlight"
		| "backgroundUnsafeForSmallTextPress";
	type ColorSet =
		| "base"
		| "brightAccent"
		| "negative"
		| "warning"
		| "positive"
		| "announcement"
		| "invertedDark"
		| "invertedLight"
		| "mutedAccent"
		| "overMedia";
	type ColorSetBackgroundColors = {
		base: string;
		highlight: string;
		press: string;
	};
	type ColorSetNamespaceColors = {
		announcement: string;
		base: string;
		brightAccent: string;
		negative: string;
		positive: string;
		subdued: string;
		warning: string;
	};
	type ColorSetBody = {
		background: ColorSetBackgroundColors & {
			elevated: ColorSetBackgroundColors;
			tinted: ColorSetBackgroundColors;
			unsafeForSmallText: ColorSetBackgroundColors;
		};
		decorative: {
			base: string;
			subdued: string;
		};
		essential: ColorSetNamespaceColors;
		text: ColorSetNamespaceColors;
	};
	type Metadata = Partial<Record<string, string>>;
	type ContextTrack = {
		uri: string;
		uid?: string;
		metadata?: Metadata;
	};
	type PlayerState = {
		timestamp: number;
		context: PlayerContext;
		index: PlayerIndex;
		item: PlayerTrack;
		shuffle: boolean;
		repeat: number;
		speed: number;
		positionAsOfTimestamp: number;
		duration: number;
		hasContext: boolean;
		isPaused: boolean;
		isBuffering: boolean;
		restrictions: Restrictions;
		previousItems?: PlayerTrack[];
		nextItems?: PlayerTrack[];
		playbackQuality: PlaybackQuality;
		playbackId: string;
		sessionId: string;
		signals?: any[];
	};
	type PlayerContext = {
		uri: string;
		url: string;
		metadata: {
			"player.arch": string;
		};
	};
	type PlayerIndex = {
		pageURI?: string | null;
		pageIndex: number;
		itemIndex: number;
	};
	type PlayerTrack = {
		type: string;
		uri: string;
		uid: string;
		name: string;
		mediaType: string;
		duration: {
			milliseconds: number;
		};
		album: Album;
		artists?: ArtistsEntity[];
		isLocal: boolean;
		isExplicit: boolean;
		is19PlusOnly: boolean;
		provider: string;
		metadata: TrackMetadata;
		images?: ImagesEntity[];
	};
	type TrackMetadata = {
		artist_uri: string;
		entity_uri: string;
		iteration: string;
		title: string;
		"collection.is_banned": string;
		"artist_uri:1": string;
		"collection.in_collection": string;
		image_small_url: string;
		"collection.can_ban": string;
		is_explicit: string;
		album_disc_number: string;
		album_disc_count: string;
		track_player: string;
		album_title: string;
		"collection.can_add": string;
		image_large_url: string;
		"actions.skipping_prev_past_track": string;
		page_instance_id: string;
		image_xlarge_url: string;
		marked_for_download: string;
		"actions.skipping_next_past_track": string;
		context_uri: string;
		"artist_name:1": string;
		has_lyrics: string;
		interaction_id: string;
		image_url: string;
		album_uri: string;
		album_artist_name: string;
		album_track_number: string;
		artist_name: string;
		duration: string;
		album_track_count: string;
		popularity: string;
	};
	type Album = {
		type: string;
		uri: string;
		name: string;
		images?: ImagesEntity[];
	};
	type ImagesEntity = {
		url: string;
		label: string;
	};
	type ArtistsEntity = {
		type: string;
		uri: string;
		name: string;
	};
	type Restrictions = {
		canPause: boolean;
		canResume: boolean;
		canSeek: boolean;
		canSkipPrevious: boolean;
		canSkipNext: boolean;
		canToggleRepeatContext: boolean;
		canToggleRepeatTrack: boolean;
		canToggleShuffle: boolean;
		disallowPausingReasons?: string[];
		disallowResumingReasons?: string[];
		disallowSeekingReasons?: string[];
		disallowSkippingPreviousReasons?: string[];
		disallowSkippingNextReasons?: string[];
		disallowTogglingRepeatContextReasons?: string[];
		disallowTogglingRepeatTrackReasons?: string[];
		disallowTogglingShuffleReasons?: string[];
		disallowTransferringPlaybackReasons?: string[];
	};
	type PlaybackQuality = {
		bitrateLevel: number;
		strategy: number;
		targetBitrateLevel: number;
		targetBitrateAvailable: boolean;
		hifiStatus: number;
	};
	namespace Player {
		/**
		 * Register a listener `type` on Spicetify.Player.
		 *
		 * On default, `Spicetify.Player` always dispatch:
		 *  - `songchange` type when player changes track.
		 *  - `onplaypause` type when player plays or pauses.
		 *  - `onprogress` type when track progress changes.
		 *  - `appchange` type when user changes page.
		 */
		function addEventListener(type: string, callback: (event?: Event) => void): void;
		function addEventListener(type: "songchange", callback: (event?: Event & { data: PlayerState }) => void): void;
		function addEventListener(type: "onplaypause", callback: (event?: Event & { data: PlayerState }) => void): void;
		function addEventListener(type: "onprogress", callback: (event?: Event & { data: number }) => void): void;
		function addEventListener(
			type: "appchange",
			callback: (
				event?: Event & {
					data: {
						/**
						 * App href path
						 */
						path: string;
						/**
						 * App container
						 */
						container: HTMLElement;
					};
				}
			) => void
		): void;
		/**
		 * Skip to previous track.
		 */
		function back(): void;
		/**
		 * An object contains all information about current track and player.
		 */
		const data: PlayerState;
		/**
		 * Decrease a small amount of volume.
		 */
		function decreaseVolume(): void;
		/**
		 * Dispatches an event at `Spicetify.Player`.
		 *
		 * On default, `Spicetify.Player` always dispatch
		 *  - `songchange` type when player changes track.
		 *  - `onplaypause` type when player plays or pauses.
		 *  - `onprogress` type when track progress changes.
		 *  - `appchange` type when user changes page.
		 */
		function dispatchEvent(event: Event): void;
		const eventListeners: {
			[key: string]: Array<(event?: Event) => void>;
		};
		/**
		 * Convert milisecond to `mm:ss` format
		 * @param milisecond
		 */
		function formatTime(milisecond: number): string;
		/**
		 * Return song total duration in milisecond.
		 */
		function getDuration(): number;
		/**
		 * Return mute state
		 */
		function getMute(): boolean;
		/**
		 * Return elapsed duration in milisecond.
		 */
		function getProgress(): number;
		/**
		 * Return elapsed duration in percentage (0 to 1).
		 */
		function getProgressPercent(): number;
		/**
		 * Return current Repeat state (No repeat = 0/Repeat all = 1/Repeat one = 2).
		 */
		function getRepeat(): number;
		/**
		 * Return current shuffle state.
		 */
		function getShuffle(): boolean;
		/**
		 * Return track heart state.
		 */
		function getHeart(): boolean;
		/**
		 * Return current volume level (0 to 1).
		 */
		function getVolume(): number;
		/**
		 * Increase a small amount of volume.
		 */
		function increaseVolume(): void;
		/**
		 * Return a boolean whether player is playing.
		 */
		function isPlaying(): boolean;
		/**
		 * Skip to next track.
		 */
		function next(): void;
		/**
		 * Pause track.
		 */
		function pause(): void;
		/**
		 * Resume track.
		 */
		function play(): void;
		/**
		 * Play a track, playlist, album, etc. immediately
		 * @param uri Spotify URI
		 * @param context
		 * @param options
		 */
		function playUri(uri: string, context?: any, options?: any): Promise<void>;
		/**
		 * Unregister added event listener `type`.
		 * @param type
		 * @param callback
		 */
		function removeEventListener(type: string, callback: (event?: Event) => void): void;
		/**
		 * Seek track to position.
		 * @param position can be in percentage (0 to 1) or in milisecond.
		 */
		function seek(position: number): void;
		/**
		 * Turn mute on/off
		 * @param state
		 */
		function setMute(state: boolean): void;
		/**
		 * Change Repeat mode
		 * @param mode `0` No repeat. `1` Repeat all. `2` Repeat one track.
		 */
		function setRepeat(mode: number): void;
		/**
		 * Turn shuffle on/off.
		 * @param state
		 */
		function setShuffle(state: boolean): void;
		/**
		 * Set volume level
		 * @param level 0 to 1
		 */
		function setVolume(level: number): void;
		/**
		 * Seek to previous `amount` of milisecond
		 * @param amount in milisecond. Default: 15000.
		 */
		function skipBack(amount?: number): void;
		/**
		 * Seek to next  `amount` of milisecond
		 * @param amount in milisecond. Default: 15000.
		 */
		function skipForward(amount?: number): void;
		/**
		 * Toggle Heart (Favourite) track state.
		 */
		function toggleHeart(): void;
		/**
		 * Toggle Mute/No mute.
		 */
		function toggleMute(): void;
		/**
		 * Toggle Play/Pause.
		 */
		function togglePlay(): void;
		/**
		 * Toggle No repeat/Repeat all/Repeat one.
		 */
		function toggleRepeat(): void;
		/**
		 * Toggle Shuffle/No shuffle.
		 */
		function toggleShuffle(): void;
	}
	/**
	 * Adds a track or array of tracks to prioritized queue.
	 */
	function addToQueue(uri: ContextTrack[]): Promise<void>;
	/**
	 * @deprecated
	 */
	const BridgeAPI: any;
	/**
	 * @deprecated
	 */
	const CosmosAPI: any;
	/**
	 * Async wrappers of CosmosAPI
	 */
	namespace CosmosAsync {
		type Method = "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT" | "SUB";
		interface Error {
			code: number;
			error: string;
			message: string;
			stack?: string;
		}

		type Headers = Record<string, string>;
		type Body = Record<string, any>;

		interface Response {
			body: any;
			headers: Headers;
			status: number;
			uri?: string;
		}

		function head(url: string, headers?: Headers): Promise<Headers>;
		function get(url: string, body?: Body, headers?: Headers): Promise<Response["body"]>;
		function post(url: string, body?: Body, headers?: Headers): Promise<Response["body"]>;
		function put(url: string, body?: Body, headers?: Headers): Promise<Response["body"]>;
		function del(url: string, body?: Body, headers?: Headers): Promise<Response["body"]>;
		function patch(url: string, body?: Body, headers?: Headers): Promise<Response["body"]>;
		function sub(
			url: string,
			callback: (b: Response["body"]) => void,
			onError?: (e: Error) => void,
			body?: Body,
			headers?: Headers
		): Promise<Response["body"]>;
		function postSub(
			url: string,
			body: Body | null,
			callback: (b: Response["body"]) => void,
			onError?: (e: Error) => void
		): Promise<Response["body"]>;
		function request(method: Method, url: string, body?: Body, headers?: Headers): Promise<Response>;
		function resolve(method: Method, url: string, body?: Body, headers?: Headers): Promise<Response>;
	}
	/**
	 * Fetch interesting colors from URI.
	 * @param uri Any type of URI that has artwork (playlist, track, album, artist, show, ...)
	 */
	function colorExtractor(uri: string): Promise<{
		DESATURATED: string;
		LIGHT_VIBRANT: string;
		PROMINENT: string;
		VIBRANT: string;
		VIBRANT_NON_ALARMING: string;
	}>;
	/**
	 * @deprecated
	 */
	function getAblumArtColors(): any;
	/**
	 * Fetch track analyzed audio data.
	 * Beware, not all tracks have audio data.
	 * @param uri is optional. Leave it blank to get current track
	 * or specify another track uri.
	 */
	function getAudioData(uri?: string): Promise<any>;
	/**
	 * Set of APIs method to register, deregister hotkeys/shortcuts
	 */
	namespace Keyboard {
		type ValidKey =
			| "BACKSPACE"
			| "TAB"
			| "ENTER"
			| "SHIFT"
			| "CTRL"
			| "ALT"
			| "CAPS"
			| "ESCAPE"
			| "SPACE"
			| "PAGE_UP"
			| "PAGE_DOWN"
			| "END"
			| "HOME"
			| "ARROW_LEFT"
			| "ARROW_UP"
			| "ARROW_RIGHT"
			| "ARROW_DOWN"
			| "INSERT"
			| "DELETE"
			| "A"
			| "B"
			| "C"
			| "D"
			| "E"
			| "F"
			| "G"
			| "H"
			| "I"
			| "J"
			| "K"
			| "L"
			| "M"
			| "N"
			| "O"
			| "P"
			| "Q"
			| "R"
			| "S"
			| "T"
			| "U"
			| "V"
			| "W"
			| "X"
			| "Y"
			| "Z"
			| "WINDOW_LEFT"
			| "WINDOW_RIGHT"
			| "SELECT"
			| "NUMPAD_0"
			| "NUMPAD_1"
			| "NUMPAD_2"
			| "NUMPAD_3"
			| "NUMPAD_4"
			| "NUMPAD_5"
			| "NUMPAD_6"
			| "NUMPAD_7"
			| "NUMPAD_8"
			| "NUMPAD_9"
			| "MULTIPLY"
			| "ADD"
			| "SUBTRACT"
			| "DECIMAL_POINT"
			| "DIVIDE"
			| "F1"
			| "F2"
			| "F3"
			| "F4"
			| "F5"
			| "F6"
			| "F7"
			| "F8"
			| "F9"
			| "F10"
			| "F11"
			| "F12"
			| ";"
			| "="
			| " | "
			| "-"
			| "."
			| "/"
			| "`"
			| "["
			| "\\"
			| "]"
			| '"'
			| "~"
			| "!"
			| "@"
			| "#"
			| "$"
			| "%"
			| "^"
			| "&"
			| "*"
			| "("
			| ")"
			| "_"
			| "+"
			| ":"
			| "<"
			| ">"
			| "?"
			| "|";
		type KeysDefine =
			| string
			| {
					key: string;
					ctrl?: boolean;
					shift?: boolean;
					alt?: boolean;
					meta?: boolean;
			  };
		const KEYS: Record<ValidKey, string>;
		function registerShortcut(keys: KeysDefine, callback: (event: KeyboardEvent) => void): void;
		function registerIsolatedShortcut(keys: KeysDefine, callback: (event: KeyboardEvent) => void): void;
		function registerImportantShortcut(keys: KeysDefine, callback: (event: KeyboardEvent) => void): void;
		function _deregisterShortcut(keys: KeysDefine): void;
		function deregisterImportantShortcut(keys: KeysDefine): void;
		function changeShortcut(keys: KeysDefine, newKeys: KeysDefine): void;
	}

	/**
	 * @deprecated
	 */
	const LiveAPI: any;

	namespace LocalStorage {
		/**
		 * Empties the list associated with the object of all key/value pairs, if there are any.
		 */
		function clear(): void;
		/**
		 * Get key value
		 */
		function get(key: string): string | null;
		/**
		 * Delete key
		 */
		function remove(key: string): void;
		/**
		 * Set new value for key
		 */
		function set(key: string, value: string): void;
	}
	/**
	 * To create and prepend custom menu item in profile menu.
	 */
	namespace Menu {
		/**
		 * Create a single toggle.
		 */
		class Item {
			constructor(name: string, isEnabled: boolean, onClick: (self: Item) => void, icon?: Icon | string);
			name: string;
			isEnabled: boolean;
			/**
			 * Change item name
			 */
			setName(name: string): void;
			/**
			 * Change item enabled state.
			 * Visually, item would has a tick next to it if its state is enabled.
			 */
			setState(isEnabled: boolean): void;
			/**
			 * Change icon
			 */
			setIcon(icon: Icon | string): void;
			/**
			 * Item is only available in Profile menu when method "register" is called.
			 */
			register(): void;
			/**
			 * Stop item to be prepended into Profile menu.
			 */
			deregister(): void;
		}

		/**
		 * Create a sub menu to contain Item toggles.
		 * `Item`s in `subItems` array shouldn't be registered.
		 */
		class SubMenu {
			constructor(name: string, subItems: Item[]);
			name: string;
			/**
			 * Change SubMenu name
			 */
			setName(name: string): void;
			/**
			 * Add an item to sub items list
			 */
			addItem(item: Item);
			/**
			 * Remove an item from sub items list
			 */
			removeItem(item: Item);
			/**
			 * SubMenu is only available in Profile menu when method "register" is called.
			 */
			register(): void;
			/**
			 * Stop SubMenu to be prepended into Profile menu.
			 */
			deregister(): void;
		}
	}

	/**
	 * Keyboard shortcut library
	 *
	 * Documentation: https://craig.is/killing/mice v1.6.5
	 *
	 * Spicetify.Keyboard is wrapper of this library to be compatible with legacy Spotify,
	 * so new extension should use this library instead.
	 */
	function Mousetrap(element?: any): void;

	/**
	 * Contains vast array of internal APIs.
	 * Please explore in Devtool Console.
	 */
	const Platform: any;
	/**
	 * Queue object contains list of queuing tracks,
	 * history of played tracks and current track metadata.
	 */
	const Queue: {
		nextTracks: any[];
		prevTracks: any[];
		queueRevision: string;
		track: any;
	};
	/**
	 * Remove a track or array of tracks from current queue.
	 */
	function removeFromQueue(uri: ContextTrack[]): Promise<void>;
	/**
	 * Display a bubble of notification. Useful for a visual feedback.
	 * @param message Message to display. Can use inline HTML for styling.
	 * @param isError If true, bubble will be red. Defaults to false.
	 * @param msTimeout Time in milliseconds to display the bubble. Defaults to Spotify's value.
	 */
	function showNotification(message: React.ReactNode, isError?: boolean, msTimeout?: number): void;
	/**
	 * Set of APIs method to parse and validate URIs.
	 */
	class URI {
		constructor(type: string, props: any);
		public type: string;
		public hasBase62Id: boolean;

		public id?: string;
		public disc?: any;
		public args?: any;
		public category?: string;
		public username?: string;
		public track?: string;
		public artist?: string;
		public album?: string;
		public duration?: number;
		public query?: string;
		public country?: string;
		public global?: boolean;
		public context?: string | typeof URI | null;
		public anchor?: string;
		public play?: any;
		public toplist?: any;

		/**
		 *
		 * @return The URI representation of this uri.
		 */
		toURI(): string;

		/**
		 *
		 * @return The URI representation of this uri.
		 */
		toString(): string;

		/**
		 * Get the URL path of this uri.
		 *
		 * @param opt_leadingSlash True if a leading slash should be prepended.
		 * @return The path of this uri.
		 */
		toURLPath(opt_leadingSlash: boolean): string;

		/**
		 *
		 * @param origin The origin to use for the URL.
		 * @return The URL string for the uri.
		 */
		toURL(origin?: string): string;

		/**
		 * Clones a given SpotifyURI instance.
		 *
		 * @return An instance of URI.
		 */
		clone(): URI | null;

		/**
		 * Gets the path of the URI object by removing all hash and query parameters.
		 *
		 * @return The path of the URI object.
		 */
		getPath(): string;

		/**
		 * The various URI Types.
		 *
		 * Note that some of the types in this enum are not real URI types, but are
		 * actually URI particles. They are marked so.
		 *
		 */
		static Type: {
			AD: string;
			ALBUM: string;
			GENRE: string;
			QUEUE: string;
			APPLICATION: string;
			ARTIST: string;
			ARTIST_TOPLIST: string;
			ARTIST_CONCERTS: string;
			AUDIO_FILE: string;
			COLLECTION: string;
			COLLECTION_ALBUM: string;
			COLLECTION_ARTIST: string;
			COLLECTION_MISSING_ALBUM: string;
			COLLECTION_TRACK_LIST: string;
			CONCERT: string;
			CONTEXT_GROUP: string;
			DAILY_MIX: string;
			EMPTY: string;
			EPISODE: string;
			/** URI particle; not an actual URI. */
			FACEBOOK: string;
			FOLDER: string;
			FOLLOWERS: string;
			FOLLOWING: string;
			IMAGE: string;
			INBOX: string;
			INTERRUPTION: string;
			LIBRARY: string;
			LIVE: string;
			ROOM: string;
			EXPRESSION: string;
			LOCAL: string;
			LOCAL_TRACK: string;
			LOCAL_ALBUM: string;
			LOCAL_ARTIST: string;
			MERCH: string;
			MOSAIC: string;
			PLAYLIST: string;
			PLAYLIST_V2: string;
			PRERELEASE: string;
			PROFILE: string;
			PUBLISHED_ROOTLIST: string;
			RADIO: string;
			ROOTLIST: string;
			SEARCH: string;
			SHOW: string;
			SOCIAL_SESSION: string;
			SPECIAL: string;
			STARRED: string;
			STATION: string;
			TEMP_PLAYLIST: string;
			TOPLIST: string;
			TRACK: string;
			TRACKSET: string;
			USER_TOPLIST: string;
			USER_TOP_TRACKS: string;
			UNKNOWN: string;
			MEDIA: string;
			QUESTION: string;
			POLL: string;
		};

		/**
		 * Creates a new URI object from a parsed string argument.
		 *
		 * @param str The string that will be parsed into a URI object.
		 * @throws TypeError If the string argument is not a valid URI, a TypeError will
		 *     be thrown.
		 * @return The parsed URI object.
		 */
		static fromString(str: string): URI;

		/**
		 * Parses a given object into a URI instance.
		 *
		 * Unlike URI.fromString, this function could receive any kind of value. If
		 * the value is already a URI instance, it is simply returned.
		 * Otherwise the value will be stringified before parsing.
		 *
		 * This function also does not throw an error like URI.fromString, but
		 * instead simply returns null if it can't parse the value.
		 *
		 * @param value The value to parse.
		 * @return The corresponding URI instance, or null if the
		 *     passed value is not a valid value.
		 */
		static from(value: any): URI | null;

		/**
		 * Checks whether two URI:s refer to the same thing even though they might
		 * not necessarily be equal.
		 *
		 * These two Playlist URIs, for example, refer to the same playlist:
		 *
		 *   spotify:user:napstersean:playlist:3vxotOnOGDlZXyzJPLFnm2
		 *   spotify:playlist:3vxotOnOGDlZXyzJPLFnm2
		 *
		 * @param baseUri The first URI to compare.
		 * @param refUri The second URI to compare.
		 * @return Whether they shared idenitity
		 */
		static isSameIdentity(baseUri: URI | string, refUri: URI | string): boolean;

		/**
		 * Returns the hex representation of a Base62 encoded id.
		 *
		 * @param id The base62 encoded id.
		 * @return The hex representation of the base62 id.
		 */
		static idToHex(id: string): string;

		/**
		 * Returns the base62 representation of a hex encoded id.
		 *
		 * @param hex The hex encoded id.
		 * @return The base62 representation of the id.
		 */
		static hexToId(hex: string): string;

		/**
		 * Creates a new 'album' type URI.
		 *
		 * @param id The id of the album.
		 * @param disc The disc number of the album.
		 * @return The album URI.
		 */
		static albumURI(id: string, disc: number): URI;

		/**
		 * Creates a new 'application' type URI.
		 *
		 * @param id The id of the application.
		 * @param args An array containing the arguments to the app.
		 * @return The application URI.
		 */
		static applicationURI(id: string, args: string[]): URI;

		/**
		 * Creates a new 'artist' type URI.
		 *
		 * @param id The id of the artist.
		 * @return The artist URI.
		 */
		static artistURI(id: string): URI;

		/**
		 * Creates a new 'collection' type URI.
		 *
		 * @param username The non-canonical username of the rootlist owner.
		 * @param category The category of the collection.
		 * @return The collection URI.
		 */
		static collectionURI(username: string, category: string): URI;

		/**
		 * Creates a new 'collection-album' type URI.
		 *
		 * @param username The non-canonical username of the rootlist owner.
		 * @param id The id of the album.
		 * @return The collection album URI.
		 */
		static collectionAlbumURI(username: string, id: string): URI;

		/**
		 * Creates a new 'collection-artist' type URI.
		 *
		 * @param username The non-canonical username of the rootlist owner.
		 * @param id The id of the artist.
		 * @return The collection artist URI.
		 */
		static collectionAlbumURI(username: string, id: string): URI;

		/**
		 * Creates a new 'concert' type URI.
		 *
		 * @param id The id of the concert.
		 * @return The concert URI.
		 */
		static concertURI(id: string): URI;

		/**
		 * Creates a new 'episode' type URI.
		 *
		 * @param id The id of the episode.
		 * @return The episode URI.
		 */
		static episodeURI(id: string): URI;

		/**
		 * Creates a new 'folder' type URI.
		 *
		 * @param id The id of the folder.
		 * @return The folder URI.
		 */
		static folderURI(id: string): URI;

		/**
		 * Creates a new 'local-album' type URI.
		 *
		 * @param artist The artist of the album.
		 * @param album The name of the album.
		 * @return The local album URI.
		 */
		static localAlbumURI(artist: string, album: string): URI;

		/**
		 * Creates a new 'local-artist' type URI.
		 *
		 * @param artist The name of the artist.
		 * @return The local artist URI.
		 */
		static localArtistURI(artist: string): URI;

		/**
		 * Creates a new 'playlist-v2' type URI.
		 *
		 * @param id The id of the playlist.
		 * @return The playlist URI.
		 */
		static playlistV2URI(id: string): URI;

		/**
		 * Creates a new 'prerelease' type URI.
		 *
		 * @param id The id of the prerelease.
		 * @return The prerelease URI.
		 */
		static prereleaseURI(id: string): URI;

		/**
		 * Creates a new 'profile' type URI.
		 *
		 * @param username The non-canonical username of the rootlist owner.
		 * @param args A list of arguments.
		 * @return The profile URI.
		 */
		static profileURI(username: string, args: string[]): URI;

		/**
		 * Creates a new 'search' type URI.
		 *
		 * @param query The unencoded search query.
		 * @return The search URI
		 */
		static searchURI(query: string): URI;

		/**
		 * Creates a new 'show' type URI.
		 *
		 * @param id The id of the show.
		 * @return The show URI.
		 */
		static showURI(id: string): URI;

		/**
		 * Creates a new 'station' type URI.
		 *
		 * @param args An array of arguments for the station.
		 * @return The station URI.
		 */
		static stationURI(args: string[]): URI;

		/**
		 * Creates a new 'track' type URI.
		 *
		 * @param id The id of the track.
		 * @param anchor The point in the track formatted as mm:ss
		 * @param context An optional context URI
		 * @param play Toggles autoplay
		 * @return The track URI.
		 */
		static trackURI(id: string, anchor: string, context?: string, play?: boolean): URI;

		/**
		 * Creates a new 'user-toplist' type URI.
		 *
		 * @param username The non-canonical username of the toplist owner.
		 * @param toplist The toplist type.
		 * @return The user-toplist URI.
		 */
		static userToplistURI(username: string, toplist: string): URI;

		static isAd(uri: URI | string): boolean;
		static isAlbum(uri: URI | string): boolean;
		static isGenre(uri: URI | string): boolean;
		static isQueue(uri: URI | string): boolean;
		static isApplication(uri: URI | string): boolean;
		static isArtist(uri: URI | string): boolean;
		static isArtistToplist(uri: URI | string): boolean;
		static isArtistConcerts(uri: URI | string): boolean;
		static isAudioFile(uri: URI | string): boolean;
		static isCollection(uri: URI | string): boolean;
		static isCollectionAlbum(uri: URI | string): boolean;
		static isCollectionArtist(uri: URI | string): boolean;
		static isCollectionMissingAlbum(uri: URI | string): boolean;
		static isCollectionTrackList(uri: URI | string): boolean;
		static isConcert(uri: URI | string): boolean;
		static isContextGroup(uri: URI | string): boolean;
		static isDailyMix(uri: URI | string): boolean;
		static isEmpty(uri: URI | string): boolean;
		static isEpisode(uri: URI | string): boolean;
		static isFacebook(uri: URI | string): boolean;
		static isFolder(uri: URI | string): boolean;
		static isFollowers(uri: URI | string): boolean;
		static isFollowing(uri: URI | string): boolean;
		static isImage(uri: URI | string): boolean;
		static isInbox(uri: URI | string): boolean;
		static isInterruption(uri: URI | string): boolean;
		static isLibrary(uri: URI | string): boolean;
		static isLive(uri: URI | string): boolean;
		static isRoom(uri: URI | string): boolean;
		static isExpression(uri: URI | string): boolean;
		static isLocal(uri: URI | string): boolean;
		static isLocalTrack(uri: URI | string): boolean;
		static isLocalAlbum(uri: URI | string): boolean;
		static isLocalArtist(uri: URI | string): boolean;
		static isMerch(uri: URI | string): boolean;
		static isMosaic(uri: URI | string): boolean;
		static isPlaylist(uri: URI | string): boolean;
		static isPlaylistV2(uri: URI | string): boolean;
		static isPrerelease(uri: URI | string): boolean;
		static isProfile(uri: URI | string): boolean;
		static isPublishedRootlist(uri: URI | string): boolean;
		static isRadio(uri: URI | string): boolean;
		static isRootlist(uri: URI | string): boolean;
		static isSearch(uri: URI | string): boolean;
		static isShow(uri: URI | string): boolean;
		static isSocialSession(uri: URI | string): boolean;
		static isSpecial(uri: URI | string): boolean;
		static isStarred(uri: URI | string): boolean;
		static isStation(uri: URI | string): boolean;
		static isTempPlaylist(uri: URI | string): boolean;
		static isToplist(uri: URI | string): boolean;
		static isTrack(uri: URI | string): boolean;
		static isTrackset(uri: URI | string): boolean;
		static isUserToplist(uri: URI | string): boolean;
		static isUserTopTracks(uri: URI | string): boolean;
		static isUnknown(uri: URI | string): boolean;
		static isMedia(uri: URI | string): boolean;
		static isQuestion(uri: URI | string): boolean;
		static isPoll(uri: URI | string): boolean;
		static isPlaylistV1OrV2(uri: URI | string): boolean;
	}

	/**
	 * Create custom menu item and prepend to right click context menu
	 */
	namespace ContextMenu {
		type OnClickCallback = (uris: string[], uids?: string[], contextUri?: string) => void;
		type ShouldAddCallback = (uris: string[], uids?: string[], contextUri?: string) => boolean;

		// Single context menu item
		class Item {
			/**
			 * List of valid icons to use.
			 */
			static readonly iconList: Icon[];
			constructor(name: string, onClick: OnClickCallback, shouldAdd?: ShouldAddCallback, icon?: Icon, disabled?: boolean);
			name: string;
			icon: Icon | string;
			disabled: boolean;
			/**
			 * A function returning boolean determines whether item should be prepended.
			 */
			shouldAdd: ShouldAddCallback;
			/**
			 * A function to call when item is clicked
			 */
			onClick: OnClickCallback;
			/**
			 * Item is only available in Context Menu when method "register" is called.
			 */
			register: () => void;
			/**
			 * Stop Item to be prepended into Context Menu.
			 */
			deregister: () => void;
		}

		/**
		 * Create a sub menu to contain `Item`s.
		 * `Item`s in `subItems` array shouldn't be registered.
		 */
		class SubMenu {
			constructor(name: string, subItems: Iterable<Item>, shouldAdd?: ShouldAddCallback, disabled?: boolean);
			name: string;
			disabled: boolean;
			/**
			 * A function returning boolean determines whether item should be prepended.
			 */
			shouldAdd: ShouldAddCallback;
			addItem: (item: Item) => void;
			removeItem: (item: Item) => void;
			/**
			 * SubMenu is only available in Context Menu when method "register" is called.
			 */
			register: () => void;
			/**
			 * Stop SubMenu to be prepended into Context Menu.
			 */
			deregister: () => void;
		}
	}

	/**
	 * Popup Modal
	 */
	namespace PopupModal {
		interface Content {
			title: string;
			/**
			 * You can specify a string for simple text display
			 * or a HTML element for interactive config/setting menu
			 */
			content: string | Element;
			/**
			 * Bigger window
			 */
			isLarge?: boolean;
		}

		function display(e: Content): void;
		function hide(): void;
	}

	/** React instance to create components */
	const React: any;
	/** React DOM instance to render and mount components */
	const ReactDOM: any;
	/** React DOM Server instance to render components to string */
	const ReactDOMServer: any;

	/** Stock React components exposed from Spotify library */
	namespace ReactComponent {
		type ContextMenuProps = {
			/**
			 * Decide whether to use the global singleton context menu (rendered in <body>)
			 * or a new inline context menu (rendered in a sibling
			 * element to `children`)
			 */
			renderInline?: boolean;
			/**
			 * Determins what will trigger the context menu. For example, a click, or a right-click
			 */
			trigger?: "click" | "right-click";
			/**
			 * Determins is the context menu should open or toggle when triggered
			 */
			action?: "toggle" | "open";
			/**
			 * The preferred placement of the context menu when it opens.
			 * Relative to trigger element.
			 */
			placement?:
				| "top"
				| "top-start"
				| "top-end"
				| "right"
				| "right-start"
				| "right-end"
				| "bottom"
				| "bottom-start"
				| "bottom-end"
				| "left"
				| "left-start"
				| "left-end";
			/**
			 * The x and y offset distances at which the context menu should open.
			 * Relative to trigger element and `position`.
			 */
			offset?: [number, number];
			/**
			 * Will stop the client from scrolling while the context menu is open
			 */
			preventScrollingWhileOpen?: boolean;
			/**
			 * The menu UI to render inside of the context menu.
			 */
			menu:
				| typeof Spicetify.ReactComponent.Menu
				| typeof Spicetify.ReactComponent.AlbumMenu
				| typeof Spicetify.ReactComponent.PodcastShowMenu
				| typeof Spicetify.ReactComponent.ArtistMenu
				| typeof Spicetify.ReactComponent.PlaylistMenu;
			/**
			 * A child of the context menu. Should be `<button>`, `<a>`,
			 * a custom react component that forwards a ref to a `<button>` or `<a>`,
			 * or a function. If a function is passed it will be called with
			 * (`isOpen`, `handleContextMenu`, `ref`) as arguments.
			 */
			children:
				| Element
				| ((isOpen?: boolean, handleContextMenu?: (e: MouseEvent) => void, ref?: (e: Element) => void) => Element);
		};
		type MenuProps = {
			/**
			 * Function that is called when the menu is closed
			 */
			onClose?: () => void;
			/**
			 * Function that provides the element that focus should jump to when the menu
			 * is opened
			 */
			getInitialFocusElement?: (el: HTMLElement | null) => HTMLElement | undefined | null;
		};
		type MenuItemProps = {
			/**
			 * Function that runs when `MenuItem` is clicked
			 */
			onClick?: React.MouseEventHandler<HTMLButtonElement>;
			/**
			 * Indicates if `MenuItem` is disabled. Disabled items will not cause
			 * the `Menu` to close when clicked.
			 */
			disabled?: boolean;
			/**
			 * Indicate that a divider line should be added `before` or `after` this `MenuItem`
			 */
			divider?: "before" | "after" | "both";
			/**
			 * React component icon that will be rendered at the end of the `MenuItem`
			 * @deprecated Since Spotify `1.2.8`. Use `leadingIcon` or `trailingIcon` instead
			 */
			icon?: React.ReactNode;
			/**
			 * React component icon that will be rendered at the start of the `MenuItem`
			 * @since Spotify `1.2.8`
			 */
			leadingIcon?: React.ReactNode;
			/**
			 * React component icon that will be rendered at the end of the `MenuItem`
			 * @since Spotify `1.2.8`
			 */
			trailingIcon?: React.ReactNode;
		};
		type TooltipProps = {
			/**
			 * Label to display in the tooltip
			 */
			label: string;
			/**
			 * The child element that the tooltip will be attached to
			 * and will display when hovered over
			 */
			children: React.ReactNode;
			/**
			 * Decide whether to use the global singleton tooltip (rendered in `<body>`)
			 * or a new inline tooltip (rendered in a sibling
			 * element to `children`)
			 */
			renderInline?: boolean;
			/**
			 * Delay in milliseconds before the tooltip is displayed
			 * after the user hovers over the child element
			 */
			showDelay?: number;
			/**
			 * Determine whether the tooltip should be displayed
			 */
			disabled?: boolean;
			/**
			 * The preferred placement of the context menu when it opens.
			 * Relative to trigger element.
			 * @default 'top'
			 */
			placement?:
				| "top"
				| "top-start"
				| "top-end"
				| "right"
				| "right-start"
				| "right-end"
				| "bottom"
				| "bottom-start"
				| "bottom-end"
				| "left"
				| "left-start"
				| "left-end";
			/**
			 * Class name to apply to the tooltip
			 */
			labelClassName?: string;
		};
		type IconComponentProps = {
			/**
			 * Icon size
			 * @default 24
			 */
			iconSize?: number;
			/**
			 * Icon color
			 * Might not be used by component
			 * @default 'currentColor'
			 */
			color?: string;
			/**
			 * Semantic color name
			 * Matches color variables used in xpui
			 * @default Inherit from parent
			 */
			semanticColor?: SemanticColor;
			/**
			 * Icon title
			 * @default ''
			 */
			title?: string;
			/**
			 * Title ID (internal)
			 */
			titleId?: string;
			/**
			 * Icon description
			 */
			desc?: string;
			/**
			 * Description ID (internal)
			 */
			descId?: string;
			/**
			 * Auto mirror icon
			 * @default false
			 */
			autoMirror?: boolean;
		};
		type TextComponentProps = {
			/**
			 * Text color
			 * Might not be used by component
			 * @default 'currentColor'
			 */
			color?: string;
			/**
			 * Semantic color name
			 * Matches color variables used in xpui
			 * @default Inherit from parent
			 */
			semanticColor?: SemanticColor;
			/**
			 * Text style variant
			 * @default 'viola'
			 */
			variant?: Variant;
			/**
			 * Bottom padding size
			 */
			paddingBottom?: string;
			/**
			 * Font weight
			 */
			weight?: "book" | "bold" | "black";
		};
		type ConfirmDialogProps = {
			/**
			 * Boolean to determine if the dialog should be opened
			 * @default true
			 */
			isOpen?: boolean;
			/**
			 * Whether to allow inline HTML in component text
			 * @default false
			 */
			allowHTML?: boolean;
			/**
			 * Dialog title. Can be inline HTML if `allowHTML` is true
			 */
			titleText: string;
			/**
			 * Dialog description. Can be inline HTML if `allowHTML` is true
			 */
			descriptionText?: string;
			/**
			 * Confirm button text
			 */
			confirmText?: string;
			/**
			 * Cancel button text
			 */
			cancelText?: string;
			/**
			 * Confirm button aria-label
			 */
			confirmLabel?: string;
			/**
			 * Function to run when confirm button is clicked
			 * The dialog does not close automatically, a handler must be included.
			 * @param {React.MouseEvent<HTMLButtonElement>} event
			 */
			onConfirm?: (event: React.MouseEvent<HTMLButtonElement>) => void;
			/**
			 * Function to run when cancel button is clicked.
			 * The dialog does not close automatically, a handler must be included.
			 * @param {React.MouseEvent<HTMLButtonElement>} event
			 */
			onClose?: (event: React.MouseEvent<HTMLButtonElement>) => void;
			/**
			 * Function to run when dialog is clicked outside of.
			 * By default, this will run `onClose`.
			 * A handler must be included to close the dialog.
			 * @param {React.MouseEvent<HTMLButtonElement>} event
			 */
			onOutside?: (event: React.MouseEvent<HTMLButtonElement>) => void;
		};
		type PanelSkeletonProps = {
			/**
			 * Aria label for the panel. Does not set the panel header content.
			 */
			label?: string;
			/**
			 * Item URI of the panel. Used as reference for Spotify's internal Event Factory.
			 *
			 * @deprecated Since Spotify `1.2.17`
			 */
			itemUri?: string;
			/**
			 * Additional class name to apply to the panel.
			 *
			 * @deprecated Since Spotify `1.2.12`
			 */
			className?: string;
			/**
			 * Additional styles to apply to the panel.
			 */
			style?: React.CSSProperties;
			/**
			 * Children to render inside the panel.
			 */
			children?: React.ReactNode;
		};
		type PanelContentProps = {
			/**
			 * Additional class name to apply to the panel.
			 */
			className?: string;
			/**
			 * Children to render inside the panel.
			 */
			children?: React.ReactNode;
		};
		type PanelHeaderProps = {
			/**
			 * Href for the header link.
			 * Can be either a URI for a path within the app, or a URL for an external link.
			 */
			link?: string;
			/**
			 * Title of the header.
			 */
			title?: string;
			/**
			 * Panel ID. Used to toggle panel open/closed state.
			 */
			panel: number;
			/**
			 * Whether or not the panel contains advertisements.
			 * @default false
			 */
			isAdvert?: boolean;
			/**
			 * Actions to render in the header.
			 */
			actions?: React.ReactNode | React.ReactNode[];
			/**
			 * Function to call when clicking on the close button.
			 * Called before the panel is closed.
			 */
			onClose?: () => void;
			/**
			 * Prevent the panel from closing when clicking on the header close button.
			 * @default false
			 */
			preventDefaultClose?: boolean;
			/**
			 * Function to call when clicking on the header back button.
			 * If not provided, the back button will not be rendered.
			 */
			onBack?: (event: React.MouseEvent<HTMLButtonElement>) => void;
			/**
			 * Font variant for the header title.
			 * @default "balladBold"
			 */
			titleVariant?: Variant;
			/**
			 * Semantic color name for the header title.
			 * @default "textBase"
			 */
			titleSemanticColor?: SemanticColor;
		};
		type SliderProps = {
			/**
			 * Label for the slider.
			 */
			labelText?: string;
			/**
			 * The current value of the slider.
			 */
			value: number;
			/**
			 * The minimum value of the slider.
			 */
			min: number;
			/**
			 * The maximum value of the slider.
			 */
			max: number;
			/**
			 * The step value of the slider.
			 */
			step: number;
			/**
			 * Whether or not the slider is disabled/can be interacted with.
			 * @default true
			 */
			isInteractive?: boolean;
			/**
			 * Whether or not the active style of the slider should be shown.
			 * This is equivalent to the slider being focused/hovered.
			 * @default false
			 */
			forceActiveStyles?: boolean;
			/**
			 * Callback function that is called when the slider starts being dragged.
			 *
			 * @param {number} value The current value of the slider in percent.
			 */
			onDragStart: (value: number) => void;
			/**
			 * Callback function that is called when the slider is being dragged.
			 *
			 * @param {number} value The current value of the slider in percent.
			 */
			onDragMove: (value: number) => void;
			/**
			 * Callback function that is called when the slider stops being dragged.
			 *
			 * @param {number} value The current value of the slider in percent.
			 */
			onDragEnd: (value: number) => void;
			/**
			 * Callback function that is called when the slider incremented a step.
			 *
			 * @deprecated Use `onDrag` props instead.
			 */
			onStepForward?: () => void;
			/**
			 * Callback function that is called when the slider decremented a step.
			 *
			 * @deprecated Use `onDrag` props instead.
			 */
			onStepBackward?: () => void;
		};
		type ButtonProps = {
			component: any;
			/**
			 * Color set for the button.
			 * @default "brightAccent"
			 */
			colorSet?: ColorSet;
			/**
			 * Size for the button.
			 * @default "md"
			 */
			buttonSize?: "sm" | "md" | "lg";
			/**
			 * Size for the button.
			 * @deprecated Use `buttonSize` prop instead, as it will take precedence.
			 * @default "medium"
			 */
			size?: "small" | "medium" | "large";
			/**
			 * Unused by Spotify. Usage unknown.
			 */
			fullWidth?: any;
			/**
			 * React component to render for an icon placed before children. Component, not element!
			 */
			iconLeading?: (props: any) => any | string;
			/**
			 * React component to render for an icon placed after children. Component, not element!
			 */
			iconTrailing?: (props: any) => any | string;
			/**
			 * React component to render for an icon used as button body. Component, not element!
			 */
			iconOnly?: (props: any) => any | string;
			/**
			 * Additional class name to apply to the button.
			 */
			className?: string;
			/**
			 * Label of the element for screen readers.
			 */
			"aria-label"?: string;
			/**
			 * ID of an element that describes the button for screen readers.
			 */
			"aria-labelledby"?: string;
			/**
			 * Unsafely set the color set for the button.
			 * Values from the colorSet will be pasted into the CSS.
			 */
			UNSAFE_colorSet?: ColorSetBody;
			onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
			onMouseEnter?: (event: MouseEvent<HTMLButtonElement>) => void;
			onMouseLeave?: (event: MouseEvent<HTMLButtonElement>) => void;
			onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
			onMouseUp?: (event: MouseEvent<HTMLButtonElement>) => void;
			onFocus?: (event: FocusEvent<HTMLButtonElement>) => void;
			onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
		};
		/**
		 * Generic context menu provider
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.ContextMenuProps
		 */
		const ContextMenu: any;
		/**
		 * Wrapper of ReactComponent.ContextMenu with props: action = 'toggle' and trigger = 'right-click'
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.ContextMenuProps
		 */
		const RightClickMenu: any;
		/**
		 * Outer layer contain ReactComponent.MenuItem(s)
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.MenuProps
		 */
		const Menu: any;
		/**
		 * Component to construct menu item
		 * Used as ReactComponent.Menu children
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.MenuItemProps
		 */
		const MenuItem: any;
		/**
		 * Tailored ReactComponent.Menu for specific type of object
		 *
		 * Props: {
		 *      uri: string;
		 *      onRemoveCallback?: (uri: string) => void;
		 * }
		 */
		const AlbumMenu: any;
		const PodcastShowMenu: any;
		const ArtistMenu: any;
		const PlaylistMenu: any;
		const TrackMenu: any;
		/**
		 * Component to display tooltip when hovering over element
		 * Useful for accessibility
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.TooltipProps
		 */
		const TooltipWrapper: any;
		/**
		 * Component to render Spotify-style icon
		 * @since Spotify `1.1.95`
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.IconComponentProps
		 */
		const IconComponent: any;
		/**
		 * Component to render Spotify-style text
		 * @since Spotify `1.1.95`
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.TextComponentProps
		 */
		const TextComponent: any;
		/**
		 * Component to render Spotify-style confirm dialog
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.ConfirmDialogProps
		 */
		const ConfirmDialog: any;
		/**
		 * Component to render Spotify-style panel skeleton
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.PanelSkeletonProps
		 */
		const PanelSkeleton: any;
		/**
		 * Component to render Spotify-style panel content
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.PanelContentProps
		 */
		const PanelContent: any;
		/**
		 * Component to render Spotify-style panel header
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.PanelHeaderProps
		 */
		const PanelHeader: any;
		/**
		 * Component to render Spotify slider
		 *
		 * Used in progress bar, volume slider, crossfade settings, etc.
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.SliderProps
		 */
		const Slider: any;
		/**
		 * Component to render Spotify primary button
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.ButtonProps
		 */
		const ButtonPrimary: any;
		/**
		 * Component to render Spotify secondary button
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.ButtonProps
		 */
		const ButtonSecondary: any;
		/**
		 * Component to render Spotify tertiary button
		 *
		 * Props:
		 * @see Spicetify.ReactComponent.ButtonProps
		 */
		const ButtonTertiary: any;
	}

	/**
	 * Add button in top bar next to navigation buttons
	 */
	namespace Topbar {
		class Button {
			constructor(label: string, icon: Icon | string, onClick: (self: Button) => void, disabled?: boolean);
			label: string;
			icon: string;
			onClick: (self: Button) => void;
			disabled: boolean;
			element: HTMLButtonElement;
			tippy: any;
		}
	}

	/**
	 * Add button in player controls
	 */
	namespace Playbar {
		/**
		 * Create a button on the right side of the playbar
		 */
		class Button {
			constructor(
				label: string,
				icon: Icon | string,
				onClick?: (self: Button) => void,
				disabled?: boolean,
				active?: boolean,
				registerOnCreate?: boolean
			);
			label: string;
			icon: string;
			onClick: (self: Button) => void;
			disabled: boolean;
			active: boolean;
			element: HTMLButtonElement;
			tippy: any;
			register: () => void;
			deregister: () => void;
		}

		/**
		 * Create a widget next to track info
		 */
		class Widget {
			constructor(
				label: string,
				icon: Icon | string,
				onClick?: (self: Widget) => void,
				disabled?: boolean,
				active?: boolean,
				registerOnCreate?: boolean
			);
			label: string;
			icon: string;
			onClick: (self: Widget) => void;
			disabled: boolean;
			active: boolean;
			element: HTMLButtonElement;
			tippy: any;
			register: () => void;
			deregister: () => void;
		}
	}

	/**
	 * SVG icons
	 */
	const SVGIcons: Record<Icon, string>;

	/**
	 * Return font styling used by Spotify.
	 * @param font Name of the font.
	 * Can match any of the fonts listed in `Spicetify._fontStyle` or returns a generic style otherwise.
	 */
	function getFontStyle(font: Variant): string;

	/**
	 * A filtered copy of user's `config-xpui` file.
	 */
	namespace Config {
		const version: string;
		const current_theme: string;
		const color_scheme: string;
		const extensions: string[];
		const custom_apps: string[];
	}

	/**
	 * Tippy.js instance used by Spotify
	 */
	const Tippy: any;
	/**
	 * Spicetify's predefined props for Tippy.js
	 * Used to mimic Spotify's tooltip behavior
	 */
	const TippyProps: any;

	/**
	 * Interface for interacting with Spotify client's app title
	 */
	namespace AppTitle {
		/**
		 * Set default app title. This has no effect if the player is running.
		 * Will override any previous forced title.
		 * @param title Title to set
		 * @return Promise that resolves to a function to cancel forced title. This doesn't reset the title.
		 */
		function set(title: string): Promise<{ clear: () => void }>;
		/**
		 * Reset app title to default
		 */
		function reset(): Promise<void>;
		/**
		 * Get current default app title
		 * @return Current default app title
		 */
		function get(): Promise<string>;
		/**
		 * Subscribe to title changes.
		 * This event is not fired when the player changes app title.
		 * @param callback Callback to call when title changes
		 * @return Object with method to unsubscribe
		 */
		function sub(callback: (title: string) => void): { clear: () => void };
	}

	/**
	 * Spicetify's QraphQL wrapper for Spotify's GraphQL API endpoints
	 */
	namespace GraphQL {
		/**
		 * Possible types of entities.
		 *
		 * This list is dynamic and may change in the future.
		 */
		type Query =
			| "decorateItemsForEnhance"
			| "imageURLAndSize"
			| "imageSources"
			| "audioItems"
			| "creator"
			| "extractedColors"
			| "extractedColorsAndImageSources"
			| "fetchExtractedColorAndImageForAlbumEntity"
			| "fetchExtractedColorAndImageForArtistEntity"
			| "fetchExtractedColorAndImageForEpisodeEntity"
			| "fetchExtractedColorAndImageForPlaylistEntity"
			| "fetchExtractedColorAndImageForPodcastEntity"
			| "fetchExtractedColorAndImageForTrackEntity"
			| "fetchExtractedColorForAlbumEntity"
			| "fetchExtractedColorForArtistEntity"
			| "fetchExtractedColorForEpisodeEntity"
			| "fetchExtractedColorForPlaylistEntity"
			| "fetchExtractedColorForPodcastEntity"
			| "fetchExtractedColorForTrackEntity"
			| "getAlbumNameAndTracks"
			| "getEpisodeName"
			| "getTrackName"
			| "queryAlbumTrackUris"
			| "queryTrackArtists"
			| "decorateContextEpisodesOrChapters"
			| "decorateContextTracks"
			| "fetchTracksForRadioStation"
			| "decoratePlaylists"
			| "playlistUser"
			| "FetchPlaylistMetadata"
			| "playlistContentsItemTrackArtist"
			| "playlistContentsItemTrackAlbum"
			| "playlistContentsItemTrack"
			| "playlistContentsItemLocalTrack"
			| "playlistContentsItemEpisodeShow"
			| "playlistContentsItemEpisode"
			| "playlistContentsItemResponse"
			| "playlistContentsItem"
			| "FetchPlaylistContents"
			| "episodeTrailerUri"
			| "podcastEpisode"
			| "podcastMetadataV2"
			| "minimalAudiobook"
			| "audiobookChapter"
			| "audiobookMetadataV2"
			| "fetchExtractedColors"
			| "queryFullscreenMode"
			| "queryNpvEpisode"
			| "queryNpvArtist"
			| "albumTrack"
			| "getAlbum"
			| "queryAlbumTracks"
			| "queryArtistOverview"
			| "queryArtistAppearsOn"
			| "discographyAlbum"
			| "albumMetadataReleases"
			| "albumMetadata"
			| "queryArtistDiscographyAlbums"
			| "queryArtistDiscographySingles"
			| "queryArtistDiscographyCompilations"
			| "queryArtistDiscographyAll"
			| "queryArtistDiscographyOverview"
			| "artistPlaylist"
			| "queryArtistPlaylists"
			| "queryArtistDiscoveredOn"
			| "queryArtistFeaturing"
			| "queryArtistRelated"
			| "queryArtistMinimal"
			| "searchModalResults"
			| "queryWhatsNewFeed"
			| "whatsNewFeedNewItems"
			| "SetItemsStateInWhatsNewFeed"
			| "browseImageURLAndSize"
			| "browseImageSources"
			| "browseAlbum"
			| "browseArtist"
			| "browseEpisode"
			| "browseChapter"
			| "browsePlaylist"
			| "browsePodcast"
			| "browseAudiobook"
			| "browseTrack"
			| "browseUser"
			| "browseMerch"
			| "browseArtistConcerts"
			| "browseContent"
			| "browseSectionContainer"
			| "browseClientFeature"
			| "browseItem"
			| "browseAll"
			| "browsePage";
		/**
		 * Collection of GraphQL definitions.
		 */
		const Definitions: Record<Query | string, any>;
		/**
		 * GraphQL query definitions. Subset of `Definitions` that are used as query requests.
		 */
		const QueryDefinitions: Record<Query | string, any>;
		/**
		 * GraphQL mutation definitions. Subset of `Definitions` that are used as mutation requests.
		 */
		const MutationDefinitions: Record<Query | string, any>;
		/**
		 * GraphQL response definitions. Subset of `Definitions` that are used as response types.
		 */
		const ResponseDefinitions: Record<Query | string, any>;
		/**
		 * Sends a GraphQL query to Spotify.
		 * @description A preinitialized version of `Spicetify.GraphQL.Handler` using current context.
		 * @param query Query to send
		 * @param variables Variables to use
		 * @param context Context to use
		 * @return Promise that resolves to the response
		 */
		function Request(
			query: (typeof Definitions)[Query | string],
			variables?: Record<string, any>,
			context?: Record<string, any>
		): Promise<any>;
		/**
		 * Context for GraphQL queries.
		 * @description Used to set context for the handler and initialze it.
		 */
		const Context: Record<string, any>;
		/**
		 * Handler for GraphQL queries.
		 * @param context Context to use
		 * @return Function to handle GraphQL queries
		 */
		function Handler(
			context: Record<string, any>
		): (
			query: (typeof Definitions)[Query | string],
			variables?: Record<string, any>,
			context?: Record<string, any>
		) => Promise<any>;
	}

	namespace ReactHook {
		/**
		 * React Hook to create interactive drag-and-drop element
		 * @description Used to create a draggable element that can be dropped into Spotify's components (e.g. Playlist, Folder, Sidebar, Queue)
		 * @param uris List of URIs to be dragged
		 * @param label Label to be displayed when dragging
		 * @param contextUri Context URI of the element from which the drag originated (e.g. Playlist URI)
		 * @param sectionIndex Index of the section in which the drag originated
		 * @param dropOriginUri URI of the desired drop target. Leave empty to allow drop anywhere
		 * @return Function to handle drag event. Should be passed to `onDragStart` prop of the element. All parameters passed onto the hook will be passed onto the handler unless declared otherwise.
		 *
		 */
		function DragHandler(
			uris?: string[],
			label?: string,
			contextUri?: string,
			sectionIndex?: number,
			dropOriginUri?: string
		): (event: React.DragEvent, uris?: string[], label?: string, contextUri?: string, sectionIndex?: number) => void;

		/**
		 * React Hook to use panel state
		 * @param id ID of the panel to use
		 * @return Object with methods of the panel
		 */
		function usePanelState(id: number): { toggle: () => void; isActive: boolean };

		/**
		 * React Hook to use extracted color from GraphQL
		 *
		 * @note This is a wrapper of ReactQuery's `useQuery` hook.
		 * The component using this hook must be wrapped in a `QueryClientProvider` component.
		 *
		 * @see https://tanstack.com/query/v3/docs/react/reference/QueryClientProvider
		 *
		 * @param uri URI of the Spotify image to extract color from.
		 * @param fallbackColor Fallback color to use if the image is not available. Defaults to `#535353`.
		 * @param variant Variant of the color to use. Defaults to `colorRaw`.
		 *
		 * @return Extracted color hex code.
		 */
		function useExtractedColor(
			uri: string,
			fallbackColor?: string,
			variant?: "colorRaw" | "colorLight" | "colorDark"
		): string;
	}

	/**
	 * An API wrapper to interact with Spotify's Panel/right sidebar.
	 */
	namespace Panel {
		/**
		 * Properties that are used by the `registerPanel` function.
		 */
		type PanelProps = {
			/**
			 * Label of the Panel.
			 */
			label?: string;
			/**
			 * Children to render inside the Panel.
			 * Must be a React Component.
			 * Will be passed a `panel` prop with the Panel ID.
			 */
			children: React.ReactNode;
			/**
			 * Determine if the children passed is a custom Panel.
			 * If true, the children will be rendered as is.
			 * Note: All passed props except `children` will be ignored if enabled.
			 *
			 * @default false
			 */
			isCustom?: boolean;
			/**
			 * Inline styles to apply to the Panel skeleton.
			 */
			style?: React.CSSProperties;
			/**
			 * Additional class name to apply to the Panel content wrapper.
			 */
			wrapperClassname?: string;
			/**
			 * Additional class name to apply to the Panel header.
			 */
			headerClassname?: string;
			/**
			 * Font variant for the Panel header title.
			 * @default "balladBold"
			 */
			headerVariant?: Variant;
			/**
			 * Semantic color name for the Panel header title.
			 * @default "textBase"
			 */
			headerSemanticColor?: SemanticColor;
			/**
			 * Href for the header link.
			 * Can be either a URI for a path within the app, or a URL for an external link.
			 */
			headerLink?: string;
			/**
			 * Additional actions to render in the header.
			 * Will be rendered next to the close button.
			 */
			headerActions?: React.ReactNode | React.ReactNode[];
			/**
			 * Function to call when clicking on the header close button.
			 * Called before the panel is closed.
			 */
			headerOnClose?: () => void;
			/**
			 * Prevent the panel from closing when clicking on the header close button.
			 * @default false
			 */
			headerPreventDefaultClose?: boolean;
			/**
			 * Function to call when clicking on the header back button.
			 * If not provided, the back button will not be rendered.
			 * @param event Event object
			 */
			headerOnBack?: (event: React.MouseEvent<HTMLButtonElement>) => void;
		};

		/**
		 * An object of reserved panel IDs used by Spotify.
		 */
		const reservedPanelIds: Record<string | number, string | number>;
		/**
		 * Collection of React Components used by Spotify in the Panel.
		 */
		const Components: {
			/**
			 * React Component for the Panel's skeleton.
			 *
			 * Props:
			 * @see Spicetify.ReactComponent.PanelSkeletonProps
			 */
			PanelSkeleton: any;
			/**
			 * React Component for the Panel's content.
			 *
			 * Props:
			 * @see Spicetify.ReactComponent.PanelContentProps
			 */
			PanelContent: any;
			/**
			 * React Component for the Panel's header.
			 *
			 * Props:
			 * @see Spicetify.ReactComponent.PanelHeaderProps
			 */
			PanelHeader: any;
		};
		/**
		 * Check whether or not a Panel with the provided ID is registered.
		 * @param id Panel ID to check
		 * @return Whether or not a Panel with the provided ID is registered
		 */
		function hasPanel(id: number): boolean;
		/**
		 * Get the Panel with the provided ID.
		 * @param id Panel ID to get
		 * @return Panel with the provided ID
		 */
		function getPanel(id: number): React.ReactNode | undefined;
		/**
		 * Set the Panel with the provided ID.
		 * If the ID is not registered, it will be set to `0`.
		 * @param id Panel ID to set
		 */
		function setPanel(id: number): Promise<void>;
		/**
		 * Subscribe to Panel changes.
		 * @param callback Callback to call when Panel changes
		 */
		function subPanelState(callback: (id: number) => void): void;
		/**
		 * Register a new Panel.
		 * An ID will be automatically assigned to the Panel.
		 *
		 * To make it easier and convenient for developers to use the Panel API, this method by default wraps the children passed into a Panel skeleton and content wrapper.
		 *
		 * If you wish to customize the Panel, you can pass `isCustom` as `true` to disable the default wrapper.
		 *
		 * @param props Properties of the Panel
		 * @return Methods and properties of the Panel
		 */
		function registerPanel(props: PanelProps): {
			/**
			 * Assigned ID of the Panel.
			 */
			id: number;
			/**
			 * Function to toggle the Panel open/closed state.
			 */
			toggle: () => Promise<void>;
			/**
			 * Method to subscribe to the related Panel state.
			 * Only fires when the related Panel open/closed state changes.
			 */
			onStateChange: (callback: (isActive: boolean) => void) => void;
			/**
			 * Boolean to determine if the Panel is open.
			 */
			isActive: boolean;
		};
		/**
		 * Function to render a Panel of the current ID.
		 * If the ID is not registered or is reserved by Spotify, the function will return `null`.
		 *
		 * Used as a hook for Spotify internal component.
		 * @return Panel of the current ID
		 */
		function render(): React.ReactNode | null;
		/**
		 * ID of the current Panel.
		 * @return ID of the current Panel
		 */
		const currentPanel: number;
	}

	/**
	 * react-flip-toolkit
	 * @description A lightweight magic-move library for configurable layout transitions.
	 * @link https://github.com/aholachek/react-flip-toolkit
	 */
	namespace ReactFlipToolkit {
		const Flipper: any;
		const Flipped: any;
		const spring: any;
	}

	/**
	 * classnames
	 * @description A simple JavaScript utility for conditionally joining classNames together.
	 * @link https://github.com/JedWatson/classnames
	 */
	function classnames(...args: any[]): string;

	/**
	 * React Query v3
	 * @description A hook for fetching, caching and updating asynchronous data in React.
	 * @link https://github.com/TanStack/query/tree/v3
	 */
	const ReactQuery: any;

	/**
	 * Analyse and extract color presets from an image. Works for any valid image URL/URI.
	 * @param image Spotify URI to an image, or an image URL.
	 */
	function extractColorPreset(image: string | string[]): Promise<
		{
			colorRaw: Color;
			colorLight: Color;
			colorDark: Color;
			isFallback: boolean;
		}[]
	>;

	interface hsl {
		h: number;
		s: number;
		l: number;
	}
	interface hsv {
		h: number;
		s: number;
		v: number;
	}
	interface rgb {
		r: number;
		g: number;
		b: number;
	}
	type CSSColors = "HEX" | "HEXA" | "HSL" | "HSLA" | "RGB" | "RGBA";
	/**
	 * Spotify's internal color class
	 */
	class Color {
		constructor(rgb: rgb, hsl: hsl, hsv: hsv, alpha?: number);

		static BLACK: Color;
		static WHITE: Color;
		static CSSFormat: Record<CSSColors, number> & Record<number, CSSColors>;

		a: number;
		hsl: hsl;
		hsv: hsv;
		rgb: rgb;

		/**
		 * Convert CSS representation to Color
		 * @param cssColor CSS representation of the color. Must not contain spaces.
		 * @param alpha Alpha value of the color. Defaults to 1.
		 * @return Color object
		 * @throws {Error} If the CSS color is invalid or unsupported
		 */
		static fromCSS(cssColor: string, alpha?: number): Color;
		static fromHSL(hsl: hsl, alpha?: number): Color;
		static fromHSV(hsv: hsv, alpha?: number): Color;
		static fromRGB(rgb: rgb, alpha?: number): Color;
		static fromHex(hex: string, alpha?: number): Color;

		/**
		 * Change the contrast of the color against another so that
		 * the contrast between them is at least `strength`.
		 */
		contrastAdjust(against: Color, strength?: number): Color;

		/**
		 * Stringify JSON result
		 */
		stringify(): string;

		/**
		 * Convert to CSS representation
		 * @param colorFormat CSS color format to convert to
		 * @return CSS representation of the color
		 */
		toCSS(colorFormat: number): string;

		/**
		 * Return RGBA representation of the color
		 */
		toString(): string;
	}

	/**
	 * Spotify internal library for localization
	 */
	namespace Locale {
		/**
		 * Relative time format
		 */
		const _relativeTimeFormat: Intl.RelativeTimeFormat | null;
		/**
		 * Registered date time formats in the current session
		 */
		const _dateTimeFormats: Record<string, Intl.DateTimeFormat>;
		/**
		 * Current locale of the client
		 */
		const _locale: string;
		const _urlLocale: string;
		/**
		 * Collection of supported locales
		 */
		const _supportedLocales: Record<string, string>;
		/**
		 * Dictionary of localized strings
		 */
		const _dictionary: Record<string, string | { one: string; other: string }>;

		/**
		 * Format date into locale string
		 *
		 * @param date Date to format
		 * @param options Options to use
		 * @return Localized string
		 * @throws {RangeError} If the date is invalid
		 */
		function formatDate(date: number | Date | undefined, options?: Intl.DateTimeFormatOptions): string;
		/**
		 * Format time into relative locale string
		 *
		 * @param date Date to format
		 * @param options Options to use
		 * @return Localized string
		 * @throws {RangeError} If the date is invalid
		 */
		function formatRelativeTime(date: number | Date | undefined, options?: Intl.DateTimeFormatOptions): string;
		/**
		 * Format number into locale string
		 *
		 * @param number Number to format
		 * @param options Options to use
		 * @return Localized string
		 */
		function formatNumber(number: number, options?: Intl.NumberFormatOptions): string;
		/**
		 * Format number into compact locale string
		 *
		 * @param number Number to format
		 * @return Localized string
		 */
		function formatNumberCompact(number: number): string;
		/**
		 * Get localized string
		 *
		 * @param key Key of the string
		 * @param children React children to pass the string into
		 * @return Localized string or React Fragment of the children
		 */
		function get(key: string, ...children: React.ReactNode[]): string | React.ReactNode;
		/**
		 * Get date time format of the passed options.
		 *
		 * Function calls here will register to the `_dateTimeFormats` dictionary.
		 *
		 * @param options Options to use
		 * @return Date time format
		 */
		function getDateTimeFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat;
		/**
		 * Get the current locale dictionary
		 *
		 * @return Current locale dictionary
		 */
		function getDictionary(): Record<string, string | { one: string; other: string }>;
		/**
		 * Get the current locale
		 *
		 * @return Current locale
		 */
		function getLocale(): string;
		/**
		 * Get the current locale code for Smartling
		 *
		 * @return Current locale code for Smartling
		 */
		function getSmartlingLocale(): string;
		/**
		 * Get the current locale code for URL
		 *
		 * @return Current locale code for URL
		 */
		function getUrlLocale(): string;
		/**
		 * Get the current relative time format
		 *
		 * @return Current relative time format
		 */
		function getRelativeTimeFormat(): Intl.RelativeTimeFormat;
		/**
		 * Get the separator for the current locale
		 *
		 * @return Separator for the current locale
		 */
		function getSeparator(): string;
		/**
		 * Set the current locale
		 *
		 * This will clear all previously set relative time formats and key-value pairs.
		 *
		 * @param locale Locale to set
		 */
		function setLocale(locale: string): void;
		/**
		 * Set the current locale code for URL
		 *
		 * @param locale Locale code for URL to set
		 */
		function setUrlLocale(locale: string): void;
		/**
		 * Set the dictionary for the current locale
		 *
		 * @param dictionary Dictionary to set
		 */
		function setDictionary(dictionary: Record<string, string | { one: string; other: string }>): void;
		/**
		 * Transform text into locale lowercase
		 *
		 * @param text Text to transform
		 * @return Locale lowercase text
		 */
		function toLocaleLowerCase(text: string): string;
		/**
		 * Transform text into locale uppercase
		 *
		 * @param text Text to transform
		 * @return Locale uppercase text
		 */
		function toLocaleUpperCase(text: string): string;
	}
}
```

## File: src/types/types.d.ts
```typescript
type PlayerEventListener = Parameters<typeof Spicetify.Player.removeEventListener>[1];

namespace SpotifyAudioAnalysis {
	interface Meta {
		analyzer_version: string;
		platform: string;
		detailed_status: string;
		status_code: number;
		timestamp: number;
		analysis_time: number;
		input_process: string;
	}

	interface Track {
		num_samples: number;
		duration: number;
		sample_md5: string;
		offset_seconds: number;
		window_seconds: number;
		analysis_sample_rate: number;
		analysis_channels: number;
		end_of_fade_in: number;
		start_of_fade_out: number;
		loudness: number;
		tempo: number;
		tempo_confidence: number;
		time_signature: number;
		time_signature_confidence: number;
		key: number;
		key_confidence: number;
		mode: number;
		mode_confidence: number;
		codestring: string;
		code_version: number;
		echoprintstring: string;
		echoprint_version: number;
		synchstring: string;
		synch_version: number;
		rhythmstring: string;
		rhythm_version: number;
	}

	interface Bar {
		start: number;
		duration: number;
		confidence: number;
	}

	interface Beat {
		start: number;
		duration: number;
		confidence: number;
	}

	interface Section {
		start: number;
		duration: number;
		confidence: number;
		loudness: number;
		tempo: number;
		tempo_confidence: number;
		key: number;
		key_confidence: number;
		mode: number;
		mode_confidence: number;
		time_signature: number;
		time_signature_confidence: number;
	}

	interface Segment {
		start: number;
		duration: number;
		confidence: number;
		loudness_start: number;
		loudness_max: number;
		loudness_max_time: number;
		loudness_end: number;
		pitches: [number, number, number, number, number, number, number, number, number, number, number, number];
		timbre: [number, number, number, number, number, number, number, number, number, number, number, number];
	}

	interface Tatum {
		start: number;
		duration: number;
		confidence: number;
	}
}

interface SpotifyAudioAnalysis {
	meta: SpotifyAudioAnalysis.Meta;
	track: SpotifyAudioAnalysis.Track;
	bars: SpotifyAudioAnalysis.Bar[];
	beats: SpotifyAudioAnalysis.Beat[];
	sections: SpotifyAudioAnalysis.Section[];
	segments: SpotifyAudioAnalysis.Segment[];
	tatums: SpotifyAudioAnalysis.Tatum[];
}

interface CurveEntry {
	x: number;
	y: number;
	accumulatedIntegral?: number;
}
```

## File: src/app.tsx
```typescript
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./css/app.module.scss";
import LoadingIcon from "./components/LoadingIcon";
import NCSVisualizer from "./components/renderer/NCSVisualizer";
import { CacheStatus, ExtensionKind, MetadataService } from "./metadata";
import { parseProtobuf } from "./protobuf/defs";
import { ColorResult } from "./protobuf/ColorResult";
import { ErrorData, ErrorHandlerContext, ErrorRecovery } from "./error";
import DebugVisualizer from "./components/renderer/DebugVisualizer";
import SpectrumVisualizer from "./components/renderer/SpectrumVisualizer";
import { MainMenuButton } from "./menu";
import { createVisualizerWindow } from "./window";

export type RendererProps = {
	isEnabled: boolean;
	themeColor: Spicetify.Color;
	audioAnalysis?: SpotifyAudioAnalysis;
};

export type RendererDefinition = {
	id: string;
	name: string;
	renderer: React.FunctionComponent<RendererProps>;
};

const RENDERERS: RendererDefinition[] = [
	{
		id: "ncs",
		name: "NCS",
		renderer: NCSVisualizer
	},
	{
		id: "spectrum",
		name: "Spectrum (very WIP)",
		renderer: SpectrumVisualizer
	},
	{
		id: "debug",
		name: "DEBUG",
		renderer: DebugVisualizer
	}
];

type VisualizerState =
	| {
			state: "loading" | "running";
	  }
	| {
			state: "error";
			errorData: ErrorData;
	  };

export default function App(props: { isSecondaryWindow?: boolean; initialRenderer?: string }) {
	const [rendererId, setRendererId] = useState<string>(props.initialRenderer || "ncs");
	const Renderer = RENDERERS.find(v => v.id === rendererId)?.renderer;

	const [state, setState] = useState<VisualizerState>({ state: "loading" });
	const [trackData, setTrackData] = useState<{ audioAnalysis?: SpotifyAudioAnalysis; themeColor: Spicetify.Color }>({
		themeColor: Spicetify.Color.fromHex("#535353")
	});

	const updateState = useCallback(
		(newState: VisualizerState) =>
			setState(oldState => {
				if (oldState.state === "error" && oldState.errorData.recovery === ErrorRecovery.NONE) return oldState;

				return newState;
			}),
		[]
	);

	const onError = useCallback((msg: string, recovery: ErrorRecovery) => {
		updateState({
			state: "error",
			errorData: {
				message: msg,
				recovery
			}
		});
	}, []);

	const isUnrecoverableError = state.state === "error" && state.errorData.recovery === ErrorRecovery.NONE;

	const metadataService = useMemo(() => new MetadataService(), []);

	const updatePlayerState = useCallback(
		async (newState: Spicetify.PlayerState) => {
			const item = newState?.item;

			if (!item) {
				onError("Start playing a song to see the visualization!", ErrorRecovery.SONG_CHANGE);
				return;
			}

			const uri = Spicetify.URI.fromString(item.uri);
			if (uri.type !== Spicetify.URI.Type.TRACK) {
				onError("Error: The type of track you're listening to is currently not supported", ErrorRecovery.SONG_CHANGE);
				return;
			}

			updateState({ state: "loading" });

			const analysisRequestUrl = `https://spclient.wg.spotify.com/audio-attributes/v1/audio-analysis/${uri.id}?format=json`;
			const [audioAnalysis, vibrantColor] = await Promise.all([
				Spicetify.CosmosAsync.get(analysisRequestUrl).catch(e => console.error("[Visualizer]", e)) as Promise<unknown>,
				metadataService
					.fetch(ExtensionKind.EXTRACTED_COLOR, item.metadata.image_url)
					.catch(s => console.error(`[Visualizer] Could not load extracted color metadata. Status: ${CacheStatus[s]}`))
					.then(colors => {
						if (
							!colors ||
							colors.value.length === 0 ||
							colors.typeUrl !== "type.googleapis.com/spotify.context_track_color.ColorResult"
						)
							return Spicetify.Color.fromHex("#535353");

						const colorResult = parseProtobuf(colors.value, ColorResult);
						const colorHex = colorResult.colorLight?.rgb?.toString(16).padStart(6, "0") ?? "535353";
						return Spicetify.Color.fromHex(`#${colorHex}`);
					})
			]);

			if (!audioAnalysis) {
				onError(
					"Error: The audio analysis could not be loaded, please check your internet connection",
					ErrorRecovery.MANUAL
				);
				return;
			}

			if (typeof audioAnalysis !== "object") {
				onError(`Invalid audio analysis data (${audioAnalysis})`, ErrorRecovery.MANUAL);
				return;
			}

			if (!("track" in audioAnalysis) || !("segments" in audioAnalysis)) {
				const message =
					"error" in audioAnalysis && audioAnalysis.error
						? (audioAnalysis.error as string)
						: "message" in audioAnalysis && audioAnalysis.message
							? (audioAnalysis.message as string)
							: "Unknown error";

				const code = "code" in audioAnalysis ? (audioAnalysis.code as number) : null;

				if (code !== null) {
					onError(`Error ${code}: ${message}`, ErrorRecovery.MANUAL);
					return;
				} else {
					onError(message, ErrorRecovery.MANUAL);
					return;
				}
			}

			setTrackData({ audioAnalysis: audioAnalysis as SpotifyAudioAnalysis, themeColor: vibrantColor });
			updateState({ state: "running" });
		},
		[metadataService]
	);

	useEffect(() => {
		if (isUnrecoverableError) return;

		const songChangeListener = (event?: Event & { data: Spicetify.PlayerState }) => {
			if (event?.data) updatePlayerState(event.data);
		};

		Spicetify.Player.addEventListener("songchange", songChangeListener);
		updatePlayerState(Spicetify.Player.data);

		return () => Spicetify.Player.removeEventListener("songchange", songChangeListener as PlayerEventListener);
	}, [isUnrecoverableError, updatePlayerState]);

	return (
		<div className="visualizer-container">
			{!isUnrecoverableError && (
				<>
					<ErrorHandlerContext.Provider value={onError}>
						{Renderer && (
							<Renderer
								isEnabled={state.state === "running"}
								audioAnalysis={trackData.audioAnalysis}
								themeColor={trackData.themeColor}
							/>
						)}
					</ErrorHandlerContext.Provider>
					{props.isSecondaryWindow || (
						<MainMenuButton
							className={styles.main_menu_button}
							renderers={RENDERERS}
							onOpenWindow={() => {
								if (!createVisualizerWindow(rendererId)) {
									Spicetify.showNotification("Failed to open a new window", true);
								}
							}}
							onSelectRenderer={id => setRendererId(id)}
						/>
					)}
				</>
			)}

			{state.state === "loading" ? (
				<LoadingIcon />
			) : state.state === "error" ? (
				<div className={styles.error_container}>
					<div className={styles.error_message}>{state.errorData.message}</div>
					{state.errorData.recovery === ErrorRecovery.MANUAL && (
						<Spicetify.ReactComponent.ButtonPrimary onClick={() => updatePlayerState(Spicetify.Player.data)}>
							Try again
						</Spicetify.ReactComponent.ButtonPrimary>
					)}
				</div>
			) : null}
		</div>
	);
}
```

## File: src/error.ts
```typescript
import { createContext } from "react";

export type ErrorHandler = (msg: string, recovery: ErrorRecovery) => void;

export const ErrorHandlerContext = createContext<ErrorHandler>(() => {});

export enum ErrorRecovery {
	MANUAL,
	SONG_CHANGE,
	NONE
}

export type ErrorData = {
	message: string;
	recovery: ErrorRecovery;
};
```

## File: src/menu.tsx
```typescript
import React from "react";
import { RendererDefinition } from "./app";

const SpotifyIcon = React.memo((props: { name: Spicetify.Icon; size: number }) => (
	<Spicetify.ReactComponent.IconComponent
		semanticColor="textBase"
		dangerouslySetInnerHTML={{ __html: Spicetify.SVGIcons[props.name] }}
		iconSize={props.size}
	/>
));

type MainMenuProps = { renderers: RendererDefinition[]; onSelectRenderer: (id: string) => void; onOpenWindow: () => void };

const MainMenu = React.memo((props: MainMenuProps) => (
	<Spicetify.ReactComponent.Menu>
		<Spicetify.ReactComponent.MenuSubMenuItem displayText="Renderer">
			{props.renderers.map(v => (
				<Spicetify.ReactComponent.MenuItem onClick={() => props.onSelectRenderer(v.id)}>
					{v.name}
				</Spicetify.ReactComponent.MenuItem>
			))}
		</Spicetify.ReactComponent.MenuSubMenuItem>
		<Spicetify.ReactComponent.MenuItem
			onClick={() => props.onOpenWindow()}
			trailingIcon={<SpotifyIcon name="external-link" size={16} />}
		>
			Open Window
		</Spicetify.ReactComponent.MenuItem>
	</Spicetify.ReactComponent.Menu>
));

export const MainMenuButton = React.memo((props: MainMenuProps & { className: string }) => {
	return (
		<Spicetify.ReactComponent.ContextMenu trigger="click" menu={<MainMenu {...props} />}>
			<Spicetify.ReactComponent.ButtonSecondary
				aria-label="menu"
				className={props.className}
				iconOnly={() => <SpotifyIcon name="menu" size={16} />}
			></Spicetify.ReactComponent.ButtonSecondary>
		</Spicetify.ReactComponent.ContextMenu>
	);
});
```

## File: src/metadata.ts
```typescript
export enum ExtensionKind {
	UNKNOWN_EXTENSION = 0,
	EXTRACTED_COLOR = 23 // type.googleapis.com/spotify.context_track_color.ColorResult
}

export enum CacheStatus {
	UNKNOWN = 0,
	OK = 1,
	NOT_RESOLVED = 2,
	NOT_FOUND = 3,
	UNAVAILABLE_FOR_LEGAL_REASONS = 4
}

export class MetadataService {
	service: any;
	serviceDescriptor: any;

	public constructor() {
		const webpack = (window as any).webpackChunkclient_web ?? (window as any).webpackChunkopen;
		const require = webpack.push([[Symbol()], {}, (re: any) => re]);
		const cache = Object.keys(require.m).map(id => require(id));
		const modules = cache
			.filter(module => typeof module === "object")
			.map(module => {
				try {
					return Object.values(module);
				} catch {}
			})
			.flat();

		const metadataService = modules.filter(
			m =>
				m &&
				typeof m === "function" &&
				"SERVICE_ID" in m &&
				m.SERVICE_ID === "spotify.mdata_esperanto.proto.MetadataService"
		);
		const createTransport = modules.filter(
			m =>
				m &&
				typeof m === "function" &&
				m.toString().includes("executeEsperantoCall") &&
				m.toString().includes("cancelEsperantoCall")
		);

		if (metadataService.length !== 1) return;
		if (createTransport.length !== 1) return;

		this.serviceDescriptor = metadataService[0] as any;
		this.service = new this.serviceDescriptor((createTransport[0] as any)());
	}

	public fetch(kind: ExtensionKind, entityUri: string): Promise<{ typeUrl: string; value: Uint8Array }> {
		return new Promise((resolve, reject) => {
			const cancel = this.service.observe(
				this.serviceDescriptor.METHODS.observe.requestType.fromPartial({
					extensionQuery: [
						{
							entityUri: entityUri,
							extensionKind: kind
						}
					]
				}),
				(response: any) => {
					if (response.pendingResponse) return;
					cancel.cancel();

					const success = response.extensionResult[0].status === 1;
					if (!success) {
						const cacheStatus: CacheStatus = response.extensionResult[0].details.cacheStatus;
						reject(cacheStatus);
						return;
					}

					const data = response.extensionResult[0].extensionData;
					resolve(data);
				}
			);
		});
	}
}
```

## File: src/RhythmString.tsx
```typescript
import { unzlibSync } from "fflate";

export type RhythmString = number[][];

export function parseRhythmString(rhythmString: string): RhythmString {
	rhythmString = rhythmString.replace(/-/g, "+").replace(/_/g, "/");
	const compressed = new Uint8Array(
		atob(rhythmString)
			.split("")
			.map(c => c.charCodeAt(0))
	);
	const decompressed = unzlibSync(compressed);

	const input = new TextDecoder()
		.decode(decompressed)
		.split(" ")
		.map(s => parseInt(s));
	const output: number[][] = [];
	if (input.length < 3) return output;

	const sampleRate = input.shift()!;
	const stepSize = input.shift()!;
	const stepDuration = stepSize / sampleRate;

	const channelCount = input.shift()!;
	if (input.length < channelCount) return output;

	for (let i = 0; i < channelCount; i++) {
		const channel: number[] = [];
		const entryCount = input.shift()!;
		if (input.length < entryCount + (channelCount - i - 1)) return output;

		for (let j = 0; j < entryCount; j++) {
			const entry = input.shift()! * stepDuration;
			channel.push(j == 0 ? entry : channel[j - 1] + entry);
		}

		output.push(channel);
	}

	return output;
}
```

## File: src/settings.json
```json
{
	"displayName": { "en": "Visualizer", "en-GB": "Visualiser" },
	"nameId": "visualizer",
	"icon": "css/icon-inactive.svg",
	"activeIcon": "css/icon-active.svg"
}
```

## File: src/utils.ts
```typescript
export function binarySearchIndex<T>(array: T[], converter: (value: T, index: number) => number, position: number): number {
	let lowerBound = 0;
	let upperBound = array.length;

	while (upperBound - lowerBound > 1) {
		const testIndex = Math.floor((upperBound + lowerBound) / 2);
		const pointPos = converter(array[testIndex], testIndex);

		if (pointPos <= position) lowerBound = testIndex;
		else upperBound = testIndex;
	}

	return lowerBound;
}

export function decibelsToAmplitude(decibels: number): number {
	return Math.min(Math.max(Math.pow(10, decibels / 20), 0), 1);
}

export function smoothstep(x: number): number {
	//return x * x * x * (3 * x * (2 * x - 5) + 10);
	return x * x * (3 - 2 * x);
}

export function mapLinear(value: number, iMin: number, iMax: number, oMin: number, oMax: number): number {
	value = (value - iMin) / (iMax - iMin);
	value = value * (oMax - oMin) + oMin;
	return value;
}

export function map(
	value: number,
	iMin: number,
	iMax: number,
	interpolate: (x: number) => number,
	oMin: number,
	oMax: number
): number {
	value = (value - iMin) / (iMax - iMin);
	value = interpolate(value);
	value = value * (oMax - oMin) + oMin;
	return value;
}

// calculate the integral of the linear function through p1 and p2 between p1.x and p2.x
export function integrateLinearSegment(p1: CurveEntry, p2: CurveEntry): number {
	return -0.5 * (p1.x - p2.x) * (p1.y + p2.y);
}

export function sampleSegmentedFunction<T>(
	array: T[],
	getX: (value: T, index: number) => number,
	getY: (value: T, index: number) => number,
	interpolate: (x: number) => number,
	position: number
): number {
	const pointIndex = binarySearchIndex(array, getX, position);
	const point = array[pointIndex];

	if (pointIndex > array.length - 2) return getY(point, pointIndex);
	const nextPoint = array[pointIndex + 1];

	return map(
		position,
		getX(point, pointIndex),
		getX(nextPoint, pointIndex + 1),
		interpolate,
		getY(point, pointIndex),
		getY(nextPoint, pointIndex + 1)
	);
}

export function sampleAmplitudeMovingAverage(amplitudeCurve: CurveEntry[], position: number, windowSize: number): number {
	if (windowSize == 0)
		return sampleSegmentedFunction(
			amplitudeCurve,
			e => e.x,
			e => e.y,
			x => x,
			position
		);

	const windowStart = position - windowSize / 2;
	const windowEnd = position + windowSize / 2;
	const windowStartIndex = binarySearchIndex(amplitudeCurve, e => e.x, windowStart);
	const windowEndIndex = binarySearchIndex(amplitudeCurve, e => e.x, windowEnd);

	let integral = 0;
	if (windowStartIndex == windowEndIndex) {
		const p1 = amplitudeCurve[windowStartIndex];

		if (windowStartIndex > amplitudeCurve.length - 2) return p1.y;
		const p2 = amplitudeCurve[windowStartIndex + 1];

		const yA = mapLinear(windowStart, p1.x, p2.x, p1.y, p2.y);
		const yB = mapLinear(windowEnd, p1.x, p2.x, p1.y, p2.y);

		return (yA + yB) / 2;
	} else {
		let p1 = amplitudeCurve[windowStartIndex];
		let p2 = amplitudeCurve[windowStartIndex + 1];

		let p = { x: windowStart, y: mapLinear(windowStart, p1.x, p2.x, p1.y, p2.y) };
		integral = integrateLinearSegment(p, p2);

		for (let i = windowStartIndex + 1; i < windowEndIndex; i++) {
			p1 = p2;
			p2 = amplitudeCurve[i + 1];

			integral += integrateLinearSegment(p1, p2);
		}

		p1 = p2;
		if (windowEndIndex > amplitudeCurve.length - 2) {
			integral += p1.y * (windowEnd - p1.x);
		} else {
			p2 = amplitudeCurve[windowEndIndex + 1];
			p = { x: windowEnd, y: mapLinear(windowEnd, p1.x, p2.x, p1.y, p2.y) };
			integral += integrateLinearSegment(p1, p);
		}
	}

	return integral / windowSize;
}

export function sampleAccumulatedIntegral(amplitudeCurve: CurveEntry[], position: number) {
	const index = binarySearchIndex(amplitudeCurve, e => e.x, position);
	const p1 = amplitudeCurve[index];

	if (index + 1 >= amplitudeCurve.length) return (p1.accumulatedIntegral ?? 0) + p1.y * (position - p1.x);

	const p2 = amplitudeCurve[index + 1];
	const mid = {
		x: position,
		y: mapLinear(position, p1.x, p2.x, p1.y, p2.y)
	};

	return (p1.accumulatedIntegral ?? 0) + integrateLinearSegment(p1, mid);
}
```

## File: src/window.tsx
```typescript
import React from "react";
import App from "./app";

export function createVisualizerWindow(rendererId: string) {
	try {
		const win = window.open();
		if (!win) return false;

		document.querySelectorAll("link[rel=stylesheet]").forEach(e => {
			const newElement = win.document.createElement("link");
			newElement.setAttribute("rel", "stylesheet");
			newElement.setAttribute("href", (e as HTMLLinkElement).href);

			win.document.head.appendChild(newElement);
		});
		document.querySelectorAll("style").forEach(e => {
			const newElement = win.document.createElement("style");
			newElement.innerText = e.innerText;

			win.document.head.appendChild(newElement);
		});

		win.document.documentElement.className = document.documentElement.className;
		win.document.body.className = document.body.className;

		Spicetify.ReactDOM.render(<App isSecondaryWindow={true} initialRenderer={rendererId} />, win.document.body);

		return true;
	} catch {
		return false;
	}
}
```

## File: .gitattributes
```
dist/* linguist-vendored
```

## File: .gitignore
```
# Created by https://www.toptal.com/developers/gitignore/api/node
# Edit at https://www.toptal.com/developers/gitignore?templates=node

### Node ###
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# Snowpack dependency directory (https://snowpack.dev/)
web_modules/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional stylelint cache
.stylelintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt

# Gatsby files
.cache/
# Comment in the public line in if your project uses Gatsby and not Next.js
# https://nextjs.org/blog/next-9-1#public-directory-support
# public

# vuepress build output
.vuepress/dist

# vuepress v2.x temp and cache directory
.temp

# Docusaurus cache and generated files
.docusaurus

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*

### Node Patch ###
# Serverless Webpack directories
.webpack/

# Optional stylelint cache

# SvelteKit build / generate output
.svelte-kit

# End of https://www.toptal.com/developers/gitignore/api/node

dist
```

## File: .prettierrc
```
{
	"tabWidth": 4,
	"useTabs": true,
	"trailingComma": "none",
	"arrowParens": "avoid",
	"printWidth": 130
}
```

## File: manifest.json
```json
{
    "name": "Visualizer",
    "description": "Audio Visualizer for Spicetify",
    "preview": "resources/screenshot.png",
    "readme": "README.md",
    "authors": [
        { "name": "Konsl", "url": "https://github.com/Konsl" }
    ],
    "tags": ["visualizer"]
}
```

## File: package.json
```json
{
  "name": "spicetify-visualizer",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "spicetify-creator",
    "build-local": "spicetify-creator --out=dist --minify",
    "watch": "spicetify-creator --watch",
    "format": "prettier --write src/"
  },
  "license": "MIT",
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "prettier": "^3.5.0",
    "spicetify-creator": "^1.0.17"
  },
  "dependencies": {
    "fflate": "^0.8.2"
  }
}
```

## File: README.md
```markdown
# Spicetify Visualizer
formerly NCS Visualizer

### Audio Visualizer for Spicetify

---

For help with installing/uninstalling, check out the [Spicetify FAQ](https://spicetify.app/docs/faq) or ask on the [Spicetify Discord](https://discord.gg/VnevqPp2Rr).
If you're experiencing any issues specific to this extension, take a look at the [Issues](https://github.com/Konsl/spicetify-visualizer/issues) tab.
Check if an issue regarding your topic already exists, if not create a new one.

---

![preview](resources/screenshot.png)

### Installation
* Open the Spicetify config directory by running `spicetify config-dir` from the terminal
* Navigate to `CustomApps` and create a folder `visualizer`
* Download the files in the [dist branch](https://github.com/Konsl/spicetify-visualizer/archive/refs/heads/dist.zip) and copy the files (index.js, manifest.json, etc) into the `visualizer` folder
* Add the app to the Spicetify config by running `spicetify config custom_apps visualizer` from the terminal
* Re-apply Spicetify by running `spicetify apply` from the terminal

### Updating
* Open the Spicetify config directory by running `spicetify config-dir` from the terminal
* Navigate to `CustomApps` and into the folder `visualizer`
* Download the latest files from the [dist branch](https://github.com/Konsl/spicetify-visualizer/archive/refs/heads/dist.zip) and copy the files (index.js, manifest.json, etc) into the `visualizer` folder
* Re-apply Spicetify by running `spicetify apply` from the terminal

### Uninstallation
* Open the Spicetify config directory by running `spicetify config-dir` from the terminal
* Navigate to `CustomApps` and delete the folder `visualizer`
* Remove the app from the Spicetify config by running `spicetify config custom_apps visualizer-` from the terminal
* Re-apply Spicetify by running `spicetify apply` from the terminal

---

### Updating from old NCS Visualizer
* Open the Spicetify config directory by running `spicetify config-dir` from the terminal
* Navigate to `CustomApps` and delete the folder `ncs-visualizer`
* Remove the app from the Spicetify config by running `spicetify config custom_apps ncs-visualizer-` from the terminal
* Follow the new [Installation instructions](#installation)

---


If you have further issues you can open a ticket on [Discord](https://discord.gg/appzM48wXG).
[CSS Snippet for Compatibility with Comfy Theme](https://github.com/Konsl/spicetify-visualizer/issues/21#issuecomment-2050515422)
```

## File: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react",
    "module": "commonjs",
    "resolveJsonModule": true,
    "outDir": "dist",
    "typeRoots": ["./src/types/"],
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["./src/**/*.*"]
}
```
