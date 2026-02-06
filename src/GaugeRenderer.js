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

      ctx.beginPath();
      ctx.arc(center, center, faceRadius * 0.88, zoneStartAngle, zoneEndAngle);
      ctx.arc(center, center, faceRadius * 0.72, zoneEndAngle, zoneStartAngle, true);
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
    const fontSize = this.size * 0.045;

    ctx.save();
    ctx.font = `bold ${fontSize}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = colors.label;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const t of texts) {
      const x = center + (t.x || 0) * radius;
      const y = center + (t.y || 0) * radius;
      ctx.fillText(t.text, x, y);
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

    ctx.save();
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
    ctx.font = `italic ${fontSize}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = colors.numbers;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const majorCount = config.majorTicks;
    const tickInnerRadius = faceRadius * 0.72;

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
    const fontSize = baseFontSize * (config.labelFontSize || 1);
    ctx.font = `bold ${fontSize}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = colors.label;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Position label in lower portion of gauge
    const labelY = center + radius * 0.28;
    ctx.fillText(config.label, center, labelY);

    // Draw units text below label if different from label (e.g., "\u00d71000" below "RPM")
    if (config.units && config.units !== config.label) {
      const unitsFontSize = fontSize * 0.55;
      ctx.font = `bold ${unitsFontSize}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
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
    ctx.font = `${digitSize}px "Courier New", monospace`;
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

  // ═══════════════════════════════════════════════════════════════════════
  // PER-FRAME DRAWING (needle, cap)
  // ═══════════════════════════════════════════════════════════════════════

  // Draw the needle (called each frame)
  drawNeedle(ctx, center, radius, angle) {
    const needleLength = radius * 0.70;
    const needleWidth = radius * 0.04;
    const tailLength = radius * 0.15;
    const colors = this._resolvedColors;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);

    // Needle shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Needle body
    ctx.beginPath();
    ctx.moveTo(-tailLength, 0);
    ctx.lineTo(-needleWidth * 1.5, -needleWidth);
    ctx.lineTo(needleLength - needleWidth * 2, -needleWidth * 0.4);
    ctx.lineTo(needleLength, 0);
    ctx.lineTo(needleLength - needleWidth * 2, needleWidth * 0.4);
    ctx.lineTo(-needleWidth * 1.5, needleWidth);
    ctx.closePath();

    // Gradient from base needle color
    const needleColor = colors.needle;
    // Check if it looks like a valid hex color for gradient generation
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

  // Draw digital value display (called each frame)
  drawDigitalValue(ctx, center, radius, value, units) {
    const fontSize = this.size * 0.06;
    const text = Math.round(value) + (units ? ' ' + units : '');
    const rectWidth = Math.max(radius * 0.5, ctx.measureText ? fontSize * text.length * 0.45 : radius * 0.5);
    const rectHeight = fontSize * 1.6;
    const x = center - rectWidth / 2;
    const y = center + radius * 0.55 - rectHeight / 2;

    ctx.save();

    // Dark rounded rect background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(x, y, rectWidth, rectHeight, 4);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Value text
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = '#00FF88';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, center, y + rectHeight / 2);

    ctx.restore();
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
