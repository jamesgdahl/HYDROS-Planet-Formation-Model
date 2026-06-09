// HYDROS v6 — BUDGET-PARAMETRIZED FORMATION FRAMEWORK.
// (Memory: two-zone-architecture, collapse-capture-physics.)
//
// The object's allocated mass is DIFFERENTIATED into a conserved budget vector
//   { b_rock, b_ice, b_hydrogen }  (+ primordial spin λ)
// each component NORMALIZED so Sol = 1. PEBBLES are NOT a separate reservoir —
// the model derives them as a drift flux (40% of the disc ICE, via
// total_pebble_bonus_budget), so a body's inherited pebbles fold into its ICE
// budget and are re-derived downstream (user, 2026-06-09). This REPLACES
// (M_star, D_neb, f_disc):
//  - D_neb is the interstellar-medium density → negligible, DROPPED.
//  - the total mass, metallicity, f_disc and the Davis Dam are all DERIVED.
//  - the budget is CONSERVED: star (≈99%) + planets (disc share) + Kuiper
//    (closing remainder) — the star gets most of EVERY component.
// Sol anchors the whole basis at (b_rock,b_ice,b_pebble,b_hydrogen,λ)=(1,1,1,1,1).
// Global-script style; depends on constants.ts, disc.ts loaded first.

interface Budget { rock: number; ice: number; hydrogen: number; }

// Sol's component masses as FRACTIONS of the Sol-primordial mass (so Sol's
// budget (1,1,1) ⇒ total = 1). Metals Z = rock+ice = 0.014; H/He = 1−Z;
// rock:ice = F_ROCK:(1−F_ROCK) = 0.22:0.78. Pebbles are inside the ice budget
// (drift flux, derived downstream) — no separate anchor.
const SOL_B_HYDROGEN = 1.0 - Z_METALLICITY;            // 0.986
const SOL_B_ROCK     = Z_METALLICITY * F_ROCK;         // 0.00308
const SOL_B_ICE      = Z_METALLICITY * (1.0 - F_ROCK); // 0.01092

// Allocated (≈ stellar) mass from the budget, Sol-normalized (Sol → 1).
function mass_from_budget(b: Budget): number {
  return b.hydrogen * SOL_B_HYDROGEN + b.rock * SOL_B_ROCK + b.ice * SOL_B_ICE;
}

// Per-object metallicity Z = metals / total (replaces the universal constant).
function metallicity_from_budget(b: Budget): number {
  const M = mass_from_budget(b);
  if (!(M > 0)) return 0;
  return (b.rock * SOL_B_ROCK + b.ice * SOL_B_ICE) / M;
}

// Per-object rock fraction of the rock+ice metal split (replaces F_ROCK).
function f_rock_from_budget(b: Budget): number {
  const r = b.rock * SOL_B_ROCK, i = b.ice * SOL_B_ICE;
  return (r + i) > 0 ? r / (r + i) : 0;
}

// DERIVED disc fraction from spin: the disc is the high-angular-momentum share
// that missed the core. Anchored f_disc(Sol: λ=1, M=1) = 0.0103.
// !! UNVALIDATED CANDIDATE — scaling ∝ λ²/M (centrifugal) is a placeholder; the
// real f_disc must come from the dam/collapse derivation below. !!
const F_DISC_SOL = 0.0103;
function f_disc_from_spin(spin: number, M: number): number {
  return Math.min(F_DISC_SOL * spin * spin / Math.max(M, 1e-12), F_DISC_MAX);
}

// DAM = WIND vs MAGNETIC FIELD, D-free (user + research, 2026-06-09).
// Regime is set at the YOUNG DIM SUN epoch (T-Tauri high spin → saturated kG
// field; pre-Hayashi dim → feeble wind). At formation all young stars are
// saturated, so the FIELD doesn't discriminate — MASS does, via the wind:
//   R_disc = WIND REACH (Davis Dam): NON-LINEAR in mass — bigger/hotter stars
//     burn heavier elements and drive disproportionately strong winds, so the
//     wind front reaches far out for big stars and barely at all for M-dwarfs.
//   R_A = MAGNETOSPHERE stand-off (Alfvén Dam): grows only weakly with mass, so
//     for low mass it overtakes the collapsed wind reach.
// Regime: C = R_A/R_disc. C<1 NORMAL (Maas- or Alfvén-waveform-dominant by the
// see-saw); C>1 TRULY INVERTED (dams swapped, the assembly-line pile). The v5
// "inverted" K/G-dwarfs are really NORMAL Alfvén-dominant (C<1 but high) — only
// genuine late-M-dwarfs invert. Non-igniters (BD/giants) have NO wind ⇒ their
// Davis Dam is the gravitational disc edge (Hill radius) ⇒ always NORMAL.
// CALIBRATED to the two clean anchors: Sol (R_disc=30.07, R_A=0.20, C=0.0067,
// Maas-dominant normal) and TRAPPIST (M=0.089: R_disc=0.011 at b, R_A=0.047 at
// the first KBO, C=4.3, inverted) ⇒ exponents below; inversion boundary ~0.15 M⊙.
const WIND_MASS_EXP = 3.27;   // R_disc ∝ M^3.27 (non-linear stellar wind)
const FIELD_MASS_EXP = 0.60;  // R_A   ∝ M^0.60 (magnetosphere stand-off)
function disc_radius_wind(M: number): number {
  return SOL_R_DISC * Math.pow(M / SOL_M_PRIMORDIAL, WIND_MASS_EXP);
}
function alfven_radius_standoff(M: number): number {
  return SOL_R_A_FORMATION * Math.pow(M / SOL_M_PRIMORDIAL, FIELD_MASS_EXP);
}
function compression_budget(M: number): number {
  return alfven_radius_standoff(M) / disc_radius_wind(M);
}
// The DAVIS DAM is set by a WIND, and the wind is UNIVERSAL: fusion (stars) +
// thermal/Kelvin-Helmholtz (gas giants) + MAGNETICALLY-DRIVEN particle wind
// (ANY magnetic object — the magnetosphere flings charged particles outward,
// piling them against the inflow at the BOW SHOCK). So a magnetic non-igniter
// gets a REAL Davis Dam (its bow shock, a product of its own field), NOT just a
// gravitational fallback; the HILL RADIUS is only the ultimate outer cap. The
// Alfvén Dam (R_A) = the magnetopause (the model's R_A is correctly located).
// REGIME = R_A vs R_disc(total wind front): NORMAL when the wind shocks BEYOND
// the magnetosphere (bow shock past magnetopause — Jupiter), INVERTED when the
// wind is too feeble to do so (red dwarf: strong field, feeble wind ⇒ R_A beats
// its own wind's reach). Mass discriminates for igniters (fusion-wind ∝ M^3.27).
// Proxy for now: below the H-burning limit force NORMAL (magnetic-wind bow-shock
// dam not yet modelled; kills the M→0 fusion-wind blow-up for sub-cascades).
// TODO: model the magnetic-wind Davis Dam (bow shock) for non-igniters.
const IGNITION_MASS = 0.08;  // M⊙, hydrogen-burning limit
function is_inverted_budget(M: number): boolean {
  return M >= IGNITION_MASS && compression_budget(M) >= 1.0;
}

// ============================================================
//  UNIFIED ACCRETION RATE — one primitive drives BOTH the snow line (viscous
//  heating) and the formation clock (M_core / Z·Ṁ). Replaces the hardcoded
//  0.10·r/AAF formation-time fudge and the GRAIN_OPACITY snow-line fudge with a
//  single derived rate (user, 2026-06-09):
//      Ṁ = K · AAF · B · C
//   AAF = derived solid accretion POTENTIAL (m_star·Z·f_rock·f_disc·η / R_disc)
//   B   = relative mass budget (M / M⊙) — the supply throttle; small allocation
//         ⇒ slow feed (gas-starvation by budget). Sol = 1 is just the anchor
//         (Sol is itself a slot product of a bigger reservoir — no special case).
//   C   = capture fraction: a self-fed primary disc = 1; a parent-fed SUB-disc
//         captures only R_disc/R_Hill of the equivalent flux (the extra gas-
//         starvation that makes a circumplanetary disc cold/close-in), R_Hill
//         from the object's slot in its parent.
//   K   = Sol-calibrated normalization (so Sol's snow line lands ~2.7 AU).
//  VERIFIED (2026-06-09): Sol calibrates (snow 2.7 AU, Jupiter-slot clock 1.7
//  Myr); Jupiter is then a PREDICTION — snow line 0.0038 AU (only Io dry,
//  Europa/Ganymede/Callisto icy) and moon clock ~4.6 Myr.
const ACCRETION_K = 5.708e-8;        // Sol snow-line anchor (M⊙/yr per AAF unit)
function accretion_rate(M: number, Z: number, f_rock: number, f_disc: number,
                        R_disc: number, B: number, C: number): number {
  const aaf = m_star_earth(M) * Z * f_rock * f_disc * ETA_ROCK / R_disc;
  return ACCRETION_K * aaf * B * C;
}
// Capture fraction C — a self-fed primary (no parent) is 1; a parent-fed sub-disc
// captures R_disc/R_Hill, R_Hill = a_parent·(M / 3 M_grand)^(1/3).
function capture_fraction(R_disc: number, a_parent: number, M: number, M_grand: number): number {
  if (!(a_parent > 0) || !(M_grand > 0)) return 1.0;
  const R_Hill = a_parent * Math.pow(M / (3 * M_grand), 1.0 / 3.0);
  return R_disc / R_Hill;
}
// Mulders et al. 2015 (Eq. 2, from Min et al. 2011) VISCOUS snow line from the
// gas accretion rate: R_SL = 2.1 AU·(M/M⊙)^⅓·(Ṁ/1e-8)^(4/9)·(κ/770)^(2/9),
// at f_gd=100, α=0.01, T_ice=160 K. Ṁ dominates (4/9 over orders of magnitude);
// opacity κ is a weak (2/9, factor-2) lever (ISM 770 vs grown 20 cm²/g).
const SNOW_KAPPA_R = 770.0;          // Rosseland opacity, ISM small grains (cm²/g)
function mulders_snow_line(M_star: number, Mdot_msun_yr: number): number {
  return 2.1 * Math.pow(M_star / SOL_M_PRIMORDIAL, 1.0 / 3.0)
    * Math.pow(Math.max(Mdot_msun_yr, 1e-40) / 1e-8, 4.0 / 9.0)
    * Math.pow(SNOW_KAPPA_R / 770.0, 2.0 / 9.0);
}

// Convenience: the full derived parameter set from a budget + spin.
function params_from_budget(b: Budget, spin: number): {
  M: number; Z: number; f_rock: number; f_disc: number; R_disc: number; R_A: number;
} {
  const M = mass_from_budget(b);
  return {
    M,
    Z: metallicity_from_budget(b),
    f_rock: f_rock_from_budget(b),
    f_disc: f_disc_from_spin(spin, M),
    R_disc: disc_radius_wind(M),
    R_A: alfven_radius_standoff(M),
  };
}
