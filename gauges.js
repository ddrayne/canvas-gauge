/**
 * Hyper-Realistic Car Gauge Cluster Web Components
 * 
 * Technical Approach: Canvas 2D + OffscreenCanvas pre-rendering
 * ─────────────────────────────────────────────────────────────
 * Justification: Canvas 2D provides the best realism/complexity/performance 
 * tradeoff for UI components. OffscreenCanvas enables pre-rendering static 
 * layers (bezel, face, ticks) which are composited with the animated needle 
 * each frame. This avoids redrawing complex gradients at 60fps while 
 * maintaining visual quality.
 * 
 * Physics: Second-order spring-damper system for needle motion. Uses fixed 
 * timestep accumulator for frame-rate independent animation. Parameters 
 * (stiffness, damping) tuned per gauge type for realistic instrument feel.
 * 
 * All graphics are procedurally generated - no external assets required.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

const GAUGE_CONFIGS = {
  speed: {
    min: 0,
    max: 140,
    units: 'MPH',
    label: 'MPH',
    majorTicks: 8,       // 0, 20, 40, 60, 80, 100, 120, 140
    minorTicks: 4,       // Between each major (every 5 mph)
    startAngle: -225,    // degrees from 12 o'clock
    endAngle: 45,
    stiffness: 120,
    damping: 18,
    showOdometer: false
  },
  rpm: {
    min: 0,
    max: 80,             // x1000
    units: '×1000',
    label: 'RPM',
    majorTicks: 9,       // 0, 10, 20, ... 80
    minorTicks: 5,
    startAngle: -225,
    endAngle: 45,
    stiffness: 150,
    damping: 16,
    redlineStart: 60
  },
  volt: {
    min: 8,
    max: 16,
    units: 'V',
    label: 'VOLT',
    majorTicks: 5,       // 8, 10, 12, 14, 16
    minorTicks: 2,
    startAngle: -135,
    endAngle: -45,
    stiffness: 200,
    damping: 22
  },
  temp: {
    min: 100,
    max: 250,
    units: '°F',
    label: 'TEMP',
    majorTicks: 4,       // 100, 150, 200, 250
    minorTicks: 5,
    startAngle: -135,
    endAngle: -45,
    stiffness: 80,
    damping: 20,
    dangerStart: 220
  },
  oilPressure: {
    min: 0,
    max: 80,
    units: 'PSI',
    label: 'OIL',
    majorTicks: 5,       // 0, 20, 40, 60, 80
    minorTicks: 4,
    startAngle: -135,
    endAngle: -45,
    stiffness: 100,
    damping: 18
  },
  oilLevel: {
    min: 0,
    max: 1,
    units: '',
    label: 'OIL',
    customLabels: ['E', '', 'F'],  // Empty / Half / Full
    majorTicks: 3,
    minorTicks: 0,
    startAngle: -135,
    endAngle: -45,
    stiffness: 60,
    damping: 25
  }
};

// Physics constants
const FIXED_TIMESTEP = 1 / 120;  // 120Hz physics for smooth motion
const MAX_FRAME_TIME = 0.1;      // Cap to prevent spiral of death

// ═══════════════════════════════════════════════════════════════════════════
// SPRING-DAMPER NEEDLE PHYSICS MODEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Second-order spring-damper system for realistic needle motion.
 * 
 * The equation of motion is:
 *   acceleration = stiffness * (target - angle) - damping * velocity
 * 
 * This produces:
 *   - Overshoot on rapid value changes (realistic instrument behavior)
 *   - Smooth settling without jitter
 *   - Physically plausible motion that "feels" like a real gauge
 */
class NeedlePhysics {
  constructor(config) {
    this.angle = 0;           // Current needle angle (radians)
    this.velocity = 0;        // Angular velocity (rad/s)
    this.targetAngle = 0;     // Target angle from value

    // Spring-damper parameters (tuned per gauge type)
    this.stiffness = config.stiffness || 120;
    this.damping = config.damping || 18;
    this.maxVelocity = config.maxVelocity || 20;      // rad/s
    this.maxAccel = config.maxAccel || 100;           // rad/s²

    // Fixed timestep accumulator
    this.accumulator = 0;
    this.lastTime = null;

    // Vibration effect (RPM only)
    this.vibrationEnabled = false;
    this.vibrationAmount = 0.002;  // radians

    // Reduced motion support
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  setTarget(angle, immediate = false) {
    this.targetAngle = angle;

    if (immediate || this.reducedMotion) {
      this.angle = angle;
      this.velocity = 0;
    }
  }

  update(currentTime) {
    if (this.lastTime === null) {
      this.lastTime = currentTime;
      return this.angle;
    }

    let frameTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Guard against invalid frame time
    if (!isFinite(frameTime) || frameTime < 0) {
      frameTime = 0;
    }

    // Cap frame time to prevent instability after tab switch
    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME;
    }

    // Reduced motion: snap to target
    if (this.reducedMotion) {
      this.angle = this.targetAngle;
      this.velocity = 0;
      return this.angle;
    }

    // Fixed timestep accumulator for frame-rate independent physics
    this.accumulator += frameTime;

    while (this.accumulator >= FIXED_TIMESTEP) {
      this.step(FIXED_TIMESTEP);
      this.accumulator -= FIXED_TIMESTEP;
    }

    // Add subtle vibration if enabled (RPM gauge effect)
    let outputAngle = this.angle;
    if (this.vibrationEnabled && Math.abs(this.targetAngle) > 0.1) {
      outputAngle += (Math.random() - 0.5) * this.vibrationAmount * (this.targetAngle / Math.PI);
    }

    return outputAngle;
  }

  step(dt) {
    // Spring-damper equation
    const displacement = this.targetAngle - this.angle;
    let acceleration = this.stiffness * displacement - this.damping * this.velocity;

    // Clamp acceleration
    acceleration = Math.max(-this.maxAccel, Math.min(this.maxAccel, acceleration));

    // Integration (semi-implicit Euler for stability)
    this.velocity += acceleration * dt;

    // Clamp velocity
    this.velocity = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, this.velocity));

    this.angle += this.velocity * dt;
  }

  // Check if needle has settled (for sweep animation completion)
  isSettled(threshold = 0.001) {
    const angleDiff = Math.abs(this.angle - this.targetAngle);
    const velMag = Math.abs(this.velocity);
    // Guard against NaN
    if (!isFinite(angleDiff) || !isFinite(velMag)) return true;
    return angleDiff < threshold && velMag < threshold;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURAL GRAPHICS GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Procedurally generates all gauge graphics without external assets.
 * Each gauge caches its static layers in an OffscreenCanvas for
 * maximum performance during animation.
 */
class GaugeRenderer {
  constructor(size, dpi, config) {
    this.size = size;
    this.dpi = dpi;
    this.config = config;
    this.scaledSize = size * dpi;

    // Create offscreen canvas for static layers
    this.staticCanvas = new OffscreenCanvas(this.scaledSize, this.scaledSize);
    this.staticCtx = this.staticCanvas.getContext('2d');
    this.staticCtx.scale(dpi, dpi);

    // Pre-render static layers
    this.renderStaticLayers();
  }

  renderStaticLayers() {
    const ctx = this.staticCtx;
    const size = this.size;
    const center = size / 2;
    const radius = size * 0.45;

    ctx.clearRect(0, 0, size, size);

    // Layer 1: Outer shadow (depth)
    this.drawOuterShadow(ctx, center, radius);

    // Layer 2: Metallic bezel
    this.drawBezel(ctx, center, radius);

    // Layer 3: Inner lip shadow
    this.drawInnerLip(ctx, center, radius);

    // Layer 4: Gauge face
    this.drawFace(ctx, center, radius);

    // Layer 4.5: Redline arc band
    this.drawRedlineArc(ctx, center, radius);

    // Layer 5: Tick marks
    this.drawTicks(ctx, center, radius);

    // Layer 6: Numbers
    this.drawNumbers(ctx, center, radius);

    // Layer 7: Label
    this.drawLabel(ctx, center, radius);

    // Layer 8: Odometer (speed gauge only)
    if (this.config.showOdometer) {
      this.drawOdometer(ctx, center, radius);
    }

    // Layer 9: Glass highlight (top layer)
    this.drawGlassHighlight(ctx, center, radius);
  }

  drawOuterShadow(ctx, center, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.restore();
  }

  drawBezel(ctx, center, radius) {
    const bezelWidth = radius * 0.12;
    const outerRadius = radius + bezelWidth / 2;

    // Main bezel ring with metallic gradient
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
    ctx.arc(center, center, radius - bezelWidth * 0.3, 0, Math.PI * 2, true);
    ctx.closePath();

    // Metallic gradient (top-left highlight, bottom-right shadow)
    const gradient = ctx.createLinearGradient(
      center - radius, center - radius,
      center + radius, center + radius
    );
    gradient.addColorStop(0, '#E8E8E8');     // Bright highlight
    gradient.addColorStop(0.2, '#C8C8C8');    // Light silver
    gradient.addColorStop(0.4, '#A0A0A0');    // Mid silver
    gradient.addColorStop(0.6, '#787878');    // Darker silver
    gradient.addColorStop(0.8, '#585858');    // Dark
    gradient.addColorStop(1, '#404040');      // Shadow

    ctx.fillStyle = gradient;
    ctx.fill();

    // Inner bevel highlight
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Outer bevel shadow
    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  drawInnerLip(ctx, center, radius) {
    const lipRadius = radius * 0.92;

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, lipRadius, 0, Math.PI * 2);

    // Inner shadow gradient
    const gradient = ctx.createRadialGradient(
      center, center, lipRadius * 0.85,
      center, center, lipRadius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  drawFace(ctx, center, radius) {
    const faceRadius = radius * 0.88;

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, faceRadius, 0, Math.PI * 2);

    // Off-white radial gradient (brighter center)
    const gradient = ctx.createRadialGradient(
      center - faceRadius * 0.2, center - faceRadius * 0.2, 0,
      center, center, faceRadius
    );
    gradient.addColorStop(0, '#FEFEFE');     // Bright white center
    gradient.addColorStop(0.3, '#F8F8F6');   // Slight warmth
    gradient.addColorStop(0.7, '#F0F0EC');   // Subtle cream
    gradient.addColorStop(1, '#E8E8E4');     // Edge tone

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  drawRedlineArc(ctx, center, radius) {
    if (!this.config.redlineStart) return;

    const config = this.config;
    const faceRadius = radius * 0.88;
    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;
    const totalAngle = endAngle - startAngle;

    const redlineAngle = startAngle + ((config.redlineStart - config.min) / (config.max - config.min)) * totalAngle;

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, faceRadius * 0.88, redlineAngle, endAngle);
    ctx.arc(center, center, faceRadius * 0.72, endAngle, redlineAngle, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(204, 32, 32, 0.15)';
    ctx.fill();
    ctx.restore();
  }

  drawTicks(ctx, center, radius) {
    const faceRadius = radius * 0.88;
    const config = this.config;
    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;
    const totalAngle = endAngle - startAngle;

    ctx.save();
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineCap = 'round';

    // Major ticks
    const majorCount = config.majorTicks;
    for (let i = 0; i < majorCount; i++) {
      const angle = startAngle + (i / (majorCount - 1)) * totalAngle;
      const innerRadius = faceRadius * 0.72;
      const outerRadius = faceRadius * 0.88;

      // Check if in danger zone (temp/rpm redline)
      const value = config.min + (i / (majorCount - 1)) * (config.max - config.min);
      const isDanger = (config.redlineStart && value >= config.redlineStart) ||
        (config.dangerStart && value >= config.dangerStart);

      ctx.beginPath();
      ctx.moveTo(
        center + Math.cos(angle) * innerRadius,
        center + Math.sin(angle) * innerRadius
      );
      ctx.lineTo(
        center + Math.cos(angle) * outerRadius,
        center + Math.sin(angle) * outerRadius
      );
      ctx.strokeStyle = isDanger ? '#CC2020' : '#1A1A1A';
      ctx.lineWidth = this.size > 150 ? 2.5 : 2;
      ctx.stroke();
    }

    // Minor ticks
    if (config.minorTicks > 0) {
      const totalMinor = (majorCount - 1) * config.minorTicks;
      for (let i = 0; i <= totalMinor; i++) {
        if (i % config.minorTicks === 0) continue; // Skip major tick positions

        const angle = startAngle + (i / totalMinor) * totalAngle;
        const innerRadius = faceRadius * 0.80;
        const outerRadius = faceRadius * 0.88;

        ctx.beginPath();
        ctx.moveTo(
          center + Math.cos(angle) * innerRadius,
          center + Math.sin(angle) * innerRadius
        );
        ctx.lineTo(
          center + Math.cos(angle) * outerRadius,
          center + Math.sin(angle) * outerRadius
        );
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawNumbers(ctx, center, radius) {
    const faceRadius = radius * 0.88;
    const config = this.config;
    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;
    const totalAngle = endAngle - startAngle;

    ctx.save();

    // Condensed italic font stack (no external fonts)
    // Use smaller font for gauges with many ticks
    const baseFontSize = this.size > 150 ? this.size * 0.07 : this.size * 0.085;
    const fontSize = config.majorTicks > 6 ? baseFontSize * 0.78 : baseFontSize;
    ctx.font = `italic ${fontSize}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = '#1A1A1A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const majorCount = config.majorTicks;
    const numberRadius = faceRadius * 0.56;  // Push numbers further out

    for (let i = 0; i < majorCount; i++) {
      const angle = startAngle + (i / (majorCount - 1)) * totalAngle;
      const x = center + Math.cos(angle) * numberRadius;
      const y = center + Math.sin(angle) * numberRadius;

      let label;
      if (config.customLabels) {
        label = config.customLabels[i] || '';
      } else {
        const value = config.min + (i / (majorCount - 1)) * (config.max - config.min);
        label = Math.round(value).toString();
      }

      // Danger zone coloring
      const value = config.min + (i / (majorCount - 1)) * (config.max - config.min);
      const isDanger = (config.redlineStart && value >= config.redlineStart) ||
        (config.dangerStart && value >= config.dangerStart);
      ctx.fillStyle = isDanger ? '#CC2020' : '#1A1A1A';

      ctx.fillText(label, x, y);
    }

    ctx.restore();
  }

  drawLabel(ctx, center, radius) {
    const config = this.config;

    ctx.save();

    const fontSize = this.size > 150 ? this.size * 0.065 : this.size * 0.08;
    ctx.font = `bold ${fontSize}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = '#2A2A2A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Position label in lower portion of gauge
    const labelY = center + radius * 0.28;
    ctx.fillText(config.label, center, labelY);

    // Draw units text below label if different from label (e.g., "×1000" below "RPM")
    if (config.units && config.units !== config.label) {
      const unitsFontSize = fontSize * 0.55;
      ctx.font = `bold ${unitsFontSize}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = '#555555';
      ctx.fillText(config.units, center, labelY + fontSize * 0.85);
    }

    ctx.restore();
  }

  drawOdometer(ctx, center, radius) {
    const width = radius * 0.5;
    const height = radius * 0.15;
    const x = center - width / 2;
    const y = center + radius * 0.15;

    ctx.save();

    // Dark background
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 3);
    ctx.fill();

    // Inner bevel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Odometer digits
    const digitSize = height * 0.7;
    ctx.font = `${digitSize}px "Courier New", monospace`;
    ctx.fillStyle = '#E0E0E0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('012345', center, y + height / 2);

    ctx.restore();
  }

  drawGlassHighlight(ctx, center, radius) {
    const faceRadius = radius * 0.88;

    ctx.save();

    // Curved highlight streak across upper arc
    ctx.beginPath();
    ctx.ellipse(
      center,
      center - faceRadius * 0.35,
      faceRadius * 0.7,
      faceRadius * 0.25,
      0,
      Math.PI * 0.15,
      Math.PI * 0.85
    );

    const highlightGradient = ctx.createLinearGradient(
      center, center - faceRadius * 0.6,
      center, center - faceRadius * 0.1
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = highlightGradient;
    ctx.fill();

    // Subtle vignette around edges
    ctx.beginPath();
    ctx.arc(center, center, faceRadius, 0, Math.PI * 2);

    const vignetteGradient = ctx.createRadialGradient(
      center, center, faceRadius * 0.5,
      center, center, faceRadius
    );
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)');

    ctx.fillStyle = vignetteGradient;
    ctx.fill();

    ctx.restore();
  }

  // Draw the needle (called each frame)
  drawNeedle(ctx, center, radius, angle) {
    const needleLength = radius * 0.70;
    const needleWidth = radius * 0.04;
    const tailLength = radius * 0.15;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);

    // Needle shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Needle body - red with darker core
    ctx.beginPath();
    ctx.moveTo(-tailLength, 0);
    ctx.lineTo(-needleWidth * 1.5, -needleWidth);
    ctx.lineTo(needleLength - needleWidth * 2, -needleWidth * 0.4);
    ctx.lineTo(needleLength, 0);
    ctx.lineTo(needleLength - needleWidth * 2, needleWidth * 0.4);
    ctx.lineTo(-needleWidth * 1.5, needleWidth);
    ctx.closePath();

    // Red gradient with darker core
    const needleGradient = ctx.createLinearGradient(0, -needleWidth, 0, needleWidth);
    needleGradient.addColorStop(0, '#FF3030');
    needleGradient.addColorStop(0.3, '#CC1010');
    needleGradient.addColorStop(0.5, '#AA0000');
    needleGradient.addColorStop(0.7, '#CC1010');
    needleGradient.addColorStop(1, '#FF3030');

    ctx.fillStyle = needleGradient;
    ctx.fill();

    // Needle outline for definition
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // Draw center cap (called each frame, on top of needle)
  drawCenterCap(ctx, center, radius) {
    const capRadius = radius * 0.10;

    ctx.save();

    // Shadow
    ctx.beginPath();
    ctx.arc(center, center, capRadius, 0, Math.PI * 2);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;

    // Dark metallic gradient
    const gradient = ctx.createRadialGradient(
      center - capRadius * 0.3, center - capRadius * 0.3, 0,
      center, center, capRadius
    );
    gradient.addColorStop(0, '#606060');
    gradient.addColorStop(0.3, '#404040');
    gradient.addColorStop(0.7, '#2A2A2A');
    gradient.addColorStop(1, '#1A1A1A');

    ctx.fillStyle = gradient;
    ctx.fill();

    // Highlight ring
    ctx.beginPath();
    ctx.arc(center, center, capRadius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // Convert value to angle
  valueToAngle(value) {
    const config = this.config;
    const normalized = (value - config.min) / (config.max - config.min);
    const clamped = Math.max(0, Math.min(1, normalized));

    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;

    return startAngle + clamped * (endAngle - startAngle);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CAR-GAUGE WEB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

class CarGauge extends HTMLElement {
  static observedAttributes = ['type', 'value', 'min', 'max', 'units', 'label', 'size'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

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
  }

  connectedCallback() {
    this._isConnected = true;
    this._initializeComponent();
    this._resizeObserver.observe(this);
    this._startAnimation();

    this.dispatchEvent(new CustomEvent('ready'));
  }

  disconnectedCallback() {
    this._isConnected = false;
    this._resizeObserver.disconnect();
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._isConnected) return;

    if (name === 'value') {
      this.setValue(parseFloat(newValue) || 0);
    } else if (name === 'type' || name === 'min' || name === 'max' ||
      name === 'units' || name === 'label' || name === 'size') {
      this._rebuildRenderer();
    }
  }

  _initializeComponent() {
    // Get configuration
    const type = this.getAttribute('type') || 'speed';
    this._config = this._buildConfig(type);

    // Build shadow DOM
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          aspect-ratio: 1;
          contain: layout style paint;
        }
        canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>
      <canvas role="img" aria-label="${this._config.label} gauge"></canvas>
    `;

    this._canvas = this.shadowRoot.querySelector('canvas');
    this._ctx = this._canvas.getContext('2d');

    // Initialize physics
    this._physics = new NeedlePhysics(this._config);

    // Enable vibration for RPM
    if (type === 'rpm') {
      this._physics.vibrationEnabled = false; // Disabled by default per spec
    }

    // Set initial value
    const initialValue = parseFloat(this.getAttribute('value')) || this._config.min;
    this._targetValue = initialValue;
    this._physics.setTarget(this._valueToAngle(initialValue), true);
  }

  _buildConfig(type) {
    const baseConfig = GAUGE_CONFIGS[type] || GAUGE_CONFIGS.speed;

    // Helper to parse float with fallback (parseFloat returns NaN for null, ?? doesn't catch NaN)
    const parseFloatOr = (val, fallback) => {
      const parsed = parseFloat(val);
      return isFinite(parsed) ? parsed : fallback;
    };

    return {
      ...baseConfig,
      min: parseFloatOr(this.getAttribute('min'), baseConfig.min),
      max: parseFloatOr(this.getAttribute('max'), baseConfig.max),
      units: this.getAttribute('units') ?? baseConfig.units,
      label: this.getAttribute('label') ?? baseConfig.label
    };
  }

  _handleResize(rect) {
    const size = Math.min(rect.width, rect.height);
    const explicitSize = this.getAttribute('size');
    const targetSize = explicitSize ? parseInt(explicitSize) : size;

    if (targetSize > 0 && (this._size !== targetSize || !this._renderer)) {
      this._size = targetSize;
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

    // Reconfigure
    const type = this.getAttribute('type') || 'speed';
    this._config = this._buildConfig(type);

    // Resize canvas
    this._canvas.width = this._size * this._dpi;
    this._canvas.height = this._size * this._dpi;

    // Update aria-label
    this._canvas.setAttribute('aria-label', `${this._config.label} gauge, current value: ${this._targetValue}`);

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

      this.dispatchEvent(new CustomEvent('valuechange', {
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
}

// ═══════════════════════════════════════════════════════════════════════════
// CAR-GAUGE-CLUSTER WEB COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

class CarGaugeCluster extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._gauges = {};
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .cluster {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 24px;
          background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%);
          border-radius: 16px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        
        .large-gauges {
          display: contents;
        }
        
        .large-gauge {
          aspect-ratio: 1;
          max-width: 100%;
        }
        
        .small-gauges {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        
        .small-gauge {
          aspect-ratio: 1;
        }
        
        /* Responsive: stack on narrow screens */
        @media (max-width: 600px) {
          .cluster {
            grid-template-columns: 1fr;
            padding: 16px;
          }
          
          .small-gauges {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      </style>
      
      <div class="cluster">
        <car-gauge class="large-gauge" type="speed" value="0"></car-gauge>
        <car-gauge class="large-gauge" type="rpm" value="0"></car-gauge>
        
        <div class="small-gauges">
          <car-gauge class="small-gauge" type="volt" value="12"></car-gauge>
          <car-gauge class="small-gauge" type="temp" value="180"></car-gauge>
          <car-gauge class="small-gauge" type="oilPressure" value="40"></car-gauge>
          <car-gauge class="small-gauge" type="oilLevel" value="0.75"></car-gauge>
        </div>
      </div>
    `;

    // Store references to gauges
    this._gauges = {
      speed: this.shadowRoot.querySelector('[type="speed"]'),
      rpm: this.shadowRoot.querySelector('[type="rpm"]'),
      volt: this.shadowRoot.querySelector('[type="volt"]'),
      temp: this.shadowRoot.querySelector('[type="temp"]'),
      oilPressure: this.shadowRoot.querySelector('[type="oilPressure"]'),
      oilLevel: this.shadowRoot.querySelector('[type="oilLevel"]')
    };
  }

  // Set individual gauge value
  setGaugeValue(type, value, options = {}) {
    const gauge = this._gauges[type];
    if (gauge) {
      gauge.setValue(value, options);
    }
  }

  // Set multiple gauge values at once
  setValues(values, options = {}) {
    for (const [type, value] of Object.entries(values)) {
      this.setGaugeValue(type, value, options);
    }
  }

  // Sweep all gauges (startup self-test animation)
  sweep() {
    // Stagger the sweep for dramatic effect
    Object.values(this._gauges).forEach((gauge, index) => {
      setTimeout(() => gauge.sweep(), index * 100);
    });
  }

  // Get gauge reference
  getGauge(type) {
    return this._gauges[type];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

customElements.define('car-gauge', CarGauge);
customElements.define('car-gauge-cluster', CarGaugeCluster);

export { CarGauge, CarGaugeCluster, GAUGE_CONFIGS };
