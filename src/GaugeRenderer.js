// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURAL GRAPHICS GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Procedurally generates all gauge graphics without external assets.
 * Each gauge caches its static layers in an OffscreenCanvas for
 * maximum performance during animation.
 */
export default class GaugeRenderer {
  constructor(size, dpi, config) {
    this.size = size;
    this.dpi = dpi;
    this.config = config;
    this.scaledSize = size * dpi;

    // Resolve colors based on faceStyle and user overrides
    this._resolvedColors = this._buildColors(config);

    // Create offscreen canvas for static layers (fall back to regular canvas for Safari <17)
    this.staticCanvas = this._createOffscreenCanvas(this.scaledSize, this.scaledSize);
    this.staticCtx = this.staticCanvas.getContext('2d');
    this.staticCtx.scale(dpi, dpi);

    // Pre-render static layers
    this.renderStaticLayers();
  }

  _createOffscreenCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
      const oc = new OffscreenCanvas(width, height);
      if (oc.getContext('2d')) return oc;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COLOR SYSTEM
  // ═══════════════════════════════════════════════════════════════════════

  _buildColors(config) {
    const userColors = config.colors || {};
    const isDark = config.faceStyle === 'dark';

    const lightDefaults = {
      face: '#FEFEFE',
      needle: '#CC1010',
      ticks: '#1A1A1A',
      minorTicks: '#404040',
      numbers: '#1A1A1A',
      label: '#2A2A2A',
      units: '#555555',
      redline: '#CC2020',
    };

    const darkDefaults = {
      face: '#1A1A1A',
      needle: '#CC1010',
      ticks: '#E0E0E0',
      minorTicks: '#888888',
      numbers: '#D0D0D0',
      label: '#E0E0E0',
      units: '#AAAAAA',
      redline: '#FF4040',
    };

    const base = isDark ? darkDefaults : lightDefaults;

    // User colors override defaults
    return {
      face: userColors.face || base.face,
      needle: userColors.needle || base.needle,
      ticks: userColors.ticks || base.ticks,
      minorTicks: userColors.minorTicks || base.minorTicks,
      numbers: userColors.numbers || base.numbers,
      label: userColors.label || base.label,
      units: userColors.units || base.units,
      redline: userColors.redline || base.redline,
    };
  }

  _needleGradient(ctx, baseColor, needleWidth) {
    // Parse hex to RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    const lighter = `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`;
    const darker = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 16)}, ${Math.max(0, b - 16)})`;
    const base = `rgb(${r}, ${g}, ${b})`;

    const gradient = ctx.createLinearGradient(0, -needleWidth, 0, needleWidth);
    gradient.addColorStop(0, lighter);
    gradient.addColorStop(0.3, base);
    gradient.addColorStop(0.5, darker);
    gradient.addColorStop(0.7, base);
    gradient.addColorStop(1, lighter);
    return gradient;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STATIC LAYER PIPELINE
  // ═══════════════════════════════════════════════════════════════════════

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

    // Layer 4.25: Arbitrary text labels (on face, under ticks)
    this.drawTexts(ctx, center, radius);

    // Layer 4.5: Warning zones (replaces old redline-only arc)
    this.drawZones(ctx, center, radius);

    // Layer 4.75: Micro ticks (dense outer ring)
    if (this.config.microTicks) {
      this.drawMicroTicks(ctx, center, radius);
    }

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

    // Layer 9: Inner ring (frames the digital display area)
    if (this.config.innerRing) {
      this.drawInnerRing(ctx, center, radius);
    }

    // Layer 10: Glass highlight (top layer)
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
    const colors = this._resolvedColors;
    const isDark = this.config.faceStyle === 'dark';

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, faceRadius, 0, Math.PI * 2);

    if (isDark) {
      const gradient = ctx.createRadialGradient(
        center - faceRadius * 0.2, center - faceRadius * 0.2, 0,
        center, center, faceRadius
      );
      // Parse the face color for gradient generation
      const base = colors.face;
      gradient.addColorStop(0, this._lightenColor(base, 20));
      gradient.addColorStop(0.3, base);
      gradient.addColorStop(0.7, this._darkenColor(base, 10));
      gradient.addColorStop(1, this._darkenColor(base, 20));
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createRadialGradient(
        center - faceRadius * 0.2, center - faceRadius * 0.2, 0,
        center, center, faceRadius
      );
      const base = colors.face;
      gradient.addColorStop(0, base);
      gradient.addColorStop(0.3, this._darkenColor(base, 3));
      gradient.addColorStop(0.7, this._darkenColor(base, 7));
      gradient.addColorStop(1, this._darkenColor(base, 12));
      ctx.fillStyle = gradient;
    }

    ctx.fill();
    ctx.restore();
  }

  drawZones(ctx, center, radius) {
    const config = this.config;
    const faceRadius = radius * 0.88;
    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;
    const totalAngle = endAngle - startAngle;
    const range = config.max - config.min;

    let zones = config.zones;

    // Backward compat: auto-generate zone from redlineStart or dangerStart
    if ((!zones || zones.length === 0) && (config.redlineStart || config.dangerStart)) {
      const start = config.redlineStart || config.dangerStart;
      zones = [{ start, end: config.max, color: `rgba(204, 32, 32, 0.15)` }];
    }

    if (!zones || zones.length === 0) return;

    ctx.save();
    for (const zone of zones) {
      const zoneStartAngle = startAngle + ((zone.start - config.min) / range) * totalAngle;
      const zoneEndAngle = startAngle + ((zone.end - config.min) / range) * totalAngle;

      const outerR = zone.offset != null ? faceRadius * zone.offset : faceRadius * 0.88;
      const zoneWidth = zone.width != null ? faceRadius * zone.width : outerR - faceRadius * 0.72;
      const innerR = outerR - zoneWidth;

      ctx.beginPath();
      ctx.arc(center, center, outerR, zoneStartAngle, zoneEndAngle);
      ctx.arc(center, center, innerR, zoneEndAngle, zoneStartAngle, true);
      ctx.closePath();
      ctx.fillStyle = zone.color;
      ctx.fill();
    }
    ctx.restore();
  }

  drawTexts(ctx, center, radius) {
    const texts = this.config.texts;
    if (!texts || texts.length === 0) return;

    const colors = this._resolvedColors;
    const baseFontSize = this.size * 0.045;
    const defaultFont = '"Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif';

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const t of texts) {
      const fs = baseFontSize * (t.fontSize || 1);
      ctx.font = `bold ${fs}px ${t.font || defaultFont}`;
      ctx.fillStyle = t.color || colors.label;
      const x = center + (t.x || 0) * radius;
      const y = center + (t.y || 0) * radius;
      ctx.fillText(t.text, x, y);
    }

    ctx.restore();
  }

  drawMicroTicks(ctx, center, radius) {
    const faceRadius = radius * 0.88;
    const config = this.config;
    const mt = config.microTicks;
    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;
    const totalAngle = endAngle - startAngle;
    const count = mt.count || 100;
    const color = mt.color || '#444444';

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= count; i++) {
      const angle = startAngle + (i / count) * totalAngle;
      const inner = faceRadius * 0.91;
      const outer = faceRadius * 0.95;
      ctx.beginPath();
      ctx.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
      ctx.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTicks(ctx, center, radius) {
    const faceRadius = radius * 0.88;
    const config = this.config;
    const colors = this._resolvedColors;
    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;
    const totalAngle = endAngle - startAngle;

    // When microTicks are present, shift regular ticks inward
    const hasMicro = !!config.microTicks;
    const majorOuter = faceRadius * (hasMicro ? 0.89 : 0.88);
    const majorInner = faceRadius * (hasMicro ? 0.75 : 0.72);
    const minorOuter = faceRadius * (hasMicro ? 0.89 : 0.88);
    const minorInner = faceRadius * (hasMicro ? 0.82 : 0.80);

    ctx.save();
    ctx.lineCap = 'round';

    // Major ticks
    const majorCount = config.majorTicks;
    for (let i = 0; i < majorCount; i++) {
      const angle = startAngle + (i / (majorCount - 1)) * totalAngle;

      // Check if in danger zone (temp/rpm redline)
      const value = config.min + (i / (majorCount - 1)) * (config.max - config.min);
      const isDanger = (config.redlineStart && value >= config.redlineStart) ||
        (config.dangerStart && value >= config.dangerStart);

      ctx.beginPath();
      ctx.moveTo(
        center + Math.cos(angle) * majorInner,
        center + Math.sin(angle) * majorInner
      );
      ctx.lineTo(
        center + Math.cos(angle) * majorOuter,
        center + Math.sin(angle) * majorOuter
      );
      ctx.strokeStyle = isDanger ? colors.redline : colors.ticks;
      ctx.lineWidth = this.size > 150 ? 2.5 : 2;
      ctx.stroke();
    }

    // Minor ticks
    if (config.minorTicks > 0) {
      const totalMinor = (majorCount - 1) * config.minorTicks;
      for (let i = 0; i <= totalMinor; i++) {
        if (i % config.minorTicks === 0) continue; // Skip major tick positions

        const angle = startAngle + (i / totalMinor) * totalAngle;

        ctx.beginPath();
        ctx.moveTo(
          center + Math.cos(angle) * minorInner,
          center + Math.sin(angle) * minorInner
        );
        ctx.lineTo(
          center + Math.cos(angle) * minorOuter,
          center + Math.sin(angle) * minorOuter
        );
        ctx.strokeStyle = colors.minorTicks;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawNumbers(ctx, center, radius) {
    const faceRadius = radius * 0.88;
    const config = this.config;
    const colors = this._resolvedColors;
    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;
    const totalAngle = endAngle - startAngle;

    ctx.save();

    // Condensed italic font stack (no external fonts)
    // Use smaller font for gauges with many ticks
    const baseFontSize = this.size > 150 ? this.size * 0.07 : this.size * 0.085;
    const fontSize = config.majorTicks > 6 ? baseFontSize * 0.78 : baseFontSize;
    ctx.font = `${fontSize}px "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif`;
    ctx.fillStyle = colors.numbers;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const majorCount = config.majorTicks;
    const hasMicro = !!config.microTicks;
    const tickInnerRadius = faceRadius * (hasMicro ? 0.75 : 0.72);

    // Build labels and measure widest to compute optimal number radius
    const labels = [];
    let maxTextWidth = 0;
    for (let i = 0; i < majorCount; i++) {
      let label;
      if (config.customLabels) {
        label = config.customLabels[i] || '';
      } else {
        const value = config.min + (i / (majorCount - 1)) * (config.max - config.min);
        label = Math.round(value).toString();
      }
      labels.push(label);
      const w = ctx.measureText(label).width;
      if (w > maxTextWidth) maxTextWidth = w;
    }

    // Position number centers so their outer edge sits a small gap inside the ticks
    const gap = fontSize * 0.35;
    const numberRadius = tickInnerRadius - gap - maxTextWidth / 2;

    for (let i = 0; i < majorCount; i++) {
      const angle = startAngle + (i / (majorCount - 1)) * totalAngle;
      const x = center + Math.cos(angle) * numberRadius;
      const y = center + Math.sin(angle) * numberRadius;

      // Danger zone coloring
      const value = config.min + (i / (majorCount - 1)) * (config.max - config.min);
      const isDanger = (config.redlineStart && value >= config.redlineStart) ||
        (config.dangerStart && value >= config.dangerStart);
      ctx.fillStyle = isDanger ? colors.redline : colors.numbers;

      ctx.fillText(labels[i], x, y);
    }

    ctx.restore();
  }

  drawLabel(ctx, center, radius) {
    const config = this.config;
    const colors = this._resolvedColors;

    ctx.save();

    const baseFontSize = this.size > 150 ? this.size * 0.065 : this.size * 0.08;
    const fontFamily = '"Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif';
    const maxWidth = radius * 0.8;
    let fontSize = baseFontSize * (config.labelFontSize || 1);

    // Auto-shrink label to fit within gauge face
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    const measured = ctx.measureText(config.label).width;
    if (measured > maxWidth) {
      fontSize *= maxWidth / measured;
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
    }

    ctx.fillStyle = colors.label;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Position label in lower portion of gauge, scaled with font size
    const effectiveScale = fontSize / baseFontSize;
    const labelY = center + radius * (0.15 + 0.13 * effectiveScale);
    ctx.fillText(config.label, center, labelY);

    // Draw units text below label if different from label (e.g., "\u00d71000" below "RPM")
    if (config.units && config.units !== config.label) {
      const unitsFontSize = fontSize * 0.55;
      ctx.font = `bold ${unitsFontSize}px "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif`;
      ctx.fillStyle = colors.units;
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
    ctx.font = `${digitSize}px "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif`;
    ctx.fillStyle = '#E0E0E0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('012345', center, y + height / 2);

    ctx.restore();
  }

  drawGlassHighlight(ctx, center, radius) {
    const faceRadius = radius * 0.88;
    const isDark = this.config.faceStyle === 'dark';

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

    const highlightOpacity = isDark ? 0.15 : 0.35;
    const highlightMid = isDark ? 0.06 : 0.15;

    const highlightGradient = ctx.createLinearGradient(
      center, center - faceRadius * 0.6,
      center, center - faceRadius * 0.1
    );
    highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${highlightOpacity})`);
    highlightGradient.addColorStop(0.5, `rgba(255, 255, 255, ${highlightMid})`);
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

  drawInnerRing(ctx, center, radius) {
    const ir = this.config.innerRing;
    if (!ir) return;

    const ringRadius = radius * (ir.radius || 0.38);
    const ringColor = ir.color || '#333333';
    const ringWidth = ir.width || 2;

    // Arc matches the gauge sweep (not a full circle)
    const startAngle = (this.config.startAngle - 90) * Math.PI / 180;
    const endAngle = (this.config.endAngle - 90) * Math.PI / 180;

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, ringRadius, startAngle, endAngle);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = ringWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PER-FRAME DRAWING (needle, cap, active ticks)
  // ═══════════════════════════════════════════════════════════════════════

  // Draw active (illuminated) ticks up to the current needle angle
  drawActiveTicks(ctx, center, radius, currentAngle, config) {
    const at = config.activeTicks;
    if (!at) return;

    const faceRadius = radius * 0.88;
    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;
    const totalAngle = endAngle - startAngle;
    const color = at.color || '#FF8800';

    // Match inward shift from drawTicks when microTicks are present
    const hasMicro = !!config.microTicks;
    const majorOuter = faceRadius * (hasMicro ? 0.89 : 0.88);
    const majorInner = faceRadius * (hasMicro ? 0.75 : 0.72);
    const minorOuter = faceRadius * (hasMicro ? 0.89 : 0.88);
    const minorInner = faceRadius * (hasMicro ? 0.82 : 0.80);

    ctx.save();
    ctx.lineCap = 'round';

    // Major ticks
    const majorCount = config.majorTicks;
    for (let i = 0; i < majorCount; i++) {
      const angle = startAngle + (i / (majorCount - 1)) * totalAngle;
      if (angle > currentAngle) break;

      ctx.beginPath();
      ctx.moveTo(center + Math.cos(angle) * majorInner, center + Math.sin(angle) * majorInner);
      ctx.lineTo(center + Math.cos(angle) * majorOuter, center + Math.sin(angle) * majorOuter);
      ctx.strokeStyle = color;
      ctx.lineWidth = this.size > 150 ? 2.5 : 2;
      ctx.stroke();
    }

    // Minor ticks
    if (config.minorTicks > 0) {
      const totalMinor = (majorCount - 1) * config.minorTicks;
      for (let i = 0; i <= totalMinor; i++) {
        if (i % config.minorTicks === 0) continue;
        const angle = startAngle + (i / totalMinor) * totalAngle;
        if (angle > currentAngle) break;

        ctx.beginPath();
        ctx.moveTo(center + Math.cos(angle) * minorInner, center + Math.sin(angle) * minorInner);
        ctx.lineTo(center + Math.cos(angle) * minorOuter, center + Math.sin(angle) * minorOuter);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Draw the needle (called each frame)
  drawNeedle(ctx, center, radius, angle) {
    const needleLength = radius * 0.70;
    const needleWidth = radius * 0.04;
    const colors = this._resolvedColors;
    const needleColor = colors.needle;
    const glowEnabled = this.config.needleGlow;
    const ir = this.config.innerRing;

    // When innerRing is set, needle starts from the ring instead of center
    const needleStart = ir ? radius * (ir.radius || 0.38) + 4 : 0;
    const tailLength = ir ? 0 : radius * 0.15;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);

    // Needle shadow (or glow)
    ctx.save();
    if (glowEnabled) {
      ctx.shadowColor = needleColor;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    // Needle body — starts from needleStart (inner ring edge or near center)
    ctx.beginPath();
    if (ir) {
      // Shorter needle: from inner ring to tick area, no tail
      ctx.moveTo(needleStart, -needleWidth * 0.6);
      ctx.lineTo(needleLength - needleWidth * 2, -needleWidth * 0.4);
      ctx.lineTo(needleLength, 0);
      ctx.lineTo(needleLength - needleWidth * 2, needleWidth * 0.4);
      ctx.lineTo(needleStart, needleWidth * 0.6);
      ctx.closePath();
    } else {
      // Classic needle with counterweight tail
      ctx.moveTo(-tailLength, 0);
      ctx.lineTo(-needleWidth * 1.5, -needleWidth);
      ctx.lineTo(needleLength - needleWidth * 2, -needleWidth * 0.4);
      ctx.lineTo(needleLength, 0);
      ctx.lineTo(needleLength - needleWidth * 2, needleWidth * 0.4);
      ctx.lineTo(-needleWidth * 1.5, needleWidth);
      ctx.closePath();
    }

    // Gradient from base needle color
    if (needleColor.match(/^#[0-9a-fA-F]{6}$/)) {
      ctx.fillStyle = this._needleGradient(ctx, needleColor, needleWidth);
    } else {
      ctx.fillStyle = needleColor;
    }
    ctx.fill();

    // Needle outline for definition
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // Draw center cap (called each frame, on top of needle)
  // Skipped when innerRing is configured (needle starts from ring, no center hub)
  drawCenterCap(ctx, center, radius) {
    if (this.config.innerRing) return;

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

  // Draw digital value display (called each frame)
  drawDigitalValue(ctx, center, radius, value, units, displayConfig) {
    if (!displayConfig) return;

    const baseFontSize = this.size * 0.06;
    const fontSize = baseFontSize * (displayConfig.fontSize || 1);
    const yOffset = displayConfig.y != null ? displayConfig.y : 0.55;
    const color = displayConfig.color || '#00FF88';
    const showUnits = displayConfig.showUnits !== false;
    const showBackground = displayConfig.background !== false;

    const valueText = Math.round(value).toString();
    const textY = center + radius * yOffset;

    ctx.save();

    // Dark rounded rect background (opt-out with background: false)
    if (showBackground) {
      const fullText = valueText + (showUnits && units ? ' ' + units : '');
      ctx.font = `bold ${fontSize}px "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif`;
      const rectWidth = Math.max(radius * 0.5, fontSize * fullText.length * 0.45);
      const rectHeight = fontSize * 1.6;
      const rx = center - rectWidth / 2;
      const ry = textY - rectHeight / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(rx, ry, rectWidth, rectHeight, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Draw combined text in background mode
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fullText, center, textY);
    } else {
      // No background: draw value and units separately for independent styling
      ctx.font = `bold ${fontSize}px "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(valueText, center, textY);

      if (showUnits && units) {
        const unitsFontSize = fontSize * (displayConfig.unitsFontSize || 0.5);
        ctx.font = `bold ${unitsFontSize}px "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif`;
        ctx.fillStyle = displayConfig.unitsColor || color;
        ctx.fillText(units, center, textY + fontSize * 0.65);
      }
    }

    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PER-FRAME LAYERS: PROGRESS ARC, RINGS, COMPLICATIONS
  // ═══════════════════════════════════════════════════════════════════════

  // Interpolate between gradient color stops at position t (0-1)
  _interpolateGradient(stops, t) {
    if (!stops || stops.length === 0) return 'rgba(255,255,255,0.5)';
    if (stops.length === 1) return stops[0].color;
    t = Math.max(0, Math.min(1, t));

    // Find the two surrounding stops
    let lower = stops[0], upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].at && t <= stops[i + 1].at) {
        lower = stops[i];
        upper = stops[i + 1];
        break;
      }
    }

    const range = upper.at - lower.at;
    const localT = range > 0 ? (t - lower.at) / range : 0;

    const c1 = this._parseHex(lower.color);
    const c2 = this._parseHex(upper.color);
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * localT);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * localT);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * localT);
    return `rgb(${r},${g},${b})`;
  }

  // Draw a gradient arc in small segments for correct color along curvature
  _drawGradientArc(ctx, cx, cy, arcRadius, arcWidth, fromAngle, toAngle, startAngle, endAngle, gradient) {
    const totalSweep = toAngle - fromAngle;
    if (Math.abs(totalSweep) < 0.001) return;

    const fullSweep = endAngle - startAngle;
    const segmentAngle = 2 * Math.PI / 180; // 2-degree segments
    const segments = Math.max(1, Math.ceil(Math.abs(totalSweep) / segmentAngle));

    ctx.save();
    ctx.lineWidth = arcWidth;
    ctx.lineCap = 'butt';

    for (let i = 0; i < segments; i++) {
      const segStart = fromAngle + (i / segments) * totalSweep;
      const segEnd = fromAngle + ((i + 1) / segments) * totalSweep;
      // Map segment midpoint to 0-1 gradient position across full sweep range
      const midT = fullSweep !== 0 ? ((segStart + segEnd) / 2 - startAngle) / fullSweep : 0;

      ctx.beginPath();
      ctx.arc(cx, cy, arcRadius, segStart, segEnd + 0.005); // tiny overlap prevents gaps
      ctx.strokeStyle = this._interpolateGradient(gradient, midT);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw progress arc that fills to current needle angle
  drawProgressArc(ctx, center, radius, currentAngle, config) {
    const arc = config.progressArc;
    if (!arc) return;

    const startAngle = (config.startAngle - 90) * Math.PI / 180;
    const endAngle = (config.endAngle - 90) * Math.PI / 180;
    const arcRadius = radius * (arc.offset || 0.92);
    const arcWidth = radius * (arc.width || 0.04);

    ctx.save();

    // Optional background track (full sweep, dim)
    if (arc.background) {
      ctx.beginPath();
      ctx.arc(center, center, arcRadius, startAngle, endAngle);
      ctx.strokeStyle = arc.background;
      ctx.lineWidth = arcWidth;
      ctx.lineCap = 'butt';
      ctx.stroke();
    }

    // Filled arc from startAngle to currentAngle
    if (currentAngle <= startAngle) {
      ctx.restore();
      return;
    }
    const fillEnd = Math.min(currentAngle, endAngle);

    this._drawGradientArc(ctx, center, center, arcRadius, arcWidth, startAngle, fillEnd, startAngle, endAngle, arc.gradient || [{ at: 0, color: '#0066FF' }, { at: 1, color: '#FF2200' }]);

    // Optional glow effect
    if (arc.glow) {
      ctx.beginPath();
      ctx.arc(center, center, arcRadius, fillEnd - 0.05, fillEnd);
      ctx.strokeStyle = this._interpolateGradient(arc.gradient || [{ at: 0, color: '#0066FF' }, { at: 1, color: '#FF2200' }], (fillEnd - startAngle) / (endAngle - startAngle));
      ctx.lineWidth = arcWidth * 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = arcWidth * 3;
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw ring indicators (secondary data bars with optional flash)
  drawRings(ctx, center, radius, ringValues, timestamp, config) {
    const rings = config.rings;
    if (!rings || rings.length === 0) return;

    const defaultStartAngle = (config.startAngle - 90) * Math.PI / 180;
    const defaultEndAngle = (config.endAngle - 90) * Math.PI / 180;

    ctx.save();
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      const value = ringValues[i] != null ? ringValues[i] : ring.min || 0;
      const ringRadius = radius * (ring.offset || 0.96);
      const ringWidth = radius * (ring.width || 0.03);
      const startAngle = ring.startAngle != null ? (ring.startAngle - 90) * Math.PI / 180 : defaultStartAngle;
      const endAngle = ring.endAngle != null ? (ring.endAngle - 90) * Math.PI / 180 : defaultEndAngle;
      const min = ring.min || 0;
      const max = ring.max != null ? ring.max : config.max;
      const range = max - min;
      const normalized = range > 0 ? Math.max(0, Math.min(1, (value - min) / range)) : 0;
      const fillEnd = startAngle + normalized * (endAngle - startAngle);

      // Background track
      if (ring.background) {
        ctx.beginPath();
        ctx.arc(center, center, ringRadius, startAngle, endAngle);
        ctx.strokeStyle = ring.background;
        ctx.lineWidth = ringWidth;
        ctx.lineCap = 'butt';
        ctx.stroke();
      }

      // Filled portion
      if (normalized > 0) {
        const gradient = ring.gradient || [{ at: 0, color: '#00CC44' }, { at: 1, color: '#FF2200' }];

        if (ring.segments) {
          // Segmented bar: draw discrete blocks with gaps
          const totalSweep = endAngle - startAngle;
          const segCount = ring.segments;
          const gapAngle = totalSweep * 0.003; // small gap between segments
          const segAngle = (totalSweep - gapAngle * (segCount - 1)) / segCount;
          const filledSegments = Math.ceil(normalized * segCount);

          ctx.save();
          ctx.lineWidth = ringWidth;
          ctx.lineCap = 'butt';
          for (let s = 0; s < filledSegments; s++) {
            const segStart = startAngle + s * (segAngle + gapAngle);
            const segEnd = segStart + segAngle;
            if (segEnd > fillEnd + segAngle * 0.5) break;
            const midT = (endAngle - startAngle) !== 0 ? (segStart + segEnd) / 2 - startAngle : 0;
            const t = midT / totalSweep;
            ctx.beginPath();
            ctx.arc(center, center, ringRadius, segStart, segEnd);
            ctx.strokeStyle = this._interpolateGradient(gradient, t);
            ctx.stroke();
          }
          ctx.restore();
        } else {
          this._drawGradientArc(ctx, center, center, ringRadius, ringWidth, startAngle, fillEnd, startAngle, endAngle, gradient);
        }
      }

      // Flash effect when value exceeds threshold
      if (ring.flash && value >= ring.flash.above) {
        const rate = ring.flash.rate || 4;
        const flashColor = ring.flash.color || 'rgba(255, 0, 0, 0.6)';
        const phase = Math.sin(timestamp / 1000 * rate * Math.PI * 2);
        const opacity = 0.3 + 0.7 * Math.max(0, phase);

        ctx.beginPath();
        ctx.arc(center, center, ringRadius, startAngle, endAngle);
        ctx.lineWidth = ringWidth + 2;
        ctx.lineCap = 'butt';

        // Apply opacity to flash color
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = flashColor;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  // Draw complications (sub-gauges like fuel bar)
  drawComplications(ctx, center, radius, complicationValues, config) {
    const complications = config.complications;
    if (!complications || complications.length === 0) return;

    for (let i = 0; i < complications.length; i++) {
      const comp = complications[i];
      const value = complicationValues[i] != null ? complicationValues[i] : comp.min || 0;
      const cx = center + (comp.x || 0) * radius;
      const cy = center + (comp.y || 0) * radius;
      const cr = radius * (comp.radius || 0.15);

      ctx.save();

      // Optional background
      if (comp.background) {
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fillStyle = comp.background;
        ctx.fill();
      }

      if (comp.type === 'arc') {
        this._drawArcComplication(ctx, cx, cy, cr, value, comp, radius);
      }

      ctx.restore();
    }
  }

  _drawArcComplication(ctx, cx, cy, cr, value, comp, gaugeRadius) {
    const rawStart = ((comp.startAngle != null ? comp.startAngle : 150) - 90) * Math.PI / 180;
    const rawEnd = ((comp.endAngle != null ? comp.endAngle : 30) - 90) * Math.PI / 180;

    // Detect counter-clockwise: when canvas start > end, the short path goes CCW
    const ccw = rawStart > rawEnd;
    const startAngle = rawStart;
    const endAngle = rawEnd;
    // Signed total: negative for CCW arcs so positions compute correctly
    const totalAngle = ccw ? -(rawStart - rawEnd) : (rawEnd - rawStart);

    const min = comp.min || 0;
    const max = comp.max != null ? comp.max : 1;
    const range = max - min;
    // arcOffset places the arc on the main gauge circle instead of the complication's own radius
    const arcRadius = comp.arcOffset != null ? gaugeRadius * comp.arcOffset : cr * 0.75;
    const arcWidth = comp.arcWidth != null ? gaugeRadius * comp.arcWidth : cr * 0.14;

    // Draw zone segments (colored arc sections)
    if (comp.zones && comp.zones.length > 0) {
      ctx.save();
      ctx.lineWidth = arcWidth;
      ctx.lineCap = 'butt';
      for (const zone of comp.zones) {
        const zs = startAngle + ((zone.start - min) / range) * totalAngle;
        const ze = startAngle + ((zone.end - min) / range) * totalAngle;
        ctx.beginPath();
        ctx.arc(cx, cy, arcRadius, zs, ze, ccw);
        ctx.strokeStyle = zone.color;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw fill bar (dynamic level indicator, e.g. battery charge)
    if (comp.fill) {
      const normalized = range > 0 ? Math.max(0, Math.min(1, (value - min) / range)) : 0;
      const fillEnd = startAngle + normalized * totalAngle;
      const fillWidth = arcWidth * (comp.fill.widthMultiplier || 1.5);
      const fillColor = comp.fill.color || '#00CCAA';

      if (normalized > 0.001) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, arcRadius, startAngle, fillEnd, ccw);
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = fillWidth;
        ctx.lineCap = 'round';

        // Glow effect
        if (comp.fill.glow) {
          ctx.shadowColor = fillColor;
          ctx.shadowBlur = fillWidth * 2;
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Draw tick marks
    if (comp.tickMarks && comp.tickMarks > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= comp.tickMarks; i++) {
        const angle = startAngle + (i / comp.tickMarks) * totalAngle;
        const inner = arcRadius - arcWidth * 0.7;
        const outer = arcRadius + arcWidth * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw labels along the arc
    if (comp.labels && comp.labels.length > 0) {
      const labelFontSize = comp.labelFontSize != null ? gaugeRadius * comp.labelFontSize : cr * 0.28;
      ctx.save();
      ctx.font = `bold ${labelFontSize}px "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif`;
      ctx.fillStyle = comp.labelColor || 'rgba(255,255,255,0.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const inside = comp.labelSide === 'inside';
      for (const label of comp.labels) {
        const angle = startAngle + (label.position || 0) * totalAngle;
        const labelR = inside
          ? arcRadius - arcWidth - labelFontSize * 0.5
          : arcRadius + arcWidth + labelFontSize * 0.5;
        ctx.fillText(label.text, cx + Math.cos(angle) * labelR, cy + Math.sin(angle) * labelR);
      }
      ctx.restore();
    }

    // Draw pointer needle from center (radial pointer)
    if (comp.pointer) {
      const normalized = range > 0 ? Math.max(0, Math.min(1, (value - min) / range)) : 0;
      const pointerAngle = startAngle + normalized * totalAngle;
      const pointerLen = cr * 0.5;
      const pointerW = cr * 0.06;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(pointerAngle);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(pointerLen, -pointerW);
      ctx.lineTo(pointerLen, pointerW);
      ctx.closePath();
      ctx.fillStyle = comp.pointerColor || '#FFFFFF';
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(0, 0, cr * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#888888';
      ctx.fill();

      ctx.restore();
    }

    // Draw marker line on arc at value position (alternative to pointer)
    if (comp.marker) {
      const normalized = range > 0 ? Math.max(0, Math.min(1, (value - min) / range)) : 0;
      const markerAngle = startAngle + normalized * totalAngle;
      const inner = arcRadius - arcWidth;
      const outer = arcRadius + arcWidth;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(markerAngle) * inner, cy + Math.sin(markerAngle) * inner);
      ctx.lineTo(cx + Math.cos(markerAngle) * outer, cy + Math.sin(markerAngle) * outer);
      ctx.strokeStyle = comp.markerColor || '#FFFFFF';
      ctx.lineWidth = Math.max(2, cr * 0.06);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COLOR UTILITIES
  // ═══════════════════════════════════════════════════════════════════════

  _parseHex(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  _lightenColor(hex, amount) {
    try {
      const [r, g, b] = this._parseHex(hex);
      return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`;
    } catch {
      return hex;
    }
  }

  _darkenColor(hex, amount) {
    try {
      const [r, g, b] = this._parseHex(hex);
      return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
    } catch {
      return hex;
    }
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
