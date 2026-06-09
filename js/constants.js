"use strict";
// ============================================================
//  HYDROS universal constants
//  Global-script style (no modules): compiled by tsc to js/constants.js
//  and loaded by index.html with an ordinary <script> tag.
// ============================================================
// Composition (solar)
const Z_METALLICITY = 0.014;
const F_ROCK = 0.22;
// PER-OBJECT COMPOSITION CONTEXT (v6 budget wiring). The allocation
// AMPLITUDE constants Z·F_ROCK are no longer universal — a budget-input
// object overrides them with its own metallicity / rock fraction (Jupiter
// is metal-enriched, so its disc carries ~2× the solids a solar-Z disc
// would). These default to the solar globals, so any system NOT using a
// budget (the entire legacy {M,D,spin,f_disc} catalog) is bit-identical.
// set_composition() is called on the budget path and ALWAYS paired with
// reset_composition() after the fit, so the context never leaks between
// systems. Z_METALLICITY / F_ROCK themselves stay fixed — they anchor the
// Sol budget basis in budget.ts (SOL_B_* must not move).
let COMP_Z = Z_METALLICITY;
let COMP_F_ROCK = F_ROCK;
function set_composition(z, f_rock) {
    COMP_Z = z;
    COMP_F_ROCK = f_rock;
}
function reset_composition() {
    COMP_Z = Z_METALLICITY;
    COMP_F_ROCK = F_ROCK;
}
// SLOPE NORMALIZATION OVERRIDE (v6 budget wiring). slope() in disc.ts measures
// the disc's solid surface density as disc_budget / disc_radius(M, spin=1) — a
// fixed spin=1 reference length. For a sub-cascade primary the cascade is
// ANCHORED far from that reference (Jupiter's dam sits at 0.0126 AU, but
// disc_radius(M,1) ≈ 1e-4 AU), so f_disc has to absorb the ~100× length
// mismatch and comes out as a meaningless scale artifact. Setting this to the
// ANCHORED dam makes slope consistent with where the cascade actually lives, so
// the bisected f_disc becomes the REAL disc fraction (and the disc mass / Ṁ
// that the snow line needs). Negative sentinel = use the spin=1 reference (the
// legacy catalog never sets it ⇒ untouched). Always reset after the fit.
let COMP_R_DISC = -1.0;
function set_r_disc_norm(r) { COMP_R_DISC = r; }
function reset_r_disc_norm() { COMP_R_DISC = -1.0; }
// SNOW-LINE OVERRIDE (v6 budget wiring). The disc-temperature snow line in
// disc.ts scales with the primary's MAIN-SEQUENCE luminosity (L∝M⁴ → the M²
// term), which vanishes for a substellar primary — so a gas giant's sub-disc
// would read as ice-everywhere. But the Galilean snow line (Io dry/rocky,
// Europa+ icy) is set by young Jupiter's FORMATION luminosity (KH/accretion),
// not fusion. The budget path computes that snow line and parks it here; a
// negative sentinel means "use the formula." Always reset after the fit.
let COMP_R_SNOW = -1.0;
function set_snow_line(r) { COMP_R_SNOW = r; }
function reset_snow_line() { COMP_R_SNOW = -1.0; }
const F_LODDERS_ICE = 3.5;
const GAS_FRACTION = 0.95;
const H_FRACTION = 0.74;
// One PRIMORDIAL-solar mass unit = 1.14 current M_sun (Sol baseline:
// M = 1, spin = 1, nebula density = 1). Earth masses per unit:
const M_PRIM_TO_MSUN = 1.14;
const M_SUN_TO_EARTH = 332946.0 * M_PRIM_TO_MSUN; // 379,558 M_E per M_prim
// Inverted-factory descent exponents (assembly mass ∝ (origin/r)^exp down the
// line). The Alfvén slots are MAGNETIC, so they concentrate FERROMAGNETIC
// material — rock/iron — and slot 0 + the cascade slots accrete rock fast and
// front-loaded (STEEP descent ⇒ rock consumed quickly). Water ICE is NOT
// ferromagnetic, so the slots can't concentrate it; ice accretes by
// gravity/drift alone, more slowly and spread out (SHALLOW descent). Hence rock
// is exhausted faster than ice along the vintages. (Memory: inverted-regime-model.)
// Inverted-factory knobs — CALIBRATED against TRAPPIST-1 (the clean in-situ
// reference). VISC_COEFF sets the viscous snow line r_visc = VISC_COEFF·
// (f_disc·M²)^(1/3) (the rock→ice phase boundary). Descents: rock steep/fast
// (ferromagnetic, slot-concentrated), ice shallow/slow (non-magnetic).
const VISC_COEFF = 0.67;
const INV_ROCK_DESCENT = 0.75;
const INV_ICE_DESCENT = 0.40;
// PHASE-3 nebula (beyond R_A, no slots): a single Alfvén-repelled pile the
// marching dam sweeps up inner-first. INV_NEB_FRAC sets the swept nebula
// budget (× f_disc·M·Z·ETA); NEB_DEPLETION is the fraction the first (inner)
// product takes, the next taking that fraction of the remainder, etc. — so the
// inner KBO consumes most of the nebula and outer ones are small tails.
const INV_NEB_FRAC = 0.318;
// The depletion fraction is DERIVED per system from the local nebula
// CONCENTRATION — density AND factory geometry — not a hard value:
//   Σ = D / R_factory²   (R_factory = R_A inverted / outer dam normal, in AU)
//   depletion = 1/(1 + (NEB_CONC_HALF/Σ)^NEB_CONC_STEEP).
// A compact factory packs the same nebula into a tiny area → high Σ → the first
// product takes most (ONE big body); a far-flung factory dilutes it → low Σ →
// many SIMILAR bodies. This is why TRAPPIST (D≈320, R_A≈0.04 AU ⇒ Σ huge) minted
// one big g + small h, while Sol (D≈1, dam ≈ 30 AU ⇒ Σ tiny) minted a swarm of
// Pluto-sized KBOs. Calibrated: TRAPPIST Σ≈2e5 → 0.75; Sol Σ≈1e-3 → ~0.1.
const NEB_CONC_HALF = 133.0;
const NEB_CONC_STEEP = 0.174;
// Universal physics
const THRESHOLD_GAS = 3.0;
const PEBBLE_CAPTURE_EFFICIENCY = 0.40;
const ETA_ROCK = 0.78;
const SNOW_PILEUP_FACTOR = 0.5;
const SNOW_PILEUP_WIDTH_FRAC = 0.15;
const T_DISC_DISPERSAL_MYR = 5.0;
const ETA_ICE_DECAY_FRACTION = 0.80;
// Grain-opacity parameter (paper §2): 0 = fully grain-grown (opacity-poor),
// 1 = ISM-like small-grain-dominated (opacity-rich). Set to 0.75 → Sol snow
// line 2.50 AU. The grain-axis midpoint 0.5 (snow line 1.97 AU, the Mulders
// disc-population median) pulled the line in far enough to hand Theia's slot
// an ice budget that pushed it over the gas-giant threshold — unphysical; so
// 0.75 keeps the terrestrial slots rock-dominant while still sitting inside
// the old Sol-fit 0.82/2.70 AU value (an artifact of anchoring on the
// Mars/Theia annihilation zone). Held constant across systems; the snow line
// then scales with M^2 and sqrt(f_disc).
const GRAIN_OPACITY = 0.75;
// Sol reference values (calibration anchors)
const SOL_M_PRIMORDIAL = 1.0; // Sol IS the unit (1 = 1.14 current M_sun)
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
const UNDERPRED_PENALTY = 5.0; // slot prediction far BELOW observed:
// physical impossibility — planet must
// have migrated from an outer slot.
const UNDERPRED_RATIO = 5.0; // observed/cascade_pred ratio threshold
const GAS_OBS_THRESHOLD = 5.0;
const GAS_INNER_PENALTY = 0.15;
const GAS_DECISIVE_DIST = 0.05;
// Stripping / composition
const IRON_FRACTION = 0.30;
const T_STRIP_K = 2000.0; // silicate vaporization threshold (K)
const L_T_TAURI_FACTOR = 10.0; // pre-MS luminosity boost over MS
const ALBEDO = 0.1;
const SIGMA_SB = 5.670374419e-8;
const L_SUN_W = 3.828e26;
const AU_M = 1.495978707e11;
const STRIP_OBS_MAX = 15.0; // M_E — large planets retain envelope
// via escape velocity inside strip zone
// Late-delivery threshold: half of (Borealis impactor mass / Mars mass)
// = 0.5 * (0.02 / 0.107) ≈ 0.0935 (9.35% fractional mass gain).
const LATE_DELIVERY_FRAC = 0.5 * (0.02 / 0.107);
// Mass class boundaries (Earth masses)
const M_STELLAR_BOUNDARY = 25400.0; // 0.08 M_sun, hydrogen burning
const DISC_TRUNCATION_FACTOR = 0.15; // Holman-Wiegert fallback only
// ---- Physical guardrails (v5: reject fits requiring impossible inputs) ----
// A disc cannot exceed half the stellar mass (gravitationally it would be
// a binary, not a disc). The f_disc bisection is bounded by this.
const F_DISC_MAX = 0.5;
// Maximum physical formation-cloud density (Sol D = 1 ≈ 1e6 H2 cm^-3).
// Ceiling is the protostellar OPACITY LIMIT n(H2) ~ 1e10 cm^-3 (D ~ 1e4),
// where a collapsing core turns optically thick / forms the first
// hydrostatic core — denser than this is inside the protostar, not a
// disc-forming nebula. Dense (clustered, collapsing) cores legitimately
// reach here; combined with a feeble M-dwarf wind this puts the Davis Dam
// very close in (TRAPPIST). Still rejects the old jaw-lock artifacts
// (D ~ 1e6–1e7). Fits above this are flagged unphysical.
const MAX_NEBULA_DENSITY = 10000.0;
// breakup_spin(M) in disc.ts is the third guardrail (true stellar rotation).
