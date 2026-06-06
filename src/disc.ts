// Derived disc properties, computed from the system inputs + constants.
// Global-script style: depends on constants.ts being loaded first.

function m_star_earth(m_sun: number): number {
  return m_sun * M_SUN_TO_EARTH;
}

function disc_radius(M_star: number, spin: number): number {
  return SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) * Math.pow(spin, -0.5);
}

// Nebula density D (Sol = 1): the physical free variable of the VICE's
// outer jaw. The formation cloud's ambient pressure establishes the
// Davis Dam - R_disc = 30.07 · (M/1.14) · D^(-1/3) - and Sol's D = 1
// corresponds to n(H2) ≈ 1e6 cm^-3 (a clustered prestellar core: the
// density whose collapse centrifugal radius puts the dam at Neptune's
// exact 30.07 AU). Under the default JAW-LOCK (inner and outer jaws
// correlated through birth-site density) the recorded spin is
// Ω = D^(2/3) - Sol has spin 1, density 1 - and the anchor-family
// scan that solves R_disc from the outermost planet IS the D
// bisection expressed through the lock. In the inverted regime D_eff
// exceeds any static cloud (TRAPPIST ~5e4): the outer jaw there
// includes more than birth pressure - the decoupled-jaw signature.
// Habitable zone, ASYMMETRIC empirical bounds scaled by sqrt(L):
//   inner 0.72 AU - the recent-Venus limit (Kopparapu et al. 2013):
//     a delivered Venus is hot but habitable; the delivery receipt,
//     not the thermostat, is the framework's discriminator.
//   outer 1.37 AU - the first-CO2-condensation limit (Kasting et
//     al. 1993): beyond it CO2 clouds defeat the greenhouse. Mars
//     (1.52) is the empirical cold case - too cold even Earth-sized
//     with oceans and atmosphere - so the edge sits INSIDE its orbit.
// L defaults to the main-sequence mass-luminosity estimate (M^4
// above 0.43 M_sun; 0.23 M^2.3 for M dwarfs); pass the system's
// measured luminosity when known (preset inputs.L) - real stars
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

function compression(M_star: number, spin: number): number {
  return alfven_radius(M_star, spin) / disc_radius(M_star, spin);
}

function snow_line(M_star: number, f_disc: number): number {
  const r_small = 1.6, r_large = 3.3, q = 2.2;
  const grain_term = r_small + (r_large - r_small) * Math.pow(GRAIN_OPACITY, q);
  const fd_ratio = f_disc / 0.01;
  const mass_factor = Math.pow(M_star / SOL_M_PRIMORDIAL, 2.0);
  const disc_factor = Math.pow(fd_ratio, 0.5);
  return grain_term * mass_factor * disc_factor;
}

/** Annulus Allocation Factor sigma_AAF [M_earth/AU]. */
function slope(M_star: number, f_disc: number): number {
  const r_disc = disc_radius(M_star, 1.0); // slope uses spin=1 R_disc by convention
  return m_star_earth(M_star) * Z_METALLICITY * F_ROCK * f_disc * ETA_ROCK / r_disc;
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
  return T_DISC_DISPERSAL_MYR * Math.pow(disc_mass / sol_disc_mass, 0.5);
}
