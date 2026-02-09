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
  digitalDisplay: null,
  labelFontSize: 1,
  texts: [],
  activeTicks: null,
  needleGlow: false,
  progressArc: null,
  innerRing: null,
  microTicks: null,
  rings: [],
  complications: [],
  onDraw: null,
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
  },
  modern: {
    min: 0,
    max: 320,
    units: 'km/h',
    label: '',
    majorTicks: 9,        // 0, 40, 80, 120, 160, 200, 240, 280, 320
    minorTicks: 4,        // every 10 km/h between majors
    startAngle: -130,     // ~7:40 position
    endAngle: 130,        // ~4:20 position (260° sweep, top ~72%)
    stiffness: 120,
    damping: 18,
    faceStyle: 'dark',
    needleGlow: true,
    colors: {
      face: '#0A0A0A',
      needle: '#FF8800',
      ticks: '#CCCCCC',
      minorTicks: '#666666',
      numbers: '#AAAAAA',
    },
    innerRing: {
      radius: 0.38,        // fraction of gauge radius — frames the digital readout
      color: '#333333',
      width: 2
    },
    microTicks: {
      count: 320,          // one per km/h
      color: '#444444'
    },
    activeTicks: {
      color: '#FFAA00'     // amber: ticks illuminate up to current speed
    },
    rings: [{
      min: 0,
      max: 8000,
      width: 0.04,
      offset: 1.08,       // outside the bezel
      startAngle: -75,    // ~10:30 on the clock
      endAngle: 75,       // ~1:30 on the clock
      segments: 30,       // discrete blocks
      gradient: [
        { at: 0, color: '#2255FF' },
        { at: 0.15, color: '#00CC44' },
        { at: 0.7, color: '#CCCC00' },
        { at: 1, color: '#FF2200' }
      ],
      background: 'rgba(255,255,255,0.04)',
      flash: { above: 7000, color: 'rgba(255, 0, 0, 0.5)', rate: 4 }
    }],
    digitalDisplay: {
      show: true,
      y: 0,
      fontSize: 2,
      color: '#FFFFFF',
      background: false,
      showUnits: true,
      unitsColor: '#999999',
      unitsFontSize: 0.35
    },
    texts: [],
    complications: [{
      type: 'arc',
      x: 0,
      y: 0,
      radius: 0.15,       // sizing reference for tick/marker width
      min: 0,
      max: 1,
      startAngle: 216,    // left (~7:12) = E
      endAngle: 144,      // right (~4:48) = F, CCW through bottom (~72° arc)
      arcOffset: 0.82,    // same circle as main speedo ticks
      arcWidth: 0.012,    // thin arc matching tick weight
      zones: [
        { start: 0, end: 0.15, color: '#FF3333' },
        { start: 0.15, end: 1, color: 'rgba(255,255,255,0.06)' }
      ],
      fill: {
        color: '#00CCBB',
        widthMultiplier: 2,
        glow: true
      },
      tickMarks: 4,
      labelSide: 'inside',
      labelFontSize: 0.04,
      labels: [
        { text: 'E', position: 0 },
        { text: 'F', position: 1 }
      ],
      marker: true,
      markerColor: '#FFFFFF'
    }]
  }
};
