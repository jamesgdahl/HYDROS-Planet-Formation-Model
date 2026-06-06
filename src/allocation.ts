// Per-radius mass allocation: rock, ice, pebble flux, H/He envelope.
// Global-script style: depends on constants.ts and disc.ts.

// Hexagonal-packing nearest-neighbor truncation at the outer Davis Dam.
// GEOMETRIC ORIGIN: in 2D hexagonal close-packing, each interior point
// has 6 nearest neighbors at 60° intervals. A planet at the disc edge
// (r = R_disc) loses 1 of these 6 to the void → retention = 5/6, loss = 1/6.
// Equivalent asymmetric formulation: L:S = 5:1 with S = outward range,
// L = inward range. f_trunc(R_disc) = L/(L+S) = 5/6 exactly.
// Same 1/6 truncation applies at the inner ramp via alpha = (5/6)*R_A.
function outer_feed_truncation(r: number, r_disc: number): number {
  const S = 0.025 * r_disc;
  const L = 5.0 * S;
  const void_width = (r + S) - r_disc;
  if (void_width <= 0) return 1.0;
  return Math.max(0.0, 1.0 - void_width / (L + S));
}

// omega: the VICE's inner-jaw rotation (defaults to spin - the
// jaw-lock). R_A and the backstop intercept are stellar (rotation/
// field) properties; R_disc, the regime classification, and the dam
// pile-up are outer-jaw (density-dial) properties.
function rock_allocation(r: number, M_star: number, spin: number,
                         f_disc: number, omega?: number): number {
  const om = (omega === undefined) ? spin : omega;
  const C = compression(M_star, spin);
  const r_a = alfven_radius(M_star, om);
  const r_snow = snow_line(M_star, f_disc);
  const sl = slope(M_star, f_disc);
  const a = intercept(M_star, om);
  const r_disc = disc_radius(M_star, spin);
  // No hard cutoff at R_disc: outer_feed_truncation fades smoothly from
  // 5/6 at r=R_disc to 0 at r=1.125*R_disc. A hard guard caused FP issues
  // for planets sitting on the edge (Neptune at 30.05 ↔ R_disc=30.04999..).
  const natural_mass_scale = sl * r_disc;
  const outer_width = 0.3 * r_disc;
  const outer_pileup = natural_mass_scale * C * Math.exp(-((r - r_disc) ** 2) / (2 * outer_width ** 2));

  const snow_bump = (r <= r_snow) ? snow_line_pileup(r, M_star, f_disc) : 0;

  // Outer-feeding-zone truncation: 1/6 loss at R_disc from asymmetric pebble drift.
  const f_trunc = outer_feed_truncation(r, r_disc);

  if (C < 1.0) {
    let base: number;
    if (r < 2.0 * r_a) {
      // Inner ramp with alpha = (5/6)*R_A.
      // GEOMETRIC 1/6 TRUNCATION: hexagonal-packing nearest-neighbor -
      // same as outer dam, just oriented inward (lost neighbor inside R_A).
      // ADDITIONAL ABLATION (separate, layered on top): Alfven Dam is
      // ACTIVE - magnetic-reconnection crack bursts vaporize Mercury's
      // silicate mantle (~70% loss; Cameron 1985, Fegley & Cameron 1987),
      // captured by post-formation dM_Mercury. The outer Davis Dam
      // is PASSIVE (MRI-revival trap, no analogous ablation), so Neptune's
      // total loss is the geometric 1/6 alone (~17%).
      const inner_ramp_alpha = (5.0 / 6.0) * r_a;
      // Clamp at 0: ramp goes negative for r < r_a/6.
      base = Math.max(0, sl * (r + inner_ramp_alpha - r_a));
    } else {
      base = a + sl * r;
    }
    return base * f_trunc + outer_pileup + snow_bump;
  }
  // Inverted regime
  if (r >= r_snow) return 0;
  const inner_fraction = Math.max(0, 1 - r / r_snow);
  const inner_contribution = natural_mass_scale * C * inner_fraction;
  return Math.max(0, inner_contribution * f_trunc + outer_pileup);
}

function ice_retention(r: number, M_star: number, spin: number, f_disc: number): number {
  const r_snow = snow_line(M_star, f_disc);
  const r_disc = disc_radius(M_star, spin);
  if (r <= r_snow) return 0;
  const scale = ETA_ICE_DECAY_FRACTION * r_disc;
  return Math.exp(-(r - r_snow) / scale);
}

function ice_allocation(r: number, M_star: number, spin: number, f_disc: number): number {
  const sl = slope(M_star, f_disc);
  const r_snow = snow_line(M_star, f_disc);
  const r_disc = disc_radius(M_star, spin);
  // No hard cutoff at R_disc; outer_feed_truncation handles the soft edge.
  if (r <= r_snow) return 0;
  const base_ice = sl * (r - r_snow) * F_LODDERS_ICE * ice_retention(r, M_star, spin, f_disc);
  const snow_bump = snow_line_pileup(r, M_star, f_disc);
  // Outer-feeding-zone truncation: same asymmetric pebble-drift mechanism
  // as in rock_allocation. Applied to ice feeding-zone integral.
  const f_trunc = outer_feed_truncation(r, r_disc);
  return base_ice * f_trunc + snow_bump;
}

function total_pebble_bonus_budget(M_star: number, f_disc: number): number {
  const disc_ice = f_disc * Z_METALLICITY * (1 - F_ROCK) * m_star_earth(M_star);
  return disc_ice * PEBBLE_CAPTURE_EFFICIENCY;
}

function pebble_allocation_weight(r: number, M_star: number, f_disc: number): number {
  const r_snow = snow_line(M_star, f_disc);
  const delta = r - r_snow;
  if (delta <= 0) return 0;
  return Math.pow(delta, -0.5);
}

function hydrogen_capture(core_mass: number, t_form_myr: number, spin: number,
                          r: number, M_star: number, f_disc: number,
                          omega?: number): number {
  spin = (omega === undefined) ? spin : omega;  // wind term is inner-jaw
  if (core_mass < THRESHOLD_GAS) return 0;
  // Tanigawa-Ikoma (2007) gas accretion: dM_gas/dt ∝ M_core² during
  // runaway phase. Integrating with exponentially-decaying disc gas
  // density gives M_gas = A_0 · M_core² · exp(-k·t_form) · wind_supp.
  // A_0 and k calibrated against Sol's Jupiter and Neptune under the
  // geometric cascade ρ = 1 − √(ln 2)/2 ≈ 0.584, with allocation at
  // SLOT radii (on-slot doctrine: Jupiter at its formation slot
  // 5.981 AU, not its displaced 5.203 AU - the old value 4.45 carried
  // that conflation). k corresponds to disc-gas-dispersal e-folding
  // time ~1.45 Myr.
  const A_0 = 4.3899;  // units of 1/M_E (so M_core² · A_0 gives M_E)
  const sol_disc = 0.01 * m_star_earth(SOL_M_PRIMORDIAL);
  const system_disc = f_disc * m_star_earth(M_star);
  const k = 0.691 * Math.max(1.0, Math.pow(sol_disc / system_disc, 2.0));
  const amplification = A_0 * Math.exp(-k * t_form_myr);
  const spin_ref = 30.0;
  const r_ref = 0.5;
  const wind_term = (spin / spin_ref) * Math.pow(r_ref / Math.max(r, 0.01), 2);
  const wind_suppression = 1.0 / (1.0 + wind_term);
  return core_mass * core_mass * amplification * wind_suppression;
}
