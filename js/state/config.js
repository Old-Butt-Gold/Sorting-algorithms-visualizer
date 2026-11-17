/* Sortlab — defaults, palettes, URL state. */
(function (global) {
  'use strict';

  const SAV = global.SAV = global.SAV || {};
  const U = SAV.util;

  const SPEED_MIN = 0.25;
  const SPEED_MAX = 64;
  const OPS_BASE = 128;
  const SIZE_MIN = 8;
  const SIZE_MAX = 500;
  const WORKER_THRESHOLD = 2000;

  const DEFAULT = {
    alg: 'quick',
    seed: null,
    size: 64,
    dist: 'random',
    speed: 2,
    view: 'bars',
    palette: 'neon',
    sound: true,
    volume: 0.7,
    glow: true,
    values: true,
    tree: false,
    scheme: 'lomuto',
    pivot: 'last'
  };

  const DISTRIBUTIONS = [
    { id: 'random', label: 'Random', hint: 'shuffled 1…n' },
    { id: 'nearly', label: 'Nearly sorted', hint: 'a few local nudges' },
    { id: 'reversed', label: 'Reversed', hint: 'n…1' },
    { id: 'few', label: 'Few unique', hint: 'four repeated values' },
    { id: 'sawtooth', label: 'Sawtooth', hint: 'ramps that reset' },
    { id: 'gaussian', label: 'Gaussian', hint: 'bell around the middle' },
    { id: 'sorted', label: 'Already sorted', hint: 'best-case probe' }
  ];

  const PALETTES = {
    neon: {
      id: 'neon',
      label: 'Neon',
      theme: 'neon',
      bg: '#070A14',
      surface: '#0E1326',
      grid: 'rgba(139, 92, 246, 0.10)',
      text: '#E8EAF6',
      muted: '#8B94B8',
      baseA: '#4F46E5',
      baseB: '#22D3EE',
      compare: '#22D3EE',
      swap: '#FF3D81',
      pivot: '#FFB020',
      sorted: '#A3E635',
      aux: '#8B5CF6',
      danger: '#FF4D5E',
      ramp: ['#4F46E5', '#6366F1', '#8B5CF6', '#22D3EE']
    },
    colorblind: {
      id: 'colorblind',
      label: 'Colorblind',
      theme: 'colorblind',
      bg: '#06101C',
      surface: '#0C1929',
      grid: 'rgba(86, 180, 233, 0.10)',
      text: '#EDF6FF',
      muted: '#93AFC8',
      baseA: '#0072B2',
      baseB: '#56B4E9',
      compare: '#F0E442',
      swap: '#D55E00',
      pivot: '#E69F00',
      sorted: '#009E73',
      aux: '#CC79A7',
      danger: '#D55E00',
      ramp: ['#0072B2', '#56B4E9', '#F0E442', '#E69F00']
    },
    light: {
      id: 'light',
      label: 'Light',
      theme: 'light',
      bg: '#EEF1F8',
      surface: '#F8FAFE',
      grid: 'rgba(67, 56, 202, 0.10)',
      text: '#121A33',
      muted: '#566079',
      baseA: '#4338CA',
      baseB: '#0891B2',
      compare: '#0E7490',
      swap: '#BE185D',
      pivot: '#B45309',
      sorted: '#4D7C0F',
      aux: '#6D28D9',
      danger: '#DC2626',
      ramp: ['#4338CA', '#6D28D9', '#0891B2', '#0E7490']
    }
  };

  const VIEWS = ['bars', 'dots', 'gradient', 'disparity'];
  const SCHEMES = ['lomuto', 'hoare'];
  const PIVOTS = ['last', 'random', 'median'];

  function speedFromSlider(position) {
    const t = U.clamp(Number(position) || 0, 0, 1000) / 1000;
    const raw = SPEED_MIN * Math.pow(SPEED_MAX / SPEED_MIN, t);
    return Math.round(raw * 100) / 100;
  }

  function sliderFromSpeed(speed) {
    const safe = U.clamp(Number(speed) || 1, SPEED_MIN, SPEED_MAX);
    return Math.round(Math.log(safe / SPEED_MIN) / Math.log(SPEED_MAX / SPEED_MIN) * 1000);
  }

  function opsPerSecond(speed) {
    return Math.round(OPS_BASE * (Number(speed) || 1));
  }

  function formatSpeed(speed) {
    const safe = Number(speed) || 1;
    if (safe < 1) return '×' + safe.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return '×' + safe.toFixed(safe < 10 ? 1 : 0).replace(/\.0$/, '');
  }

  function uniqueSeed() {
    if (global.crypto && global.crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      global.crypto.getRandomValues(buf);
      return buf[0] >>> 0;
    }
    return (Math.random() * 0xFFFFFFFF) >>> 0;
  }

  function normalizeConfig(raw) {
    const config = Object.assign({}, DEFAULT, raw && typeof raw === 'object' ? raw : {});
    const numericSeed = U.parseSeed(config.seed);
    config.seed = numericSeed == null ? uniqueSeed() : numericSeed;
    config.size = Math.round(U.clamp(Number(config.size) || DEFAULT.size, SIZE_MIN, SIZE_MAX));
    config.speed = Math.round(U.clamp(Number(config.speed) || DEFAULT.speed, SPEED_MIN, SPEED_MAX) * 100) / 100;
    config.volume = U.clamp(Number(config.volume), 0, 1);
    if (!Number.isFinite(config.volume)) config.volume = DEFAULT.volume;
    config.dist = DISTRIBUTIONS.some(function (d) { return d.id === config.dist; }) ? config.dist : DEFAULT.dist;
    config.view = VIEWS.indexOf(config.view) >= 0 ? config.view : DEFAULT.view;
    config.palette = PALETTES[config.palette] ? config.palette : DEFAULT.palette;
    config.scheme = SCHEMES.indexOf(config.scheme) >= 0 ? config.scheme : DEFAULT.scheme;
    config.pivot = PIVOTS.indexOf(config.pivot) >= 0 ? config.pivot : DEFAULT.pivot;
    config.sound = !!config.sound;
    config.glow = !!config.glow;
    config.values = !!config.values;
    config.tree = !!config.tree;
    if (SAV.algorithms && !SAV.algorithms.some(function (a) { return a.id === config.alg; })) {
      config.alg = DEFAULT.alg;
    }
    return config;
  }

  function readURL() {
    let params;
    try {
      params = new URLSearchParams(global.location.search);
    } catch (error) {
      return {};
    }
    if (!params.toString()) return {};
    const out = {};
    const take = function (key, parser) {
      if (!params.has(key)) return;
      const value = parser(params.get(key));
      if (value != null) out[key] = value;
    };
    take('alg', String);
    take('seed', U.parseSeed);
    take('size', function (v) { return Math.round(Number(v)); });
    take('dist', String);
    take('speed', Number);
    take('mode', String);
    take('view', String);
    take('palette', String);
    take('scheme', String);
    take('pivot', String);
    take('volume', function (v) {
      const n = Number(v);
      return Number.isFinite(n) ? n / 100 : null;
    });
    if (!out.view && out.mode) out.view = out.mode;
    delete out.mode;
    if (params.has('sound')) out.sound = params.get('sound') !== '0';
    if (params.has('glow')) out.glow = params.get('glow') !== '0';
    if (params.has('values')) out.values = params.get('values') !== '0';
    if (params.has('tree')) out.tree = params.get('tree') !== '0';
    return out;
  }

  function writeURL(config, replace) {
    if (!global.history || !global.history.replaceState) return '';
    let url;
    try {
      url = new URL(global.location.href);
    } catch (error) {
      return '';
    }
    url.hash = '';
    const params = url.searchParams;
    params.set('alg', config.alg);
    params.set('seed', U.formatSeed(config.seed));
    params.set('size', String(config.size));
    params.set('dist', config.dist);
    params.set('speed', String(config.speed));
    params.set('view', config.view);
    params.set('palette', config.palette);
    params.set('scheme', config.scheme);
    params.set('pivot', config.pivot);
    params.set('sound', config.sound ? '1' : '0');
    params.set('glow', config.glow ? '1' : '0');
    params.set('values', config.values ? '1' : '0');
    params.set('tree', config.tree ? '1' : '0');
    params.set('volume', String(Math.round(config.volume * 100)));
    const next = url.toString();
    if (replace) {
      global.history.replaceState(null, '', next);
    }
    return next;
  }

  SAV.state = {
    DEFAULT: DEFAULT,
    DISTRIBUTIONS: DISTRIBUTIONS,
    PALETTES: PALETTES,
    VIEWS: VIEWS,
    SCHEMES: SCHEMES,
    PIVOTS: PIVOTS,
    SIZE_MIN: SIZE_MIN,
    SIZE_MAX: SIZE_MAX,
    SPEED_MIN: SPEED_MIN,
    SPEED_MAX: SPEED_MAX,
    OPS_BASE: OPS_BASE,
    WORKER_THRESHOLD: WORKER_THRESHOLD,
    speedFromSlider: speedFromSlider,
    sliderFromSpeed: sliderFromSpeed,
    opsPerSecond: opsPerSecond,
    formatSpeed: formatSpeed,
    uniqueSeed: uniqueSeed,
    normalizeConfig: normalizeConfig,
    readURL: readURL,
    writeURL: writeURL
  };
})(typeof window !== 'undefined' ? window : globalThis);
