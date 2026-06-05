// ============================================================
//  HYDROS universal constants
//  Global-script style (no modules): compiled by tsc to js/constants.js
//  and loaded by index.html with an ordinary <script> tag.
// ============================================================

// Composition (solar)
const Z_METALLICITY = 0.014;
const F_ROCK = 0.22;
const F_LODDERS_ICE = 3.5;
const GAS_FRACTION = 0.95;
const H_FRACTION = 0.74;
// One PRIMORDIAL-solar mass unit = 1.14 current M_sun (Sol baseline:
// M = 1, spin = 1, nebula density = 1). Earth masses per unit:
const M_PRIM_TO_MSUN = 1.14;
const M_SUN_TO_EARTH = 332946.0 * M_PRIM_TO_MSUN;  // 379,558 M_E per M_prim

// Universal physics
const THRESHOLD_GAS = 3.0;
const PEBBLE_CAPTURE_EFFICIENCY = 0.40;
const ETA_ROCK = 0.78;
const SNOW_PILEUP_FACTOR = 0.5;
const SNOW_PILEUP_WIDTH_FRAC = 0.15;
const T_DISC_DISPERSAL_MYR = 5.0;
const ETA_ICE_DECAY_FRACTION = 0.80;

// Grain-opacity parameter (paper §2): 0 = fully grain-grown (opacity-poor),
// 1 = ISM-like small-grain-dominated (opacity-rich). Calibrated on Sol and
// identical across every calibrated system, so treated as a constant —
// uniform at least across the local galactic neighbourhood our calibration
// sample occupies; not necessarily universal.
const GRAIN_OPACITY = 0.82;

// Sol reference values (calibration anchors)
const SOL_M_PRIMORDIAL = 1.0;  // Sol IS the unit (1 = 1.14 current M_sun)
// The family constant IS Neptune's orbit (J2000 semi-major axis):
// Sol at (M, Ω, D) = (1, 1, 1) puts the Davis Dam exactly on slot-0
// Neptune.
const SOL_R_DISC = 30.069923;
const SOL_R_A_FORMATION = 0.20;
const SOL_INTERCEPT = 0.596;

// CASCADE_RATIO derivation: each slot sits at the half-amplitude-at-45°
// projection (1/(2√2)) of the previous slot's Gaussian HWHM (√(2 ln 2)).
// Equivalent forms: 1 - √(ln 2)/2 = 1 - 1/(2√2)·√(2 ln 2). The factor
// 1/(2√2) is a pure geometric constant — the half-diagonal-projection
// in any orthogonal decomposition, appearing in 45° polarization,
// Butterworth filter damping, and inscribed-circle-to-diagonal ratios.
const CASCADE_RATIO = 1.0 - Math.sqrt(Math.log(2.0)) / 2.0; // ~0.5837

// Assignment scoring
const OVERPRED_PENALTY = 0.2;
const UNDERPRED_PENALTY = 5.0;  // slot prediction far BELOW observed:
                                // physical impossibility — planet must
                                // have migrated from an outer slot.
const UNDERPRED_RATIO = 5.0;    // observed/cascade_pred ratio threshold
const GAS_OBS_THRESHOLD = 5.0;
const GAS_INNER_PENALTY = 0.15;
const GAS_DECISIVE_DIST = 0.05;

// Stripping / composition
const IRON_FRACTION = 0.30;
const T_STRIP_K = 2000.0;       // silicate vaporization threshold (K)
const L_T_TAURI_FACTOR = 10.0;  // pre-MS luminosity boost over MS
const ALBEDO = 0.1;
const SIGMA_SB = 5.670374419e-8;
const L_SUN_W = 3.828e26;
const AU_M = 1.495978707e11;
const STRIP_OBS_MAX = 15.0;     // M_E — large planets retain envelope
                                // via escape velocity inside strip zone

// Late-delivery threshold: half of (Borealis impactor mass / Mars mass)
// = 0.5 * (0.02 / 0.107) ≈ 0.0935 (9.35% fractional mass gain).
const LATE_DELIVERY_FRAC = 0.5 * (0.02 / 0.107);

// Mass class boundaries (Earth masses)
const M_STELLAR_BOUNDARY = 25400.0;  // 0.08 M_sun, hydrogen burning
const DISC_TRUNCATION_FACTOR = 0.15; // Holman-Wiegert fallback only
