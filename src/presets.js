// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const FIXED_TIMESTEP = 1 / 120;  // 120Hz physics for smooth motion
export const MAX_FRAME_TIME = 0.1;      // Cap to prevent spiral of death

export const defaults = {
  min: 0,
  max: 100,
  units: '',
  label: '',
  majorTicks: 5,
  minorTicks: 4,
  startAngle: -225,
  endAngle: 45,
  stiffness: 120,
  damping: 18,
  faceStyle: 'light',
  colors: {},
  zones: [],
  showDigitalValue: false,
  texts: [],
};

export const presets = {
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
    units: '\u00d71000',
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
    units: '\u00b0F',
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
