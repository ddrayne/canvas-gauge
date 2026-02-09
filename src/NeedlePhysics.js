import { FIXED_TIMESTEP, MAX_FRAME_TIME } from './presets.js';

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
export default class NeedlePhysics {
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

    // Reduced motion support — listen for changes
    this._motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this._motionQuery.matches;
    this._onMotionChange = (e) => { this.reducedMotion = e.matches; };
    this._motionQuery.addEventListener('change', this._onMotionChange);
  }

  setTarget(angle, immediate = false) {
    this.targetAngle = angle;

    if (immediate) {
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
    // Reduced motion: overdamped (no bounce/overshoot), fast settle
    const stiffness = this.reducedMotion ? 300 : this.stiffness;
    const damping = this.reducedMotion ? 40 : this.damping;

    const displacement = this.targetAngle - this.angle;
    let acceleration = stiffness * displacement - damping * this.velocity;

    // Clamp acceleration
    acceleration = Math.max(-this.maxAccel, Math.min(this.maxAccel, acceleration));

    // Integration (semi-implicit Euler for stability)
    this.velocity += acceleration * dt;

    // Clamp velocity
    this.velocity = Math.max(-this.maxVelocity, Math.min(this.maxVelocity, this.velocity));

    this.angle += this.velocity * dt;
  }

  destroy() {
    this._motionQuery.removeEventListener('change', this._onMotionChange);
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
