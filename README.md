# Canvas Gauge

Hyper-realistic automotive gauges rendered entirely on HTML Canvas with spring-damper needle physics. Zero dependencies. ~6 KB gzipped.

**[Live Demo](https://ddrayne.github.io/canvas-gauge/)** | **[API Docs](https://ddrayne.github.io/canvas-gauge/docs.html)** | **[Interactive Builder](https://ddrayne.github.io/canvas-gauge/builder.html)**

![Canvas Gauge Demo](https://ddrayne.github.io/canvas-gauge/screenshots/cluster.png)

## Features

- **Procedural rendering** -- every pixel is generated on canvas, no images or external assets
- **Spring-damper physics** -- second-order needle animation with realistic overshoot and settling
- **Color theming** -- full control over face, needle, ticks, numbers, labels, and redline colors
- **Dark mode** -- `faceStyle: 'dark'` auto-inverts all defaults
- **Warning zones** -- multiple colored arc bands with configurable ranges
- **Digital readout** -- optional per-frame numeric display
- **Arbitrary text** -- place brand logos or labels anywhere on the gauge face
- **6 built-in presets** -- speed, RPM, volt, temp, oil pressure, oil level
- **Responsive** -- ResizeObserver-based, works at any size
- **HiDPI aware** -- crisp on Retina/4K displays
- **Accessible** -- ARIA labels updated with current value

## Quick Start

```html
<div id="my-gauge" style="width: 200px; aspect-ratio: 1"></div>

<script type="module">
  import { Gauge } from './src/index.js';

  const gauge = new Gauge(document.getElementById('my-gauge'), {
    min: 0,
    max: 140,
    label: 'MPH',
    units: 'MPH',
    majorTicks: 8,
  });

  gauge.setValue(60);
</script>
```

## Install

```bash
npm install canvas-gauge
```

```js
import { Gauge } from 'canvas-gauge';
```

Or use directly from source (no build step required):

```js
import { Gauge } from './src/index.js';
```

## Usage

### Presets

```js
// Built-in presets: speed, rpm, volt, temp, oilPressure, oilLevel
const speedo = new Gauge(element, 'speed');
const tacho = new Gauge(element, 'rpm');
```

### Custom Configuration

```js
const gauge = new Gauge(element, {
  min: 0,
  max: 200,
  label: 'KPH',
  units: 'km/h',
  majorTicks: 11,
  minorTicks: 2,
  startAngle: -225,
  endAngle: 45,
  stiffness: 120,    // spring stiffness (higher = faster)
  damping: 18,       // damping (higher = less bounce)
});
```

### Dark Mode + Zones + Colors

```js
const gauge = new Gauge(element, {
  min: 0,
  max: 120,
  label: 'POWER',
  units: 'kW',
  faceStyle: 'dark',
  showDigitalValue: true,
  colors: {
    needle: '#00AAFF',
  },
  zones: [
    { start: 80, end: 100, color: 'rgba(255, 165, 0, 0.15)' },
    { start: 100, end: 120, color: 'rgba(204, 32, 32, 0.15)' },
  ],
  texts: [
    { text: 'EV', x: 0, y: -0.25 },
  ],
});
```

### Methods

```js
gauge.setValue(75);                        // animated
gauge.setValue(75, { immediate: true });   // instant snap
gauge.sweep();                            // self-test sweep animation
gauge.destroy();                          // cleanup
```

### Properties

```js
gauge.value = 50;       // setter (animated)
gauge.value;            // getter
gauge.vibration = true; // enable needle jitter
```

### Events

```js
element.addEventListener('gauge:ready', () => { });
element.addEventListener('gauge:valuechange', (e) => {
  console.log(e.detail.value);
});
element.addEventListener('gauge:sweepcomplete', () => { });
```

## Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `min` | number | `0` | Minimum scale value |
| `max` | number | `100` | Maximum scale value |
| `label` | string | `''` | Main label on gauge face |
| `units` | string | `''` | Units text below label |
| `majorTicks` | number | `5` | Number of major tick marks |
| `minorTicks` | number | `4` | Minor ticks between each major |
| `startAngle` | number | `-225` | Start angle (degrees from 12 o'clock) |
| `endAngle` | number | `45` | End angle |
| `stiffness` | number | `120` | Spring stiffness |
| `damping` | number | `18` | Damping coefficient |
| `faceStyle` | string | `'light'` | `'light'` or `'dark'` |
| `colors` | object | `{}` | Color overrides (see below) |
| `zones` | array | `[]` | Warning/danger zone arcs |
| `texts` | array | `[]` | Arbitrary text placements |
| `showDigitalValue` | boolean | `false` | Show numeric readout |
| `redlineStart` | number | -- | Legacy redline start value |
| `dangerStart` | number | -- | Legacy danger zone start |
| `showOdometer` | boolean | `false` | Show odometer display |
| `customLabels` | string[] | -- | Custom tick labels |

### Colors Object

All keys optional. Unset keys auto-resolve based on `faceStyle`.

```js
colors: {
  face: '#FEFEFE',       // face gradient base
  needle: '#CC1010',     // needle gradient base
  ticks: '#1A1A1A',      // major tick color
  minorTicks: '#404040', // minor tick color
  numbers: '#1A1A1A',    // number text color
  label: '#2A2A2A',      // label text color
  units: '#555555',      // units text color
  redline: '#CC2020',    // redline/danger zone color
}
```

## Architecture

```
src/
  Gauge.js          -- Public API, animation loop, lifecycle
  GaugeRenderer.js  -- Canvas drawing, static layer caching, color system
  NeedlePhysics.js  -- Spring-damper model, 120Hz fixed timestep
  presets.js        -- Defaults and named presets
  index.js          -- Re-exports
```

**Rendering pipeline:** Static layers (bezel, face, ticks, numbers, zones, glass highlight) are pre-rendered to an OffscreenCanvas. Each animation frame composites the static image then draws the needle, center cap, and optional digital readout on top.

**Physics model:** `acceleration = stiffness * (target - angle) - damping * velocity`, integrated with semi-implicit Euler at 120Hz. A fixed-timestep accumulator ensures frame-rate independent behavior.

## Development

```bash
npm install
npm run dev      # localhost:3000
npm run build    # dist/canvas-gauge.js + dist/canvas-gauge.umd.cjs
```

## License

MIT
