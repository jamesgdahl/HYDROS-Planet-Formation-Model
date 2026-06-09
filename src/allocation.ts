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

// omega: the VICE's inner-jaw rotation (defaults to spin — the
// jaw-lock). R_A and the backstop intercept are stellar (rotation/
// field) properties; R_disc, the regime classification, and the dam
// pile-up are outer-jaw (density-dial) properties.
function rock_allocation(r: number, M_star: number, spin: number,
                         f_disc: number, omega?: number): number {
  const om = (omega === undefined) ? spin : omega;
  const C = compression(M_star, spin, om, f_disc);
  const r_a = alfven_radius(M_star, om);
  const r_snow = snow_line(M_star, f_disc);
  const sl = slope(M_star, f_disc);
  const a = intercept(M_star, om);
  const r_disc = disc_radius(M_star, spin, om, f_disc);
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
      // GEOMETRIC 1/6 TRUNCATION: hexagonal-packing nearest-neighbor —
      // same as outer dam, just oriented inward (lost neighbor inside R_A).
      // ADDITIONAL ABLATION (separate, layered on top): Alfven Dam is
      // ACTIVE — magnetic-reconnection crack bursts vaporize Mercury's
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
  // INVERTED regime (v5.2): the FACTORY assembly line, PHASE 1 = ROCK. The
  // dense pile-up is viscously hot, so water is gaseous and only ROCK
  // condenses out to the viscous snow line r_visc — the rock-only phase,
  // exhausted by ~vintage 3. Mass descends OUTWARD from the dam (biggest at
  // the dam = the innermost "big rock"), the disc-solid budget tying the
  // scale so the f-bisection matches the total. Beyond r_visc the disc cools
  // and ice takes over (ice_allocation), so rock returns 0 there.
  // (Memory: inverted-regime-model.)
  const r_visc = viscous_snow_line(M_star, f_disc);
  if (r > r_visc) return 0;   // past the viscous snow line: cool ⇒ ice, not rock
  const disc_solid = f_disc * m_star_earth(M_star) * COMP_Z * COMP_F_ROCK * ETA_ROCK;
  // STEEP descent: rock is ferromagnetic, so the magnetic slots (slot 0 + the
  // marching factory) concentrate it strongly ⇒ fast, front-loaded consumption.
  const descent = Math.pow(r_disc / Math.max(r, r_disc), INV_ROCK_DESCENT);
  return Math.max(0, disc_solid * descent);
}

function ice_retention(r: number, M_star: number, spin: number, f_disc: number, omega?: number): number {
  const r_snow = snow_line(M_star, f_disc);
  const r_disc = disc_radius(M_star, spin, omega, f_disc);
  if (r <= r_snow) return 0;
  const scale = ETA_ICE_DECAY_FRACTION * r_disc;
  return Math.exp(-(r - r_snow) / scale);
}

function ice_allocation(r: number, M_star: number, spin: number, f_disc: number, omega?: number): number {
  // INVERTED regime (v5.2): the FACTORY assembly line, PHASE 2 = ICE. The
  // disc-temperature snow line is moot here; the rock-only phase ends at the
  // VISCOUS snow line r_visc (where the viscously-heated pile finally cools to
  // 170 K). Inside r_visc water is gaseous → no ice (rock only). Beyond it ice
  // condenses; the ice budget Z·(1−F_ROCK) descends from r_visc — the descent
  // RESETS at the phase boundary, so the first icy vintage just past r_visc is
  // a "big ice" product (the big-small-big pattern). (Phase 3 = nebula KBOs
  // beyond R_A, handled in the exterior block.)
  if (compression(M_star, spin, omega, f_disc) >= 1.0) {
    const r_visc = viscous_snow_line(M_star, f_disc);
    if (r <= r_visc) return 0;   // PHASE 1 (rock): viscously hot, water gaseous
    const om = (omega === undefined) ? spin : omega;
    const r_A = alfven_radius(M_star, om);
    const disc_ice = f_disc * m_star_earth(M_star) * COMP_Z * COMP_F_ROCK * ETA_ROCK;
    // The assembly DESCENT resets at each phase boundary, giving the
    // big-small-big pattern (comparable peaks, same coefficient):
    //   PHASE 2 (ice):    r_visc..R_A — descent from the viscous line.
    //   PHASE 3 (nebula): beyond R_A  — descent from R_A; the dam has marched
    //     past the magnetosphere into the Alfvén-repelled nebula (the
    //     "big nebula" product sits at R_A). These are the exterior KBO-class
    //     bodies, minted with a real ICE composition like every other body.
    const origin = (r > r_A && r_A > r_visc) ? r_A : r_visc;
    // SHALLOW descent: ice is NOT ferromagnetic, so the magnetic slots can't
    // concentrate it — it accretes by gravity/drift alone, slower and more
    // spread ⇒ ice consumed more slowly than rock down the assembly line.
    const descent = Math.pow(origin / Math.max(r, origin), INV_ICE_DESCENT);
    return Math.max(0, disc_ice * descent);
  }
  const sl = slope(M_star, f_disc);
  const r_snow = snow_line(M_star, f_disc);
  const r_disc = disc_radius(M_star, spin, omega, f_disc);
  // No hard cutoff at R_disc; outer_feed_truncation handles the soft edge.
  if (r <= r_snow) return 0;
  const base_ice = sl * (r - r_snow) * F_LODDERS_ICE * ice_retention(r, M_star, spin, f_disc, omega);
  const snow_bump = snow_line_pileup(r, M_star, f_disc);
  // Outer-feeding-zone truncation: same asymmetric pebble-drift mechanism
  // as in rock_allocation. Applied to ice feeding-zone integral.
  const f_trunc = outer_feed_truncation(r, r_disc);
  return base_ice * f_trunc + snow_bump;
}

function total_pebble_bonus_budget(M_star: number, f_disc: number): number {
  const disc_ice = f_disc * COMP_Z * (1 - COMP_F_ROCK) * m_star_earth(M_star);
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
  // Runaway gate: the core must beat the Kelvin-Helmholtz clock (Ikoma 2000)
  // before the gas disperses, i.e. exceed the derived critical core mass.
  if (core_mass < runaway_core_mass(M_star, f_disc)) return 0;
  // DERIVED supply-limited capture (core-accretion paradigm). Once a core runs
  // away, the local Tanigawa-Watanabe disc-limited rate (∝ M^4/3·Σ_gas·...)
  // vastly outstrips the disc gas supply, so the captured envelope is set by
  // how much of the DISC GAS RESERVOIR is still available — NOT by M_core (a
  // forming giant swallows essentially everything its gap can reach). So:
  //   M_gas = ε · M_gas_disc · exp(−k·t_form) · wind_supp,
  // M_gas_disc = f_disc·M_star (the reservoir), ε the universal capture
  // fraction, exp(−k·t_form) the closing capture window. This is what makes
  // Jupiter's H/He fall out of Sol's DISC (f_disc, M_star) instead of a fit
  // amplitude re-tuned to the cascade's current core allocation; with all four
  // Sol giants' cores ≈ 16 M⊕, the old A_0·M_core² was a disguised constant ≈
  // ε·M_gas_disc and the whole Jupiter→Neptune envelope ladder is TIMING (the
  // exp term), which this preserves.
  const M_gas_disc = f_disc * m_star_earth(M_star);
  const sol_disc = 0.01 * m_star_earth(SOL_M_PRIMORDIAL);
  // k = capture-window e-fold; steepens in gas-poor discs (less reservoir, the
  // window shuts faster relative to the reservoir already being thin).
  const k = GAS_WINDOW_K * Math.max(1.0, Math.pow(sol_disc / M_gas_disc, 2.0));
  const window = Math.exp(-k * t_form_myr);
  const spin_ref = 30.0;
  const r_ref = 0.5;
  const wind_term = (spin / spin_ref) * Math.pow(r_ref / Math.max(r, 0.01), 2);
  const wind_suppression = 1.0 / (1.0 + wind_term);
  return GAS_CAPTURE_EFF * M_gas_disc * window * wind_suppression;
}
