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

    // Draw units text below label if different from label (e.g., "\u00d71000" below "RPM")
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
