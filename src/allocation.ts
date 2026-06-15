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
// THE FACTORY — ONE mechanism for every factory (inverted systems, exterior KBOs, moon discs alike;
// no special cases). The Davis Dam marches outward as the disc drains, minting planetesimals that
// coagulate — within ISO_HILL_C mutual Hill radii — into oligarchic isolation-mass bodies, each
// seeding the next a feeding-zone out. ROCK is the refractory SEED present at EVERY radius; ICE only
// MANTLES that seed past the viscous snow line (heterogeneous nucleation on silicate — no ice-only
// bodies). Isolation mass M_iso = [2π·C·a²·Σ]^1.5 / (3·M★)^½ on the seeded solid, Σ ∝ r⁻² over the
// disc (inner dam → centrifugal R_c). Returns the local product at r split into {total, rock, ice}.
function factory_product(r: number, M_star: number, omega: number, f_disc: number):
    { total: number; rock: number; ice: number } {
  if (!(r > 0)) return { total: 0, rock: 0, ice: 0 };
  const R_disc = disc_radius(M_star, omega, omega, f_disc);
  const R_A = alfven_radius(M_star, omega);
  const r_visc = viscous_snow_line(M_star, f_disc);
  const R_in = Math.max(Math.min(R_A, R_disc), 1e-9);            // inner dam
  const R_outer = Math.max(R_A, R_disc);                         // outer dam (Davis in normal, Alfvén in inverted)
  const R_c = disc_centrifugal_radius(M_star, omega);            // centrifugal disc extent (Hill-capped for sub-cascades)
  const M_star_E = M_star * M_SUN_EARTH;                         // central mass in M⊕ (Hill dynamics)
  // COMPOSITION SPLIT (same in both zones): ROCK is refractory and seeds every radius;
  // ICE mantles it only past the viscous snow line. fr = rock fraction of the local solid.
  const fr = (r > r_visc) ? COMP_F_ROCK : 1.0;

  if (r > R_outer) {
    // OUTER ZONE (beyond the outer dam): streaming-instability planetesimal SEEDS. Out here
    // the disc dispersed before oligarchic growth could run, so the product never grew to
    // isolation mass — it is the self-gravitating SI clump mass M_G = 4π⁵ G² Σ_p³ / Ω⁴
    // (Youdin & Goodman 2005), set by the sparse, slow outer nebula. The nebula solid surface
    // density follows the self-similar LBP profile (γ=1): Σ ∝ R⁻¹·e^(−R/R_c). This is the SAME
    // factory minting planetesimals — they just stay seeds beyond the dam (Sol's KBOs, Saturn's
    // outer-zone moons), instead of coagulating into the inter-dam isolation-mass planets.
    const Sigma = m_star_earth(M_star) / (2 * Math.PI * R_c * r) * Math.exp(-r / R_c) * COMP_Z; // M⊕/AU²
    const Sigma_cgs = Sigma * EARTH_G_PER_ME / (AU_CM * AU_CM);   // g/cm²
    const r_cm = r * AU_CM;
    const Omega2 = G_CGS * (M_star * M_SUN_G) / (r_cm * r_cm * r_cm);
    const M_G_g = 4 * Math.pow(Math.PI, 5) * G_CGS * G_CGS * Math.pow(Sigma_cgs, 3) / (Omega2 * Omega2);
    // M_G = the streaming-instability seed (one self-gravitating clump) at the local solid Σ. This
    // is the right per-KBO scale (Sol dam-edge ≈ Triton); the DECLINING size trend comes from the
    // reservoir depleting as the factory mints (handled in the KBO loop), not from a global factor.
    const M_G = M_G_g / EARTH_G_PER_ME;
    return { total: M_G, rock: M_G * fr, ice: M_G * (1 - fr) };
  }

  // INTER-DAM ZONE: oligarchic isolation mass. The disc metals (f_disc·budget·Z) spread as
  // Σ ∝ r⁻² over the capture region; coagulation runs to the local isolation mass.
  const R_out = Math.max(R_c, R_in * 1.0001);
  const lnD = Math.log(R_out / R_in);
  if (!(lnD > 0)) return { total: 0, rock: 0, ice: 0 };
  const solid = f_disc * m_star_earth(M_star) * COMP_Z;  // disc metals budget
  const S_base = solid / (2 * Math.PI * lnD) / (r * r);  // Σ_solid ∝ r⁻², normalized to disc metals
  const S_solid = (r > r_visc) ? S_base : S_base * COMP_F_ROCK;  // rock-only inside snow, rock+ice past
  if (S_solid <= 0) return { total: 0, rock: 0, ice: 0 };
  const M_iso = Math.pow(2 * Math.PI * ISO_HILL_C * r * r * S_solid, 1.5) / Math.sqrt(3 * M_star_E);
  return { total: M_iso, rock: M_iso * fr, ice: M_iso * (1 - fr) };
}

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
  // INVERTED regime: the oligarchic FACTORY (no rock-only "phase", no descent fudge). Rock is
  // refractory and condenses at EVERY radius, so this returns the rock share of the local
  // isolation mass — even outer products carry rock. (See inverted_isolation.)
  return factory_product(r, M_star, om, f_disc).rock;
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
    // INVERTED regime: the oligarchic FACTORY. Ice condenses only PAST the viscous snow line, so
    // this returns the ice share of the local isolation mass (zero inside r_visc, rising outward).
    const om = (omega === undefined) ? spin : omega;
    return factory_product(r, M_star, om, f_disc).ice;
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
  // CONSERVED pebble flux — sourced from the OUTER solids draining inward during the gas epoch
  // (budgetFit sets the captured mass ε_PA·(1−ε_SI)·Z·M_beyond from the beyond-dam reservoir, in
  // the budget's f_rock:1−f_rock ratio; 0 when there's no outer reservoir / it's trapped). It is
  // NOT minted from the inner disc ice (the old "mana" double-counted the disc's own metals).
  if (COMP_PEBBLE_FLUX >= 0) return COMP_PEBBLE_FLUX;
  // Sub-cascade fallback (moon disc — no stellar outer zone parked): legacy disc-ice drift flux.
  const disc_ice = f_disc * COMP_Z * (1 - COMP_F_ROCK) * m_star_earth(M_star);
  return disc_ice * PEBBLE_CAPTURE_EFFICIENCY;
}

function pebble_allocation_weight(r: number, M_star: number, f_disc: number): number {
  const r_snow = snow_line(M_star, f_disc);
  const delta = r - r_snow;
  if (delta <= 0) return 0;
  return Math.pow(delta, -0.5);
}

// H/He ENVELOPE — the gas-rich-gorging WINDOW model (the WANT; the shared-budget cap is applied
// system-wide by apply_hydrogen_allocation). Two epochs, one disc-lifetime clock:
//   τ = R_disc³/M·GAS_TRICKLE_COEF — the disc lifetime. The gas drains inward to the star by
//   GRAVITY (v ∝ g ∝ M/r² ⇒ drain time ∝ R³/M), so a FAR dam drains cubically slower and its
//   disc is long-lived. Sol R_disc≈30 ⇒ τ≈3.5 Myr; HR 8799 dam≈117 ⇒ τ≈160 Myr.
//   EPOCH 1 (gas-rich): a runaway core gorges the replenished disc for its window (τ − t_form);
//     early formers (Jupiter) gorge longest. SHORT-lived disc ⇒ lopsided windows ⇒ steep profile
//     (Jupiter ≫ Saturn, ice giants miss it). LONG-lived disc ⇒ everyone gorges ⇒ flat (HR 8799).
//   EPOCH 2 (clearing): the residual drains to the star; post-window cores (ice giants) skim a
//     small slice of the inward through-flow (the pileup). Inner ≳ outer (∝(R_disc/r)^q).
// DAM-WIND SUPPRESSION: the SAME stellar wind that sets the Davis Dam (ram ∝ W/r², W = COMP_FLUX
//   = M⋆^3.54) only partially strips the gas's angular momentum (GAS_WIND_K = its efficiency), so
//   it suppresses capture most where strongest — the INNER giants. Jupiter (close) is zapped most;
//   the outer/far giants are spared because 1/r² beats their (larger) W — which is why HR 8799's
//   distant planets keep their gas. Replaces the abandoned gap-limited / global-ε models.
function hydrogen_capture(core_mass: number, t_form_myr: number, spin: number,
                          r: number, M_star: number, f_disc: number,
                          omega?: number): number {
  const om = (omega === undefined) ? spin : omega;
  if (core_mass < gas_threshold_mass(r, M_star, f_disc)) return 0;
  const M_gas_disc = f_disc * m_star_earth(M_star);
  const r_disc = disc_radius(M_star, spin, om, f_disc);
  // GORGING WINDOW = the disc-GAS LIFETIME (a TIME), i.e. how long every gobbler — planets AND the
  // central star — competes for the reservoir before "the gas is gone." Whatever the planets don't
  // grab by then the star gobbles (the "dispersed" bucket IS the star's share, not a loss). This is
  // gas_dispersal_time (∝ disc mass), NOT the old R_disc³/M clock, which smuggled disc SIZE (an
  // availability/supply property) into the time and so COLLAPSED to ~0 for a compact disc (HD 134987:
  // R_disc=6.27 ⇒ window≈0 ⇒ c starved to ~5 M⊕ while the star swept 99.9%). The disc SIZE/amount now
  // lives only in the reservoir (availability); the window is a clean time. Floored at the old clock so
  // a large, long-lived disc (HR 8799) is never shortened. NORMAL regime ONLY: an inverted M-dwarf
  // disc is gas-poor and mints rocky factory planets (TRAPPIST, Proxima) — flooring its window would
  // hand those rocky bodies spurious H/He envelopes (T-1b → 108 M⊕). Inverted keeps the bare R_disc³
  // clock, which collapses for its compact disc and correctly suppresses gas gorging.
  const tau_clock = Math.pow(r_disc, 3) / Math.max(M_star, 1e-9) * GAS_TRICKLE_COEF;
  // Inverted = the FULL budgetFit condition (mass test OR magnetopause past the dam, R_A ≥ R_disc) —
  // is_inverted_budget(M) alone misses M-dwarfs inverted via R_A≥R_disc (Proxima), which would then
  // get the floor and spurious gas.
  const inverted_here = is_inverted_budget(M_star) || (alfven_radius(M_star, om) >= r_disc);
  const tau = inverted_here
    ? tau_clock
    : Math.max(gas_dispersal_time(M_star, f_disc), tau_clock);
  const window = Math.max(0, tau - t_form_myr);                                // gorging window (Myr)
  // Dam-wind ram suppression (∝ W/r², W = M⋆^3.54 ≡ COMP_FLUX, the dam-setting wind):
  const W = (COMP_FLUX > 0) ? COMP_FLUX : Math.pow(Math.max(M_star, 1e-9), 3.54);
  const wind_suppression = 1.0 / (1.0 + GAS_WIND_K * W / Math.max(r * r, 1e-6));
  const gorge = GAS_CAPTURE_RATE * window * wind_suppression;                  // Epoch-1 want
  // Epoch-2 clearing trickle (the ice-giant envelope; negligible vs a gorging giant):
  const pileup = GAS_PILEUP_EFF * M_gas_disc
    * Math.pow(Math.max(r_disc, 1e-9) / Math.max(r, 1e-9), GAS_PILEUP_Q) * wind_suppression;
  return gorge + pileup;  // the WANT; shared budget cap applied in apply_hydrogen_allocation
}
