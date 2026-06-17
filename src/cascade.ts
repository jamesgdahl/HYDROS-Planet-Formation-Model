// Cascade slot geometry and the anchor (auto-spin) search.
// Global-script style: depends on constants.ts, disc.ts, allocation.ts;
// uses assign_planets_to_slots from fit.ts (resolved at call time).

// BINARY / MULTI-CORE override of the ladder's inner terminus. A single star's cascade bottoms
// out at its R_A; a binary's CANNOT — no slot forms inside the cores' mutual orbit, so the
// circumbinary ladder terminates at the OUTERMOST core element's Alfvén Dam (its apastron from
// the barycentre + that element's R_A), not the combined R_A back at the barycentre. budgetFit
// sets this before the binary fit and resets it after; single stars leave it null. (The
// Holman-Wiegert instability separately destroys anything that forms further out.)
let CASCADE_INNER_DAM: number | null = null;
function set_cascade_inner_dam(r: number): void { CASCADE_INNER_DAM = (r > 0) ? r : null; }
function reset_cascade_inner_dam(): void { CASCADE_INNER_DAM = null; }

// SUHL PARAMETRIC SUBHARMONIC order m = 2ᵏ (1 = fundamental). When a weak-field disc period-doubles
// (see B_PARAMETRIC_CRIT), the standing wave runs at half the rung frequency: α_eff = CASCADE_ALPHA/m,
// so the rungs space out by m×. budgetFit sets this per fit (decided forward, from the field and the
// gas-giant pump); single-pass FWHM systems leave it at 1. (docs: wavelength-doubling)
let COMP_WAVE_DOUBLING = 1;
function set_wave_doubling(m: number): void { COMP_WAVE_DOUBLING = (m >= 1) ? m : 1; }
function reset_wave_doubling(): void { COMP_WAVE_DOUBLING = 1; }

function cascade_slot_positions(M_star: number, spin: number,
                                min_slots: number = 0,
                                omega?: number, f_disc?: number): number[] {
  // Slot count: keep adding slots until next would fall inside R_A.
  // Inverted regime (R_A >= R_disc): the compressed inner reservoir
  // defaults to 11 slots, but the observed planet count constrains the
  // generator — a system with n observed planets requires at least n
  // slots, so the inverted reservoir packs max(11, min_slots). (The
  // normal regime cannot be extended this way: its slot count is fixed
  // by the R_A terminus, so insufficient slots invalidate the spin.)
  // v5: both dams are physical now — R_disc from the wind⇄density balance
  // (depends on M, D=spin^1.5, and rotation Ω=omega) and R_A from rotation.
  // INVERTED when the magnetosphere reaches past the Davis Dam (R_A ≥
  // R_disc) — the feeble-wind M-dwarf case; the compressed reservoir packs
  // max(11, min_slots). Normal regime: the ladder terminates at R_A.
  const om = (omega === undefined) ? spin : omega;
  // Both dams are the universal laws now (disc_radius = outward pressure ⇄ density,
  // alfven_radius = magnetic field reach) — the factory marches from the real Davis Dam.
  const R_disc = disc_radius(M_star, spin, om, f_disc);
  // Inner terminus: the combined R_A, unless a binary raised it to the outermost core dam.
  const R_A_bare = alfven_radius(M_star, om);
  const R_A_phys = (CASCADE_INNER_DAM != null && CASCADE_INNER_DAM > R_A_bare)
    ? CASCADE_INNER_DAM : R_A_bare;
  const out: number[] = [];
  if (R_A_phys >= R_disc) {
    // INVERTED FACTORY (oligarchic isolation-mass growth) — NO ρ-ladder, NO half-steps, NO
    // Alfvén-anchored second factory (R_A only REPELS). The Davis Dam marches outward as the
    // dense disc drains; planetesimals coagulate within ISO_HILL_C mutual Hill radii into one
    // isolation-mass planet, each seeding the next a feeding-zone out:
    //   a_{n+1} = a_n + ISO_HILL_C·R_H(M_iso(a_n)),  bounded by the repelling magnetosphere R_A.
    const fd = (f_disc !== undefined && f_disc > 0) ? f_disc : 0.01;
    let a = R_disc;
    while (a < R_A_phys && out.length < 40) {
      out.push(a);
      const Mi = factory_product(a, M_star, om, fd).total;
      const R_H = a * Math.pow(Math.max(Mi, 1e-12) / (3 * M_star * M_SUN_EARTH), 1 / 3);
      const step = ISO_HILL_C * R_H;
      if (!(step > 0) || !isFinite(step)) break;
      a += step;
    }
    return out;
  }
  // NORMAL: the two FUNDAMENTAL waveforms — Maas (Davis Dam, R_disc) and
  // Alfvén (Alfvén Dam, R_A) — share frequency α (φ_M + φ_A = const), so they
  // sum to ONE cosine, ρ-spaced but phase-shifted by δ: antinodes
  // r_n = R_disc·e^(−δ/α)·ρⁿ (δ→0 ⇒ r_n = R_disc·ρⁿ when Maas dominates).
  // Ladder terminates at the inner Alfvén Dam.
  // SLOTS = ANTINODES OF THE NET SUPERPOSITION (the single source of truth). Scan |amplitude|
  // over [R_A, R_disc] and take every LOCAL MAXIMUM — that is where the standing wave actually
  // piles matter. No geometric ρ-ladder, no snap, no dip-filter: the maxima land on the ρ-rungs
  // (full-rung spacing), and a near-zero DIP between two peaks (a suppressed rung) is simply not
  // a maximum ⇒ not a slot. The phase shift, the Alfvén comb and the envelope are all already
  // baked into superposition_amplitude.
  const NS = 1200;
  const logHi = Math.log(R_disc), logLo = Math.log(R_A_phys);
  const rAt = (i: number) => Math.exp(logHi - (logHi - logLo) * i / NS);
  const ampAt = (i: number) => Math.abs(superposition_amplitude(rAt(i), R_disc, R_A_phys));
  let aL = ampAt(0), aC = ampAt(1);
  if (aL > aC) out.push(R_disc);                 // antinode right at the dam (fundamental peak)
  for (let i = 1; i < NS; i++) {
    const aR = ampAt(i + 1);
    if (aC > aL && aC >= aR) out.push(rAt(i));    // local |amplitude| maximum = a real antinode
    aL = aC; aC = aR;
  }
  return out;
}

// Alfvén–Maas superposition primitives (v5). ALPHA = π/(−ln ρ) ≈ 5.836 is
// the cascade's angular wavenumber: one full antinode cycle per ρ-step.
const CASCADE_ALPHA = Math.PI / (-Math.log(CASCADE_RATIO));

// Dam see-saw weights from compression C = R_A/R_disc: the dominant dam is
// normalized to 1, the weaker scaled by the ratio. Davis/Maas dominates the
// normal regime (C<1); Alfvén dominates when inverted (C>1).
function dam_weights(R_disc: number, R_A: number): { wM: number; wA: number } {
  const C = R_A / R_disc;
  return C >= 1 ? { wM: 1 / C, wA: 1 } : { wM: 1, wA: C };
}

// Constant phase shift δ of the merged ρ-ladder, returned as the radial
// factor e^(−δ/α) that multiplies R_disc. 1.0 when Alfvén is negligible.
function superposition_phase_shift(R_disc: number, R_A: number): number {
  if (!(R_disc > 0) || !(R_A > 0)) return 1.0;
  const Phi_tot = CASCADE_ALPHA * Math.log(R_disc / R_A);
  const { wM, wA } = dam_weights(R_disc, R_A);
  const delta = Math.atan2(wA * Math.sin(Phi_tot), wM + wA * Math.cos(Phi_tot));
  return Math.exp(-delta / CASCADE_ALPHA);
}

// Each wave's amplitude attenuates by half per ρ-step away from its own dam (the resonance
// diminishing into the cavity). This falloff is the standing wave's amplitude — it's what makes
// the slot masses differ (outer big, inner small) and what lets the Alfvén wave matter in the
// inner system where the Maas wave has attenuated. ≈1.287.
const CASCADE_DECAY = Math.log(2) / (-Math.log(CASCADE_RATIO));

// CAVITY EIGENVALUE. The Maas wave is a standing mode of the cavity [R_A, R_disc], so its wavelength is
// QUANTIZED: an integer number N of rungs must span the cavity (antinode at the Davis Dam, node at the
// Alfvén dam), giving ρ = (R_A/R_disc)^(1/N) and α_eff = Nπ/ln(R_disc/R_A). N is the nearest integer to
// the base-ρ rung count, so the wave is PINNED to BOTH dams — it can't drift off the inner dam the way a
// fixed-ρ wave does (the fixed ρ=0.5837 gives Sol N=9.3, a non-integer mismatch that floats the inner
// rungs and was ratcheting Earth outward). Compression then enters through N (a packed/compressed cavity
// wants more rungs); for now N is the geometric nearest-integer, pinning only.
function cascade_alpha_eff(R_disc: number, R_A: number): number {
  const span = Math.log(R_disc / Math.max(R_A, 1e-9));
  if (!(span > 0)) return CASCADE_ALPHA;
  // The Maas wave is the Davis-Dam reverberation at the UNIVERSAL self-similar rung ratio ρ — R_A is only
  // where the ladder TERMINATES (inner dam), it does NOT set the wavelength. Constraining the wavelength to
  // fit an integer N rungs in [R_A, R_disc] (the cavity-eigenvalue experiment) was a REGRESSION: it shifted
  // ρ off its universal value and degraded Sol's terrestrials (Mercury/Venus/Earth/Mars 0%→−3..−10%). So
  // α is the fixed CASCADE_ALPHA, independent of R_A. (span/R_A kept in the signature, now unused.)
  void span; void R_A;
  // Suhl parametric subharmonic: a doubled disc runs at half the rung frequency (α/2, α/4, …).
  return CASCADE_ALPHA / COMP_WAVE_DOUBLING;
}

// Net (signed) Alfvén–Maas standing wave at radius r — THE SOURCE OF TRUTH for slot positions
// (its antinodes) and masses (its amplitude). A_M(r)·cos(φ_M) + A_A(r)·cos(φ_A): the Maas wave
// radiates from the Davis Dam (R_disc) attenuating inward; the Alfvén wave radiates from the
// Alfvén Dam (R_A, single-star comb centred at the star) attenuating outward.
// COMPONENT waveforms — the SINGLE SOURCE OF TRUTH for both the fit (superposition_amplitude, below)
// AND the index.html chart, so the two can never drift. ONE Maas + ONE Alfvén wave at the fixed
// fundamental frequency CASCADE_ALPHA (ρ = 0.5837).

// Maas wave: radiates from the Davis Dam (R_disc), attenuates INWARD.
function maas_component(r: number, R_disc: number, R_A: number): number {
  const { wM } = dam_weights(R_disc, R_A);
  const ampM = Math.pow(Math.min(r / R_disc, 1), CASCADE_DECAY);
  return wM * ampM * Math.cos(cascade_alpha_eff(R_disc, R_A) * Math.log(R_disc / r));
}
// Alfvén wave = the Maas wave PARTIALLY REFLECTED off the Alfvén-speed gradient at R_A. Lab and
// magnetospheric measurements (Zhao et al. 2024; the Ionospheric Alfvén Resonator / field-line
// resonances) show such a reflection is partial and carries a 180° PHASE FLIP — so the reflected wave is
// sign-INVERTED. That negative sign is the source of the comb's exclusion behaviour (a density minimum at
// R_A, π out of phase with the Maas pile); it is DERIVED from the reflection boundary condition, not
// chosen. Radiates outward from R_A, attenuating by half per ρ-step (ampA). LOAD-BEARING: it is what
// seats Mercury in the magnetic-sandblast zone (slot 0.377, not the absorber's 0.431 where Mercury ran
// +115%); removing it or flipping it +positive scrambles Sol's inner ladder. The smooth-absorber and
// hard-node alternatives are both unphysical (a magnetosphere reflects, it does not absorb to zero).
function alfven_component(r: number, R_disc: number, R_A: number): number {
  const { wA } = dam_weights(R_disc, R_A);
  const dA = Math.max(r, R_A * 0.2);
  const ampA = Math.pow(Math.min(R_A / dA, 1), CASCADE_DECAY);
  return -wA * ampA * Math.cos(cascade_alpha_eff(R_disc, R_A) * Math.log(dA / R_A));
}
// Net (signed) Alfvén–Maas standing wave = Maas + Alfvén. THE SOURCE OF TRUTH for slot positions
// (its antinodes) and masses (its amplitude).
function superposition_amplitude(r: number, R_disc: number, R_A: number): number {
  return maas_component(r, R_disc, R_A) + alfven_component(r, R_disc, R_A);
}

// Snap a geometric-ladder guess to the nearest TRUE antinode (local |amplitude| max) of the
// enveloped superposition, searching only within the slot's own lobe so it can't jump to a
// neighbour. The ladder solves the anchor/spin in closed form; the snap places the seat where
// the real net wave actually peaks (inner slots shift out most, where the Alfvén bites).
function snap_to_antinode(r_guess: number, R_disc: number, R_A: number): number {
  if (!(r_guess > 0) || !(R_disc > 0) || !(R_A > 0)) return r_guess;
  let best = r_guess, bestA = Math.abs(superposition_amplitude(r_guess, R_disc, R_A));
  const N = 60, lo = r_guess * 0.82, hi = Math.min(r_guess * 1.30, R_disc);
  for (let i = 0; i <= N; i++) {
    const r = lo + (hi - lo) * i / N;
    const a = Math.abs(superposition_amplitude(r, R_disc, R_A));
    if (a > bestA) { bestA = a; best = r; }
  }
  return best;
}

// Predict the cascade: r_n = R_disc * 0.5837^n (geometric ratio from the
// half-amplitude-at-45° projection, 1 - sqrt(ln 2)/2). Slot 0 sits at the
// Davis Dam (R_disc); the innermost slot at the inner Alfven Dam
// vicinity. Returns slots split by snow line for display.
function predict_slots(M_star: number, spin: number, f_disc: number): { inner: number[]; outer: number[] } {
  const r_snow = snow_line(M_star, f_disc);
  const slots_r = cascade_slot_positions(M_star, spin);
  return {
    inner: slots_r.filter(r => r <= r_snow * 1.05),
    outer: slots_r.filter(r => r > r_snow * 1.05),
  };
}

function slot_predicted_mass(r: number, M_star: number, spin: number,
                             f_disc: number, t_form_cascade?: number,
                             omega?: number): number {
  const rock = rock_allocation(r, M_star, spin, f_disc, omega);
  const ice = ice_allocation(r, M_star, spin, f_disc, omega);
  const core = rock + ice;
  // Inverted aggregates can also capture gas IF the core reaches the gas
  // threshold (an inverted hot Jupiter) — so no inverted-specific suppression.
  if (core <= gas_threshold_mass(r, M_star, f_disc)) return core;
  const sl = slope(M_star, f_disc);
  const tf = (t_form_cascade === undefined) ? formation_time(r, rock + ice, M_star, f_disc) : t_form_cascade;
  return core + hydrogen_capture(core, tf, spin, r, M_star, f_disc, omega);
}

function auto_spin_from_outermost(planets: Planet[], M_star: number, anchor_slot?: number): number {
  if (anchor_slot === undefined) anchor_slot = 0;
  // All observed bodies are included in the cascade — even stellar-mass
  // ones. This is consistent with the framework's prediction that outer
  // slots can naturally allocate stellar-mass bodies (e.g. HD 60532's
  // predicted slot 0 stellar companion). Holman-Wiegert truncation is
  // retained only as a fallback when no observed body anchors R_disc.
  const disc_planets = planets.filter(p => (p.observed || 0) > 0);
  const truncation_cap: number | null = null;
  let max_r: number;
  if (disc_planets.length) {
    max_r = Math.max(...disc_planets.map(p => p.r));
    if (truncation_cap !== null && max_r > truncation_cap) {
      max_r = truncation_cap;
    }
  } else if (truncation_cap !== null) {
    max_r = truncation_cap;
  } else {
    return 1.0;
  }
  // anchor_slot > 0: outermost observed sits at slot k, not slot 0.
  // Slots 0..k-1 are "missing" — ejected/scattered outer bodies.
  // v5: the outermost sits at slot k of the SHIFTED superposition ladder
  // (r_k = R_disc·shift·ρ^k), so solve R_disc by fixed point — the shift
  // depends on R_disc/R_A, so iterate (converges fast; shift→1 in the
  // Maas-dominant regime, recovering the old closed form).
  let shift = 1.0, spin = 1.0;
  for (let i = 0; i < 6; i++) {
    const R_disc_target = max_r / (shift * Math.pow(CASCADE_RATIO, anchor_slot));
    spin = spin_for_disc_radius(M_star, R_disc_target);   // inverts the v5 wind-balance formula
    shift = superposition_phase_shift(disc_radius(M_star, spin),
                                      alfven_radius(M_star, spin));
  }
  return spin;
}

// EXISTENCE JUSTIFICATION (fit gate): every observed body must have a
// dynamically consistent story under the hypothesis. A fit positing an
// unobserved GHOST whose chaotic zone contains a calm, full-mass
// observed body refutes itself: that body would have been scattered
// and would not hold its observed mass. Accepted stories: survivor
// depletion (observed <= 15% of its own slot prediction), observed
// position outside the zone (it moved), or deep-interior decoupling
// (< 0.27 of the ghost's radius). Observed-observed packing is NOT
// gated here (real resonant chains prove protection exists; PACKED
// flags it informationally).
function ghost_refuted(slots: number[], assignment: Record<number, Planet>,
                       M_star: number, spin_try: number,
                       f_disc_eval: number): boolean {
  for (let g = 0; g < slots.length; g++) {
    if (assignment[g]) continue;                       // ghosts only
    const m_ghost = slot_predicted_mass(slots[g], M_star, spin_try, f_disc_eval);
    if (m_ghost <= 0) continue;
    const r_g = slots[g];
    const RH = r_g * Math.pow(m_ghost * (3e-6 / M_PRIM_TO_MSUN) / (3 * M_star), 1.0 / 3.0);
    for (let n = 0; n < slots.length; n++) {
      const p = assignment[n];
      if (!p || (p.observed || 0) <= 0) continue;
      const m_pred_n = slot_predicted_mass(slots[n], M_star, spin_try, f_disc_eval);
      // ghost must DOMINATE the bystander to be a threat
      if (m_ghost < 10 * Math.max(p.observed || 0, m_pred_n)) continue;
      const r_obs = p.r;                               // observed position
      if (Math.abs(r_obs - r_g) >= 11 * RH) continue;  // outside the zone
      if (r_obs < r_g && r_obs / r_g < 0.27) continue; // decoupled interior
      if ((p.observed || 0) <= 0.15 * Math.max(m_pred_n, 1e-12)) continue; // survivor
      return true;   // calm full-mass body inside the ghost's chaos zone
    }
  }
  return false;
}

function auto_spin_with_anchor_search(planets: Planet[], M_star: number, f_disc: number): AnchorResult {
  // Iterate anchor_slot k=0..K. For each, compute positional residual,
  // missing-slot count, AND reject any k where a MISSING slot would
  // predict a body at or above stellar-companion mass (we can't invoke
  // an undetected star). Brown dwarf is the absolute maximum for any
  // predicted unobserved body.
  const obs_disc = planets.filter(p => (p.observed || 0) > 0);
  if (!obs_disc.length) {
    return { spin: auto_spin_from_outermost(planets, M_star, 0), anchor_slot: 0 };
  }
  const BIG = 1e6;
  const f_disc_eval = (f_disc !== undefined && f_disc > 0) ? f_disc : 0.107;
  // Stage 1: outermost at varying k, in-situ everywhere.
  let best_score = Infinity;
  let best_spin: number | null = null;
  let best_k = 0;
  let best_pos_resid = Infinity, best_unassigned = Infinity;
  for (let k = 0; k < 12; k++) {
    const spin_try = auto_spin_from_outermost(planets, M_star, k);
    const slots = cascade_slot_positions(M_star, spin_try, obs_disc.length);
    if (!slots.length) continue;
    const remaining = slots.map((_, i) => i);
    const assignment: Record<number, Planet> = {};
    let unassigned = 0, pos_resid = 0;
    const ordered = [...obs_disc].sort((a, b) => b.r - a.r);
    for (const p of ordered) {
      if (!remaining.length) { unassigned++; continue; }
      let best_n = remaining[0], best_d = Infinity;
      for (const n of remaining) {
        const d = Math.abs(Math.log(p.r) - Math.log(slots[n]));
        if (d < best_d) { best_d = d; best_n = n; }
      }
      pos_resid += best_d;
      assignment[best_n] = p;
      remaining.splice(remaining.indexOf(best_n), 1);
    }
    // Reject if any MISSING slot would predict a stellar-mass body, and
    // accumulate mass-weighted missing cost (log10 of predicted mass).
    // Missing rocky bodies are cheap; missing brown dwarfs and gas
    // giants are expensive — discourages exotic outer slot ejection
    // scenarios involving giants when a smaller-k solution exists.
    let stellar_missing = false;
    let missing_cost = 0;
    for (let n = 0; n < slots.length; n++) {
      if (assignment[n]) continue;
      const m_pred = slot_predicted_mass(slots[n], M_star, spin_try, f_disc_eval);
      if (m_pred >= M_STELLAR_BOUNDARY) { stellar_missing = true; break; }
      missing_cost += Math.log10(1 + Math.max(0, m_pred));
    }
    if (stellar_missing) continue;
    if (ghost_refuted(slots, assignment, M_star, spin_try, f_disc_eval)) continue;
    // Anchor must be in-situ: run the actual mass-scored assignment and
    // verify the outermost observed planet ends up at slot k. If the
    // mass scoring moves the anchor planet elsewhere, this k is unreliable.
    const outermost = ordered[0];
    const real_assign = assign_planets_to_slots(obs_disc, M_star, spin_try, f_disc_eval);
    const anchor_slot_data = real_assign.find(
      s => s.filled && s.name === outermost.name);
    if (!anchor_slot_data || anchor_slot_data.slot_n !== k) continue;
    // Anchor must be roughly its predicted size. Asymmetric tolerance:
    // significant LOSS (predicted >> observed) is acceptable; GAIN
    // (predicted << observed) is suspect. SKIP this check for gas-
    // eligible anchors (observed > 5 M_E) because t_form bisection in
    // bestFit always fits gas-giant mass exactly — the slot prediction
    // at pre-bisection f_disc/t_form is not a reliable estimate.
    if ((outermost.observed || 0) <= GAS_OBS_THRESHOLD) {
      const anchor_pred = slot_predicted_mass(slots[k], M_star, spin_try, f_disc_eval);
      if (anchor_pred > 0 && (outermost.observed || 0) > 0) {
        const ratio_mp = anchor_pred / (outermost.observed || 1);
        if (ratio_mp < 0.75 || ratio_mp > 1.333) continue;
      }
    }
    // Per-k penalty: prefer anchoring to the outermost slot (k=0).
    // Escalating k is only chosen when the missing-cost or positional
    // fit improvement outweighs this penalty — a default-to-in-situ
    // anchor at R_disc bias.
    const K_PENALTY = 1.5;
    const score = unassigned * BIG + pos_resid + missing_cost + K_PENALTY * k;
    if (score < best_score) {
      best_score = score; best_spin = spin_try; best_k = k;
      best_pos_resid = pos_resid; best_unassigned = unassigned;
    }
  }
  // Stage 2: if stage 1 result is bad (large pos_resid → planets need
  // significant migration to fit slots), try outward-migration scenarios.
  // Outermost is conceptually at slot 0 but migrated outward; cascade
  // is rooted by the SECOND-outermost planet at slot 1 (or slot 2, etc.
  // when slot 1 is also empty). Inner planets must fit cleanly.
  const STAGE1_POS_RESID_OK = 1.5;
  if (obs_disc.length >= 2 &&
      (best_pos_resid > STAGE1_POS_RESID_OK || best_unassigned > 0)) {
    const ordered_outer_in = [...obs_disc].sort((a, b) => b.r - a.r);
    const outermost = ordered_outer_in[0];
    const second_outermost = ordered_outer_in[1];
    // Try second-outermost at slot 1..5 (varying vacated-outer-slot count).
    // Wider gap → larger R_disc → less wind suppression at the migrant
    // outermost's formation slot, allowing larger gas-giant formation
    // before destabilization-driven outward migration.
    for (let k1 = 1; k1 <= 5; k1++) {
      // second_outermost at slot k1: R_disc = second_outermost.r / ratio^k1
      const R_disc = second_outermost.r / Math.pow(CASCADE_RATIO, k1);
      // Stage 2 is outward-migration only — outermost must have migrated
      // outward, so its observed r must be > R_disc (formation position).
      if (outermost.r <= R_disc) continue;
      // Feasibility for a gas-giant outermost: stellar wind suppression
      // at slot 0 must not be so extreme that gas capture is suppressed
      // below ~10%. Below this threshold, accreting Saturn-mass amounts
      // in the destabilization window is physically implausible.
      if ((outermost.observed || 0) > GAS_OBS_THRESHOLD) {
        const spin_check = Math.pow(SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) / R_disc, 2);
        const wind_term = (spin_check / 30.0) * Math.pow(0.5 / Math.max(R_disc, 0.01), 2);
        const wind_supp = 1.0 / (1.0 + wind_term);
        if (wind_supp < 0.1) continue;  // gas accretion too suppressed
      }
      const spin_try = Math.pow(SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) / R_disc, 2);
      const slots = cascade_slot_positions(M_star, spin_try, obs_disc.length);
      if (!slots.length) continue;
      // Outermost is FORCED to slot 0 (migrant) regardless of position.
      // Other planets assigned greedily to remaining slots.
      const remaining = slots.map((_, i) => i).filter(i => i !== 0);
      const assignment: Record<number, Planet> = { 0: outermost };
      let unassigned_s2 = 0, pos_resid_s2 = 0;
      // Process inner planets outer-to-inner.
      const inner_ordered = ordered_outer_in.slice(1);
      for (const p of inner_ordered) {
        if (!remaining.length) { unassigned_s2++; continue; }
        let bn = remaining[0], bd = Infinity;
        for (const n of remaining) {
          const d = Math.abs(Math.log(p.r) - Math.log(slots[n]));
          if (d < bd) { bd = d; bn = n; }
        }
        pos_resid_s2 += bd;
        assignment[bn] = p;
        remaining.splice(remaining.indexOf(bn), 1);
      }
      // Reject if any MISSING slot would predict stellar mass.
      let stellar_missing_s2 = false;
      let missing_cost_s2 = 0;
      for (let n = 0; n < slots.length; n++) {
        if (assignment[n]) continue;
        const m_pred = slot_predicted_mass(slots[n], M_star, spin_try, f_disc_eval);
        if (m_pred >= M_STELLAR_BOUNDARY) { stellar_missing_s2 = true; break; }
        missing_cost_s2 += Math.log10(1 + Math.max(0, m_pred));
      }
      if (stellar_missing_s2) continue;
      if (ghost_refuted(slots, assignment, M_star, spin_try, f_disc_eval)) continue;
      // Stage 2 base penalty: invoking a migration story is itself a cost.
      const STAGE2_PENALTY = 2.0;
      // k1 penalty: more vacated outer slots cost more.
      const K1_PENALTY = 1.0 * (k1 - 1);
      const score_s2 = unassigned_s2 * BIG + pos_resid_s2
                     + missing_cost_s2 + STAGE2_PENALTY + K1_PENALTY;
      if (score_s2 < best_score) {
        best_score = score_s2; best_spin = spin_try; best_k = 0;
      }
    }
  }
  return {
    spin: best_spin !== null ? best_spin
                             : auto_spin_from_outermost(planets, M_star, 0),
    anchor_slot: best_k,
  };
}
