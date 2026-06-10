"use strict";
// HYDROS v6 — BUDGET-PARAMETRIZED FORMATION FRAMEWORK.
// (Memory: two-zone-architecture, collapse-capture-physics.)
//
// The object's allocated mass is DIFFERENTIATED into a conserved budget vector
//   { b_rock, b_ice, b_hydrogen }  (+ primordial spin λ)
// each component an ABSOLUTE MASS in EARTH MASSES (M⊕) of that material — the
// same unit as the planet masses / m_star_earth everywhere else in the model, so
// the budget is composition-AGNOSTIC physical mass and Sol's own Z=0.014 /
// f_rock=0.22 EMERGE from its numbers rather than being baked into the anchors
// (user, 2026-06-09: budget in Earth masses to match composition elsewhere).
// PEBBLES are NOT a separate reservoir — derived as a drift flux (40% of the
// disc ICE), so inherited pebbles fold into the ICE budget. This REPLACES
// (M_star, D_neb, f_disc):
//  - D_neb is the interstellar-medium density → negligible, DROPPED.
//  - the total mass, metallicity, f_disc and the Davis Dam are all DERIVED.
//  - the budget is CONSERVED: star (≈99%) + planets (disc share) + Kuiper
//    (closing remainder) — the star gets most of EVERY component.
// Sol: (b_rock,b_ice,b_hydrogen) = (1169.04, 4144.78, 374244.62) M⊕ (sum =
// 379558 M⊕ = 1.14 M☉ = 1 Sol-primordial). constants.ts, disc.ts first.
// Allocated (≈ stellar) mass from the budget, in Sol-primordial model units
// (Sol → 1): the total Earth-mass budget divided by the Earth masses per Sol-
// primordial unit (M_SUN_TO_EARTH = 379558), so all downstream physics — which
// runs in M⊕ via m_star_earth — is unchanged.
function mass_from_budget(b) {
    return (b.rock + b.ice + b.hydrogen) / M_SUN_TO_EARTH;
}
// Per-object metallicity Z = metals / total — now a PURE ratio of the absolute
// masses (no Sol-composition anchor); Sol's (3.5112+12.4488)/1140 = 0.014 falls out.
function metallicity_from_budget(b) {
    const total = b.rock + b.ice + b.hydrogen;
    return total > 0 ? (b.rock + b.ice) / total : 0;
}
// Per-object rock fraction of the rock+ice metal split — pure ratio.
function f_rock_from_budget(b) {
    return (b.rock + b.ice) > 0 ? b.rock / (b.rock + b.ice) : 0;
}
// RECONSTRUCT the conserved budget {rock, ice, hydrogen} (Earth masses) from a
// star's MASS + two spectroscopic indicators:
//   M_star  — Sol-primordial M☉ (Sol = 1 ≡ M_SUN_TO_EARTH earth masses),
//   FeH     — [Fe/H] metallicity → Z = Z☉·10^[Fe/H] (the metal budget),
//   CtoO    — C/O ratio → the rock:ice split (water indicator); ≤0 ⇒ assume solar.
// f_rock rises as C/O climbs (less free oxygen ⇒ less water): f_rock(0.55)=0.22,
// f_rock(≥0.8)=1 (dry). Validates against Sol: (1, 0, 0.55) → the catalog budget
// (1169.04, 4144.78, 374244.62). Helium folds into the hydrogen (H/He) budget.
function budget_from_abundances(M_star, FeH, CtoO) {
    const Z = Z_METALLICITY * Math.pow(10, FeH);
    const co = (CtoO > 0) ? CtoO : CO_SUN;
    const f_rock = Math.min(1.0, 1.0 / (1.0 + K_CO * Math.max(0, CO_RICH_THRESH - co)));
    const total = M_star * M_SUN_TO_EARTH; // total budget mass in Earth masses
    return {
        rock: total * Z * f_rock,
        ice: total * Z * (1 - f_rock),
        hydrogen: total * (1 - Z),
    };
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
// === CENTRIFUGAL COLLAPSE PHYSICS (Terebey–Shu–Cassen) ==========================
// Spin is the angular-momentum dial. Material with specific angular momentum j
// lands at its CENTRIFUGAL RADIUS R_c = j²/GM (Ulrich 1976; the disc's outer
// edge). With j ∝ Ω·R² and the SIS inside-out collapse (R_c ∝ M³), the disc
// radius is R_disc = R_wind(M)·λ² — the same law that gives Sol 30 AU at λ=1 and
// Alpha Cen ~14,000 AU at λ≈5.7. Higher spin disperses more mass to larger radii
// (more disc) and leaves less for the core.
//
// The rotational parameter β = E_rot/|E_grav| ∝ Ω² ∝ λ². At β ≥ β_FRAG = 0.274
// (Bate 2011 bar-mode/secular instability) the core cannot stay axisymmetric and
// tears into a binary — the Alpha Cen A+B channel.
//
// CONSISTENCY ANCHOR: BETA_SOL is fixed so the λ that reproduces Alpha Cen's
// 14,000 AU Davis Dam (λ² = 14000/R_wind(2.26) ≈ 32.4) is exactly its
// fragmentation threshold (β=0.274) — ONE λ explains the dam AND the core split.
// The resulting BETA_SOL ≈ 0.0085 also matches the solar-nebula rotational
// parameter, so the model's λ becomes the physical normalized spin (Sol = 1).
const BETA_SOL = 0.274 / 32.4; // ≈ 0.00846; ties the dam to fragmentation
const BETA_FRAG = 0.274; // bar-mode instability → binary (Bate 2011)
function rotational_beta(lambda) {
    return BETA_SOL * lambda * lambda;
}
function core_fragments(lambda) {
    return rotational_beta(lambda) >= BETA_FRAG;
}
// Centrifugal radius = the Davis Dam. R_wind(M) carries the SIS M³ mass-scaling;
// λ² carries the rotational dispersion. Sol (λ=1)→30 AU, Alpha Cen (λ≈5.7)→14k AU.
function centrifugal_radius(M, lambda) {
    return disc_radius_wind(M) * lambda * lambda;
}
// Dispersed fraction (mass diverted to the disc rather than the core), rising with
// β. Anchored on the two clean fixed points: Sol (β≈0.0085 → f_disc≈0.01, the
// solar nebula) and Alpha Cen (β=0.274 → f_disc≈0.12, i.e. Proxima+giants against
// the A+B core). A power law through both gives f_disc = 0.305·β^0.715. The core
// keeps the rest (1−f_disc); above β_FRAG that core is itself split into a binary.
function disc_fraction_centrifugal(lambda) {
    const beta = rotational_beta(lambda);
    return Math.min(F_DISC_MAX, 0.305 * Math.pow(beta, 0.715));
}
function three_budget_split(b, lambda) {
    const M = mass_from_budget(b);
    const f_disc = disc_fraction_centrifugal(lambda);
    const f_outer_of_disc = Math.max(0, 1 - Math.pow(Math.max(lambda, 1e-9), -2 / 3));
    const f_outer = f_disc * f_outer_of_disc;
    const f_inner = f_disc - f_outer;
    const f_core = 1 - f_disc;
    const scale = (f) => ({ rock: b.rock * f, ice: b.ice * f, hydrogen: b.hydrogen * f });
    return {
        core: scale(f_core), inner: scale(f_inner), outer: scale(f_outer),
        f_core, f_inner, f_outer,
        R_disc: centrifugal_radius(M, lambda), R_dam: disc_radius_wind(M),
        beta: rotational_beta(lambda), fragments: core_fragments(lambda),
    };
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
const IGNITION_MASS = 0.08; // M⊙, hydrogen-burning limit
function is_inverted_budget(M) {
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
const ACCRETION_K = 5.708e-8; // Sol snow-line anchor (M⊙/yr per AAF unit)
function accretion_rate(M, Z, f_rock, f_disc, R_disc, B, C) {
    const aaf = m_star_earth(M) * Z * f_rock * f_disc * ETA_ROCK / R_disc;
    return ACCRETION_K * aaf * B * C;
}
// Capture fraction C — a self-fed primary (no parent) is 1; a parent-fed sub-disc
// captures R_disc/R_Hill, R_Hill = a_parent·(M / 3 M_grand)^(1/3).
function capture_fraction(R_disc, a_parent, M, M_grand) {
    if (!(a_parent > 0) || !(M_grand > 0))
        return 1.0;
    const R_Hill = a_parent * Math.pow(M / (3 * M_grand), 1.0 / 3.0);
    return R_disc / R_Hill;
}
// Mulders et al. 2015 (Eq. 2, from Min et al. 2011) VISCOUS snow line from the
// gas accretion rate: R_SL = 2.1 AU·(M/M⊙)^⅓·(Ṁ/1e-8)^(4/9)·(κ/770)^(2/9),
// at f_gd=100, α=0.01, T_ice=160 K. Ṁ dominates (4/9 over orders of magnitude);
// opacity κ is a weak (2/9, factor-2) lever (ISM 770 vs grown 20 cm²/g).
const SNOW_KAPPA_R = 770.0; // Rosseland opacity, ISM small grains (cm²/g)
function mulders_snow_line(M_star, Mdot_msun_yr) {
    return 2.1 * Math.pow(M_star / SOL_M_PRIMORDIAL, 1.0 / 3.0)
        * Math.pow(Math.max(Mdot_msun_yr, 1e-40) / 1e-8, 4.0 / 9.0)
        * Math.pow(SNOW_KAPPA_R / 770.0, 2.0 / 9.0);
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
