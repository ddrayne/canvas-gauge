# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on localhost:3000
npm run build    # Build library → dist/canvas-gauge.js + dist/canvas-gauge.umd.cjs
npm run preview  # Preview production build
```

No test framework is configured. Verify changes visually via `npm run dev` — the demo page at `/index.html` renders all 6 preset gauges. Check `/docs.html` for live API examples and `/builder.html` for interactive config testing.

## Architecture

Zero-dependency canvas gauge library. Four source files in `src/`, three HTML demo pages at root.

### Core Classes

**Gauge** (`src/Gauge.js`) — Public API and orchestrator. Creates a `<canvas>` inside the given element, owns a `GaugeRenderer` and `NeedlePhysics` instance, and runs the `requestAnimationFrame` loop. Handles responsive sizing via `ResizeObserver` with DPI awareness.

**GaugeRenderer** (`src/GaugeRenderer.js`) — All canvas drawing. Static layers (bezel, face, ticks, numbers, zones, glass highlight) are pre-rendered once into an `OffscreenCanvas`. Per-frame layers (needle, center cap, digital readout) are drawn fresh each frame on top of the composited static image.

**NeedlePhysics** (`src/NeedlePhysics.js`) — Spring-damper model: `accel = stiffness * (target - angle) - damping * velocity`. Uses a fixed 120Hz timestep accumulator for frame-rate independent physics. Respects `prefers-reduced-motion`.

**presets.js** (`src/presets.js`) — Default config values and 6 named presets (speed, rpm, volt, temp, oilPressure, oilLevel). Constants `FIXED_TIMESTEP` and `MAX_FRAME_TIME` live here too.

### Rendering Pipeline

Static layers are expensive (gradients, shadows, text measurement) so they're cached:

```
Static (OffscreenCanvas, rebuilt on resize):
  OuterShadow → Bezel → InnerLip → Face → Texts → Zones → Ticks → Numbers → Label → [Odometer] → GlassHighlight

Per-frame (main canvas):
  Composite static image → Needle → CenterCap → [DigitalValue]
```

Rebuilding the renderer (`_rebuildRenderer()`) is triggered by `ResizeObserver`. Any config change that affects static layers requires a full rebuild — only physics (stiffness/damping) and value can be updated without rebuilding.

### Color System

`GaugeRenderer._buildColors()` resolves colors in two tiers:
1. Check `config.colors` (user overrides) for each key
2. Fall back to light or dark defaults based on `config.faceStyle`

Eight color keys: `face`, `needle`, `ticks`, `minorTicks`, `numbers`, `label`, `units`, `redline`. The needle gradient is generated programmatically from the base hex color via `_needleGradient()`.

### Config Resolution

In `Gauge._resolveConfig()`: if config is a string, look up `presets[name]` and merge with `defaults`. If it's an object, merge directly with `defaults`. The merged config is stored as `this._config`.

### Backward Compatibility

`drawZones()` handles both the modern `zones[]` array and the legacy `redlineStart`/`dangerStart` scalars. If `zones` is empty but `redlineStart` or `dangerStart` exists, a single zone is auto-generated.

### Sweep Animation

State machine in `Gauge`: `_sweepPhase` cycles through `'idle'` → `'up'` → `'down'`. During sweep, `setValue()` is blocked. Dispatches `gauge:sweepcomplete` when the needle settles back.

## HTML Pages

- `index.html` — Demo cluster (6 gauges, sliders, sweep test, random drive simulation)
- `docs.html` — API reference with live examples, sidebar nav with IntersectionObserver tracking
- `builder.html` — Interactive builder with bidirectional code/UI sync, drag-and-drop text positioning

All three share a nav bar and the same dark theme via CSS custom properties. They import from `./src/index.js` directly. GitHub Pages deploys the root directory via `.github/workflows/pages.yml`.

## Build

Vite library mode. Entry: `src/index.js`. Outputs ESM (`canvas-gauge.js`) and UMD (`canvas-gauge.umd.cjs`). The HTML pages are not part of the library build — they're served as-is for dev and Pages.

## Key Constraints & Gotchas

**Pixel-identical existing presets.** When adding new API features, the existing 6 presets must render identically. New config keys must default to inert values (empty arrays, `false`, etc.) so existing gauges are unaffected. Always verify the demo page after changes.

**Number positioning uses text measurement.** `drawNumbers()` measures the widest label with `ctx.measureText()` and positions all numbers so their outer edge sits a consistent gap inside the tick inner radius (`faceRadius * 0.72`). This replaced a naive size-threshold approach that broke at certain gauge sizes. Don't use `this.size > N` thresholds for layout — use measurement-based positioning instead.

**Static vs per-frame layer distinction matters.** Anything that changes with the gauge value (needle angle, digital readout) must be drawn in `Gauge._render()`, not in `renderStaticLayers()`. Static layers are only re-rendered on resize or config change. Putting per-frame content in static layers causes it to be stale.

**Gauge lifecycle on config change.** The builder demonstrates the pattern: `gauge.destroy()` → clear container → `new Gauge(container, config)` → `gauge.setValue(value, { immediate: true })`. There's no `updateConfig()` method — a full rebuild is required.

**Physics updates don't need rebuild.** Stiffness and damping can be set directly on `gauge._physics.stiffness` / `gauge._physics.damping` without destroying/recreating the gauge. The builder uses this for its physics sliders.

**Builder bidirectional sync.** The builder uses a `_suppressSync` flag to prevent circular updates between UI controls → code panel → gauge and vice versa. Any new control bindings must check this flag.

**`drawZones()` backward compat.** The method checks `zones[]` first. If empty, it falls back to auto-generating a zone from `redlineStart` or `dangerStart`. Both the modern and legacy patterns must continue working — existing presets like `rpm` use `redlineStart` and `temp` uses `dangerStart`.

**Needle gradient requires valid hex.** `_needleGradient()` parses 6-digit hex colors (`#RRGGBB`). It checks with a regex before calling and falls back to a solid fill if the color isn't valid hex. Non-hex color values (rgb(), named colors) won't get the 3D gradient effect.

**GitHub Pages serves root.** The Pages workflow uploads the entire repo root, so `src/`, `node_modules/` etc. are all accessible. The HTML pages import `./src/index.js` directly — this works because Vite handles module resolution in dev, and browsers handle ES module imports from Pages.

**GitHub remote:** `origin` → `git@github.com:ddrayne/canvas-gauge.git`
