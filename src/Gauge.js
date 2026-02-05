import { presets, defaults } from './presets.js';
import NeedlePhysics from './NeedlePhysics.js';
import GaugeRenderer from './GaugeRenderer.js';

// ═══════════════════════════════════════════════════════════════════════════
// GAUGE — Pure JS API (no web-component dependency)
// ═══════════════════════════════════════════════════════════════════════════

export default class Gauge {
  /**
   * @param {HTMLElement} element  Container element (gauge appends a <canvas> inside)
   * @param {string|object} config  Preset name (e.g. 'speed') or config object
   */
  constructor(element, config) {
    if (!element || !(element instanceof HTMLElement)) {
      throw new TypeError('Gauge requires a valid HTMLElement as the first argument');
    }
    this._element = element;

    // Internal state
    this._value = 0;
    this._targetValue = 0;
    this._size = null;
    this._dpi = window.devicePixelRatio || 1;
    this._renderer = null;
    this._physics = null;
    this._animationId = null;
    this._config = null;
    this._isConnected = false;

    // Sweep animation state
    this._isSweeping = false;
    this._sweepPhase = 'idle';  // 'idle' | 'up' | 'down'
    this._sweepStartTime = 0;

    // Canvas element
    this._canvas = null;
    this._ctx = null;

    // Resize observer for responsive sizing
    this._resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this._handleResize(entry.contentRect);
      }
    });

    // Resolve config
    this._resolveConfig(config);

    // Initialize synchronously
    this._initializeComponent();
    this._resizeObserver.observe(this._element);
    this._isConnected = true;
    this._startAnimation();

    this._element.dispatchEvent(new CustomEvent('gauge:ready'));
  }

  _resolveConfig(config) {
    if (typeof config === 'string') {
      if (!presets[config]) {
        console.warn(`Gauge: unknown preset "${config}", using defaults`);
      }
      this._config = { ...defaults, ...presets[config] };
      this._presetName = config;
    } else {
      this._config = { ...defaults, ...config };
      this._presetName = null;
    }
  }

  _initializeComponent() {
    // Create canvas and append to container
    this._canvas = document.createElement('canvas');
    this._canvas.style.width = '100%';
    this._canvas.style.height = '100%';
    this._canvas.style.display = 'block';
    this._canvas.setAttribute('role', 'img');
    this._canvas.setAttribute('aria-label', `${this._config.label} gauge`);
    this._element.appendChild(this._canvas);

    this._ctx = this._canvas.getContext('2d');

    // Initialize physics
    this._physics = new NeedlePhysics(this._config);

    // Enable vibration for RPM
    if (this._presetName === 'rpm') {
      this._physics.vibrationEnabled = false; // Disabled by default per spec
    }

    // Set initial value
    const initialValue = this._config.min;
    this._targetValue = initialValue;
    this._physics.setTarget(this._valueToAngle(initialValue), true);
  }

  _handleResize(rect) {
    const size = Math.min(rect.width, rect.height);

    if (size > 0 && (this._size !== size || !this._renderer)) {
      this._size = size;
      this._rebuildRenderer();
    }
  }

  _rebuildRenderer() {
    if (!this._size || this._size <= 0) return;

    // Check for DPI change
    const currentDpi = window.devicePixelRatio || 1;
    if (currentDpi !== this._dpi) {
      this._dpi = currentDpi;
    }

    // Resize canvas
    this._canvas.width = this._size * this._dpi;
    this._canvas.height = this._size * this._dpi;

    // Update aria-label
    this._canvas.setAttribute('aria-label',
      `${this._config.label} gauge, current value: ${this._targetValue}`);

    // Create new renderer with pre-rendered static layers
    this._renderer = new GaugeRenderer(this._size, this._dpi, this._config);

    // Update physics if config changed
    if (this._physics) {
      this._physics.stiffness = this._config.stiffness;
      this._physics.damping = this._config.damping;
    }
  }

  _valueToAngle(value) {
    if (!this._config) return 0;

    // Guard against invalid value
    if (!isFinite(value)) value = this._config.min;

    const range = this._config.max - this._config.min;
    // Guard against zero range
    if (range === 0) return 0;

    const normalized = (value - this._config.min) / range;
    const clamped = Math.max(0, Math.min(1, normalized));

    const startAngle = (this._config.startAngle - 90) * Math.PI / 180;
    const endAngle = (this._config.endAngle - 90) * Math.PI / 180;

    const result = startAngle + clamped * (endAngle - startAngle);
    return isFinite(result) ? result : 0;
  }

  _startAnimation() {
    const animate = (timestamp) => {
      if (!this._isConnected) return;

      this._render(timestamp);
      this._animationId = requestAnimationFrame(animate);
    };

    this._animationId = requestAnimationFrame(animate);
  }

  _render(timestamp) {
    if (!this._renderer || !this._ctx || !this._physics) return;
    if (!this._size || this._size <= 0) return;

    const ctx = this._ctx;
    const size = this._size;
    const dpi = this._dpi;
    const center = size / 2;
    const radius = size * 0.45;

    // Handle sweep animation
    if (this._isSweeping) {
      this._updateSweep(timestamp);
    }

    // Update physics and get current angle
    let currentAngle = this._physics.update(timestamp);

    // Guard against NaN angle
    if (!isFinite(currentAngle)) {
      currentAngle = this._valueToAngle(this._config.min);
      this._physics.angle = currentAngle;
      this._physics.velocity = 0;
    }

    // Clear and scale
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size * dpi, size * dpi);
    ctx.scale(dpi, dpi);

    // Draw cached static layers
    ctx.drawImage(this._renderer.staticCanvas, 0, 0, size, size);

    // Draw animated needle
    this._renderer.drawNeedle(ctx, center, radius, currentAngle);

    // Draw center cap (on top of needle)
    this._renderer.drawCenterCap(ctx, center, radius);

    // Draw digital value display (per-frame, since value changes)
    if (this._config.showDigitalValue) {
      this._renderer.drawDigitalValue(ctx, center, radius, this._targetValue, this._config.units);
    }
  }

  _updateSweep(timestamp) {
    const elapsed = timestamp - this._sweepStartTime;
    const sweepDuration = 800;  // ms per direction

    if (this._sweepPhase === 'up') {
      if (elapsed >= sweepDuration) {
        this._sweepPhase = 'down';
        this._sweepStartTime = timestamp;
        this._physics.setTarget(this._valueToAngle(this._config.min));
      }
    } else if (this._sweepPhase === 'down') {
      if (this._physics.isSettled(0.01)) {
        this._isSweeping = false;
        this._sweepPhase = 'idle';
        // Return to actual target value
        this._physics.setTarget(this._valueToAngle(this._targetValue));
        this._element.dispatchEvent(new CustomEvent('gauge:sweepcomplete'));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════

  setValue(value, options = {}) {
    const { immediate = false } = options;

    this._targetValue = value;

    if (!this._isSweeping && this._physics) {
      this._physics.setTarget(this._valueToAngle(value), immediate);

      // Update aria-label
      if (this._canvas) {
        this._canvas.setAttribute('aria-label',
          `${this._config.label} gauge, current value: ${Math.round(value)}`);
      }

      this._element.dispatchEvent(new CustomEvent('gauge:valuechange', {
        detail: { value }
      }));
    }
  }

  sweep() {
    if (!this._physics || !this._config) return;

    this._isSweeping = true;
    this._sweepPhase = 'up';
    this._sweepStartTime = performance.now();

    // Sweep to max
    this._physics.setTarget(this._valueToAngle(this._config.max));
  }

  get value() {
    return this._targetValue;
  }

  set value(val) {
    this.setValue(val);
  }

  // Enable/disable RPM vibration
  set vibration(enabled) {
    if (this._physics) {
      this._physics.vibrationEnabled = enabled;
    }
  }

  destroy() {
    this._isConnected = false;
    this._resizeObserver.disconnect();
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
  }
}
