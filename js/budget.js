"use strict";
// HYDROS v6 — BUDGET-PARAMETRIZED FORMATION FRAMEWORK.
// (Memory: two-zone-architecture, collapse-capture-physics.)
//
// The object's allocated mass is DIFFERENTIATED into a conserved budget vector
//   { b_rock, b_ice, b_pebble, b_hydrogen }  (+ primordial spin λ)
// each component NORMALIZED so Sol = 1. This REPLACES (M_star, D_neb, f_disc):
//  - D_neb is the interstellar-medium density → negligible, DROPPED.
//  - the total mass, metallicity, f_disc and the Davis Dam are all DERIVED.
//  - the budget is CONSERVED: star (≈99%) + planets (disc share) + Kuiper
//    (closing remainder) — the star gets most of EVERY component.
// Sol anchors the whole basis at (b_rock,b_ice,b_pebble,b_hydrogen,λ)=(1,1,1,1,1).
// Global-script style; depends on constants.ts, disc.ts loaded first.
// Sol's component masses as FRACTIONS of the Sol-primordial mass (so Sol's
// budget (1,1,1,1) ⇒ total = 1). Metals Z = rock+ice(+pebble) = 0.014;
// H/He = 1−Z; rock:ice = F_ROCK:(1−F_ROCK) = 0.22:0.78.
// PEBBLE is carried as a fourth budget but its Sol anchor is left 0 for now
// (pebbles handled as the existing drift-flux bonus until SOL_B_PEBBLE is
// pinned from total_pebble_bonus_budget) — TODO.
const SOL_B_HYDROGEN = 1.0 - Z_METALLICITY; // 0.986
const SOL_B_ROCK = Z_METALLICITY * F_ROCK; // 0.00308
const SOL_B_ICE = Z_METALLICITY * (1.0 - F_ROCK); // 0.01092
const SOL_B_PEBBLE = 0.0; // placeholder
// Allocated (≈ stellar) mass from the budget, Sol-normalized (Sol → 1).
function mass_from_budget(b) {
    return b.hydrogen * SOL_B_HYDROGEN + b.rock * SOL_B_ROCK
        + b.ice * SOL_B_ICE + b.pebble * SOL_B_PEBBLE;
}
// Per-object metallicity Z = metals / total (replaces the universal constant).
function metallicity_from_budget(b) {
    const M = mass_from_budget(b);
    if (!(M > 0))
        return 0;
    return (b.rock * SOL_B_ROCK + b.ice * SOL_B_ICE + b.pebble * SOL_B_PEBBLE) / M;
}
// Per-object rock fraction of the rock+ice metal split (replaces F_ROCK).
function f_rock_from_budget(b) {
    const r = b.rock * SOL_B_ROCK, i = b.ice * SOL_B_ICE;
    return (r + i) > 0 ? r / (r + i) : 0;
}
// DERIVED disc fraction from spin: the disc is the high-angular-momentum share
// that missed the core. Anchored f_disc(Sol: λ=1, M=1) = 0.0103.
// !! UNVALIDATED CANDIDATE — scaling ∝ λ²/M (centrifugal) is a placeholder; the
// real f_disc must come from the dam/collapse derivation below. !!
const F_DISC_SOL = 0.0103;
function f_disc_from_spin(spin, M) {
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
const WIND_MASS_EXP = 3.27; // R_disc ∝ M^3.27 (non-linear stellar wind)
const FIELD_MASS_EXP = 0.60; // R_A   ∝ M^0.60 (magnetosphere stand-off)
function disc_radius_wind(M) {
    return SOL_R_DISC * Math.pow(M / SOL_M_PRIMORDIAL, WIND_MASS_EXP);
}
function alfven_radius_standoff(M) {
    return SOL_R_A_FORMATION * Math.pow(M / SOL_M_PRIMORDIAL, FIELD_MASS_EXP);
}
function compression_budget(M) {
    return alfven_radius_standoff(M) / disc_radius_wind(M);
}
// Inversion requires an IGNITER. The Davis Dam's FALLBACK (no/feeble wind) is
// the HILL RADIUS — the gravitational disc edge — NOT the atmosphere. Without a
// wind to advance it, the dam sits at the Hill radius; whether that inverts
// depends on R_A vs R_Hill: for a star's strong magnetosphere the Hill-radius
// fallback is too small to beat it ⇒ would invert — so RED DWARFS invert
// (strong field, but feeble wind ⇒ dam stuck at the small fallback). For a
// gas giant (Jupiter) the planetary Hill radius is LARGE vs its weaker
// magnetosphere ⇒ NORMAL (Alfvén-dominant). Proxy for now: below the H-burning
// limit there is no stellar wind, force NORMAL (kills the M→0 wind blow-up for
// sub-cascades); proper non-igniter handling = R_A vs R_Hill. TODO.
const IGNITION_MASS = 0.08; // M⊙, hydrogen-burning limit
function is_inverted_budget(M) {
    return M >= IGNITION_MASS && compression_budget(M) >= 1.0;
}
// Convenience: the full derived parameter set from a budget + spin.
function params_from_budget(b, spin) {
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
