// Derived disc properties, computed from the system inputs + constants.
// Global-script style: depends on constants.ts being loaded first.

function m_star_earth(m_sun: number): number {
  return m_sun * M_SUN_TO_EARTH;
}

// The Davis Dam is a stellar-wind ⇄ nebula ram-pressure balance (v5).
// Wind: Ṁ ∝ R²·F_X^0.77 (Wood et al. 2021); F_X = L_X/R² with L_X ∝ L_bol ∝
// M⁴ (activity) AND ∝ rotation (Cranmer & Saar 2011). Folding luminosity in:
// Ṁ ∝ R²·(M⁴/R²)^0.77 ⟹ wind strength ∝ M^3.54·Ω^0.77 (R∝M^0.9, v_esc). So
//   R_disc = 30.07 · √( M^3.54 · Ω^0.77 / D ) = 30.07·M^1.77·Ω^0.385·D^(−0.5).
// The M^1.77 (vs the old M^0.925 that dropped the L term) makes the M-dwarf
// wind properly FEEBLE — the dam sits close-in at MODEST density, which is
// why M-dwarfs invert without an impossible nebula. D = spin^1.5.
// Sol-normalized (M=Ω=D=1 ⟹ 30.07 AU). A feeble (low-Ω, spun-down)
// wind and/or a dense (high-D) nebula both pull the dam inward — which
// is why M-dwarfs are commonly INVERTED (Davis Dam advances past R_A).
// `spin` carries the nebula density (D = spin^1.5, the outer/density
// dial); `omega` is the stellar rotation Ω (the wind driver), defaulting
// to spin (the old jaw-lock) when not supplied.
// Inverted-dam plunge (v5.2). drop = R_disc/R_A from a wind ⇄ disc-weight
// balance: once inverted, the disc's OWN weight (∝ f_disc) supplies the inward
// pressure beyond the bare inversion, and R_disc ∝ P^(−1/2) ⟹
//   drop(f_disc) = (1 + DISC_PLUNGE_K·f_disc)^(−1/2),
// → 1 as f_disc → 0 (no disc weight ⇒ dam rests right at R_A). Calibrated so
// TRAPPIST (f_disc≈0.0152, R_A≈first-KBO 0.047) plunges to its innermost
// planet (b, 0.011): drop≈0.234. This is what lets the STORED nebula density
// stay modest — the deep drop to the innermost slot is f_disc's doing, not an
// impossible nebula. See memory: inverted-regime-model.
const DISC_PLUNGE_K = 1135.0;
function inverted_dam_drop(f_disc: number): number {
  return Math.pow(1 + DISC_PLUNGE_K * Math.max(0, f_disc), -0.5);
}

// The MODEST nebula density that JUST inverts the system: the D where the
// wind-balance edge R_density(D) reaches the magnetosphere R_A. With
// R_density = 30.07·M^1.77·Ω^0.385·D^(−1/2) and R_A = 0.20·M·Ω^(4/7):
//   D_inv = (30.07·M^1.77·Ω^0.385 / R_A)².
// This is the value to STORE/REPORT for an inverted system — "enough to invert
// and no more"; f_disc carries the dam the rest of the way down.
function inversion_threshold_density(M_star: number, omega: number): number {
  const R_A = alfven_radius(M_star, omega);
  const base = SOL_R_DISC * Math.pow(M_star / SOL_M_PRIMORDIAL, 1.77) * Math.pow(omega, 0.385);
  return Math.pow(base / R_A, 2.0);
}

function disc_radius(M_star: number, spin: number, omega?: number, f_disc?: number): number {
  const Omega = (omega === undefined) ? spin : omega;
  const D = Math.pow(spin, 1.5);
  const R_density = SOL_R_DISC * Math.pow(M_star / SOL_M_PRIMORDIAL, 1.77)
       * Math.pow(Omega, 0.385) * Math.pow(D, -0.5);
  // INVERTED PLUNGE: once the density is just enough to push the wind-balance
  // edge to the magnetosphere (R_density ≤ R_A — the system has inverted), the
  // density's job is done; the disc WEIGHT f_disc holds and plunges the Davis
  // Dam BELOW R_A to R_A·drop(f_disc). So the density never has to do the
  // (impossible) full drop to the innermost planet by pressure alone.
  if (f_disc !== undefined && f_disc > 0) {
    const R_A = alfven_radius(M_star, Omega);
    if (R_A >= R_density) return R_A * inverted_dam_drop(f_disc);
  }
  return R_density;
}

// Invert the wind-balance R_disc: the geometry/density dial `spin`
// (D = spin^1.5) that puts the Davis Dam at R_target. Replaces the old
// (30.07·M/R)^2 anchor inversions everywhere. base = 30.07·(M/M_sol)^0.925.
//  - jaw-lock (omega omitted, Ω=spin): R = base·spin^(−0.365) ⇒ spin = (base/R)^(1/0.365)
//  - decoupled (omega given):          R = base·Ω^0.385·spin^(−0.75) ⇒ spin = (base·Ω^0.385/R)^(4/3)
function spin_for_disc_radius(M_star: number, R_target: number, omega?: number): number {
  const base = SOL_R_DISC * Math.pow(M_star / SOL_M_PRIMORDIAL, 1.77);
  if (omega === undefined) return Math.pow(base / R_target, 1 / 0.365);
  return Math.pow(base * Math.pow(omega, 0.385) / R_target, 4 / 3);
}

// Inverse Alfvén Dam: the rotation Ω that puts the magnetosphere at R_target.
// R_A = 0.20·(M/M_sol)·Ω^(4/7)  ⇒  Ω = (R_target / (0.20·M/M_sol))^(7/4).
function omega_for_alfven_radius(M_star: number, R_target: number): number {
  return Math.pow(R_target / (SOL_R_A_FORMATION * (M_star / SOL_M_PRIMORDIAL)), 7.0 / 4.0);
}

// INSOLATION snow line — distinct from the disc-temperature `snow_line` used
// for normal-regime allocation. This is where the STELLAR-INSOLATION
// equilibrium temperature falls to water condensation (~170 K): inside it,
// water stays a GAS from insolation alone and is lost from the (atmosphere-
// less) forming body → rocky; outside it, ice is retained. Used to give the
// inverted-regime KBO aggregates a composition mix. T_eq = 278 K·(L/L_sun)^¼·
// (1−A)^¼ / √(r/AU); solve T_eq = 170 K ⇒ r = [278·L^¼·(1−A)^¼ / 170]².
// L defaults to the main-sequence M–L estimate; pass measured L when known.
function insolation_snow_line(M_star: number, L_obs?: number | null): number {
  const L = (L_obs && L_obs > 0) ? L_obs
    : M_star > 0.43 ? Math.pow(M_star, 4)
    : 0.23 * Math.pow(M_star, 2.3);
  const T_ICE = 170.0;            // K, water condensation
  const T_EQ_1AU = 278.0;         // K, equilibrium temp at 1 AU, L=L_sun, A=0
  const s = T_EQ_1AU * Math.pow(L, 0.25) * Math.pow(1 - ALBEDO, 0.25) / T_ICE;
  return s * s;
}

// VISCOUS snow line (inverted regime). The dense inversion pile-up is
// VISCOUSLY heated by its own rapid accretion, keeping water GASEOUS out to a
// radius far beyond the insolation snow line — so the inner factory vintages
// are ROCK-only (water excluded). T_visc^4 ∝ Ṁ·M★/r³ with Ṁ ∝ f_disc·M★ (the
// pile accretes fast) ⟹ the 170 K line sits at r_visc ∝ (f_disc·M★²)^(1/3).
// As the rocky budget is consumed the heating attenuates; beyond r_visc the
// disc cools and ICE condenses. Calibrated (VISC_COEFF) so TRAPPIST's rock
// phase is exhausted by ~vintage 3 (b,c,d rock; e,f ice). Distinct from
// `insolation_snow_line` (stellar irradiation) and `snow_line` (disc temp).
function viscous_snow_line(M_star: number, f_disc: number): number {
  if (COMP_KINETIC) return Infinity;   // hot impact-vapor disc — no ice condenses (all rock)
  return VISC_COEFF * Math.pow(Math.max(f_disc, 0) * Math.pow(M_star / SOL_M_PRIMORDIAL, 2.0), 1.0 / 3.0);
}

// Nebula density D (Sol = 1): the physical free variable of the VICE's
// outer jaw. The formation cloud's ambient pressure establishes the
// Davis Dam — R_disc = 30.07 · (M/1.14) · D^(-1/3) — and Sol's D = 1
// corresponds to n(H2) ≈ 1e6 cm^-3 (a clustered prestellar core: the
// density whose collapse centrifugal radius puts the dam at Neptune's
// exact 30.07 AU). Under the default JAW-LOCK (inner and outer jaws
// correlated through birth-site density) the recorded spin is
// Ω = D^(2/3) — Sol has spin 1, density 1 — and the anchor-family
// scan that solves R_disc from the outermost planet IS the D
// bisection expressed through the lock. In the inverted regime D_eff
// exceeds any static cloud (TRAPPIST ~5e4): the outer jaw there
// includes more than birth pressure — the decoupled-jaw signature.
// Habitable zone, ASYMMETRIC empirical bounds scaled by sqrt(L):
//   inner 0.72 AU — the recent-Venus limit (Kopparapu et al. 2013):
//     a delivered Venus is hot but habitable; the delivery receipt,
//     not the thermostat, is the framework's discriminator.
//   outer 1.37 AU — the first-CO2-condensation limit (Kasting et
//     al. 1993): beyond it CO2 clouds defeat the greenhouse. Mars
//     (1.52) is the empirical cold case — too cold even Earth-sized
//     with oceans and atmosphere — so the edge sits INSIDE its orbit.
// L defaults to the main-sequence mass-luminosity estimate (M^4
// above 0.43 M_sun; 0.23 M^2.3 for M dwarfs); pass the system's
// measured luminosity when known (preset inputs.L) — real stars
// scatter around the M-L law (ACen B: true 0.50 vs estimate 0.41).
function habitable_zone(M_star: number,
                         L_obs?: number | null): [number, number] {
  const L = (L_obs && L_obs > 0) ? L_obs
    : M_star > 0.43 ? Math.pow(M_star, 4)
    : 0.23 * Math.pow(M_star, 2.3);
  const s = Math.sqrt(L);
  return [0.72 * s, 1.37 * s];
}

function nebula_density_from_spin(spin: number): number {
  return Math.pow(spin, 1.5);
}
function spin_from_nebula_density(D: number): number {
  return Math.pow(D, 2.0 / 3.0);
}
function disc_radius_from_density(M_star: number, D: number): number {
  return SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) * Math.pow(D, -1.0 / 3.0);
}

// Formation-era stellar breakup spin (Sol-primordial units, Ω = 1 ↔
// P = 1.55 d). On the Hayashi track R_HT ≈ 2.3 R☉·M^(2/3), the breakup
// period is P_min = 2π√(R³/GM) ≈ 0.41·√M d, so Ω_break ≈ 3.8/√M.
// The inner jaw (true stellar rotation, hence the physical Alfvén Dam)
// cannot exceed this; effective dials beyond it are the outer jaw's
// territory (VICE mode decouples them).
function breakup_spin(M_star: number): number {
  return 3.8 / Math.sqrt(M_star * M_PRIM_TO_MSUN);
}

function alfven_radius(M_star: number, spin: number): number {
  return SOL_R_A_FORMATION * (M_star / SOL_M_PRIMORDIAL) * Math.pow(spin, 4.0 / 7.0);
}

// === CONDUCTOR LADDER ===============================================
// Physical body radius (R⊕) spanning rock → gas-giant degeneracy plateau →
// star. Piecewise mass–radius (terran / neptunian / jovian-plateau / stellar),
// anchored at Earth (1 R⊕), Jupiter (~11 R⊕) and Sol (109 R⊕).
function body_radius_earth(M_E: number): number {
  const ME_PER_MSUN = 332946.0;
  const M_ign = 0.08 * ME_PER_MSUN;                 // hydrogen-burning limit in M⊕
  if (M_E <= 2.0) return Math.pow(M_E, 0.28);                       // terran
  if (M_E <= 130.0) return Math.pow(2, 0.28) * Math.pow(M_E / 2, 0.55);  // neptunian
  if (M_E <= M_ign) {                                              // gas-giant plateau
    const R130 = Math.pow(2, 0.28) * Math.pow(65, 0.55);
    return R130 * Math.pow(M_E / 130, -0.02);
  }
  return 109.0 * Math.pow(M_E / ME_PER_MSUN, 0.8);                 // stellar main sequence
}

// Metallic-hydrogen conducting fraction (by mass) of the H envelope, from an
// n=1 polytrope (R≈const across the giant regime — the polytrope gives that).
// ρ(r)=ρ_c·sin(πr/R)/(πr/R), ρ_c=(π²/3)·ρ̄. Solve ρ(r_d)=RHO_METALLIC_H for the
// dynamo radius, return the enclosed mass fraction. 0 if ρ_c never reaches ρ_t.
function metallic_h_fraction(M_E: number, R_E: number): number {
  const M_g = M_E * EARTH_G_PER_ME;
  const R_cm = R_E * EARTH_CM_PER_RE;
  const rho_mean = M_g / ((4 / 3) * Math.PI * Math.pow(R_cm, 3));   // g/cc
  const rho_c = (Math.PI * Math.PI / 3) * rho_mean;
  if (rho_c <= RHO_METALLIC_H) return 0;
  const target = RHO_METALLIC_H / rho_c;
  // sinc(πx) decreasing 1→0 on x∈(0,1); bisect for x=r_d/R.
  let lo = 0, hi = 1, x = 0.5;
  for (let i = 0; i < 60; i++) {
    x = (lo + hi) / 2;
    const f = Math.sin(Math.PI * x) / (Math.PI * x);
    if (f > target) lo = x; else hi = x;
  }
  const xi = Math.PI * x;                                          // enclosed-mass fraction (n=1)
  return Math.max(0, Math.min(1, (Math.sin(xi) - xi * Math.cos(xi)) / Math.PI));
}

// Total conductive mass (M⊕-equivalents), weighted by each conductor's relative
// dynamo potential. Stellar: whole mass is plasma. Sub-stellar: molten-iron rock
// (gated below IRON_MELT_MASS) + metallic hydrogen.
function conductive_mass_earth(M_E: number, M_rock_E: number, M_h_E: number): number {
  const ME_PER_MSUN = 332946.0;
  if (M_E >= 0.08 * ME_PER_MSUN) return CONDUCT_PLASMA * M_E;       // STELLAR: ionized plasma
  const melt = Math.max(0, Math.min(1, M_E / IRON_MELT_MASS_E));   // iron-melt ramp (Mars dark)
  const rock_cond = melt * M_rock_E;
  const mh = metallic_h_fraction(M_E, body_radius_earth(M_E)) * M_h_E;
  return CONDUCT_ROCK * rock_cond + CONDUCT_METALLIC_H * mh;
}

// Dynamo surface field relative to Sol (=1): saturated B ∝ (conductive mass)^exp,
// organized by spin. Returns 0 if there is no conducting fluid (unmagnetized).
function dynamo_field_rel(M_E: number, M_rock_E: number, M_h_E: number, spin: number): number {
  const ME_PER_MSUN = 332946.0;
  const Mc = conductive_mass_earth(M_E, M_rock_E, M_h_E);
  if (Mc <= 0 || spin <= 0) return 0;
  const Mc_sol = CONDUCT_PLASMA * ME_PER_MSUN;                     // Sol: all plasma
  return Math.pow(Mc / Mc_sol, DYNAMO_SAT_EXP) * Math.pow(spin, 0.25);  // spin organizes (saturating)
}

// Predictive surface field (Gauss): conductor ladder, organized by spin with a
// dynamo onset (Rossby) — sub-stellar fields die below DYNAMO_SPIN_ONSET; stars
// (plasma rung) run regardless via differential rotation. Earth-anchored (~0.5 G).
function dynamo_surface_field(M_E: number, M_rock_E: number, M_h_E: number, spin: number): number {
  const ME_PER_MSUN = 332946.0;
  const Mc = conductive_mass_earth(M_E, M_rock_E, M_h_E);
  if (Mc <= 0 || spin <= 0) return 0;
  const Mc_earth = conductive_mass_earth(1.0, 0.32, 0.0);          // Earth iron-core reference
  const stellar = M_E >= 0.08 * ME_PER_MSUN;
  const f_spin = stellar ? 1.0 : Math.min(1.0, Math.pow(spin / DYNAMO_SPIN_ONSET, 2.0));
  return DYNAMO_B_EARTH * Math.pow(Mc / Mc_earth, DYNAMO_SAT_EXP) * f_spin;
}

// Does the magnetosphere PROJECT beyond the body? Surface magnetic pressure
// B²/2μ₀ vs the external (formation-disc / ambient) pressure. ratio>1 ⇒ exterior
// Alfvén Dam exists; ratio<1 ⇒ BURIED (field confined inside R_body), all matter
// infalls to a single body. P_ext defaults to the formation disc pressure.
function magnetosphere_projection(M_E: number, M_rock_E: number, M_h_E: number,
                                  spin: number, P_ext: number = P_EXT_FORMATION): number {
  const B = dynamo_surface_field(M_E, M_rock_E, M_h_E, spin);      // Gauss
  const P_mag = Math.pow(B * 1e-4, 2) / (2 * MU0_SI);              // Pa (B: G→T)
  return P_mag / P_ext;
}

function compression(M_star: number, spin: number, omega?: number, f_disc?: number): number {
  const om = (omega === undefined) ? spin : omega;
  return alfven_radius(M_star, om) / disc_radius(M_star, spin, om, f_disc);
}

function snow_line(M_star: number, f_disc: number): number {
  if (COMP_R_SNOW >= 0) return COMP_R_SNOW;  // budget-path formation-L override
  const r_small = 1.6, r_large = 3.3, q = 2.2;
  const grain_term = r_small + (r_large - r_small) * Math.pow(GRAIN_OPACITY, q);
  const fd_ratio = f_disc / 0.01;
  const mass_factor = Math.pow(M_star / SOL_M_PRIMORDIAL, 2.0);
  const disc_factor = Math.pow(fd_ratio, 0.5);
  return grain_term * mass_factor * disc_factor;
}

/** Annulus Allocation Factor sigma_AAF [M_earth/AU]. */
function slope(M_star: number, f_disc: number): number {
  // Normalize to the ANCHORED dam when the budget path supplies it (so f_disc is
  // the real disc fraction); else the spin=1 reference length (legacy convention).
  const r_disc = COMP_R_DISC > 0 ? COMP_R_DISC : disc_radius(M_star, 1.0);
  return m_star_earth(M_star) * COMP_Z * COMP_F_ROCK * f_disc * ETA_ROCK / r_disc;
}

// Formation time [Myr] — ONE clock for igniters and non-igniters (the old
// 0.10·r/AAF was wrong: it used ABSOLUTE r, so it read ~0 for a compact moon
// disc and ~31 Gyr for a body at 13,000 AU). The supply-limited clock is
//   t = M_core / Ṁ_local,   Ṁ_local = Ṁ · (R_disc / r),
// i.e. the local accretion rate falls ∝1/r (Σ·Ω·R_Hill²), so t scales UP with AU
// (outer planets slower → Sol's ice-giant ladder) while the gas-starvation term
// in Ṁ keeps a compact CPD at ~Myr (the Galilean fix). Normalising by R_disc
// (not absolute r) is what tames the 13,000 AU case. No ignition cap — an
// igniter keeps accreting H/He into its envelope after it lights; formation just
// runs until the gas disc disperses (the exp(−k·t) gas depletion does the rest).
// A t_form exceeding the disc lifetime means the body can't assemble by
// accretion → it is collapse-formed (a star), flagged downstream.
function formation_time(r: number, core: number, M_star: number, f_disc: number): number {
  if (COMP_MDOT > 0 && core > 0 && COMP_R_DISC > 0 && r > 0) {
    return core * (r / COMP_R_DISC) / (COMP_Z * COMP_MDOT * FORM_CLOCK_COEFF);
  }
  return 0.10 * r / slope(M_star, f_disc);   // fallback: non-budget legacy systems
}

function intercept(M_star: number, spin: number): number {
  return SOL_INTERCEPT * (M_star / SOL_M_PRIMORDIAL) * Math.pow(spin, 2.0 / 7.0);
}

function snow_line_pileup(r: number, M_star: number, f_disc: number): number {
  const sl = slope(M_star, f_disc);
  const rs = snow_line(M_star, f_disc);
  const amp = sl * rs * SNOW_PILEUP_FACTOR;
  const sigma = SNOW_PILEUP_WIDTH_FRAC * rs;
  return amp * Math.exp(-((r - rs) ** 2) / (2 * sigma ** 2));
}

function gas_dispersal_time(M_star: number, f_disc: number): number {
  const disc_mass = f_disc * m_star_earth(M_star);
  const sol_disc_mass = 0.01 * m_star_earth(SOL_M_PRIMORDIAL);
  // Lifetime ∝ (disc mass)^1.5 — the disc persists until its outermost body has
  // assembled, and the formation clock (t_form ∝ 1/Ṁ) runs slow in a massive,
  // dilute, extended disc. A √-law (exp 0.5) was far too shallow: it gave Alpha
  // Centauri's 37×-Sol disc only ~32 Myr while its dam-slot needs ~1.2 Gyr. Exp
  // 1.5 makes the two consistent (Alpha Cen ≈ 1.35 Gyr) and also sharpens Sol's
  // gas window enough to recover Jupiter's correct ~1.6 Myr formation time; the
  // gas-capture efficiency (GAS_CAPTURE_EFF) is re-anchored to that window.
  return T_DISC_DISPERSAL_MYR * Math.pow(disc_mass / sol_disc_mass, 1.5);
}

// Runaway gas-accretion GATE: the core mass at which the Kelvin-Helmholtz
// envelope-contraction timescale (Ikoma, Nakazawa & Emori 2000, τ_KH ∝ M^−2.5·κ)
// equals the gas-disc lifetime — below it the envelope can't run away before the
// gas is gone (ice giant / terrestrial), above it the planet goes runaway.
// τ_KH = TAU_KH0_MYR·(M/M⊕)^−2.5·κ; set τ_KH = τ_disc and solve for M:
//   M_crit = (TAU_KH0_MYR·κ / τ_disc)^(1/2.5).
// κ is taken as the grain-opacity knob (GRAIN_OPACITY ≈ 0.75 cm²/g in this fit).
// Sol → 2.93 M⊕ (≈ the legacy THRESHOLD_GAS=3); gas-poor discs read HIGHER
// (giants harder, e.g. TRAPPIST 4.4), gas-rich LOWER (Beta Pic 1.5).
function runaway_core_mass(M_star: number, f_disc: number): number {
  const tau_disc = Math.max(gas_dispersal_time(M_star, f_disc), 0.01);
  return Math.pow(TAU_KH0_MYR * GRAIN_OPACITY / tau_disc, 1.0 / 2.5);
}

// Wind-competition gas threshold: the core mass whose gravity wins H/He against
// the stellar wind that is competing for the same gas at radius r. The wind is
// the SAME wind that sets the Davis Dam (R_disc); its ram pressure dilutes as
// ∝1/r², equalling the disc pressure at the dam, so M_crit(r) =
// THRESHOLD_GAS·(GAS_DIVIDE_FRAC·R_disc/r)² — fierce close in (rocky planets),
// feeble far out (gas giants), the rocky→gassy divide at GAS_DIVIDE_FRAC·R_disc
// (Sol ≈3 AU). Combined with the τ_KH cooling floor via max(): a core must BOTH
// out-pull the local wind AND contract fast enough to run away. One wind, two
// jobs — it positions the dam and sets the gas threshold at every radius.
function gas_threshold_mass(r: number, M_star: number, f_disc: number): number {
  const R_disc = COMP_R_DISC > 0 ? COMP_R_DISC : disc_radius(M_star, 1.0);
  const ratio = GAS_DIVIDE_FRAC * R_disc / Math.max(r, 1e-12);
  const wind_gate = THRESHOLD_GAS * ratio * ratio;
  return Math.max(wind_gate, runaway_core_mass(M_star, f_disc));
}
