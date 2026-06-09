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

interface Budget { rock: number; ice: number; pebble: number; hydrogen: number; }

// Sol's component masses as FRACTIONS of the Sol-primordial mass (so Sol's
// budget (1,1,1,1) ⇒ total = 1). Metals Z = rock+ice(+pebble) = 0.014;
// H/He = 1−Z; rock:ice = F_ROCK:(1−F_ROCK) = 0.22:0.78.
// PEBBLE is carried as a fourth budget but its Sol anchor is left 0 for now
// (pebbles handled as the existing drift-flux bonus until SOL_B_PEBBLE is
// pinned from total_pebble_bonus_budget) — TODO.
const SOL_B_HYDROGEN = 1.0 - Z_METALLICITY;            // 0.986
const SOL_B_ROCK     = Z_METALLICITY * F_ROCK;         // 0.00308
const SOL_B_ICE      = Z_METALLICITY * (1.0 - F_ROCK); // 0.01092
const SOL_B_PEBBLE   = 0.0;                             // placeholder

// Allocated (≈ stellar) mass from the budget, Sol-normalized (Sol → 1).
function mass_from_budget(b: Budget): number {
  return b.hydrogen * SOL_B_HYDROGEN + b.rock * SOL_B_ROCK
       + b.ice * SOL_B_ICE + b.pebble * SOL_B_PEBBLE;
}

// Per-object metallicity Z = metals / total (replaces the universal constant).
function metallicity_from_budget(b: Budget): number {
  const M = mass_from_budget(b);
  if (!(M > 0)) return 0;
  return (b.rock * SOL_B_ROCK + b.ice * SOL_B_ICE + b.pebble * SOL_B_PEBBLE) / M;
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

// DAM = WIND vs MAGNETIC FIELD (D-free; user, 2026-06-09). On ignition the wind
// must establish a pressure differential HIGHER THAN THE MAGNETIC FIELD across
// the future disc. If it does (NORMAL): the field is confined to a small R_A
// (holds the inner disc), and the Davis Dam — the wind front — advances FAR OUT
// to where the wind weakens to balance the outer disc (~30 AU). If the wind is
// too feeble (INVERTED): the field is unconfined ⇒ R_A stands far out, and the
// feeble wind cannot advance the Davis Dam ⇒ it stays plunged in. So the regime
// is a WIND-vs-B comparison (a stellar property of M, spin) — D never enters.
// Model mapping: R_disc = wind reach, R_A = magnetic reach, regime = which is
// outer. NEXT PIECE (not a blocker): the scalings must make feeble/low-spin
// M-dwarfs invert ⇒ the magnetic reach grows as the wind weakens — the OPEN
// R_A–Ω^(4/7) SIGN issue from the paper review. The naive centrifugal form
// below is a PLACEHOLDER until the wind/B scalings are settled.
function disc_radius_from_budget(M: number, spin: number): number {
  return SOL_R_DISC * spin * spin / Math.max(M, 1e-12);  // PLACEHOLDER — wind/B dam pending
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
    R_disc: disc_radius_from_budget(M, spin),
    R_A: alfven_radius(M, spin),
  };
}
