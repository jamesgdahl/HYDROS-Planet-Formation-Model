// Slot assignment, the slot-aware fit (with all post-formation detectors),
// and the shared bestFit() used identically by the web UI and the CLI.
// Global-script style: depends on constants, disc, allocation, cascade, classify.

// LUGER LATTICE (half-step interstitial occupancy) gate. In the
// INVERTED regime the disc lives inside the magnetosphere: magnetic
// stiffening reduces shear and the compressed gas density crushes
// solid random velocities, so low-mass bodies' feeding zones become
// drag-limited — narrower than the geometric (Gaussian-HWHM) width
// that lets rung bodies eat their midpoints in the normal regime.
// The surviving midpoint material can consolidate at interstitial
// sites r_n·√ρ, PROVIDED the resulting half-step lattice is
// Hill-stable for the occupant: gap/R_H,mutual ≥ 7 (Lissauer).
// Giants are Hill-limited, not drag-limited — their reach spans the
// midpoint regardless of damping — so the gate excludes them
// naturally. Named the Luger lattice after Luger et al. 2017, whose
// TRAPPIST-1 resonant chain exhibited the complete structure:
// full-ladder chains relax to 2:1 (period ρ^{-3/2} = 2.24; GJ 876,
// HR 8799), Luger-lattice chains sit on 3:2 essentially at birth
// (period ρ^{-3/4} = 1.497; TRAPPIST-1).
function half_site_allowed(p: Planet, M_star: number): boolean {
  const HALF_GAP = 1 / Math.sqrt(CASCADE_RATIO) - 1;  // 0.3089 of r
  const m = Math.max(p.observed || 0, 1e-3);
  const rh_mut = 1.154 * Math.pow((2 * m * (3e-6 / M_PRIM_TO_MSUN)) / (3 * M_star), 1 / 3);
  return HALF_GAP / rh_mut >= 7.0;
}

interface CascadeSite { n: number; r: number; interstitial: boolean }

// A sub-stellar core fragment's LOCAL clearing zone [r−R_clear, r+R_clear].
// R_clear = R_Hill + R_sweep, where (μ = m/M*, the planet:star mass ratio):
//   R_Hill  = r·(μ/3)^(1/3)        — the Hill radius
//   R_sweep = 1.3·r·μ^(2/7)        — Wisdom (1980) first-order mean-motion resonance-OVERLAP
//             half-width: the chaotic zone bordering the body within which test particles
//             (here, cascade slots) are dynamically swept clear. (Wisdom, J. 1980, AJ 85,
//             1122 — "The resonance overlap criterion and the onset of stochastic behavior
//             in the restricted three-body problem".)
// This is the fragment's OWN Hill/chaos zone — a LOCAL effect — not a system-wide
// co-primary mechanism (barycentre / Holman-Wiegert / outermost-R_A); those are reserved
// for STELLAR co-primaries. UNITS: m is in M⊕ (the planet's catalogue mass), M_star is in
// PRIMORDIAL-solar units (the slot machinery's convention — cf. half_site_allowed and the
// Hill computations at lines ~625), so m is converted into solar units (× 3e-6/M_PRIM_TO_MSUN
// = 1/M_SUN_TO_EARTH) before forming μ.
interface ClearZone { r: number; m: number; r_hill: number; r_sweep: number; r_clear: number; lo: number; hi: number }
// ONE-SIDED INTERIOR CLEARING RULE. A genuine low-spin hot-Jupiter fragment forms by dragging
// its interior inward into the collapsing core (low angular momentum → nothing is left to seat
// planets sunward of it), so the disc can only build BEYOND the fragment. When NO body is
// observed interior to the fragment (`interior_consumed` = true, the clean low-spin case),
// the clearing is ONE-SIDED INTERIOR: everything from the inner edge (lo ≈ 0 / the inner dam)
// out to r_frag + R_sweep is swept; no slot survives sunward of the fragment. But if a real
// planet IS observed interior to the fragment, the interior was demonstrably NOT consumed (that
// planet survived), so we keep the ordinary SYMMETRIC Hill+chaos clear [r−R_clear, r+R_clear]
// and leave the surviving inner super-Earth's slot alone.
function fragment_clear_zone(r: number, m: number, M_star: number,
                             interior_consumed: boolean = false): ClearZone {
  const m_solar = Math.max(m, 0) * (3e-6 / M_PRIM_TO_MSUN);   // M⊕ → primordial-solar units
  const mu = m_solar / Math.max(M_star, 1e-12);
  const r_hill = r * Math.pow(mu / 3, 1 / 3);
  const r_sweep = 1.3 * r * Math.pow(mu, 2 / 7);
  const r_clear = r_hill + r_sweep;
  // Interior consumed (no observed inner body): sweep the whole interior (lo → 0) out to
  // r_frag + R_sweep. Otherwise: symmetric local clear about r_frag.
  const lo = interior_consumed ? 0 : r - r_clear;
  const hi = interior_consumed ? r + r_sweep : r + r_clear;
  return { r, m, r_hill, r_sweep, r_clear, lo, hi };
}

// All candidate formation sites: the full rungs, plus (inverted regime
// only) the interstitial midpoints at r_n·√ρ. Sub-stellar fragments' clearing
// zones (`clearings`) sweep out any site that falls inside [r±R_clear].
function cascade_sites(M_star: number, spin: number,
                       min_slots: number, omega?: number, f_disc?: number,
                       clearings?: ClearZone[]): CascadeSite[] {
  const slots_r = cascade_slot_positions(M_star, spin, min_slots, omega, f_disc);
  const sites: CascadeSite[] = slots_r.map((r, n) =>
    ({ n, r, interstitial: false }));
  const om_s = (omega === undefined) ? spin : omega;
  // Regime = can the stellar ram pressure (flux + magnetic wind) hold the disc out? The budget
  // criterion (compression_budget ≥ 1) is the physical test — a feeble-ram M-dwarf can't, so it
  // inverts even though its rotation-starved field leaves R_A geometrically inside R_disc. The
  // geometric R_A ≥ R_disc still catches genuine high-field inversions. (Either ⇒ inverted.)
  const inverted = is_inverted_budget(M_star) || alfven_radius(M_star, om_s) >= disc_radius(M_star, spin, om_s, f_disc);
  if (inverted) {
    // INVERTED regime = a SINGLE Davis assembly line. The Alfvén Dam REPELS
    // material (magnetosphere — it cannot accrete), so there is NO second
    // factory. Outward half-steps (√ρ cadence) between the integer slots give
    // the assembly drop points. Composition + mass differentiate by PHASE
    // down the line (rocky → icy → nebula KBOs) via the rocky-budget clock in
    // slot_aware_fit. (Memory: inverted-regime-model.)
    const SQRT_RHO = Math.sqrt(CASCADE_RATIO);
    for (let n = 0; n < slots_r.length; n++) {
      sites.push({ n: n + 0.5, r: slots_r[n] / SQRT_RHO, interstitial: true });
    }
  }
  // SUB-STELLAR FRAGMENT CLEARING: a hot Jupiter (rotational-fragmentation sibling) sweeps
  // its own Hill + resonance-overlap chaos zone clear — no cascade slot can form or survive
  // within [r_frag ± R_clear]. Drop every site that falls inside any fragment's zone. Local
  // dynamical effect only (its own neighbourhood), not the system-wide co-primary mechanisms.
  if (clearings && clearings.length) {
    return sites.filter(s => !clearings.some(cz => s.r >= cz.lo && s.r <= cz.hi));
  }
  return sites;
}

function assign_planets_to_slots(planets: Planet[], M_star: number,
                                 spin: number, f_disc: number,
                                 omega?: number, clearings?: ClearZone[]): AssignedSlot[] {
  const observed = planets.filter(p => (p.observed || 0) > 0);
  const sites = cascade_sites(M_star, spin, observed.length, omega, f_disc, clearings);
  const site_pred = sites.map(s => slot_predicted_mass(s.r, M_star, spin, f_disc, undefined, omega));

  const slot_pred = site_pred;
  const slots_r = sites.map(s => s.r);

  // POSITION-FIRST assignment (no-migration hypothesis): planets form on their
  // slots and stay there, so each is assigned to its NEAREST slot by position
  // (log-radius distance). Mass deltas vs the slot's allocation are NOT relocation
  // triggers — they are REPORTED downstream as events: late delivery / impact loss
  // (observed < predicted), or a planet whose mass exceeds the slot's gas-capture
  // ceiling (a gravitational-instability giant, e.g. HR 8799 b — massive AT a wide
  // orbit, which gas capture cannot build). Position trumps mass; migration is not
  // invoked to reconcile a mass mismatch. (Interstitial half-slots keep their Hill
  // gate — that's a dynamical admissibility test, not a mass match.)
  const pair_score = (p: Planet, n: number): number => {
    if (sites[n].interstitial && !half_site_allowed(p, M_star)) return 1e9;
    return Math.abs(Math.log(p.r) - Math.log(slots_r[n]));
  };

  const n_sites = sites.length;
  const assignments: (string | null)[] = new Array(n_sites).fill(null);
  const unassigned = observed.slice();
  while (unassigned.length) {
    // INWARD-SWEPT REMNANTS yield: while any in-situ body is still unseated, swept remnants are not
    // considered. Their observed AU is post-sweep, so letting them compete on position would let them
    // squat an inner slot and evict the in-situ neighbour. Once the in-situ bodies hold their natural
    // slots, the remnant takes the best remaining site — necessarily OUTWARD (its formation AU) — and
    // is reported as an inward migrant (form_r = slot_r > observed r).
    const in_situ_left = unassigned.some(p => !p.swept);
    let best: { score: number; planet: Planet; n: number } | null = null;
    for (const p of unassigned) {
      if (in_situ_left && p.swept) continue;
      for (let n = 0; n < n_sites; n++) {
        if (assignments[n] !== null) continue;
        const s = pair_score(p, n);
        if (s >= 1e9) continue;  // gated interstitial
        if (best === null || s < best.score) best = { score: s, planet: p, n };
      }
    }
    if (!best) break;
    assignments[best.n] = best.planet.name;
    unassigned.splice(unassigned.indexOf(best.planet), 1);
  }

  // Output: every full rung (filled or lost, as before) plus OCCUPIED
  // interstitials. Empty interstitials are optional sites, not lost
  // planets — they produce no rows and carry no score cost.
  const out: AssignedSlot[] = [];
  for (let n = 0; n < n_sites; n++) {
    if (assignments[n] !== null) {
      const p = planets.find(q => q.name === assignments[n])!;
      out.push({
        slot_n: sites[n].n, slot_r: sites[n].r, filled: true,
        interstitial: sites[n].interstitial,
        name: p.name, r_obs: p.r, observed: p.observed || 0,
        slot_predicted_mass: slot_pred[n],
      });
    } else if (!sites[n].interstitial) {
      out.push({
        slot_n: sites[n].n, slot_r: sites[n].r, filled: false,
        name: `slot_${sites[n].n}_lost`, r_obs: sites[n].r, observed: 0,
        slot_predicted_mass: slot_pred[n],
      });
    }
  }
  out.sort((a, b) => a.slot_n - b.slot_n);
  return out;
}

interface SlotAwareFitOpts {
  auto_compress?: boolean;
  bisect_tolerance?: number;
  // Devour credits: body name -> retained meal mass. The named body's
  // formation seat bisects to (observed - credit): a wrecking migrant
  // must JUSTIFY its observed mass as formation + meals, not be fit
  // to its post-meal total (which would be an invalid formation).
  devour_credit?: Record<string, number>;
  max_iterations?: number;
  // VICE inner-jaw rotation: owns R_A, the backstop intercept, and the
  // wind term. Defaults to spin (the jaw-lock).
  omega?: number;
  // DEFER the post-formation passes (scatter + devour + void-remnant). When set,
  // slot_aware_fit returns the formed slots WITHOUT running them, and stashes a thunk
  // (_run_post_formation) the caller invokes after gas conservation — so scatter reads
  // the final gas-conserved masses, not the pre-cap phantom-envelope masses. Used by
  // budgetFit; bestFit/bruteFit leave it unset (post-formation runs inline).
  defer_post_formation?: boolean;
}

// POST-FORMATION processes (run AFTER the formation model produces final masses):
// scatter physics (scatter.ts) + the devoured-mass ledger + the void-interior remnant
// binding. Operates on the final slot set in place. A distinct stage from the FIT — it
// reads only predicted/formed quantities; observed planets are compared against, not fed in.
function apply_post_formation(results: FitSlot[], M_star: number, R_A_now: number,
                              planet_by_slot: Record<number, Planet>,
                              void_bodies: Planet[], nearest_site_n: (r: number) => number,
                              fragments: Planet[]): void {
  // Post-formation SCATTERING (scatter.ts) — collision/bombardment remnants, mutual
  // eviction, Lissauer destabilisation, slot-dispersal scatter remnants + destroyed
  // slots. A distinct process from the fit; rewrites results in place.
  apply_scattering(results, M_star, R_A_now, planet_by_slot);


  // DEVOURED-MASS LEDGER (wrecking class): a giant that migrated
  // inward ACROSS SEATS ate the interior cascade it traversed. The
  // swallowed condensables arrive post-gas-accumulation: they enrich
  // the interior (the anomalous 10-100 M⊕ heavy-element inventories of
  // hot Jupiters; Thorngren et al. 2016) without seeding further
  // envelope capture, so they are reported as a post-formation gain,
  // never folded into the Tanigawa-Ikoma core² term. Within-seat
  // displacement (Jupiter's -0.78 AU) does not qualify; the migrant
  // must have left its seat.
  const wreckers: FitSlot[] = [];
  for (const s of results) {
    if (!s.filled || s.external || s.exterior) continue;
    const p = planet_by_slot[s.slot_n];
    if (!p || !(p.r > 0)) continue;
    if (nearest_site_n(p.r) === s.slot_n) continue;   // displaced, not migrated
    if (p.r >= s.slot_r) continue;                    // inward migrants only
    wreckers.push(s);
  }
  // Each eaten slot goes to ONE devourer: the LEADER — the migrant with
  // the lowest formation seat whose traversal range contains the slot
  // (it descends ahead; followers cross an already-cleared corridor).
  // VICTIMS ARE FORMED PLANETS at full predicted mass (migration is
  // post-gas: the occupants existed). Meals are NOT intact: the
  // retention line prices each one — retained joins the migrant,
  // the remainder scatters as corridor debris. The migrant's
  // FORMATION-seat mass is therefore observed minus retained: the
  // devoured gain is post-prediction mass. Slots whose planets were
  // scattered OUTWARD (dispersal-with-survivor stories) are not on
  // the menu.
  interface Meal { total: number; retained: number; metals: number;
                   debris: number; n: number; }
  const eaten = new Map<FitSlot, Meal>();
  for (const o of results) {
    if (o.filled || o.external || o.exterior) continue;
    if (/scattered outward/.test(o.interpretation)) continue;
    let leader: FitSlot | null = null;
    for (const m of wreckers) {
      const pr = planet_by_slot[m.slot_n].r;
      if (o.slot_r < m.slot_r && o.slot_r > pr) {
        if (leader === null || m.slot_r < leader.slot_r) leader = m;
      }
    }
    if (!leader) continue;
    // TABLE MANNERS: a migrant cannot swallow a victim larger than its
    // own final self — bigger bodies in the corridor are eviction
    // stories, not meals. And the meal ledger caps below: retained
    // mass cannot dominate the eater's observed mass.
    const m_eater = leader.observed > 0 ? leader.observed : leader.predicted;
    if (o.predicted > m_eater) continue;
    // encounter: migrant crossing the victim's orbit on its descent
    // (grazing-perihelion convention q = 0.85 r_v, aphelion at the
    // migrant's formation seat)
    const r_v = o.slot_r, r0 = leader.slot_r;
    const q = 0.85 * r_v, ao = (q + r0) / 2, ecc = (r0 - q) / (r0 + q);
    const vc = 29.785 * Math.sqrt(M_PRIM_TO_MSUN * M_star / r_v);
    const vv = Math.sqrt(2 - r_v / ao);
    const vt = Math.sqrt(ao * (1 - ecc * ecc) / r_v);
    const vr = Math.sqrt(Math.max(0, vv * vv - vt * vt));
    const dv = vc * Math.sqrt((vt - 1) ** 2 + vr * vr);
    const m_mig = leader.observed > 0 ? leader.observed : leader.predicted;
    const vesc = 11.186 * Math.pow(Math.max(m_mig + o.predicted, 1), 1 / 3);
    const ret = Math.max(0.05, 0.969 - 0.605 * dv / vesc);
    const meal = eaten.get(leader) || { total: 0, retained: 0, metals: 0, debris: 0, n: 0 };
    // meal cap: total retained <= 60% of the eater's observed mass
    // (the eater must still mostly be its own formation product)
    if (meal.retained + ret * o.predicted > 0.6 * m_eater) continue;
    meal.total += o.predicted;
    meal.retained += ret * o.predicted;
    meal.metals += ret * (o.rock + o.ice + o.pebble);
    meal.debris += (1 - ret) * o.predicted;
    meal.n += 1;
    eaten.set(leader, meal);
    // name the eater on the victim's row
    const victim_note = `devoured by ${leader.name} en route: ${(ret * 100).toFixed(0)}% retained into it, ${((1 - ret) * o.predicted).toFixed(1)} M⊕ scattered as corridor debris`;
    if (/\(not observed\)/.test(o.interpretation)) {
      o.interpretation = o.interpretation.replace('(not observed)', `(${victim_note})`);
    } else {
      o.interpretation += ` — ${victim_note}`;
    }
  }
  for (const [m, meal] of eaten) {
    if (meal.retained <= 0.1) continue;
    m.devoured = meal.retained;
    const m_form = Math.max(0, (m.observed > 0 ? m.observed : m.predicted) - meal.retained);
    m.interpretation += ` — devoured ${meal.n} interior occupant${meal.n > 1 ? 's' : ''}: +${meal.retained.toFixed(1)} retained of ${meal.total.toFixed(1)} M⊕ (≈${meal.metals.toFixed(1)} M⊕ metals; ${meal.debris.toFixed(1)} M⊕ scattered as corridor debris); formation-seat mass ≈ ${m_form.toFixed(0)} M⊕ pre-devouring`;
  }

  // bodies leaves no stable region. Total obliteration of the swarm.
  // Void-interior bodies — observed inside the Alfven Dam, where no
  // cascade slot exists. A body cannot have FORMED there, but a small
  // one (bare-core mass range, no surviving envelope) may be a
  // Martian-type scatter remnant: a survivor retaining ~5-10% of its
  // slot's parent (Mars retains ~8% of its slot prediction in Sol),
  // stripped and flung under the dam. If an UNFILLED slot's predicted
  // mass puts the orphan inside that band, bind it to the slot: the
  // mass delta and the delivered position are both scatter OUTPUT —
  // a satisfied fit (excluded from the f-bisection target and the
  // position score), exactly as Mars' -92% counts as diagnostic, not
  // error. Otherwise the body stays a void row.
  const REMNANT_MAX_MASS = 30.0;  // M⊕ — above this it kept an envelope
  for (const p of void_bodies) {
    const m_obs = p.observed || 0;
    const is_small = m_obs > 0 && m_obs <= REMNANT_MAX_MASS;
    // FISSION REMAINDER. A small void body interior to a sub-stellar core fragment is the
    // residue of THAT fragment's fission, not a scattered cascade slot: when the over-spun
    // core shed its overflow as the hot Jupiter (flung out to a_bin), the marginally-bound
    // inner residue stayed under the Alfvén Dam. Attribute it to the fragment (a satisfied,
    // diagnostic row — excluded from the target) rather than inventing a phantom slot parent
    // to scatter inward. (55 Cnc e interior to b is the exemplar.)
    const frag_parent = is_small
      ? fragments.find(fr => fr.r > p.r && (fr.observed || 0) > m_obs) : undefined;
    if (frag_parent) {
      const pct = (m_obs / (frag_parent.observed || 1) * 100);
      results.push({
        slot_n: -1, slot_r: p.r, r_used: p.r,
        filled: true, name: p.name,
        rock: 0, ice: 0, pebble: 0, core: 0, t_form: 0, h_he: 0,
        predicted: m_obs, observed: m_obs,
        err_pct: 0, implied_dM: 0,
        stripped: is_stripped(p, M_star), in_void: true, external: true, remnant: true,
        primordial: { rock: 0, ice: 0, pebble: 0, h_he: 0, core: 0, total: m_obs },
        interpretation: `fission remainder of ${frag_parent.name}: the ${m_obs.toFixed(2)} M⊕ inner residue (~${pct.toFixed(1)}% of the ${(frag_parent.observed || 0).toFixed(0)} M⊕ fragment) left under the Alfvén Dam at ${p.r} AU when the over-spun core shed its overflow outward as ${frag_parent.name} — not a cascade slot (interior to R_A) and not a scattered slot parent`,
      });
      continue;
    }
    let bound: FitSlot | null = null;
    if (is_small) {
      let best_d = Infinity;
      for (const s of results) {
        if (s.filled || s.external || s.predicted <= 0) continue;
        const frac = m_obs / s.predicted;
        if (frac < SURVIVOR_MASS_FRAC_MIN || frac > SURVIVOR_MASS_FRAC_MAX) continue;
        const d = Math.abs(Math.log(frac
          / Math.sqrt(SURVIVOR_MASS_FRAC_MIN * SURVIVOR_MASS_FRAC_MAX)));
        if (d < best_d) { best_d = d; bound = s; }
      }
    }
    if (bound) {
      const pct = Math.round(m_obs / bound.predicted * 100);
      bound.filled = true;
      bound.name = p.name;
      bound.observed = m_obs;
      bound.err_pct = (bound.predicted - m_obs) / m_obs * 100;
      bound.implied_dM = m_obs - bound.predicted;
      bound.remnant = true;
      bound.stripped = is_stripped(p, M_star);
      bound.interpretation = `Martian-type scatter remnant: ~${pct}% of the slot ${bound.slot_n} parent (${bound.predicted.toFixed(0)} M⊕), stripped and flung under the dam to ${p.r} AU`;
      continue;
    }
    // CORE COMPONENT: a stellar-mass body interior to R_A that the disc reservoir
    // cannot form. It isn't a planet or a slot product — it's a central fragment
    // (co-primary): the core's primordial spin exceeded breakup (λ_break ≈
    // breakup_spin(M_star)) and tore off a sibling star (rotational fragmentation;
    // the binary channel). Alpha Cen B is the exemplar: 0.91 M☉ at 23.5 AU,
    // interior to R_A, > the whole reservoir. Together with the predicted main
    // star it's a core component — both masses drive the dams + barycentre.
    const is_core = m_obs > M_STELLAR_BOUNDARY || !!p.core;
    const lam_break = breakup_spin(M_star);
    results.push({
      slot_n: -1, slot_r: p.r, r_used: p.r,
      filled: true, name: p.name,
      rock: 0, ice: 0, pebble: 0, core: 0,
      t_form: 0, h_he: 0,
      predicted: m_obs, observed: m_obs,
      err_pct: 0, implied_dM: 0,
      stripped: is_stripped(p, M_star), in_void: true, external: true,
      core_component: is_core,
      primordial: { rock: 0, ice: 0, pebble: 0, h_he: 0, core: 0, total: m_obs },
      interpretation: is_core
        ? `core component (co-primary): ${(m_obs / 332946).toFixed(3)} M☉ at ${p.r} AU — a rotational-fragmentation SIBLING STAR, not a slot product. Its mass exceeds the disc reservoir, and seating it demands a spin far past breakup (λ_break ≈ ${lam_break.toFixed(1)}): the core spun up beyond cohesion and tore in two (the binary channel). With the main star, both masses drive the dams + barycentre.`
        : is_small
        ? `interior to Alfven Dam (Martian-type scatter remnant: ~5-10% of a ${(m_obs / SURVIVOR_MASS_FRAC_MAX).toFixed(0)}-${(m_obs / SURVIVOR_MASS_FRAC_MIN).toFixed(0)} M⊕ parent, stripped and flung under the dam; parent slot indeterminate)`
        : "interior to Alfven Dam (void: no slot at observed r — delivered inward by scattering or migration; formation slot indeterminate)",
    });
  }
}

function slot_aware_fit(planets: Planet[], M_star: number,
                        spin: number | null | undefined, f_disc: number,
                        opts?: SlotAwareFitOpts): FitResult {
  opts = opts || {};
  const auto_compress = (opts.auto_compress !== false);
  const bisect_tol = opts.bisect_tolerance || 1e-5;
  const max_iter = opts.max_iterations || 100;
  // Primordial spin factor for the accretion clock (≡1 at Sol). formation_time reads
  // this; it scales the Myr accretion time off Sol to the orbital-period cascade.
  set_form_spin((spin && spin > 0) ? spin : 1.0);

  // SUB-STELLAR FRAGMENTS (hot Jupiters, warm Neptunes). A body INSIDE the snow line whose mass
  // exceeds the runaway-gas critical core mass (gas_threshold_mass = M_crit) MUST carry an H/He
  // envelope — but the disc can't supply gas inside the snow line (no ice core to trigger runaway),
  // so it cannot have formed in situ: it's a rotational-fragmentation sibling (like a co-primary, but
  // planetary-mass), not a slot product. This is the same "the disc can't form it" test that flags a
  // stellar co-primary, now via the PHYSICAL runaway threshold M_crit — no arbitrary mass cut, and it
  // cleanly spares rocky super-Earths (below M_crit) at any radius, including inside R_A. Being
  // `fragment` not `core`, it carries NO barycentre / Holman-Wiegert weight (low mass ⇒ tiny shift,
  // thin chaotic clearing). Excluded from the cascade; predicted := observed.
  // NORMAL regime only: the inverted regime mints EVERY body in the dense pile-up (factory products),
  // so "the disc can't form it" doesn't apply — its compact planets are not fragments.
  // SPIN JUSTIFICATION (the necessary precondition): a core fragment can only exist if the core
  // actually fissioned — i.e. the primordial spin reached the bar-mode limit β = BETA_SOL·λ² ≥ 0.274
  // (Bate 2011), `core_fragments(λ)`. Below it the core stays axisymmetric and sheds nothing, so no
  // body at any orbit is a fragment — it's a disc product. This stops the mass-only test from
  // mislabelling under-fed disc cascades (Kepler-90, λ=0.23 ⇒ β≈0.0004) as fission debris.
  // ACCRETION-PRESSURE HILL-OVERFLOW FRAGMENTS. A runaway H/He GAS giant INSIDE the snow line cannot
  // form in situ — the disc can't supply H/He there and there's no in-situ ice. At low-but-not-too-low
  // spin the accretion-heat outward pressure pushes the un-distributed core mass past its Hill radius,
  // where it pinches off as a hot Jupiter (see accretion-overflow-fragmentation.md). The discriminator
  // is structural, not the bar-mode β (β≈0.274 is the rotational-STABILITY ceiling, ~30× above the
  // pressure-assisted fragmentation onset): the fragment is an inner giant with a body EXTERIOR to it.
  // The OUTERMOST body is spared — it's the slot-0 cascade barrier (or the cold giant beyond the snow
  // line, e.g. HD 134987 c). Normal regime only; inverted M-dwarfs mound at the dam, they don't overflow.
  if (!is_inverted_budget(M_star)) {
    const r_snow_f = snow_line(M_star, f_disc);
    // a_bin AU cap + single-per-star (see budgetFit's detection block): a low-spin core sheds ONE
    // close fission product at a_bin = close_binary_separation(λ); giants beyond a_bin are normal
    // cascade products. spin here IS the system λ; if null (un-resolved sub-cascade) drop the cap.
    const a_bin = (spin != null && isFinite(spin) && spin > 0)
      ? close_binary_separation(spin, M_star) : Infinity;
    let outer_r = 0;
    for (const p of planets) {
      if (p.core || p.kbo) continue;
      const m = p.observed || 0;
      if (m > 0 && m < M_STELLAR_BOUNDARY && p.r > outer_r) outer_r = p.r;
    }
    let frag: Planet | null = null;        // the single innermost qualifying candidate
    for (const p of planets) {
      if (p.core || p.kbo || p.fragment) continue;
      const mo = p.observed || 0;
      if (mo <= 0 || mo >= M_STELLAR_BOUNDARY || !(p.r > 0) || p.r >= r_snow_f) continue;
      if (!(p.r < outer_r)) continue;                         // outermost body = cascade barrier, spared
      if (p.r > a_bin) continue;                              // beyond the close-fission reach ⇒ not a fragment
      // Gas-DOMINATED runaway giant the disc can't build here. The absolute floor (not the bare
      // f_disc-sensitive M_crit) survives the f_disc bisection sweep — packed super-Earth systems
      // (Kepler-90) are never mislabelled when a low trial f_disc collapses gas_threshold_mass.
      if (mo >= FRAG_GIANT_MIN && mo > gas_threshold_mass(p.r, M_star, f_disc)) {
        if (frag === null || p.r < frag.r) frag = p;          // keep the INNERMOST qualifier
      }
    }
    if (frag) frag.fragment = true;
  }

  // All observed bodies participate in the cascade — consistent with
  // the framework's predicted-stellar-companion patterns (HD 60532, etc.).
  // The stellar-mass label is preserved in classification but doesn't
  // exclude bodies from cascade fitting.
  const external_bodies: Planet[] = [];  // no bodies excluded by mass anymore
  // KBO-class bodies (dam-exterior cohort, the Kuiper mechanism) are a
  // DISTINCT population with independent inputs: they never enter the
  // interior cascade fit. They are evaluated afterward against the
  // exterior ladder anchored on the fitted dam.
  // INVERTED regime: there is no uniform inner accretion disc — the marching dam
  // mints EVERY body as a factory product (the pile-up + the outer KBOs), so ALL
  // non-core bodies go through the factory branch (with the receding snow line),
  // not the cascade. Normal regime: only the catalog-flagged KBOs are factory.
  const all_factory = is_inverted_budget(M_star);
  const kbo_bodies = all_factory
    ? planets.filter(p => !p.core && !p.fragment && (p.observed || 0) >= 0)
    : planets.filter(p => p.kbo && (p.observed || 0) >= 0);
  // CORE COMPONENTS: central fragments — catalog-flagged co-primaries (`core`, stellar) AND the
  // auto-detected sub-stellar fragments (`fragment`, hot Jupiters / warm Neptunes). Both are
  // excluded from the cascade fit (predicted:=observed); only `core` drives the dams/barycentre.
  const core_bodies = planets.filter(p => (!!p.core || !!p.fragment) && (p.observed || 0) > 0);
  const observed_all = all_factory ? []
    : planets.filter(p => !p.kbo && !p.core && !p.fragment && (p.observed || 0) > 0);

  if (auto_compress && (spin === undefined || spin === null)) {
    // Anchor search sees only the interior population — KBOs and core
    // components carry no weight in the cascade geometry.
    spin = auto_spin_with_anchor_search(
      planets.filter(p => !p.kbo && !p.core && !p.fragment), M_star, f_disc).spin;
  } else if (spin === undefined || spin === null) {
    spin = 1.0;
  }

  // Alfven-Dam interior exclusion (normal regime only): the
  // magnetospheric void hosts no cascade slots, so planets observed at
  // r < R_A cannot OCCUPY a formation slot there. They may well be cascade
  // products delivered inward by scattering or migration (the mill
  // flings bodies under the dam too); their formation slot is simply
  // indeterminate from position. Reported as void-interior
  // bodies rather than force-fitted to slots. In the inverted regime
  // (R_A >= R_disc) the compressed reservoir lives inside R_A by
  // construction, so no exclusion applies.
  const omega = (opts.omega === undefined || opts.omega === null)
    ? (spin as number) : opts.omega;
  const R_A_now = alfven_radius(M_star, omega);
  // Ram-pressure regime (see slot_positions): feeble-ram M-dwarf inverts even if its crushed
  // field leaves R_A inside R_disc; geometric R_A ≥ R_disc still catches high-field inversions.
  const inverted = is_inverted_budget(M_star) || R_A_now >= disc_radius(M_star, spin, omega, f_disc);
  // Only the DEEP void (r < 0.5 R_A) is exclusion-eligible: the dam
  // edge is not razor-sharp, and marginal cases remain fittable.
  const VOID_DEPTH = 0.5;
  const void_bodies = inverted ? []
    : observed_all.filter(p => p.r < VOID_DEPTH * R_A_now);
  const disc_planets = inverted ? observed_all
    : observed_all.filter(p => p.r >= VOID_DEPTH * R_A_now);

  // SUB-STELLAR FRAGMENT CLEARING ZONES. Each planetary-mass fragment (hot Jupiter,
  // observed < M_STELLAR_BOUNDARY) sweeps its OWN Hill + resonance-overlap chaos zone
  // clear of cascade slots (fragment_clear_zone). Stellar co-primaries (observed ≥
  // M_STELLAR_BOUNDARY) are NOT included — they get the system-wide co-primary treatment
  // (barycentre / Holman-Wiegert / inner-dam), not this local clearing.
  // FORWARD interior clearing: a genuine low-spin fragment forms by dragging its interior inward
  // into the collapsing core (low angular momentum ⇒ nothing left to seat planets sunward of it),
  // so the clearing is always ONE-SIDED INTERIOR (sweep the inner edge → r_frag + R_sweep). That is
  // the fragment's PHYSICAL formation mode (it IS the low-spin overflow), NOT gated on whether a
  // planet happens to be observed interior to it — letting the observed set decide which predicted
  // slots survive is the leak. The zone uses the fragment's FORWARD mass (fragment_overflow_mass),
  // not its observed mass.
  const frag_clearings: ClearZone[] = core_bodies
    .filter(p => !!p.fragment && (p.observed || 0) > 0 && (p.observed || 0) < M_STELLAR_BOUNDARY && p.r > 0)
    .map(p => fragment_clear_zone(p.r, fragment_overflow_mass(M_star, spin), M_star, true));

  const slot_data = assign_planets_to_slots(disc_planets, M_star, spin, f_disc, omega, frag_clearings);
  const planet_by_slot: Record<number, Planet> = {};
  for (const s of slot_data) {
    if (s.filled) {
      planet_by_slot[s.slot_n] = disc_planets.find(q => q.name === s.name)!;
    }
  }
  // fit_r: ON-SLOT DOCTRINE — planets form at their slots exactly, so
  // cascade allocation is evaluated at slot_r for everyone. Observed
  // minus slot position is post-formation displacement (the event
  // ledger), not a formation input. Nearest-site machinery retained for
  // migration tagging.
  const sites_pre = cascade_sites(M_star, spin, disc_planets.length, omega, f_disc, frag_clearings);
  const R_disc_local = sites_pre.length ? sites_pre[0].r : 0;
  const nearest_site_n = (r_obs: number): number => {
    const log_obs = Math.log(r_obs);
    let nearest = sites_pre.length ? sites_pre[0].n : 0, best = Infinity;
    for (const st of sites_pre) {
      const d = Math.abs(log_obs - Math.log(st.r));
      if (d < best) { best = d; nearest = st.n; }
    }
    return nearest;
  };
  const fit_r = (s: AssignedSlot): number => s.slot_r;

  const sl = slope(M_star, f_disc);
  const pebble_total = total_pebble_bonus_budget(M_star, f_disc);

  // UNIFIED PEBBLE-FLUX COMPETITION (see memory unified-reservoir-competition). The inward pebble
  // flux is a reservoir drained by the SAME Hill-space competition as the gas, its drift gated by the
  // gas density P(t). The seed core (in-situ rock+ice standing-wave allocation) sets each sink's
  // starting Hill reach and its onset (formation_time); the runaway (capture → bigger Hill → more
  // capture) and forming-first advantage let the inner cores gobble the flux before the outer ones
  // switch on (pebble isolation). The leftover (gas-exhausted) flux freezes out as the KBO budget.
  // Sinks = cores at ALL radii. The inward pebble flux is captured by whatever core it drifts past; the
  // snow line gates only ICE RETENTION, not capture — inside it the icy pebble's ice sublimates and only
  // its refractory ROCK is retained (the peb_rock/peb_water split below keeps rock, drops the water for
  // a non-retainer), but the core still grows. (Was BEYOND-snow-line only — the "sublimates ⇒ no solid
  // capture" reasoning was wrong; it starved every inside-snow-line core of all pebble, e.g. ups And's
  // c/d, which then never reached the runaway gas threshold. The gas inner edge R_inner — no gas ⇒ no
  // drift — is the real inner cutoff, applied in pebble_competition, not the snow line.)
  const seeds: { n: number; r: number; seed: number }[] = [];
  for (const s of slot_data) {
    const r = fit_r(s);
    seeds.push({ n: s.slot_n, r, seed: rock_allocation(r, M_star, spin, f_disc, omega)
                                       + ice_allocation(r, M_star, spin, f_disc, omega) });
  }
  const R_disc_peb = R_disc_local > 0 ? R_disc_local : disc_radius(M_star, spin, omega, f_disc);
  const peb_result = (!inverted && pebble_total > 0)
    ? pebble_competition(seeds, pebble_total, M_star, R_disc_peb, f_disc, omega)
    : { cap: {} as Record<number, number>, residual: pebble_total };
  const pebble: Record<number, number> = {};
  for (const s of slot_data) pebble[s.slot_n] = peb_result.cap[s.slot_n] || 0;
  const pebble_residual_to_kbo = peb_result.residual;   // gas-exhausted leftover → KBO budget (TODO wire)

  // AVAILABILITY CAP — mass = min(accretion potential, availability). The AAF
  // (rock+ice) is the local accretion POTENTIAL; the standing wave concentrates
  // only so much MATERIAL at each slot (availability = the disc-solid budget
  // shared out by waveform amplitude). An accreted core can't exceed the
  // material present, so core = min(potential, availability). This caps the
  // over-predicted outer cores (Uranus' AAF solid ~18.8 → ~11.9), opening the
  // room the H/He envelope then fills, while potential-limited slots (the
  // terrestrials) are untouched (min = potential). NORMAL accretors only:
  // fragments (collapse, unbounded) and the inverted factory bypass the cap.
  const avail_amp = (rr: number): number =>
    Math.pow(Math.min(rr, R_disc_local) / Math.max(R_disc_local, 1e-9),
             rr > snow_line(M_star, f_disc) ? INV_ICE_DESCENT : INV_ROCK_DESCENT);
  let avail_sumA = 0;
  for (const s of slot_data) if (fit_r(s) > 0) avail_sumA += avail_amp(fit_r(s));
  // The cap is on the DIRECT (in-situ) disc accretion only — the local material the standing wave
  // concentrates. The pebble flux is gravitationally captured drift, NOT limited by this budget, so
  // it is added AFTER the cap (uncapped) in the slot loop.
  const disc_solid_budget = f_disc * m_star_earth(M_star) * COMP_Z;
  const cap_active = !inverted && !COMP_FRAGMENTING && R_disc_local > 0 && avail_sumA > 0;
  const availability_of = (rr: number): number =>
    cap_active ? disc_solid_budget * avail_amp(rr) / avail_sumA : Infinity;

  // First pass: identify migrants for MISSING-slot attribution.
  // Nearest checks run over all candidate sites (rungs + interstitials).
  const migrants: string[] = [];
  for (const s of slot_data) {
    if (!s.filled) continue;
    const p = planet_by_slot[s.slot_n];
    if (nearest_site_n(p.r) !== s.slot_n) migrants.push(p.name);
  }

  const results: FitSlot[] = [];
  for (const s of slot_data) {
    const n = s.slot_n;
    const r = fit_r(s);
    let rock = rock_allocation(r, M_star, spin, f_disc, omega);
    let ice = ice_allocation(r, M_star, spin, f_disc, omega);
    // PEBBLE BONUS, folded into rock + ICE at f_rock:1−f_rock. The pebble flux drifts in AFTER accretion
    // is over and the disc has COOLED — there is no longer a snow line, so the icy pebbles do NOT
    // sublimate: each delivers its full rock AND ice to whatever core it reaches, at any radius. (The
    // earlier gate dropped the pebble water inside a Type-II/snow-line boundary on a sublimation/magma-
    // ocean-escape argument — but that is an accretion-EPOCH effect, over by the time pebbles arrive;
    // and Sol's dry terrestrials get no pebble anyway (R_inner) — their water is Theia-delivered.)
    const peb_rock = COMP_F_ROCK * pebble[n];
    const peb_water = (1 - COMP_F_ROCK) * pebble[n];
    // POTENTIAL core (uncapped — the accretion the body actually did; the gas clock reads this, NOT
    // the availability-capped solid): direct + the FULL captured pebble (rock + ice).
    const potential_core = rock + ice + peb_rock + peb_water;
    // AVAILABILITY CAP applies ONLY to the DIRECT (in-situ) disc accretion — the local material the
    // standing wave concentrates. The pebble flux is gravitationally captured drift, NOT limited by
    // the local disc-solid budget, so it is added AFTER the cap, uncapped.
    const availability = availability_of(r);
    const direct = rock + ice;
    if (direct > availability && direct > 0) {
      const cap_k = availability / direct;
      rock *= cap_k; ice *= cap_k;
    }
    // SEED core = the in-situ accretion-halo core (rock+ice, capped, PRE-pebble). This is when the
    // accretion halo creates the planet, so it sets t_form — the pebble flux drifts in AFTER and adds
    // mass but does NOT lengthen the formation clock (pebbles don't delay the planet's existence).
    const seed_core = rock + ice;
    rock += peb_rock;
    ice += peb_water;   // pebbles arrive post-accretion (disc cooled, no snow line) ⇒ ice delivered, not sublimated
    let peb = 0;
    let core = rock + ice + peb;
    const in_void = false;
    const observed = s.filled ? s.observed : 0;
    // Inverted bodies CAN become gas giants too — if the aggregate core
    // reaches the gas threshold and an envelope is available (an inverted hot
    // Jupiter). So no special suppression: gas-eligible on core mass alone.
    const gas_eligible = (potential_core > gas_threshold_mass(r, M_star, f_disc));
    // Strip detection: FORWARD — always the PREDICTED core mass and PREDICTED slot position.
    // (Filled slots previously used the observed mass/orbit as the escape gate, which let an
    // observed planet rewrite its own predicted composition; that is the leak we're closing.)
    const mass_for_strip_gate = core;
    const strip_r = r;
    let stripped = is_stripped({ r: strip_r, observed: mass_for_strip_gate }, M_star);

    let t_form: number, h_he: number, total: number;
    if (!gas_eligible) {
      // Sub-threshold rocky: total = core, t_form from cascade (potential core).
      t_form = formation_time(r, seed_core, M_star, f_disc);
      h_he = 0;
      total = core;
    } else {
      // FORWARD, observed-INDEPENDENT (no t_form bisection): the formation clock runs on the
      // potential core (full accretion time) and the envelope captures over the DERIVED window, so
      // the H/He mass is PREDICTED from (r, core, M, λ, f_disc) alone — it is NEVER tuned to the
      // observed mass. Observed planets are matched to slots for SCORING only; they cannot move a
      // predicted value. (Impact reconstruction on the observed outer giants lives in the
      // impactors forensics — the one allowed observed-dependent exception.)
      t_form = formation_time(r, direct, M_star, f_disc);
      h_he = hydrogen_capture(potential_core, t_form, spin, r, M_star, f_disc, omega);
      total = core + h_he;
    }

    // Snapshot PRIMORDIAL composition (with cascade-default t_form, no
    // bisection, no stripping) — used by classifier for diagnostic tags.
    const t_form_p = formation_time(r, direct, M_star, f_disc);
    const h_he_p = gas_eligible
      ? hydrogen_capture(potential_core, t_form_p, spin, r, M_star, f_disc, omega) : 0;
    const primordial: Composition = {
      rock, ice, pebble: peb, h_he: h_he_p,
      core, total: core + h_he_p,
    };

    // Apply mantle stripping: small rocky planets inside the strip zone
    // lose envelope, ice, and mantle down to the iron-core floor.
    if (stripped) {
      const [rk2, ic2, pb2, hh2] = apply_mantle_stripping(
        rock, ice, peb, h_he, strip_r, M_star);
      rock = rk2; ice = ic2; peb = pb2; h_he = hh2;
      core = rock + ice + peb;
      total = core + h_he;
    }
    // MAGNETIC SANDBLASTING (inner Alfvén-dam reconnection bombardment): the innermost rocky
    // survivor in the bombardment zone (r < 2·R_A) loses ~70% of its mantle even when too cool to
    // vaporize bolometrically — Mercury's iron-rich core. r<2·R_A spares compact-disc inner planets
    // (Kepler-90 b at 2.4 R_A). Normal regime only (the inverted factory has no inner Alfvén dam).
    if (!stripped && !inverted) {
      const mstrip = magnetic_strip_fraction(strip_r, R_A_now);
      if (mstrip > 0 && (rock + peb) > 0) {
        const [rk3, ic3, pb3, hh3] = strip_mantle_by(rock, ice, peb, h_he, mstrip);
        rock = rk3; ice = ic3; peb = pb3; h_he = hh3;
        core = rock + ice + peb;
        total = core + h_he;
        stripped = true;   // a magnetically-sandblasted iron core ⇒ "core remnant" classification
      }
    }

    const err_pct = observed > 0 ? ((total - observed) / observed * 100) : 0;
    const implied_dM = (s.filled && observed > 0) ? (observed - total) : 0;

    // Migration detection for classifier
    let migrated_flag = false;
    let r_used_class = s.slot_r;
    if (s.filled) {
      const p = planet_by_slot[n];
      r_used_class = p.r;
      // Outward migrant beyond R_disc: planet observed outside the cascade.
      if (R_disc_local > 0 && p.r > R_disc_local * 1.2) {
        migrated_flag = true;
      } else {
        migrated_flag = (nearest_site_n(p.r) !== n);
      }
    }
    const r_snow_now = snow_line(M_star, f_disc);
    const interpretation = classify_slot(
      {
        filled: s.filled, slot_r: s.slot_r, r_used: r_used_class,
        observed, stripped, predicted: total,
        rock, ice, pebble: peb, h_he,
      },
      primordial, r_snow_now, migrated_flag, migrants);

    const credit_applied = (opts.devour_credit && s.filled
      && opts.devour_credit[s.name]) || 0;
    results.push({
      devoured_credit: credit_applied || undefined,
      slot_n: n, slot_r: s.slot_r, r_used: r,
      observed_r: (s.filled && planet_by_slot[n]) ? planet_by_slot[n].r : s.slot_r,
      filled: s.filled, name: s.name,
      interstitial: s.interstitial,
      rock, ice, pebble: peb, core, potential_core, t_form, h_he,
      predicted: total, observed, err_pct, implied_dM, stripped,
      in_void, primordial, interpretation,
    });
  }

  // POST-FORMATION stage (apply_post_formation): scatter + devour + void-remnant. A
  // distinct stage from the fit; rewrites the final slot set in place. DEFERRED when the
  // caller (budgetFit) will run gas conservation first — so scatter reads final masses,
  // not the pre-cap phantom envelopes. Otherwise (bestFit/bruteFit) it runs inline now.
  const run_post_formation = () =>
    apply_post_formation(results, M_star, R_A_now, planet_by_slot, void_bodies, nearest_site_n,
                         core_bodies.filter(p => !!p.fragment && (p.observed || 0) < M_STELLAR_BOUNDARY && p.r > 0));
  if (!opts.defer_post_formation) run_post_formation();

  // CORE COMPONENTS (catalog-flagged): central fragments / co-primaries, NOT
  // slot products. Reported alongside the predicted main star as the system's
  // core, whose summed mass drives the dams + barycentre. predicted := observed.
  for (const p of core_bodies) {
    const m_obs = p.observed || 0;
    const lam_break = breakup_spin(M_star);
    const is_frag = !!p.fragment && m_obs < M_STELLAR_BOUNDARY;   // sub-stellar (planetary) fragment
    // The fragment's local clearing zone (Hill + Wisdom-1980 resonance-overlap chaos),
    // exposed for the chart's exclusion span. Only for sub-stellar fragments. Matches the
    // slot-filtering zone above: forward mass (fragment_overflow_mass), one-sided interior clear.
    const cz = is_frag ? fragment_clear_zone(p.r, fragment_overflow_mass(M_star, spin), M_star, true) : null;
    // PREDICTED low-spin fragment: its MASS is the centrifugal Hill-overflow K·β·budget
    // (fragment_overflow_mass), and its formation POSITION is the close-fission separation a_bin —
    // BOTH derived forward from λ + budget, not copied from the observed body. (External ⇒ outside
    // the residual target, so this is a pure diagnostic: predicted vs observed mass/position.)
    const frag_pred = is_frag ? fragment_overflow_mass(M_star, spin) : m_obs;
    // PLACEMENT depends on how hot the core ran. DEEP fission (T_core ≫ boiling, low spin) parks the
    // lump close-in at a_bin. THRESHOLD-EDGE fission (T_core just above silica boiling, spin near the
    // threshold — 47 UMa) flings it FAR OUT, by the same centrifugal stretch that enlarges it, to the
    // log-midpoint √(a_bin·R_c) between the close fission scale and the centrifugal dam. Both forward.
    let frag_pos = close_binary_separation(spin, M_star);
    if (is_frag && COMP_MDOT > 0
        && core_accretion_temperature(M_star, spin, COMP_MDOT) < 2.0 * T_SILICA_BOIL
        && core_accretion_temperature(M_star, spin, COMP_MDOT) > T_SILICA_BOIL) {
      frag_pos = Math.sqrt(frag_pos * centrifugal_radius(M_star, spin));
    }
    const frag_abin = is_frag ? frag_pos : p.r;
    const frag_err = (is_frag && frag_pred > 0) ? (m_obs - frag_pred) / frag_pred * 100 : 0;
    results.push({
      slot_n: -1, slot_r: p.r, r_used: p.r,
      filled: true, name: p.name,
      // The fragment is gas-dominated (it qualified via mo > gas_threshold_mass) and interior to the
      // snow line (no ice condenses), so its mass IS its H/He envelope. h_he carries the OBSERVED gas
      // (the marker the chart sizes/colours), while `predicted` carries the forward overflow mass and
      // `primordial` the predicted composition — so the gas-giant colour/tooltip and the predicted-vs-
      // observed delta are both correct from the single source. A stellar co-primary keeps 0.
      rock: 0, ice: 0, pebble: 0, core: 0, t_form: 0, h_he: is_frag ? m_obs : 0,
      predicted: is_frag ? frag_pred : m_obs, observed: m_obs, err_pct: frag_err, implied_dM: 0,
      stripped: false, in_void: true, external: true, core_component: true,
      core_fragment: is_frag,
      clear_r: cz ? cz.r_clear : undefined,
      clear_lo: cz ? Math.max(0, cz.lo) : undefined,
      clear_hi: cz ? cz.hi : undefined,
      primordial: { rock: 0, ice: 0, pebble: 0, h_he: is_frag ? frag_pred : 0, core: 0, total: is_frag ? frag_pred : m_obs },
      interpretation: is_frag
        ? `sub-stellar core fragment: predicted ${frag_pred.toFixed(0)} M⊕ (centrifugal Hill-overflow K·β·budget, β = BETA_SOL·λ²) forming at a_bin ≈ ${frag_abin.toFixed(3)} AU; observed ${m_obs.toFixed(0)} M⊕ at ${p.r} AU (${frag_err >= 0 ? '+' : ''}${frag_err.toFixed(0)}%). A low-spin (λ=${spin.toFixed(2)}) accretion-pressure overflow lump: accretion heat vaporises rock and builds outward pressure, but low spin can't spread it into the disc, so the would-be-stellar share overflows the core's Hill radius and breaks off as a hot Jupiter. Clears its local Hill+resonance zone ±${cz!.r_clear.toFixed(3)} AU (R_Hill ${cz!.r_hill.toFixed(4)}, R_sweep ${cz!.r_sweep.toFixed(4)}) of cascade slots.`
        : `core component (co-primary): ${(m_obs / 332946).toFixed(3)} M☉ at ${p.r} AU — a rotational-fragmentation sibling star (λ_break ≈ ${lam_break.toFixed(1)}), not a slot product. With the predicted main star, both masses drive the wind/field dams and the barycentre the products orbit.`,
    });
  }

  // KBO-class population (the Kuiper mechanism): a distinct entity
  // with independent inputs. The exterior carries structure in TIME,
  // not space (the 6,034-TNO census test rejected the exterior
  // ladder): products mint continuously at the retreating dam's outer
  // face, and SIZE IS THE CLOCK — the product-mass law m ∝ Σ_dam² ∝
  // R⁻⁴ inverts each body's mass to its minting stance (the original
  // AU) and the dam's retreat chronology dates it (FACTORY VINTAGE):
  //   gear 1: parked at R_disc through the gas era (t_disc)
  //   gear 2: the firehose sweep, R_disc → 1.6 R_disc over ~3 Myr
  //   gear 3: the long retreat, R ∝ t^0.138 (Sol: heliopause 120 AU
  //           at 4,570 Myr)
  // slot_r carries the BIRTH STANCE, so r_form / Δr display formation
  // position and displacement exactly as for interior rows.
  if (kbo_bodies.length > 0) {
    const R_dam = R_disc_local > 0 ? R_disc_local
      : disc_radius(M_star, spin as number, omega, f_disc);
    // KBO/exterior products are minted from the OUTER zone. The branch is keyed
    // to the MASS-based inversion (is_inverted_budget — feeble M-dwarf wind), not
    // the geometric R_A≥R_disc: an inverted system's outer zone is a depleted
    // phase-3 nebula (B_neb, concentration-limited), so its products are bounded
    // by that small reservoir. Without this, a compact inverted dam (TRAPPIST-1,
    // R_dam≈0.04 AU) falls into the Sol-anchored size-clock m_at_dam ∝ (Σ/Σ☉)²,
    // which explodes to ~10⁷ M⊕ — far past the entire budget. Sol/normal systems
    // (is_inverted_budget false) keep the Sol-calibrated size-clock.
    if (inverted || is_inverted_budget(M_star)) {
      // INVERTED PHASE-3 NEBULA products (exterior, KBO-class). UNIFIED
      // minting: every body — interior planet, factory product, exterior KBO —
      // is allocated rock/ice/pebble, runs gas capture + mantle stripping, and
      // is classified by the SAME machinery (no predicted:=observed shortcut,
      // no zero composition). The Davis Dam has marched past R_A into the
      // Alfvén-repelled nebula; the ice allocation's PHASE-3 branch gives these
      // a real ICE composition and a PREDICTED mass. (Memory: inverted-regime-model.)
      const r_snow_k = snow_line(M_star, f_disc);   // pile-up density-gradient snow line (parked)
      // VINTAGE: the Davis Dam marches OUTWARD through the pile over the disc lifetime, minting
      // each product in turn — so each body's formation epoch is the disc dispersal time × the
      // fraction of the (factory) solid budget already swept up inward of it. Inner bodies are
      // the early vintage, outer the late. The mass itself is factory_product (one factory).
      const disp_t = gas_consumption_time(M_star, f_disc);
      const sorted_in = [...kbo_bodies].sort((a, b) => a.r - b.r);
      const fp_solid: Record<string, number> = {};
      for (const p of sorted_in) {
        const fp = factory_product(p.r, M_star, omega, f_disc);
        fp_solid[p.name] = fp.rock + fp.ice;
      }
      const total_solid = sorted_in.reduce((s, p) => s + fp_solid[p.name], 0) || 1;
      const vintage: Record<string, number> = {};
      let cum_solid = 0;
      for (const p of sorted_in) {
        cum_solid += fp_solid[p.name];
        vintage[p.name] = disp_t * cum_solid / total_solid;
      }
      for (const p of kbo_bodies) {
        const rr = p.r, observed = p.observed || 0;
        // ONE FACTORY everywhere (no special cases): the shared isolation-mass product. Rock seeds
        // every body; ice mantles it past the snow line. Inverted planets, exterior KBOs and outer
        // moons all mint through the same factory_product.
        const iso = factory_product(p.r, M_star, omega, f_disc);
        let rock = iso.rock;
        let ice = iso.ice;
        let peb = 0;
        let core = rock + ice + peb;
        const t_form = vintage[p.name];   // marching-dam formation epoch
        let h_he = (core > gas_threshold_mass(rr, M_star, f_disc))
          ? hydrogen_capture(core, t_form, spin, rr, M_star, f_disc, omega) : 0;
        let total = core + h_he;
        const primordial: Composition = { rock, ice, pebble: peb, h_he, core, total };
        const stripped = is_stripped({ r: rr, observed }, M_star);
        if (stripped) {
          const [rk, ic, pb, hh] = apply_mantle_stripping(rock, ice, peb, h_he, rr, M_star);
          rock = rk; ice = ic; peb = pb; h_he = hh; core = rock + ice + peb; total = core + h_he;
        }
        const comp = classify_slot(
          { filled: true, slot_r: rr, r_used: rr, observed, stripped,
            predicted: total, rock, ice, pebble: peb, h_he },
          primordial, r_snow_k, false, migrants);
        results.push({
          slot_n: -Math.max(0.01, Math.log(rr / Math.max(R_dam, 1e-6)) / Math.log(1 / CASCADE_RATIO)),
          slot_r: rr, r_used: rr, filled: true, name: p.name,
          rock, ice, pebble: peb, core, t_form, h_he,
          predicted: total, observed,
          err_pct: observed > 0 ? (total - observed) / observed * 100 : 0,
          implied_dM: observed > 0 ? observed - total : 0,
          stripped, in_void: false, exterior: true, primordial,
          interpretation: `phase-3 nebula product (inverted, ${comp})`,
        });
      }
    } else {
    // product-mass law, Sol-anchored at the dam face
    const SIGMA_SOL = 0.0103830 * m_star_earth(1.0) / Math.pow(30.07, 2);
    // anchor = TRITON, the firstborn: captured by the dam-keeper at
    // the gate, it is the true at-dam product (zero displacement).
    // Pluto and Eris are lighter -> minted slightly farther out.
    const M_EXT_SOL = 0.00359;
    const sigma_dam = f_disc * m_star_earth(M_star) / (R_dam * R_dam);
    const m_at_dam = M_EXT_SOL * Math.pow(sigma_dam / SIGMA_SOL, 2);
    const t_disc_myr = gas_consumption_time(M_star, f_disc);
    const R_cliff = 1.6 * R_dam, BETA = 0.138;
    // assembly-line order: earliest vintage first (bigger product =
    // denser supply = earlier; onset ties resolve by mass descending)
    kbo_bodies.sort((a, b) => (b.observed || 0) - (a.observed || 0));
    // The firstborn is the dam-EDGE streaming-instability seed M_G (the OUTER-zone branch, just
    // beyond the dam — Sol's is ≈ Triton), NOT the inter-dam oligarchic isolation mass (that gave
    // 0.7-M⊕ phantoms). The size DECLINE is the Davis Dam MARCHING OUT as the nebula depletes — the
    // nebula mass holds the dam in (disc_radius: R_disc ∝ M_nebula^−½ ⇒ M_nebula ∝ R⁻²), so by the
    // time the dam reaches R_birth the local Σ ∝ M_nebula/area ∝ R⁻³ and the seed M_G ∝ Σ³/Ω⁴ ∝ R⁻³.
    // ⇒ M_k = seed·(R_dam/R_birth)³. No fudge coupling: the decline IS the dam march (the increasing AU).
    const seed_fp = factory_product(R_dam * 1.0002, M_star, omega, f_disc);
    for (const p of kbo_bodies) {
      const m_obs_k = p.observed || 0;
      const onset = m_obs_k >= m_at_dam * 0.999;
      // INVERT the dam-march size-clock M = m_at_dam·(R_dam/R_birth)³ (homogeneous outer factory,
      // M ∝ R⁻³) ⇒ R_birth = R_dam·(m_at_dam/M)^(1/3). Mass alone fixes the vintage and original AU
      // (^(1/3) matches the cube march below, so predicted := observed exactly). [was ^0.25, which
      // didn't invert the cube and left a spurious mass residual.]
      const R_birth = onset ? R_dam
        : R_dam * Math.pow(m_at_dam / m_obs_k, 1.0 / 3.0);
      // Davis-dam march depletion: seed × (R_dam/R_birth)³ (the nebula that left to move the dam out).
      const march = Math.pow(R_dam / Math.max(R_birth, R_dam), 3);
      const fp_k = { rock: seed_fp.rock * march, ice: seed_fp.ice * march, total: seed_fp.total * march };
      // NUMERIC vintage (Myr) → carried in t_form so the slot column shows it (like
      // the inverted factory products).
      let t_vintage: number;
      if (onset) { t_vintage = t_disc_myr; }
      else if (R_birth <= R_cliff) { t_vintage = t_disc_myr + 3 * (R_birth - R_dam) / (0.6 * R_dam); }
      else { t_vintage = (t_disc_myr + 3) * Math.pow(R_birth / R_cliff, 1 / BETA); }
      const disp = (p.r - R_birth) / R_birth;
      let where: string;
      if (p.captured !== undefined) {
        const captor = results.find(s =>
          s.filled && !s.exterior && !s.external && s.slot_n === p.captured);
        where = `CAPTURED by ${captor ? captor.name : 'slot ' + p.captured}`
          + (Math.abs(disp) < 0.15 ? ' at the gate (co-orbital, zero displacement)' : '');
      } else {
        where = Math.abs(disp) < 0.15 ? 'in situ at its stance'
          : disp > 0 ? 'displaced outward (combed/scattered)'
          : 'displaced inward (rained back / captured)';
      }
      // THE SIZE-CLOCK IS THE MAPPING: observed mass IS the vintage.
      // Current AU is post-history and carries no assignment weight —
      // a KBO is judged by what the factory minted, never by where it
      // has drifted since. predicted := observed (exact by inversion);
      // the falsifiable content is the vintage chronology itself, the
      // census counts, and the undiscovered-cohort rows.
      const core_k = fp_k.rock + fp_k.ice;
      results.push({
        slot_n: -Math.max(0.01, Math.log(R_birth / R_dam) / Math.log(1 / CASCADE_RATIO)),
        slot_r: R_birth, r_used: p.r,
        filled: true, name: p.name,
        rock: fp_k.rock, ice: fp_k.ice, pebble: 0, core: core_k,
        t_form: t_vintage, h_he: 0,
        predicted: core_k, observed: m_obs_k,
        err_pct: m_obs_k > 0 ? (core_k - m_obs_k) / m_obs_k * 100 : 0,
        implied_dM: m_obs_k > 0 ? m_obs_k - core_k : 0,
        stripped: false, in_void: false, exterior: true,
        primordial: { rock: fp_k.rock, ice: fp_k.ice, pebble: 0, h_he: 0, core: core_k,
                      total: core_k },
        interpretation: `factory product — streaming-instability seed predicted ${core_k < 0.01 ? (core_k * 1000).toPrecision(3) + ' mE' : core_k.toFixed(2) + ' M⊕'}; size-clock birth stance ${R_birth.toFixed(1)} AU; ${where}`,
      });
    }
    // PER-VINTAGE COUNT AUDIT: the census law (stance stock / product
    // mass) gives the expected member count of each represented
    // vintage bin; catalogued members within the x2.5 mass mapping
    // fill it. A shortfall is a SIBLING DEFICIT — same vintage, more
    // members predicted, hiding where the survival law says survivors
    // hide (scattered: high inclination, far from perihelion).
    // Census stock = the conserved KBO budget ε_SI·S_outer (the 1% the SI retains from the outer
    // solids). This is the FULL population, not the detected belt: we catalogue only the bright,
    // nearby tip (~0.013 M⊕ for Sol — Triton/Pluto/Eris…); the rest (~99.8%) is UNDETECTED, in
    // distant scattered/detached/inner-Oort orbits at hundreds of AU where surveys are blind. The
    // census deficit IS that prediction. Fallback (sub-cascade, no parked budget): the legacy anchor.
    const C_STOCK = 5.1e-6;
    const stock = COMP_KBO_BUDGET >= 0 ? COMP_KBO_BUDGET : C_STOCK * f_disc * m_star_earth(M_star);
    {
      const binned = new Set<Planet>();
      for (const p of kbo_bodies) {
        if (binned.has(p)) continue;
        const members = kbo_bodies.filter(pp =>
          Math.abs(Math.log((pp.observed || 1e-12) / (p.observed || 1e-12)))
            < Math.log(2.5));
        members.forEach(pp => binned.add(pp));
        const N_exp = Math.max(1, Math.round(stock / (p.observed || 1e-12)));
        const deficit = N_exp - members.length;
        if (deficit > 0) {
          const row = results.find(s => s.exterior && s.name === p.name);
          if (row) {
            // search range: scattered-class siblings ride Eris/Sedna-
            // grade orbits — semi-major axis from the birth stance out
            // to ~9x it, perihelion pinned outside the dam
            const a_lo = row.slot_r, a_hi = 9 * row.slot_r;
            row.interpretation += ` — VINTAGE BIN AUDIT: ~${N_exp} expected at this grade, ${members.length} catalogued: ${deficit} sibling${deficit > 1 ? 's' : ''} predicted undiscovered (scattered-class: high inclination, far from perihelion; search a ≈ ${a_lo.toFixed(0)}-${a_hi.toFixed(0)} AU, q ≳ ${R_dam.toFixed(0)} AU)`;
          }
        }
      }
    }
    // WORTH-MENTIONING cutoff: 0.05 mE (~660 km at icy density —
    // Ceres-class and up; Vesta borderline). Cohorts below it are
    // grindings, not predictions worth a row.
    const MENTION_CUTOFF = 5e-5;
    let t_epoch = (t_disc_myr + 3) * 4;
    for (let k = 0; k < 5 && t_epoch < 6000; k++, t_epoch *= 4) {
      const R_t = R_cliff * Math.pow(t_epoch / (t_disc_myr + 3), BETA);
      const m_t = m_at_dam * Math.pow(R_dam / R_t, 4);
      if (m_t < MENTION_CUTOFF) continue;
      const matched = kbo_bodies.some(pp =>
        Math.abs(Math.log((pp.observed || 1e-12) / m_t)) < Math.log(2.5));
      if (matched) continue;
      const N = Math.max(1, Math.round(stock / m_t));
      results.push({
        slot_n: -Math.log(R_t / R_dam) / Math.log(1 / CASCADE_RATIO),
        slot_r: R_t, r_used: R_t,
        filled: false, name: `(vintage ~${t_epoch.toFixed(0)} Myr)`,
        rock: 0, ice: 0, pebble: 0, core: 0,
        t_form: 0, h_he: 0,
        predicted: m_t, observed: 0,
        err_pct: 0, implied_dM: 0,
        stripped: false, in_void: false, exterior: true,
        primordial: { rock: 0, ice: 0, pebble: 0, h_he: 0, core: 0,
                      total: m_t },
        interpretation: `PREDICTED cohort, undiscovered: ~${m_t < 0.01 ? (m_t * 1000).toPrecision(3) + ' mE' : m_t.toFixed(1) + ' M⊕'} products minted ~${t_epoch.toFixed(0)} Myr at ${R_t.toFixed(1)} AU; N~${N} expected at this stance, none catalogued`,
      });
    }
    }   // end normal-regime size-clock (else of the inverted branch)
  }

  // Append external (stellar) bodies as informational entries — bound
  // but not products of the primary's protoplanetary disc.
  for (const p of external_bodies) {
    results.push({
      slot_n: -1, slot_r: p.r, r_used: p.r,
      filled: true, name: p.name,
      rock: 0, ice: 0, pebble: 0, core: 0,
      t_form: 0, h_he: 0,
      predicted: p.observed || 0, observed: p.observed || 0,
      err_pct: 0, implied_dM: 0,
      stripped: false, in_void: false, external: true,
      primordial: { rock: 0, ice: 0, pebble: 0, h_he: 0, core: 0, total: p.observed || 0 },
      interpretation: (p.observed || 0) >= M_STELLAR_BOUNDARY
        ? "stellar companion (bound, not formed in disc)"
        : "external body",
    });
  }

  // Gravity-purge detection: brown dwarfs and stellar-class bodies
  // clear their inner slots. Compare by r rather than slot_n since
  // external bodies have slot_n=-1.
  const purgers = results.filter(s => s.filled
    && (s.interpretation.includes("brown dwarf")
        || s.interpretation.includes("-class star")));
  for (const victim of results) {
    if (victim.filled) continue;
    for (const purger of purgers) {
      if (purger.slot_r <= victim.slot_r) continue;
      const old = victim.interpretation;
      const base = old.includes("(destroyed by")
        ? old.split(" (destroyed by")[0] : old;
      victim.interpretation = `${base} (purged by ${purger.name})`;
      break;
    }
  }

  // Protostellar consumption: during the disc era the star sits on its
  // Hayashi track, bloated far beyond its main-sequence radius ---
  //   R_HT(t) ≈ 2.3 R☉ · (M/M☉)^(2/3) · (t/Myr)^(-1/3)
  // (near-constant T_eff contraction, calibrated to the Sun's ~2.3 R☉
  // at 1 Myr; clock floored at 0.5 Myr, roughly the birthline). The
  // inverted regime's ladder, projected inward from the dam with
  // scale-free geometry, can place slots INSIDE this photosphere ---
  // their allocation is real but its destination is the star. Such
  // slots are consumed, not lost: the strongest interpretation,
  // applied after all dynamical detectors. A FILLED slot inside the
  // protostellar radius is a contradiction for in-situ formation; the
  // occupant must be a later arrival (cf. GJ 367b-class USP planets).
  const R_SUN_AU = 0.00465;
  const hayashi_radius = (t_myr: number) =>
    2.3 * R_SUN_AU * Math.pow(M_star * M_PRIM_TO_MSUN, 2 / 3)
    * Math.pow(Math.max(t_myr, 0.5), -1 / 3);
  // Terminology and physics switch by PRIMARY CLASS, decided by mass:
  // below the hydrogen-burning threshold the primary is a planet, not
  // a protostar — it has no Hayashi track, and slots beneath its
  // physical surface are FALLBACK, debris pulled back into the
  // primary trying to reach seats below the ground.
  const SUBSTELLAR_M_PRIM = 0.075 / M_PRIM_TO_MSUN; // H-burning limit
  if (M_star < SUBSTELLAR_M_PRIM) {
    // gas-giant-class primaries are puffier than rocky ones
    const RHO_PRIMARY = (M_star * M_PRIM_TO_MSUN * 332946 * 1.14 > 10)
      ? 1300 : 5500; // kg/m^3
    const Mkg_prim = M_star * M_PRIM_TO_MSUN * 1.989e30;
    const R_prim_AU = Math.pow(3 * Mkg_prim / (4 * Math.PI * RHO_PRIMARY), 1 / 3) / 1.496e11;
    for (const s of results) {
      if (s.external || !s.slot_r || s.slot_r <= 0) continue;
      if (s.slot_r >= R_prim_AU) continue;
      if (!s.filled) {
        const eaten = s.predicted;
        s.predicted = 0;
        s.rock = 0; s.ice = 0; s.pebble = 0; s.core = 0; s.h_he = 0;
        s.interpretation = "fallback: slot lies beneath the primary's"
          + " surface (slot radius " + s.slot_r.toFixed(5)
          + " AU vs primary radius " + R_prim_AU.toFixed(5) + " AU; "
          + (eaten * 1000).toFixed(2) + " mE allocation re-accreted"
          + " by the primary; predicted body mass: zero)";
      } else {
        s.interpretation += " [slot beneath the primary's surface"
          + " — in-situ origin impossible; delivered or migrated]";
      }
    }
  } else
  for (const s of results) {
    if (s.external || !s.slot_r || s.slot_r <= 0) continue;
    const R_HT = hayashi_radius(s.t_form);
    if (s.slot_r >= R_HT) continue;
    if (!s.filled) {
      // The model PREDICTS ZERO PLANET MASS here: the allocation is
      // real, but its destination is the star. Zeroing the prediction
      // also zeroes the slot's missing-planet cost in the brute score
      // — predicting absence where nothing is observed is a success,
      // not a loss.
      const eaten = s.predicted;
      s.predicted = 0;
      s.rock = 0; s.ice = 0; s.pebble = 0; s.core = 0; s.h_he = 0;
      s.interpretation = "consumed by the protostar (slot radius "
        + s.slot_r.toFixed(4) + " AU inside the Hayashi-track photosphere "
        + R_HT.toFixed(4) + " AU at formation; "
        + eaten.toFixed(2) + " M⊕ allocation accreted by the star;"
        + " predicted planet mass: zero)";
    } else {
      s.interpretation += " [slot inside protostellar radius at formation"
        + " — in-situ origin excluded; delivered or late-formed]";
    }
  }

  // Roche-forbidden zone: every primary has a fluid Roche limit,
  //   d = 2.44 · (3 M / 4π ρ_s)^(1/3)
  // (mass-only form — the primary's radius cancels), inside which no
  // body can consolidate. Slot allocations there are real but persist
  // as RINGS and feed material rather than planets/moons: Jupiter's
  // main-ring edge (~1.86 R_J) and Saturn's A-ring edge (~2.2 R_S)
  // sit at their primaries' fluid Roche limits — the forbidden slots'
  // allocations, visible. For stars the Hayashi photosphere normally
  // swallows this zone (consumption is checked first and wins); the
  // Roche parameter bites when the primary is compact during
  // formation: gas giants and impact discs, where
  // Luna's slots 2+ fall inside Earth's 2.9 R⊕ limit. ρ_s = rock
  // (3000 kg/m³); satellites of ice-zone primaries are dirtier but
  // the cube root forgives.
  const RHO_SAT = 3000; // kg/m^3
  const M_kg = M_star * M_PRIM_TO_MSUN * 1.989e30;
  const d_roche_AU = 2.44
    * Math.pow(3 * M_kg / (4 * Math.PI * RHO_SAT), 1 / 3) / 1.496e11;
  for (const s of results) {
    if (s.external || s.exterior || !s.slot_r || s.slot_r <= 0) continue;
    if (s.slot_r >= d_roche_AU) continue;
    if (s.predicted <= 0 && !s.filled) continue; // already consumed
    if (!s.filled) {
      const shredded = s.predicted;
      s.predicted = 0;
      s.rock = 0; s.ice = 0; s.pebble = 0; s.core = 0; s.h_he = 0;
      s.interpretation = "Roche-forbidden (slot radius "
        + s.slot_r.toFixed(5) + " AU inside the primary's fluid Roche"
        + " limit " + d_roche_AU.toFixed(5) + " AU; "
        + (shredded * 1000).toFixed(2) + " mE allocation cannot"
        + " consolidate — persists as ring/feed material;"
        + " predicted body mass: zero)";
    } else {
      s.interpretation += " [inside the fluid Roche limit ("
        + d_roche_AU.toFixed(5) + " AU) — rigid-body survivor,"
        + " ring shepherd, or later arrival]";
    }
  }

  // DESTROYED slots: an unfilled INTERIOR cascade slot — a planet the chain predicted, with
  // nothing observed there, inside the outermost surviving planet — did not survive (merged,
  // scattered, or consumed). It is "destroyed", not merely "unobserved" (the exterior /
  // undiscovered cohort is handled in budgetFit, never reaches here). Cause-specific detectors
  // above (scatter / devour / merger) have already set their own flags + narrative; this only
  // catches the residual gaps still labelled "(not observed)".
  const max_obs_r = results.reduce((m, s) =>
    (s.filled && !s.external && !s.exterior && s.r_used > m) ? s.r_used : m, 0);
  for (const s of results) {
    if (s.filled || s.external || s.exterior || s.core_component) continue;
    if (!(s.slot_r > 0) || s.slot_r >= max_obs_r) continue;
    s.destroyed = true;
    if (/\(not observed\)$/.test(s.interpretation)) {
      s.interpretation = s.interpretation.replace(/\(not observed\)$/,
        '(destroyed — a planet was predicted here but none survived: merged, scattered, or consumed)');
    }
  }

  return {
    slots: results,
    ratio: CASCADE_RATIO,
    R_disc: disc_radius(M_star, spin, omega),
    spin,
    _run_post_formation: run_post_formation,
  };
}

// ============================================================
//  bestFit — the calibration entry point shared by UI and CLI.
//  One pass = anchor search (spin) followed by f_disc bisection
//  (driving sum(predicted - observed) → 0 over all filled slots).
//  Iterated to a fixed point so spin and f_disc are mutually consistent.
// ============================================================
function bestFit(planets: Planet[], M_star: number, f_disc_initial: number,
                 max_outer_iterations?: number): BestFitResult {
  let f_disc = f_disc_initial;
  let spin: number | null = null;
  let anchor_slot = 0;
  let fit: FitResult | null = null;
  let converged = false;
  let iterations = 0;
  let target_residual = 0;
  let target_names: string[] = [];
  const max_outer = max_outer_iterations || 8;

  const sel = (f: FitResult): FitSlot[] =>
    f.slots.filter(s => s.filled && !s.external && !s.remnant && !s.exterior);
  // Objective mass of a slot: formation prediction plus any devour
  // credit (the meals close the books against observed).
  const objMass = (s: FitSlot): number => s.predicted + (s.devoured_credit || 0);

  for (let iter = 0; iter < max_outer; iter++) {
    iterations = iter + 1;
    const ar = auto_spin_with_anchor_search(
      planets.filter(p => !p.kbo), M_star, f_disc);
    const spin_new = ar.spin;
    anchor_slot = ar.anchor_slot;
    fit = slot_aware_fit(planets, M_star, spin_new, f_disc, { auto_compress: false });
    const totalErr = (f: FitResult): number =>
      sel(f).reduce((a, s) => a + (s.predicted - s.observed), 0);
    const totalTarget = sel(fit).reduce((a, s) => a + s.observed, 0);
    let f_new = f_disc;
    if (totalTarget > 0) {
      let lo = 0.0005, hi = F_DISC_MAX;
      // Tolerance: tight enough that the smallest target planet's
      // individual error stays below ~0.1% of ITS observed mass.
      const smallest = sel(fit).reduce((m, s) => Math.min(m, s.observed), Infinity);
      const tol = Math.max(1e-6, 0.001 * smallest);
      for (let i = 0; i < 60; i++) {
        const fm = Math.sqrt(lo * hi);
        const f2 = slot_aware_fit(planets, M_star, spin_new, fm, { auto_compress: false });
        const e = totalErr(f2);
        f_new = fm; fit = f2;
        if (Math.abs(e) < tol) break;
        if (e > 0) hi = fm; else lo = fm;
      }
      target_residual = Math.abs(totalErr(fit)) / totalTarget;
    }
    const conv = spin !== null
      && Math.abs(f_new - f_disc) / Math.max(f_disc, 1e-12) < 1e-3
      && Math.abs(spin_new - spin) / Math.max(spin_new, 1e-12) < 1e-3;
    spin = spin_new;
    f_disc = f_new;
    if (conv) { converged = true; break; }
  }
  target_names = sel(fit!).map(s => s.name);
  return {
    spin: spin!, f_disc, anchor_slot, iterations, converged,
    target_residual, target_names, fit: fit!,
  };
}

// ============================================================
//  bruteFit — exhaustive joint optimization over the discrete anchor
//  family (outermost planet at slot k = 0..11, plus the Stage-2
//  outward-migrant variants), with the EXACT canonical f_disc
//  bisection solved inside each candidate. Joint scanning removes the
//  limit-cycle failure mode of bestFit's alternating loop while
//  preserving the canonical fits bit-for-bit (the same anchor scoring
//  and the same f objective are used — they are simply no longer
//  evaluated against a stale partner value).
//
//  HARD CONSTRAINT from the observed planet count: a valid candidate
//  must provide at least as many cascade slots as observed planets.
//  Slot count depends on spin alone (M_star cancels in
//  C = R_A/R_disc ∝ Ω^(15/14)), so the planet count partitions the
//  spin axis a priori — a slow normal-regime branch and an
//  inverted-regime branch (11 slots), with a forbidden band between.
// ============================================================
interface BruteFitResult extends BestFitResult {
  score: number;
}

// Predict the INVERTED regime from OBSERVABLES alone (no input flag).
// Inverted = dense nebula + feeble wind ⇒ (1) very close-in formation (the
// outermost body sits far inside the D=1 reference dam — the dam was shoved
// in), and (2) a multi-phase assembly line that, fed by the dense nebula,
// mints THREE big products — a big ROCK (phase-1 start, innermost/hot-Jupiter),
// a big ICE (phase-2 start), and a big NEBULA/KBO (phase-3 start, beyond R_A,
// possibly undetected) — each heading a descending sequence, giving the
// "big-small-big-small-big" mass pattern (≥2 local maxima). Sol oscillates
// (Earth/Jupiter/Neptune maxima) but is NOT compact; TRAPPIST is both.
function inverted_signature(planets: Planet[], M_star: number):
    { compact: boolean; maxima: number; likely: boolean } {
  const obs = planets.filter(p => (p.observed || 0) > 0 && !p.kbo)
    .sort((a, b) => a.r - b.r);
  if (obs.length < 3) return { compact: false, maxima: 0, likely: false };
  const compact = obs[obs.length - 1].r < 0.2 * disc_radius(M_star, 1.0);
  // Count local mass maxima INCLUDING endpoints — the phase-start "bigs"
  // (rock / ice / nebula) often sit at the ends (the innermost rock product
  // is the first body). ≥2 ⇒ the big-small-big multi-phase fingerprint.
  let maxima = 0;
  for (let i = 0; i < obs.length; i++) {
    const m = obs[i].observed || 0;
    const lok = (i === 0) || m > (obs[i - 1].observed || 0);
    const rok = (i === obs.length - 1) || m > (obs[i + 1].observed || 0);
    if (lok && rok) maxima++;
  }
  return { compact, maxima, likely: compact && maxima >= 2 };
}

function bruteFit(planets: Planet[], M_star: number,
                  vice?: boolean): BruteFitResult {
  const BIG = 1e6;
  const K_PENALTY = 1.5;
  const STAGE2_PENALTY = 2.0;

  // KBO-class bodies are a distinct population: they never anchor the
  // cascade and never count toward the interior planet census.
  const obs_disc = planets.filter(p => !p.kbo && (p.observed || 0) > 0);
  const n_obs = obs_disc.length;
  const sel = (f: FitResult): FitSlot[] =>
    f.slots.filter(s => s.filled && !s.external && !s.remnant && !s.exterior);
  // Objective mass of a slot: formation prediction plus any devour
  // credit (the meals close the books against observed).
  const objMass = (s: FitSlot): number => s.predicted + (s.devoured_credit || 0);
  const by_name: Record<string, Planet> = {};
  for (const p of planets) by_name[p.name] = p;

  // Canonical f_disc bisection at a fixed spin: drive the target-sum
  // objective sum(predicted - observed) → 0 over all filled slots.
  let devour_credit: Record<string, number> | null = null;
  const fit_opts = (omega?: number): SlotAwareFitOpts => {
    const o: SlotAwareFitOpts = { auto_compress: false };
    if (omega !== undefined) o.omega = omega;
    if (devour_credit) o.devour_credit = devour_credit;
    return o;
  };
  const bisectF = (spin: number, omega?: number):
      { f: number; fit: FitResult; residual: number } => {
    let f = 0.01;
    let fit = slot_aware_fit(planets, M_star, spin, f, fit_opts(omega));
    const totalTarget = sel(fit).reduce((a, s) => a + s.observed, 0);
    if (totalTarget <= 0) return { f, fit, residual: 0 };
    let lo = 0.0005, hi = F_DISC_MAX;
    const smallest = sel(fit).reduce((m, s) => Math.min(m, s.observed), Infinity);
    const tol = Math.max(1e-6, 0.001 * smallest);
    let e = Infinity;
    for (let i = 0; i < 60; i++) {
      const fm = Math.sqrt(lo * hi);
      const f2 = slot_aware_fit(planets, M_star, spin, fm, fit_opts(omega));
      e = sel(f2).reduce((a, s) => a + (objMass(s) - s.observed), 0);
      f = fm; fit = f2;
      if (Math.abs(e) < tol) break;
      if (e > 0) hi = fm; else lo = fm;
    }
    return { f, fit, residual: Math.abs(e) / totalTarget };
  };

  // Anchor-family score of a fitted candidate (canonical convention):
  // unassigned·BIG + position residual + missing cost (+ penalties),
  // with stellar-mass empty slots rejected via BIG.
  const scoreFit = (fit: FitResult, penalty: number): number => {
    let score = penalty;
    let n_filled = 0;
    for (const s of fit.slots) {
      if (s.external || s.exterior) continue;
      if (s.filled) {
        n_filled++;
        // Remnant binding: mass and position are scatter output — a
        // satisfied fit contributes no residual (REMNANT_PENALTY in
        // consider() carries the parsimony cost instead). KBO rows are
        // a distinct population with independent inputs — zero cost.
        if (s.remnant || s.exterior) continue;
        const p = by_name[s.name];
        if (p) score += Math.abs(Math.log(p.r / s.slot_r));
      } else {
        // CORE PRICING: a missing gas-eligible slot's occupant is
        // indeterminate between its core and the full-gas default
        // (t_form truncation) — the corpse is COSTED at its core
        // (cheapest viable occupant). Only a core that is itself
        // stellar is un-truncatable.
        const corpse_core = s.rock + s.ice + s.pebble;
        const corpse_cost = Math.min(s.predicted, Math.max(corpse_core, 0));
        if (corpse_core >= M_STELLAR_BOUNDARY
            || (s.predicted >= M_STELLAR_BOUNDARY && corpse_core <= 0)) {
          // MUTUAL-EVICTION EXEMPTION: a missing stellar-mass slot is
          // not an impossible ghost when an OBSERVED stellar-mass body
          // sits within two rungs displaced far OUTWARD of its seat —
          // the pair is an eviction event (one ejected unbound, one
          // flung up but bound: the Alpha Cen B / Proxima grammar).
          // Costed, not rejected.
          let eviction_partner = false;
          for (const s2 of fit.slots) {
            if (!s2.filled || s2.external || s2.exterior) continue;
            if (Math.abs(s2.slot_n - s.slot_n) > 2) continue;
            const p2 = by_name[s2.name];
            if (!p2 || !(p2.r > 0)) continue;
            if ((p2.observed || 0) >= M_STELLAR_BOUNDARY
                && p2.r > 3 * s2.slot_r) { eviction_partner = true; break; }
          }
          if (eviction_partner) {
            score += 3 + Math.log10(1 + corpse_cost);
          } else {
            score += BIG;
          }
        }
        else if (s.predicted >= M_STELLAR_BOUNDARY) {
          // stellar at full gas but truncatable core: priced as the
          // core-mass corpse (BD-grade occupant removed early)
          score += 1.5 + Math.log10(1 + corpse_cost);
        }
        else {
          // CORRIDOR DISCOUNT: an unfilled slot lying between a filled
          // planet's observed position and its assigned seat is not
          // missing — it is a victim on a migrant's descent path
          // (devoured, budget-closed). Explained absences are cheap.
          let in_corridor = false;
          for (const s2 of fit.slots) {
            if (!s2.filled || s2.external || s2.exterior) continue;
            const p2 = by_name[s2.name];
            if (!p2 || !(p2.r > 0)) continue;
            if (p2.r < s.slot_r && s.slot_r < s2.slot_r) { in_corridor = true; break; }
          }
          const cost = Math.log10(1 + Math.max(0, corpse_cost));
          score += in_corridor ? 0.2 * cost : cost;
        }
      }
    }
    // Unassigned = observed, non-void planets without a slot. Void-
    // interior bodies are external rows, not unassigned failures —
    // but they are REJECTED all the same: every observed planet must
    // occupy a seat. A body with "formation slot indeterminate" is an
    // unjustified existence, exactly like an unassigned one. (Empty
    // slots with death stories are fine; planets without slots are
    // not.) The void fit can only survive as a last resort when NO
    // candidate seats everyone.
    const n_void_now = fit.slots.filter(s => s.external && s.in_void).length;
    score += BIG * Math.max(0, (n_obs - n_void_now) - n_filled);
    score += BIG * n_void_now;
    // MASS-SUPPLY FEASIBILITY: a filled seat must be able to SUPPLY
    // its body's observed mass — formation prediction plus devour
    // credit, within a factor 2.5. A body whose seat cannot source it
    // is an unjustified existence (mass appearing from nowhere), no
    // matter how well positions score.
    for (const s of fit.slots) {
      if (!s.filled || s.external || s.exterior || s.remnant) continue;
      if (!(s.observed > 0)) continue;
      // a stripped body implies a PROGENITOR of observed/iron-fraction:
      // the seat must source the progenitor, not the remnant
      const need = s.stripped ? s.observed / IRON_FRACTION : s.observed;
      if ((s.predicted + (s.devoured_credit || 0)) * 2.5 < need) {
        score += BIG;
      }
    }
    // EXISTENCE JUSTIFICATION (ghost refutation): an unfilled slot
    // predicting a body that dominates a calm, full-mass observed
    // neighbor inside its chaotic zone refutes the candidate — that
    // neighbor would have been scattered and would not hold its
    // observed mass. Survival stories that exempt the neighbor:
    // depletion (<= 15% of its own slot prediction), observed position
    // outside the zone, deep-interior decoupling (< 0.27 of the ghost
    // radius). The ghost itself is exempt only if a body at least its
    // own mass exists in the system (a credible remover): an
    // unremovable dominant ghost with calm bystanders is a
    // contradiction, not a story.
    const m_max_obs = obs_disc.reduce((a, p) => Math.max(a, p.observed || 0), 0);
    // THE LARGEST BODY MUST BE OBSERVED: a hypothesis that conjures an
    // unobserved body exceeding every observed member is rejected
    // OUTRIGHT — removed-overlord stories are not stories. (Removed
    // PEERS — ghosts at or below the observed maximum — remain
    // arguable through the exemptions below.)
    for (const g of fit.slots) {
      if (g.filled || g.external || g.exterior) continue;
      if (g.predicted > m_max_obs) { score += BIG; break; }
    }
    for (const g of fit.slots) {
      if (g.filled || g.external || g.exterior) continue;
      const m_g = g.predicted;
      if (m_g <= 0 || m_g <= m_max_obs) continue;     // removable ghost
      // eviction-partner exemption: a corpse removed EARLY by a mutual
      // eviction (observed stellar partner within two rungs, displaced
      // far outward) never lived alongside the bystanders — its zone
      // threat is moot
      let evict_ok = false;
      for (const s2 of fit.slots) {
        if (!s2.filled || s2.external || s2.exterior) continue;
        if (Math.abs(s2.slot_n - g.slot_n) > 2) continue;
        const p2 = by_name[s2.name];
        if (!p2 || !(p2.r > 0)) continue;
        if ((p2.observed || 0) >= M_STELLAR_BOUNDARY
            && p2.r > 3 * s2.slot_r) { evict_ok = true; break; }
      }
      if (evict_ok) continue;
      const RH = g.slot_r * Math.pow(
        m_g * (3e-6 / M_PRIM_TO_MSUN) / (3 * M_star), 1.0 / 3.0);
      for (const s of fit.slots) {
        if (!s.filled || s.external || s.exterior || s.remnant) continue;
        const p = by_name[s.name];
        if (!p || (p.observed || 0) <= 0) continue;
        if (m_g < 10 * Math.max(p.observed || 0, s.predicted)) continue;
        if ((p.observed || 0) <= 0.15 * Math.max(s.predicted, 1e-12)) continue;
        // TWO EPOCHS: the bystander must be justified at its observed
        // position AND at its formation seat — migrating out of the
        // ghost's zone afterwards does not explain surviving birth
        // inside it at full mass.
        let threatened = false;
        for (const rb of [p.r, s.slot_r]) {
          if (Math.abs(rb - g.slot_r) >= 11 * RH) continue;
          if (rb < g.slot_r && rb / g.slot_r < 0.27) continue;
          threatened = true; break;
        }
        if (!threatened) continue;
        score += BIG;   // unjustified existence under this hypothesis
        break;
      }
    }
    return score;
  };

  const topCands: { score: number; spin: number; k: number;
                    penalty_base: number }[] = [];
  let best: { score: number; spin: number; f: number; k: number;
              fit: FitResult; residual: number; omega: number | null;
              penalty_base?: number } | null = null;
  const VOID_PENALTY = 5.0;    // per planet relegated to the deep Alfven void
  const REMNANT_PENALTY = 2.0; // per void orphan bound to a parent slot
  // VICE mode: geometry (spin = the density dial, anchor k) is selected
  // by the LOCKED scan exactly as in the default mode; omega
  // (inner jaw: R_A, intercept, wind) then refines WITHIN the winning
  // geometry over a breakup-bounded grid. This keeps every validated
  // geometry (Beta Pic 28.4 AU dam, Sol ladder, ...) while letting the
  // physical rotation decouple from the environmental squeeze.
  const evalCandidate = (spin: number, k: number, penalty: number,
                         omega?: number) => {
    // Physicality floor: spin < 0.02 means D < 0.003 — a cloud more
    // diffuse than any star-forming medium, reached only by runaway
    // deep-k anchors on wide stellar companions. Reject.
    if (spin < 0.02) return null;
    const om_eff = (omega === undefined) ? spin : omega;
    const R_A_try = alfven_radius(M_star, om_eff);
    const inv_try = alfven_radius(M_star, om_eff) >= disc_radius(M_star, spin, om_eff);
    // DENSITY GUARDRAIL (v5): a NORMAL-regime Davis Dam is a stellar-wind ⇄
    // nebula gas-pressure balance, so it cannot demand a cloud denser than
    // MAX_NEBULA_DENSITY (forces compact systems off the impossible anchor).
    // The INVERTED dam sits beneath the magnetosphere and is held by the
    // disc's OWN gas pressure (∝ f_disc), NOT external nebula density — so
    // its high "effective density" is a compression diagnostic, not a gas
    // requirement. Exempt it; f_disc≤0.5 + breakup bind the inverted regime.
    if (!inv_try && nebula_density_from_spin(spin) > MAX_NEBULA_DENSITY) return null;
    const n_void_pre = inv_try ? 0
      : planets.filter(p => (p.observed || 0) > 0 && p.r < 0.5 * R_A_try).length;
    const n_eff = n_obs - n_void_pre;
    if (n_eff < 1) return null;
    // count SITES (integer + inverted half-steps), not just integer slots —
    // the inverted regime fills two interleaved factory ladders.
    if (cascade_sites(M_star, spin, n_eff, omega).length < n_eff) return null;
    // VICE per-planet score: the mean PER-PLANET |log(pred/obs)| — the quantity
    // the consensus f-bisection (which only zeroes the SUM) cannot see.
    const perPlanetJ = (f2: FitResult): number => {
      const rows = f2.slots.filter(s => s.filled && !s.external
        && !s.remnant && s.observed > 0 && s.predicted > 0);
      if (!rows.length) return 0;
      return rows.reduce((a, s) =>
        a + Math.abs(Math.log(s.predicted / s.observed)), 0) / rows.length;
    };
    const { f, fit, residual } = bisectF(spin, omega);
    const J = vice ? perPlanetJ(fit) : 0;
    // Void accounting AFTER the fit: an orphan bound to a parent slot
    // as a Martian-type remnant is an explained body (cheap), not a
    // void relegation (expensive) — geometries that can name the
    // parent beat geometries that cannot.
    const n_void_rows = fit.slots.filter(s => s.external && s.in_void).length;
    const n_remn = fit.slots.filter(s => s.remnant).length;
    const pen = penalty + VOID_PENALTY * n_void_rows + REMNANT_PENALTY * n_remn;
    // Residual term: candidates whose f-bisection cannot reach the mass
    // target are penalized in proportion (10 × fractional residual), so
    // position alone cannot carry an unfittable configuration. In VICE
    // mode the per-planet term J joins the score (close individual masses,
    // not just the sum).
    // Gross mass non-closure is rejection-grade: the books must close
    // at percent level. (Without this, a 46%-residual fit can outrank
    // an honest last-resort void fit purely on structure.)
    // PARSIMONY (v5): among PHYSICAL fits (the hard caps already removed
    // impossible inputs), prefer the most SOL-LIKE disc — Sol is the
    // calibration anchor and a typical disc, so minimize log-space
    // DEVIATION from Sol's values (nebula density → 1, f_disc → 0.01),
    // NOT the absolute lowest (which biased every system toward extreme
    // diffuse discs). Gentle tie-breakers — the residual (10×) and
    // structural BIG penalties dominate. (Empty outer slots are penalized
    // separately via K_PENALTY/missing_cost; ledger-explained absences —
    // eviction/annihilation — are exempted there.)
    const D_neb = nebula_density_from_spin(spin);
    const parsimony = 0.08 * Math.abs(Math.log10(Math.max(0.003, D_neb)))
                    + 0.08 * Math.abs(Math.log10(Math.max(1e-4, f) / 0.01));
    const score = scoreFit(fit, pen) + 10 * residual + 2 * J
      + (residual > 0.05 ? BIG : 0) + parsimony;
    return { score, spin, f, k, fit, residual,
             omega: (omega === undefined) ? null : omega, penalty_base: penalty };
  };
  const consider = (spin: number, k: number, penalty: number) => {
    const r = evalCandidate(spin, k, penalty, undefined);
    if (r) {
      topCands.push({ score: r.score, spin, k, penalty_base: penalty });
      topCands.sort((a, b) => a.score - b.score);
      if (topCands.length > 4) topCands.length = 4;
    }
    if (r && (best === null || r.score < best.score)) best = r;
  };

  const runStages = () => {
    // Stage 1: outermost INTERIOR planet anchored at slot k (KBO-class
    // bodies are exterior-ladder citizens and never anchor the dam).
    for (let k = 0; k < 12; k++) {
      const spin = auto_spin_from_outermost(obs_disc, M_star, k);
      consider(spin, k, K_PENALTY * k);
    }
    // Stage 2: outward-migrant variants (cascade rooted by the
    // second-outermost planet at slot k1; outermost beyond R_disc).
    if (obs_disc.length >= 2) {
      const ordered = [...obs_disc].sort((a, b) => b.r - a.r);
      const outermost = ordered[0], second = ordered[1];
      for (let k1 = 1; k1 <= 5; k1++) {
        const R_disc = second.r / Math.pow(CASCADE_RATIO, k1);
        if (outermost.r <= R_disc) continue;
        if ((outermost.observed || 0) > GAS_OBS_THRESHOLD) {
          const spin_check = spin_for_disc_radius(M_star, R_disc);
          const wind_term = (spin_check / 30.0) * Math.pow(0.5 / Math.max(R_disc, 0.01), 2);
          if (1.0 / (1.0 + wind_term) < 0.1) continue;
        }
        const spin = spin_for_disc_radius(M_star, R_disc);
        consider(spin, 0, STAGE2_PENALTY + 1.0 * (k1 - 1));
      }
      // EVERY OBSERVED BODY IS A CANDIDATE DAM-ANCHOR: stage 2 assumes
      // the outermost vacated slot 0, but an evicted body may have
      // left ANY seat while the dam-keeper never moved (Alpha Cen: B
      // holds the dam, Proxima left slot 1). Anchor each body's
      // observed radius at slot 0 and let allocation-matched
      // assignment seat the rest.
      for (const pl of obs_disc) {
        const spin_anchor = spin_for_disc_radius(M_star, pl.r);
        if (!(spin_anchor > 0.02 && spin_anchor < 1e7)) continue;
        consider(spin_anchor, 0, 0.5);
      }
    }
    // INVERTED-REGIME anchor (feeble-wind M-dwarf): the Davis Dam is the
    // INNERMOST planet (f_disc-pressure pile-up) and the magnetosphere R_A is
    // the OUTERMOST — the cascade marches outward between them (memory:
    // inverted-regime-model). ω back-solved from R_A (breakup-checked); the
    // density dial back-solved so R_disc = innermost (density-cap exempt in
    // evalCandidate because inverted). Evaluated with decoupled ω.
    if (obs_disc.length >= 2) {
      const sorted = [...obs_disc].sort((a, b) => a.r - b.r);
      const innermost = sorted[0].r, outermost = sorted[sorted.length - 1].r;
      if (outermost > innermost) {
        // Inverted planets form INSIDE-OUT, so the pattern's OUTERMOST planet
        // is the end of the assembly line; the magnetosphere R_A — where the
        // phase-3 KBOs begin — sits one half-step beyond it (R_A = r_out·ρ^(−½),
        // the first exterior site). R_A is read from the planet PATTERN, never
        // from a KBO flag. The nebula density only has to INVERT the system
        // (spin = the modest inversion threshold); the disc weight f_disc then
        // plunges the Davis Dam from R_A down to the innermost planet — so the
        // STORED density stays modest. (Memory: inverted-regime-model.)
        const R_A_target = outermost / Math.sqrt(CASCADE_RATIO);
        const omega_inv = omega_for_alfven_radius(M_star, R_A_target);
        if (omega_inv > 0.02 && omega_inv <= breakup_spin(M_star)) {
          // spin just above the inversion threshold (R_density ≲ R_A → inverted);
          // f_disc carries the deep drop. Density-cap exempt because inverted.
          const spin_inv = Math.pow(inversion_threshold_density(M_star, omega_inv) * 1.05, 2.0 / 3.0);
          if (spin_inv > 0.02) {
            const r = evalCandidate(spin_inv, 0, 0.5, omega_inv);
            if (r) {
              topCands.push({ score: r.score, spin: spin_inv, k: 0, penalty_base: 0.5 });
              topCands.sort((a, b) => a.score - b.score);
              if (topCands.length > 4) topCands.length = 4;
              if (best === null || r.score < best.score) best = r;
            }
          }
        }
      }
    }
  };
  runStages();

  // VICE omega refinement: breakup-bounded inner-jaw grid evaluated at
  // the locked winner's geometry (spin, k, and its base penalty).
  if (vice && best !== null) {
    const bw = best as { spin: number; k: number; penalty_base?: number;
                         score: number };
    const ob = breakup_spin(M_star);
    // grid extends DOWN to slow inner jaws: a decoupled rim can sit
    // far inside the geometric lock (deep ladders seating hot giants).
    // Scan the TOP candidates, not just the winner: the lock-frame
    // ranking can invert once the rim is free to move.
    const seeds = [{ spin: bw.spin, k: bw.k, penalty_base: bw.penalty_base || 0 },
                   ...topCands];
    const seen = new Set<string>();
    for (const sd of seeds) {
      const key = sd.spin.toFixed(6) + ':' + sd.k;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const frac of [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.4, 0.65, 1.0]) {
        const r = evalCandidate(sd.spin, sd.k, sd.penalty_base, ob * frac);
        if (r && r.score < (best as { score: number }).score) best = r;
      }
    }
  }

  if (best === null) {
    // No candidate satisfied the slot-count constraint; fall back to
    // the inverted-regime spin that the outermost-anchor would give.
    const spin = auto_spin_from_outermost(obs_disc, M_star, 0);
    const { f, fit, residual } = bisectF(spin);
    best = { score: Infinity, spin, f, k: 0, fit, residual,
             omega: null, penalty_base: 0 };
  }
  let b = best as { score: number; spin: number; f: number; k: number;
                    fit: FitResult; residual: number; omega: number | null };
  // SECOND PASS — devour-aware refit. If the chosen fit contains
  // wrecking migrants with meals, the migrants' formation seats must
  // be refit to (observed - retained): a migrant fit to its post-meal
  // total is an invalid formation and does not justify its observed
  // existence. Harvest the meals, refit at the chosen (spin, k, q)
  // with credits applied, and iterate once more so the meal masses
  // themselves converge (victims' predictions shift with f).
  for (let pass = 0; pass < 2; pass++) {
    const credits: Record<string, number> = {};
    let any = false;
    for (const s of b.fit.slots) {
      if (s.filled && s.devoured && s.devoured > 0.1) {
        credits[s.name] = s.devoured; any = true;
      }
    }
    if (!any) break;
    devour_credit = credits;
    // FIXED-f refit: re-bisecting f here can hop assignment basins and
    // return a fit that was never scored (the B-class-eating-planet
    // failure mode). Hold the winner's f; only the credits change.
    const fit2 = slot_aware_fit(planets, M_star, b.spin, b.f,
      fit_opts(b.omega ?? undefined));
    const tgt2 = sel(fit2);
    const tot2 = tgt2.reduce((a, s) => a + s.observed, 0);
    const res2 = tot2 > 0
      ? Math.abs(tgt2.reduce((a, s) => a + (objMass(s) - s.observed), 0)) / tot2
      : 0;
    // no-regression guard: keep the credited fit only if it does not
    // worsen the structural score
    const sc_old = scoreFit(b.fit, 0), sc_new = scoreFit(fit2, 0);
    if (sc_new <= sc_old + 1.0) {
      b = { ...b, fit: fit2, residual: res2 };
    } else { devour_credit = null; break; }
  }
  devour_credit = null;
  // Inverted winners are spin-DEGENERATE: once past inversion the Davis Dam
  // = R_A·drop(f_disc) is fixed by ω and f_disc, NOT by spin, so the geometry
  // (and b.fit) is identical for any spin above the inversion threshold. The
  // brute search may carry a high-spin twin; report instead the MODEST
  // inversion-threshold density — "enough to invert, no more" — which
  // reproduces the same dam in the UI via the f_disc plunge.
  {
    const om_w = (b.omega === undefined || b.omega === null) ? b.spin : b.omega;
    if (alfven_radius(M_star, om_w) >= disc_radius(M_star, b.spin, om_w, b.f)) {
      b = { ...b, spin: Math.pow(inversion_threshold_density(M_star, om_w) * 1.05, 2.0 / 3.0) };
    }
  }
  return {
    spin: b.spin,
    nebula_density: nebula_density_from_spin(b.spin),
    omega_rot: b.omega,
    f_disc: b.f, anchor_slot: b.k,
    iterations: 1, converged: true,
    target_residual: b.residual,
    target_names: sel(b.fit).map(s => s.name),
    fit: b.fit, score: b.score,
  };
}

// ============================================================
//  budgetFit — v6 budget-driven entry point (shared by CLI + web UI).
//  Inputs: a conserved budget {rock, ice, hydrogen} (Sol = 1,1,1) and an
//  optional ARCHAIC primordial spin λ. Derives M_star + per-object Z/f_rock
//  (composition context), the regime (ignition gate), the anchored-dam slope
//  normalization (so f_disc is the REAL disc fraction), and — when λ is given
//  — the Alfvén Dam R_A = alfven_radius(M, λ) decoupled from the density dial
//  (a gas giant's present rotation is not primordial, so λ is inferred from the
//  satellite config). Positions stay anchored to the outermost body; f_disc is
//  bisected to the observed target. All contexts are reset on exit, so the
//  legacy {M,D,spin,f_disc} catalog is untouched.
// ============================================================
// SIGN-MODULATED SOLID TRANSFER (normal regime). The signed Alfvén–Maas standing
// wave is a chain of alternating pressure BUMPS and DIPS — successive antinodes
// are over- / under-densities. Solids drift toward the bumps, so where feeding
// zones OVERLAP the contested solids go to the bump, not the dip: the NEGATIVE-
// amplitude antinodes win (user, 2026-06-09; Galilean masses track the sign).
// Modeled as an outer→inner CASCADE: each +amplitude slot (dip) drains a fraction
// φ of its solids inward; each −amplitude slot (bump) traps a share and passes
// the rest further in; the innermost bump catches the remainder (the inward
// pile-up). The deposited solid is ROCK (drifted silicate; ice sublimates going
// inward). Conserves total solid. BOTH φ and the leak scale with C = R_A/R_disc
// (the Alfvén weight = the modulation depth / feeding-zone overlap), so the
// effect is MINOR for Maas-dominant discs (Sol, C≈0.007 → tiny local exchange)
// and strong for the compact higher-C Galilean disc (C≈0.135 → Io wins big).
// φ scales with C² — the contested overlap is the PRODUCT of two neighboring
// zones, so quadratic in the modulation depth — which makes the effect utterly
// negligible at Sol's C≈0.007 (φ≈8e-4, no change) yet ~0.32 at Jupiter's 0.135.
// Calibrated on the four Galileans.
const SIGN_DRAIN_K = 17.6;  // φ = drain fraction of a +slot's solids = K·C² (cap 0.6)
const SIGN_LEAK_K = 6.4;    // fraction a −slot passes further inward = K·C (cap 0.95)
function apply_sign_modulation(slots: FitSlot[], C: number,
                               R_disc: number, R_A: number,
                               M_star?: number, f_disc?: number): void {
  const phi = Math.min(0.6, SIGN_DRAIN_K * C * C);
  const leak = Math.min(0.95, SIGN_LEAK_K * C);
  if (!(phi > 0) || !(R_disc > 0) || !(R_A > 0)) return;
  const body = slots.filter(s => s.filled && !s.external && !s.exterior
    && s.slot_r > 0 && s.core > 0).sort((a, b) => b.slot_r - a.slot_r);  // outer→inner
  let acc = 0;
  let lastBump: FitSlot | null = null;
  for (const s of body) {
    const A = superposition_amplitude(s.slot_r, R_disc, R_A);
    if (A >= 0) {                       // + (dip): drain solids inward
      const drain = phi * s.core;
      const keep = 1 - phi;
      s.rock *= keep; s.ice *= keep; s.pebble *= keep; s.core *= keep;
      s.predicted -= drain;
      acc += drain;
    } else {                            // − (bump): trap (1−leak)·acc, pass the rest
      const gain = (1 - leak) * acc;
      s.rock += gain; s.core += gain; s.predicted += gain;
      acc -= gain; lastBump = s;
    }
  }
  if (acc > 0 && lastBump) {            // innermost bump catches the remainder
    lastBump.rock += acc; lastBump.core += acc; lastBump.predicted += acc;
  }
  for (const s of body) {
    // refresh the formation clock from the FINAL (post-transfer) core, and the
    // residual bookkeeping
    if (M_star !== undefined && f_disc !== undefined) {
      s.t_form = formation_time(s.slot_r, s.potential_core ?? s.core, M_star, f_disc);
    }
    if (s.observed > 0) {
      s.err_pct = (s.predicted - s.observed) / s.observed * 100;
      s.implied_dM = s.observed - s.predicted;
    }
  }
}

// CONSERVED hydrogen draw-down. The gas-giant envelopes draw from ONE finite
// disc-hydrogen reservoir (= f_disc·M_star, the disc's share of b_hydrogen),
// earliest-forming giant first (it reaches the gas supply first). Each takes the
// gas it wants up to what's left; if the reservoir empties before all are
// satisfied the rest are STARVED (capped) and `exhausted` flags an under-budget
// system — the lever to fix it is a bigger budget / higher spin (more disc), not
// a fudge. The un-captured remainder is `dispersed` — disc GAS that closed onto
// the star or was flung out (the self-similar analogue of the Kuiper closing
// term). NB: this is NOT planet destruction — in a multi-star system the
// companions gravitationally obliterate the planet slots (the scattering/purge
// diagnostics handle that separately). Conserves total H: captured+dispersed=reservoir.
// Budget-share the gas-rich-capturing WANTS (s.predicted−s.core from hydrogen_capture) against the
// finite disc reservoir. Two regimes fall out, no per-system knob:
//   WINDOW-limited (Σwant ≤ budget): every giant keeps its full want — Sol's short-lived disc lets
//     the planets eat only ~10%, the rest drains to the star (the "90% to Sol" emerges).
//   BUDGET-limited (Σwant > budget): share PROPORTIONALLY to want (∝ window) — HR 8799's long-lived
//     disc lets the giants consume nearly all of it; flat profile, latest/shortest-window the runt.
// The gas INTERIOR to the innermost giant has no planet to catch it ⇒ clears to the star (reduces
// the planet-available budget); for a compact disc this barely binds (window-limited anyway).
function apply_hydrogen_conservation(slots: FitSlot[], reservoir: number, M_star: number, spin: number):
    { captured: number; dispersed: number; exhausted: boolean } {
  const total_res = Math.max(0, reservoir);
  const claims = (s: FitSlot) => !s.external && !s.exterior && (s.predicted - s.core) > 1e-9;
  // DRAINAGE = the gorging WINDOW itself (τ = R_disc³/M, in hydrogen_capture), no geometric
  // clamp. But the gas physically PILES AT THE DAM (R_disc) and drains INWARD toward the
  // star, so it is allocated OUTERMOST-FIRST — each body takes min(want, gas still flowing
  // past it):
  //   • NEAR dam (small τ) → small window-wants → every body gets its full want and the
  //     remainder disperses to the star (Sol keeps ~10%, the measured 90% drains).
  //   • FAR dam (huge τ) → the OUTERMOST body's want exceeds the whole reservoir → it keeps
  //     everything and ignites (Proxima at slot 0); the interior gets nothing. No proportional
  //     smearing into brown dwarfs, and no uncapped far-disc want left to render as a phantom
  //     O-class "star" (Alpha Cen had ~25,000 M☉ ghosts).
  // When REAL (observed) bodies exist they are the recipients (empty slots form nothing); a
  // pure forward run with NO observed bodies lets the predicted cascade itself accrete —
  // dam-slot first — so the system self-assembles (Proxima from inputs alone).
  const filled = slots.filter(s => s.filled && claims(s));
  const empty = slots.filter(s => !s.filled && claims(s));
  const recipients = (filled.length ? filled : empty).slice().sort((a, b) => b.slot_r - a.slot_r);
  let captured = 0;
  const setgas = (s: FitSlot, g: number) => {
    s.h_he = g; s.predicted = s.core + g;
    if (s.primordial) { s.primordial.h_he = g; s.primordial.total = s.predicted; }
    if (s.observed > 0) { s.err_pct = (s.predicted - s.observed) / s.observed * 100; s.implied_dM = s.observed - s.predicted; }
  };
  // GEOMETRIC STELLAR CONSUMPTION — there is no "want." All gas is either CAPTURED by a planet or
  // CONSUMED by the star; nothing is an unaccounted leftover. The star eats the gas WITHIN ITS REACH:
  // the nebular gas fills a 3-D sphere of radius R_disc (the Davis Dam) and the stellar consumption
  // rate drops steeply outward, so the star eats only the fraction of that sphere's VOLUME inside its
  // reach R_GAS_REACH ⇒ star_frac = (R_GAS_REACH / R_disc)³. A COMPACT disc (Sol R_disc≈30) is almost
  // entirely within reach ⇒ star eats ~90%; a WIDE disc (HR 8799 R_disc≈67) holds most of its gas far
  // beyond reach ⇒ star eats <10% and the PLANETS get the rest. This replaces the old "planets take
  // their window-want, star gets the residual" — for Sol that residual happened to be 90%, but it was
  // a passive leftover, not a real consumption, and it over-fed the star for wide discs.
  // The planets then split the remaining (1−star_frac)·reservoir in proportion to their capture weight
  // (the gorge formula's predicted−core), which sets the inter-planet ratios (Jupiter/Saturn etc.).
  // GAS CAPTURE RADIUS = GAS_REACH_FRAC · R_c, where R_c is the centrifugal radius (the angular-momentum
  // disc scale, R_c = SOL_R_C·Ω²/M — so this carries mass AND spin, fully derived). R_c is the RIGHT
  // SCALE: reach/R_c is the tightest invariant across the catalogue (~0.08–0.11, HR 8799 included — it
  // stops being an outlier because R_c, not R_disc, is the natural scale). star_frac = (reach/R_disc)³.
  // ⚠️ MAGIC NUMBER: GAS_REACH_FRAC ≈ 0.086 is NOT yet derived. It's near 1/(4π)=0.0796 (a solid-angle
  // fraction of the centrifugal sphere — the cleanest candidate) but undershoots Sol (1/4π → 71% vs the
  // 90% Sol needs); the excess above 1/4π tracked the stellar wind, NOT R_A (the +κ·R_A form failed:
  // κ scattered 0–32). TODO: determine what GAS_REACH_FRAC physically is (solid angle 1/4π + a wind
  // term? a disc aspect ratio H/R? an angular-momentum/mass fraction of R_c?).
  const R_disc_sys = COMP_R_DISC > 0 ? COMP_R_DISC : 1e9;
  const R_c = disc_centrifugal_radius(M_star, spin);
  const reach = GAS_REACH_FRAC * R_c;
  const geom = Math.min(1, Math.pow(reach / Math.max(R_disc_sys, 1e-9), 3));
  // WIND SUPPORT (spin). The gas drains onto the star by gravity; the magnetized wind (momentum ∝
  // Ω^WIND_SPIN_EXP) holds it up in the disc where planets can capture it. A WEAK wind (low spin) fails
  // to support it ⇒ the gas falls in ⇒ the star eats MORE; a STRONG wind (HR 8799) keeps the gas out
  // for the planets. So the planet-RETAINED fraction (1−star_frac) is the geometric share raised to the
  // wind-support power 1/Ω^WIND_SPIN_EXP: Ω=1 (Sol) ⇒ unchanged (90%); ups And Ω=0.42 ⇒ 37→67%; HR 8799
  // Ω=1.21 ⇒ planets keep a touch more. Ties the otherwise-unused WIND_SPIN_EXP (R_inner is the SYMPTOM
  // of low spin — compact disc, gas piled close — not the driver; keying on it directly breaks HR 8799).
  const wind_support = Math.pow(Math.max(spin, 1e-6), WIND_SPIN_EXP);
  const star_frac = 1 - Math.pow(Math.max(1 - geom, 0), 1 / wind_support);
  const planet_budget = total_res * (1 - star_frac);
  const wsum = recipients.reduce((a, s) => a + Math.max(0, s.predicted - s.core), 0);
  if (wsum > 0) for (const s of recipients) {
    const g = planet_budget * Math.max(0, s.predicted - s.core) / wsum;
    setgas(s, g); captured += g;
  }
  // Empty slots when real bodies took the disc: they formed nothing, so zero their gas.
  if (filled.length) for (const s of empty) {
    s.h_he = 0; s.predicted = s.core;
    if (s.primordial) { s.primordial.h_he = 0; s.primordial.total = s.core; }
  }
  return { captured, dispersed: total_res - captured, exhausted: false };
}

// parent: the object's slot in its PARENT system, for the capture-fraction C
// (gas-starvation of a sub-disc). { a: slot AU, M: grandparent mass M⊙ }. Absent
// ⇒ self-fed primary (C = 1).
interface BudgetParent { a: number; M: number; }
interface BudgetFitResult extends BruteFitResult {
  budget_M: number; budget_Z: number; budget_f_rock: number;
  budget_inverted: boolean; budget_R_A: number; budget_lambda: number;
  budget_Mdot: number; budget_snow: number; budget_C: number;
  budget_h_reservoir: number; budget_h_captured: number;
  budget_h_dispersed: number; budget_h_exhausted: boolean;
  budget_barycentre: number;
  budget_hw_inner: number; budget_hw_outer: number;
  budget_R_disc: number; budget_dam_align: number;
  // Binary only: the outermost core element's Alfvén Dam (the cascade's inner terminus); equals
  // budget_R_A for a single star.
  budget_R_A_outer: number;
  budget_wave_doubling: number;   // Suhl parametric subharmonic order m (1 = fundamental, 2 = doubled); the chart primes set_wave_doubling(m)
}
// Core barycentre: the mass-weighted centre of all core elements (the primary at
// r=0, mass primaryMass; plus every co-primary core body at its own r). Everything
// the core emits — wind, field, the dams — and every product orbit is referenced to
// it. Single-star systems have no co-primary ⇒ barycentre = 0 (the primary itself).
function core_barycentre(primaryMass: number | undefined | null, planets: Planet[]): number {
  if (primaryMass == null || !isFinite(primaryMass)) return 0;
  let m = primaryMass * 332946;   // primary mass in M⊕, at r=0
  let mr = 0;
  // Only STELLAR co-primaries (≥ M_STELLAR_BOUNDARY) shift the barycentre / drive the
  // co-primary mechanics. A sub-stellar fragment (a hot Jupiter ~10⁻³ M☉) has a negligible
  // mass ratio: it clears only its local Hill+resonance zone, not a Holman-Wiegert annulus.
  for (const p of planets) { const mo = p.observed || 0; if ((p.core || p.fragment) && mo >= M_STELLAR_BOUNDARY) { m += mo; mr += mo * p.r; } }
  return m > 0 ? mr / m : 0;
}
function budgetFit(planets: Planet[], budget: Budget,
                   lambda?: number | null, parent?: BudgetParent | null,
                   primaryMass?: number | null): BudgetFitResult {
  // CENTRIFUGAL λ-ANCHOR ON A WIDE STELLAR COMPANION + DISTANCE-GATED FRAGMENT CLASSIFICATION.
  // A wide stellar companion's POSITION over-determines λ: it sits at the centrifugal Davis Dam
  // R_c = R_wind(M)·λ², so λ_wide = √(r_wide / R_wind(M)). That implied λ is the physical spin and
  // CAPS the stored value: a stored spin far ABOVE it is an inflated artifact (GJ 667 stores
  // spin=59.9 ≈ 8000× breakup; the companion C at 230 AU implies only λ≈4.6 — already past
  // λ_frag=2, self-consistently fragmenting), so we replace it with λ_wide and pin the dam at the
  // companion's position. A stored spin AT-OR-BELOW λ_wide is kept untouched: Alpha Cen's λ=5.7
  // was derived from Proxima's SEMI-MAJOR axis (~9000 AU), so it sits below the apastron-implied
  // λ≈18 from the OBSERVED 13,000 AU — keeping it preserves the calibrated fit exactly.
  // Independently of the λ override, classify the stellar bodies by DISTANCE:
  //   • the WIDE companion (outermost, sitting AT ~R_c) is the centrifugal Davis Dam — a SLOT
  //     PRODUCT formed on the dam (Proxima's role, GJ 667 C's role); it is NOT a close fragment.
  //   • any OTHER stellar body well INSIDE R_c (near the inner-pair separation a_bin) is the CLOSE
  //     fission product (Alpha Cen B's role, GJ 667 B's role) ⇒ flagged `core`, drives barycentre.
  // Only fires for a TOP-LEVEL system (no parent) with a stellar-mass body beyond the wind disc;
  // sub-cascades and single stars are untouched.
  reset_wide_dam();
  if (parent == null && primaryMass != null && isFinite(primaryMass) && primaryMass > 0) {
    const R_wind = disc_radius_wind(primaryMass);
    const stellar = planets.filter(p => (p.observed || 0) >= M_STELLAR_BOUNDARY && !p.kbo);
    // The wide companion = the outermost stellar body, IF it sits well beyond the wind dam
    // (r_wide ≥ WIDE_DAM_FACTOR·R_wind ⇒ it is the centrifugal dam, not a close-in pair).
    const WIDE_DAM_FACTOR = 4.0;
    let wide: Planet | null = null;
    for (const p of stellar) {
      if (p.r > R_wind * WIDE_DAM_FACTOR && (!wide || p.r > wide.r)) wide = p;
    }
    if (wide) {
      const lam_wide = Math.sqrt(wide.r / Math.max(R_wind, 1e-12));
      // Override ONLY when the stored spin is inflated past the companion-implied λ (the artifact case,
      // e.g. a stale 59.9): cap λ := λ_wide. The dam is NOT pinned to the companion's observed position
      // — that was an observed→predicted leak (it forced GJ 667's dam onto C's 230 AU, so the WITH-
      // observed run diverged from the pure forward, where the dam is the input-derived centrifugal
      // radius ~3135 AU). The dam now always = centrifugal_radius(M, λ) (forward-pure); the wide
      // companion is a cascade slot product within it, compared against — not feeding — the dam. A
      // reasonable stored λ (≤ λ_wide, e.g. Alpha Cen's semimajor-derived 5.7) is left exactly as-is.
      const lam_stored = (lambda != null && isFinite(lambda)) ? lambda : Infinity;
      if (isFinite(lam_wide) && lam_wide > 0 && lam_stored > lam_wide) lambda = lam_wide;
      // Distance gate (always): any stellar body well INSIDE the wide dam (r < FRAG_INNER_FRAC·R_c)
      // is the close fission product ⇒ flag `core`. The wide companion itself stays a slot product.
      const FRAG_INNER_FRAC = 0.25;
      for (const p of stellar) {
        if (p === wide) continue;
        if (p.r > 0 && p.r < FRAG_INNER_FRAC * wide.r) p.core = true;
      }
    }
  }
  // FORWARD BINARY: a fragmenting stellar core (β = BETA_SOL·λ² ≥ 0.274, the bar-mode limit)
  // with NO observed co-primary synthesizes its PREDICTED co-primary, so it flows through the
  // barycentre / Holman-Wiegert / budget / display exactly like an observed one — Alpha Cen
  // assembles A + B + Proxima from inputs alone. Mass = the centrifugal split (core =
  // (1−f_disc_centrifugal)·budget; the remainder is the disc), separation a_bin ∝ λ² (the
  // centrifugal radius j²/GM ∝ spin², the same law that flings the wide fragment to R_c).
  // Guarded on M_B>0 so an artifact-high spin on a low-mass star — too little budget for a
  // sibling — does NOT spuriously split (e.g. gj667).
  if (parent == null && primaryMass != null && isFinite(primaryMass)
      && primaryMass * M_SUN_EARTH >= M_STELLAR_BOUNDARY
      && lambda != null && core_fragments(lambda)
      && !planets.some(p => p.core && (p.observed || 0) > 0)) {
    // BAR-FISSION MASS RATIO (DERIVED — not a budget kludge): the rotating core splits into the
    // primary A and a co-primary B with mass ratio q = M_B/M_A = √(1−β), β = BETA_SOL·λ² (the bar's
    // rotational asymmetry: β→0 ⇒ equal twins q→1; the bar-mode β≈0.27 ⇒ q≈0.85). B is q·M_A from the
    // FRACTURE itself. REPLACES the old kludge M_B = (1−f_disc)·budget − primary, which dumped ALL the
    // non-disc mass into B and was reverse-tuned so Alpha Cen B landed on 0.909 — it overshot GJ 667 B
    // (0.69 → 0.95, B heavier than A). The √(1−β) law predicts BOTH from inputs alone, no per-system
    // tuning: Alpha Cen 0.919 (obs 0.909, +1%), GJ 667 0.660 (obs 0.690, −4%).
    const q_frag = Math.sqrt(Math.max(0, 1 - rotational_beta(lambda)));
    const M_B = q_frag * primaryMass * M_SUN_EARTH;
    if (M_B > 0) planets = [...planets,
      { name: "Co-primary (predicted)", r: close_binary_separation(lambda, primaryMass), observed: M_B, core: true }];
  }
  // ACCRETION-PRESSURE HILL-OVERFLOW FRAGMENTS — detected HERE, before the barycentre, so the
  // fragment drives the SHARED-CORE dynamics exactly like a co-primary star (Alpha Cen B): it
  // fragmented off the core, so the rest of the system orbits the primary+fragment barycentre, the
  // dams are emitted from it, and its Holman-Wiegert annulus + outermost-R_A dam clear the slots
  // around it. A runaway H/He giant inside the snow line that is NOT the outermost body cannot form
  // in situ (the disc can't supply gas there); at low spin the accretion-heat overflow pinches it
  // off past its Hill radius. The absolute giant floor (FRAG_GIANT_MIN) keeps disc super-Earths /
  // Neptunes out. Normal regime only. See accretion-overflow-fragmentation.md.
  if (parent == null && primaryMass != null && isFinite(primaryMass)) {
    const M_pre = mass_from_budget(budget);
    if (!is_inverted_budget(M_pre)) {
      const r_snow_pre = irradiation_snow_line(M_pre);
      // FISSION WINDOW (validated): fission requires the disc-locked crossing R_co ≈ 1.6 R_A — the
      // spin range where the accretion-pressure overflow reaches R_A but the centrifugal fling is too
      // weak to launch it to the disc. Too-high spin (R_co ≪ R_A) launches it → cascade (Sol/HR 8799);
      // too-low spin is gated separately as inverted (above). Replaces the ad-hoc λ ≤ FRAG_SPIN_MAX.
      const R_A_pre = (lambda != null && isFinite(lambda) && lambda > 0)
        ? alfven_radius(M_pre, lambda) : 0;
      const in_window = (lambda != null && isFinite(lambda) && lambda > 0)
        && in_fission_window(M_pre, lambda, R_A_pre);
      // A LOW-SPIN core sheds essentially ONE close-in fission product (low angular momentum can't
      // fling it far): it lands at the close-fission separation a_bin = close_binary_separation(λ),
      // the SAME centrifugal radius the high-spin close binary uses (but at low λ). A gas giant
      // beyond a_bin is too far for a low-j core to have shed it — it reverts to a normal cascade
      // slot product. And a star sheds at most ONE fragment, so only the INNERMOST qualifier is
      // kept; the rest are cascade giants. (Was over-flagging EVERY in-snow-line giant, multiple
      // per system.) No λ ⇒ no a_bin gate (sub-cascade / un-spun): fall back to innermost-only.
      const a_bin = (lambda != null && isFinite(lambda))
        ? close_binary_separation(lambda, primaryMass) : Infinity;
      let outer_r = 0;
      for (const p of planets) {
        if (p.core || p.kbo) continue;
        const m = p.observed || 0;
        if (m > 0 && m < M_STELLAR_BOUNDARY && p.r > outer_r) outer_r = p.r;
      }
      let frag: Planet | null = null;        // the single innermost qualifying candidate
      if (in_window) for (const p of planets) {
        if (p.core || p.kbo || p.fragment) continue;
        const mo = p.observed || 0;
        if (mo < FRAG_GIANT_MIN || mo >= M_STELLAR_BOUNDARY || !(p.r > 0)) continue;
        if (p.r >= r_snow_pre) continue;     // cold giants = cascade slot-0 (e.g. HD 134987 c)
        if (!(p.r < outer_r)) continue;      // outermost body = cascade barrier, spared
        if (p.r > a_bin) continue;           // beyond the close-fission reach ⇒ not a fragment
        if (frag === null || p.r < frag.r) frag = p;   // keep the INNERMOST qualifier
      }
      if (frag) frag.fragment = true;        // sub-stellar core fragment ⇒ a shared-core element
      // FORWARD low-spin fragment synthesis — predict the hot Jupiter from the INPUTS alone, with
      // no observed body (mirrors the forward co-primary synthesis above). Fires only when:
      //   • there are NO observed disc planets (outer_r === 0) — a pure forward prediction; if any
      //     planet is observed, the overflow is already accounted for by the observed architecture
      //     (e.g. Beta Pic's giants), so we must not inject a spurious extra one, AND
      //   • we are in the low-spin fragment WINDOW: sub-bar-mode (not core_fragments ⇒ not the
      //     stellar co-primary channel), λ ≤ FRAG_SPIN_MAX (Sol-spin discs spread it into a cascade
      //     instead), and the predicted overflow is gas-giant-sized (≥ FRAG_GIANT_MIN; M-dwarfs fall
      //     below this and are inverted anyway).
      // Mass + position are BOTH predicted: m = fragment_overflow_mass(λ), orbit = a_bin. So e.g.
      // Upsilon Andromedae b is predicted from core fragmentation with no observed planet defined.
      if (frag === null && outer_r === 0
          && lambda != null && isFinite(lambda) && lambda > 0
          && !core_fragments(lambda) && in_window && isFinite(a_bin) && a_bin > 0) {
        const m_frag = fragment_overflow_mass(M_pre, lambda);
        if (m_frag >= FRAG_GIANT_MIN) {
          // The fragment forms at the fission radius a_bin but migrates inward and STALLS at the
          // inner-disc cavity / magnetospheric-truncation pile-up (~0.04·M^⅓ AU), NOT at a_bin
          // (the old placement parked hot Jupiters out at the Alfvén-dam region). a_bin is kept as
          // the formation seat (form_r); r is the close parked orbit.
          const r_park = hot_jupiter_park_radius(M_pre, lambda);
          planets = [...planets,
            { name: "Hot Jupiter (predicted)", r: r_park, observed: m_frag, fragment: true }];
        }
      }
    }
  }
  // Re-reference every body to the core barycentre: the dams are emitted from it and
  // products orbit it, so positions are measured from the barycentre, not the primary.
  const r_bary = core_barycentre(primaryMass, planets);
  // Core-element separations (primary-relative, captured BEFORE the barycentre shift).
  // For N core elements the Holman-Wiegert clearing generalizes to [0.3·a_min,
  // 2.4·a_max]: stable inside the TIGHTEST pair's circum-element region and outside
  // the WIDEST pair's circum-system region; everything between is swept. N=2 reduces
  // to the binary [0.3·a_bin, 2.4·a_bin].
  // Destabilization uses the binary's ORBITAL EXTREMES, not its semimajor axis —
  // "destabilized is destabilized": the P-type (circumbinary) clear-out reaches the widest
  // separation (APASTRON a(1+e)); the S-type (circum-element) stable edge is set by the
  // closest approach (PERIASTRON a(1-e)). Circular pairs (e=0) reduce to a. Alpha Cen
  // (e≈0.52) ⇒ swept 3.4→86 AU, matching the full Holman-Wiegert eccentric polynomial
  // (vs 7→56 with bare a). e defaults to 0, so single stars / circular binaries are unchanged.
  // STELLAR co-primaries only: the Holman-Wiegert instability annulus is a mass-ratio effect,
  // so a sub-stellar fragment (μ ~ 10⁻³) has no real HW zone and doesn't anchor the circumbinary
  // inner dam — it clears only its local Hill+resonance zone (fragment_clear_zone) above.
  const co_cores = planets.filter(p => (p.core || p.fragment) && (p.observed || 0) >= M_STELLAR_BOUNDARY);
  const apo = co_cores.map(p => p.r * (1 + (p.e || 0)));    // widest reach (P-type limiter)
  const peri = co_cores.map(p => p.r * (1 - (p.e || 0)));   // closest approach (S-type limiter)
  const a_min = peri.length ? Math.min(...peri) : 0;
  const a_max = apo.length ? Math.max(...apo) : 0;
  const hw_in = a_max > 0 ? BINARY_HW_INNER * a_min : 0;
  const hw_out = a_max > 0 ? BINARY_HW_OUTER * a_max : 0;
  if (r_bary !== 0) planets = planets.map(p => {
    const shifted = p.r - r_bary;
    // Core/co-primary bodies keep their SIGNED barycentre-relative position (they're
    // not fit to log-spaced slots, so a negative — on the primary's side — is fine and
    // should display as negative). Disc products clamp to a tiny positive: a negative
    // would break the log-spaced slot assignment, and an inside-barycentre product is
    // in the destabilization annulus anyway.
    return { ...p, r: (p.core || p.fragment) ? shifted : Math.max(shifted, 1e-9) };
  });
  const M = mass_from_budget(budget);
  const Z = metallicity_from_budget(budget);
  const f_rock = f_rock_from_budget(budget);
  let inverted = is_inverted_budget(M);   // refined to the magnetopause regime in the physics-dam path
  let budget_wave_doubling = 1;           // Suhl parametric subharmonic order m used this fit (1 = fundamental; exposed for the chart)
  set_composition(Z, f_rock);
  try {
    // Interior fit population: slot products only — core components (co-primary
    // fragments) and KBOs (factory products) don't anchor the cascade.
    const obs = planets.filter(p => !p.kbo && !p.core && (p.observed || 0) > 0);
    const ordered = obs.slice().sort((a, b) => b.r - a.r);
    // Anchor the dam to the outermost slot product; if a system has NO surviving
    // slot products (e.g. Alpha Cen — all planets destroyed, only core + factory
    // product left), fall back to the outermost body of any class so the dam
    // still lands somewhere physical instead of the 1 AU default.
    const anyBody = planets.filter(p => (p.observed || 0) > 0)
      .slice().sort((a, b) => b.r - a.r);
    const outermost = ordered.length ? ordered[0].r
      : (anyBody.length ? anyBody[0].r : 1.0);
    const omega = (lambda !== undefined && lambda !== null) ? lambda : undefined;
    // DAVIS DAM from physics — NOT anchored to the outermost body. THREE mass buckets:
    //  • CORE (inside R_A)            = M_core (star + co-primaries)
    //  • DISC (R_A → R_disc)          = f_disc·M (the captured planet-forming material)
    //  • OUTER nebula D (beyond R_disc)= budget − core − disc
    // The outer nebula D resists the COMBINED stellar wind from every core element
    // (Σ (M_i/M☉)^3.54 · Ω^0.77 — wind is super-linear in mass, so two stars emit far
    // less than one of their summed mass) → R_disc = SOL_R_DISC·√(W·Ω^0.77)·D^(−0.5).
    // D depends on f_disc THROUGH the disc bucket (not circular — D needs f, not
    // R_disc), so R_disc (and the back-solved geometry spin) is recomputed per f in the
    // bisection. Fallback (no primary mass / no Ω — sub-cascades): the legacy anchor.
    const usePhysicsDam = primaryMass != null && isFinite(primaryMass) && primaryMass > 0 && omega !== undefined;
    let R_disc_phys: number | null = null;
    let R_A_mag: number | null = null;
    let f_disc_derived: number | null = null;
    let M_core_earth = 0;   // hoisted: needed below for the outer-zone (pebble/KBO) budget
    let spin: number;
    if (usePhysicsDam) {
      // Co-primaries — OBSERVED or forward-SYNTHESIZED above — make this a fragmenting binary
      // (⇒ the centrifugal dam fires in disc_radius). The synthesis already gated on the spin
      // fragmentation criterion + a positive sibling mass, so a plain co.length test suffices.
      const co = planets.filter(p => (p.core || p.fragment) && (p.observed || 0) > 0);
      set_fragmenting(co.length > 0);
      // Core = primary + every co-primary (observed, or the forward-synthesized fragment). The
      // synthesized B carries the centrifugal-split mass, so the co-primary's ~0.9 M☉ leaves the
      // nebula and f_disc stays ~0.12 (not 0.52) — no inflated-budget O-class phantoms.
      M_core_earth = (primaryMass as number) * M_SUN_EARTH
        + co.reduce((a, p) => a + (p.observed || 0), 0);
      // DERIVED nebula density (no calibration constant). The disc mass is the nebula
      // M_d = budget − core (budget minus the stars). It spreads over the centrifugal
      // disc (Terebey-Shu-Cassen R_c = j²/GM ∝ spin² — "extended by spin"), giving the
      // self-similar surface density D ∝ M_d / R_c². D is Sol-normalized by Sol's OWN
      // budget − core (a derived value). The spin is capped at the fragmentation
      // (breakup) limit: a core can't rotate faster — the excess angular momentum goes
      // into the co-primary, so a binary's disc isn't spun out to absurd radii.
      const M_d = Math.max(M * M_SUN_TO_EARTH - M_core_earth, 1e-3);   // nebula = budget − core
      const spin_eff = Math.min(omega as number, breakup_spin(M));     // disc rotation ≤ breakup
      // Combined outward FLUX (Σ core-element luminosity). The mass–luminosity relation is
      // steep for fusing stars (L ∝ M^3.54) but FLATTENS below the low-mass break (~0.43 M☉,
      // M-dwarf M–L knee, L ∝ M^2.3). A single M^3.54 law under-counts an M-dwarf's flux ~8×,
      // starving its Davis-Dam ram pressure so R_disc collapses below R_A at any spin. The
      // flattened branch restores the flux-driven ram pressure (same broken law the insolation
      // snow line uses), so a slow M-dwarf sits NORMAL (feeble field can't reach past the dam)
      // and only inverts once it spins fast enough to grow R_A past the flux-set R_disc.
      const FLUX_BREAK = 0.43;
      const lum = (m: number) => m > FLUX_BREAK ? Math.pow(m, 3.54)
        : Math.pow(FLUX_BREAK, 3.54) * Math.pow(m / FLUX_BREAK, 2.3);
      let flux = lum(primaryMass as number);
      for (const p of co) flux += lum((p.observed || 0) / M_SUN_EARTH);
      // Park the dam INPUTS (nebula mass, flux) as context, then the TWO UNIVERSAL LAWS
      // compute the dams — no inline formula, no override, no back-solve. The cascade and
      // allocations call the SAME disc_radius/alfven_radius, so the factory marches from the
      // real Davis Dam and the regime is the real magnetopause vs Davis comparison.
      set_dam_inputs(M_d, flux);
      // Sub-cascade (moon disc): cap the centrifugal radius at the planet's Hill sphere, else
      // R_c ∝ spin²/M explodes (Saturn → ~10⁷ AU) and the inter-dam reservoir → 0 (f_disc floors).
      if (parent) set_hill_radius(parent.a * Math.pow(M / (3 * parent.M), 1.0 / 3.0));
      else reset_hill_radius();
      R_disc_phys = disc_radius(M, omega as number, omega as number);   // Davis = outward pressure ⇄ density
      R_A_mag = alfven_radius(M, omega as number);                      // Alfvén = magnetic field reach
      spin = omega as number;                                           // real spin everywhere — no fake geometry spin
      const M_E_body = M * M_SUN_TO_EARTH;
      // DERIVED f_disc — dam reservoir: self-similar nebula mass (LBP γ=1) between the two
      // dams over the disc profile-scale R_c. From spin + budget alone; bare ≡ populated disc.
      //   NORMAL (R_A inner, R_disc outer): the disc spreads to the CENTRIFUGAL radius
      //     R_c = SOL_R_C·spin²/M, with the outer dam (R_disc) sitting near it ⇒ a healthy
      //     inter-dam capture (Sol ~8.5%).
      //   INVERTED (R_disc inner, R_A outer; feeble wind, dense disc): the disc is concentrated
      //     WITHIN the magnetosphere — it never reaches the centrifugal radius — so its profile
      //     scale is the OUTER dam (R_A). Otherwise both dams sit ~300× inside a centrifugal R_c,
      //     the inter-dam slice is ~0.3% and f_disc plunges to ~0, starving the M-dwarf factory.
      const R_c = (R_A_mag >= R_disc_phys)
        ? Math.max(R_A_mag, 1e-9)                       // inverted: disc bounded by the magnetosphere
        : disc_centrifugal_radius(M, spin_eff);         // normal: centrifugal spread (Hill-capped for sub-cascades)
      // The reservoir is the nebula mass BETWEEN the two dams — independent of which is
      // inner. Normal: R_A inner, R_disc outer. INVERTED: R_disc (Davis) inner, R_A (Alfvén)
      // outer. Order by radius so the difference stays positive in both regimes.
      const dam_in = Math.min(R_A_mag, R_disc_phys);
      const dam_out = Math.max(R_A_mag, R_disc_phys);
      const reservoir = M_d * (Math.exp(-dam_in / R_c) - Math.exp(-dam_out / R_c));
      f_disc_derived = Math.max(reservoir / (M * M_SUN_TO_EARTH), 1e-6);
      // REGIME from the magnetopause: buried (R_A inside the body) treated as non-inverting
      // here; magnetized → inverted iff the magnetosphere reaches past the Davis Dam.
      const R_body_AU = body_radius_earth(M_E_body) * EARTH_RE_IN_AU;
      inverted = (R_A_mag >= R_body_AU) && (R_A_mag >= R_disc_phys);
    } else {
      spin = (omega !== undefined)
        ? spin_for_disc_radius(M, outermost, omega)
        : spin_for_disc_radius(M, outermost);
    }
    // DISC SCALE = the DERIVED dam, not the observed outermost body — so a bare system
    // (no observed planets) sets its snow line / Ṁ / cascade from budget + spin alone,
    // exactly as a forward model must. Falls back to outermost only if no physics dam.
    const R_disc_scale = R_disc_phys != null ? R_disc_phys : outermost;
    set_r_disc_norm(R_disc_scale);
    // UNIFIED RATE → snow line. B = relative mass budget; C = capture fraction
    // (1 self-fed, R_disc/R_Hill for a parent-fed sub-disc).
    const B = M / SOL_M_PRIMORDIAL;
    const C = parent ? capture_fraction(R_disc_scale, parent.a, M, parent.M) : 1.0;
    const Mdot_of = (fd: number) => accretion_rate(M, Z, f_rock, fd, R_disc_scale, B, C);
    const om_for_RA = (omega !== undefined) ? omega : spin;
    const R_A_used = alfven_radius(M, om_for_RA);
    // Fit-quality selector: filled slot products (inverted → pile-up factory products).
    // Used for the residual readout, and (sub-cascade only) the f_disc bisection.
    const sel = (fr: FitResult): FitSlot[] => fr.slots.filter(s =>
      s.filled && !s.external && !s.remnant && (inverted || !s.exterior));
    // TWO accretion regimes, two snow-line laws — both VISCOUS, so both SPIN-
    // INDEPENDENT (viscous heating dominates bolometric during accretion):
    //  • UNIFORM-DISC (normal regime): the smooth viscous disc → Mulders line (R_SL ∝ Ṁ^4/9).
    //  • PILE-UP (inverted regime): same viscous heating but in a DIFFUSE pile, so
    //    Mulders (a uniform-disc equivalent density) over-reads — pile_snow_line tracks
    //    Σ_pile → Σ_crit. Maxed against the bolometric line. (Ref spin 1; spin-independent.)
    const SNOW_REF_SPIN = 1.0;
    const snow_of = (fd: number) => inverted
      ? Math.max(pile_snow_line(M, fd, alfven_radius(M, SNOW_REF_SPIN), SNOW_REF_SPIN),
                 irradiation_snow_line(M))
      : mulders_snow_line(M, Mdot_of(fd));
    // FORWARD THRESHOLD-EDGE FISSION (47 UMa). The top-of-budgetFit detector catches the DEEP-fission
    // close-in hot Jupiters; this catches the THRESHOLD-EDGE case, predicted from λ + accretive heating
    // (Ṁ is known here). If the core boils but only just — T_SILICA_BOIL < T_core(λ,Ṁ) < 2·T_SILICA_BOIL
    // — the overflow is large (enhanced) and flung far to √(a_bin·R_c). That is a PREDICTION from inputs;
    // the observed giant matching it in BOTH position and mass IS that product, so it's flagged like a
    // fission sibling (NOT hand-flagged). No match ⇒ a prediction of an unobserved giant. (docs: fission-threshold)
    if (parent == null && primaryMass != null && !inverted && f_disc_derived != null
        && lambda != null && isFinite(lambda) && lambda > 0) {
      const Mdot_fe = Mdot_of(f_disc_derived);
      const T_core_fe = core_accretion_temperature(M, lambda, Mdot_fe);
      if (T_core_fe > T_SILICA_BOIL && T_core_fe < 2.0 * T_SILICA_BOIL) {
        set_mdot(Mdot_fe);                                            // engage the overflow-mass enhancement
        const m_pred = fragment_overflow_mass(M, lambda);            // enhanced overflow mass
        const reservoir = f_disc_derived * M * M_SUN_TO_EARTH;       // disc mass available to source it
        // AVAILABILITY (amplitude-allocation law): the enhanced overflow must fit within the disc
        // reservoir. Near the threshold the enhancement diverges; a metal-poor / low-mass disc (e.g.
        // HD 20794: predicts 2278 M⊕ but reservoir only 1446) cannot source it ⇒ no giant fissions.
        // Only a disc that can actually supply it (47 UMa: 808 ≪ 3389) produces the body.
        if (m_pred >= FRAG_GIANT_MIN && m_pred <= reservoir) {
          const pos = Math.sqrt(close_binary_separation(lambda, primaryMass)
                                * centrifugal_radius(M, lambda));     // √(a_bin·R_c) — the threshold-edge fling
          let outer_r = 0;
          for (const p of planets) {
            if (p.core || p.kbo) continue;
            const mo = p.observed || 0;
            if (mo > 0 && mo < M_STELLAR_BOUNDARY && p.r > outer_r) outer_r = p.r;
          }
          // The product is PREDICTED from inputs. If an observed giant matches it (position AND mass),
          // that body IS it (flag like a fission sibling). If none does — e.g. all planets stripped for
          // a forward test — EMIT it as a predicted body, so the prediction stands on the inputs alone.
          let matched = false;
          for (const p of planets) {
            if (p.core || p.kbo || p.fragment) continue;
            const mo = p.observed || 0;
            if (mo < FRAG_GIANT_MIN || mo >= M_STELLAR_BOUNDARY || !(p.r > 0) || !(p.r < outer_r)) continue;
            if (Math.abs(Math.log(p.r / pos)) > 0.405) continue;      // position match (±~1.5×)
            if (Math.abs(mo - m_pred) / m_pred > 0.5) continue;       // mass match (±50%)
            p.fragment = true; matched = true; break;
          }
          if (!matched) {
            planets = [...planets,
              { name: "Hot Jupiter (predicted)", r: pos, observed: m_pred, fragment: true }];
          }
        }
      }
    }
    // BINARY: the circumbinary ladder bottoms out at the OUTERMOST core element's Alfvén Dam, not
    // the combined R_A at the barycentre — no slot forms inside the cores' mutual orbit. Each
    // element's dam reaches to its apastron-from-barycentre + its own R_A; take the widest (incl.
    // the primary, sitting r_bary off the barycentre). (HW instability clears anything beyond it.)
    let cascade_inner_dam: number | null = null;
    if (co_cores.length > 0 && omega !== undefined && primaryMass != null && r_bary !== 0) {
      const e_bin = co_cores.reduce((m, p) => Math.max(m, p.e || 0), 0);
      let dam = Math.abs(r_bary) * (1 + e_bin) + alfven_radius(primaryMass, omega);
      for (const p of co_cores) {
        const reach = Math.abs(p.r - r_bary) * (1 + (p.e || 0))
          + alfven_radius((p.observed || 0) / M_SUN_TO_EARTH, omega);
        if (reach > dam) dam = reach;
      }
      cascade_inner_dam = dam;
      set_cascade_inner_dam(dam);
    } else {
      reset_cascade_inner_dam();
    }
    // OUTER-ZONE conserved budget (the Davis-dam factory), on ONE gas-dispersal clock. The solids
    // beyond the dam (S = Z·M_beyond, M_beyond = budget − core − disc) split temporally: during the
    // gas epoch the headwind drives radial drift, so most drain inward as the PEBBLE FLUX (caught by
    // inner cores at ε_PA = PEBBLE_CAPTURE_EFFICIENCY); the residual still present when the gas
    // turns off (drift stalls) collapses into KBOs. ε_SI = min(1, t_drift/t_disc) IS that residual —
    // small where untrapped (drift fast vs disc life → starved Kuiper belt), ≈1 where trapped
    // (inverted: no headwind, nothing leaks → efficient assembly line). No beyond-dam ⇒ no flux.
    if (usePhysicsDam && R_disc_phys != null && f_disc_derived != null && M_core_earth > 0 && parent == null) {
      const Mtot_e = M * M_SUN_TO_EARTH;
      const M_beyond = Math.max(0, Mtot_e - M_core_earth - f_disc_derived * Mtot_e);
      const S_outer = COMP_Z * M_beyond;                        // outer solids (full f_rock:1−f_rock ratio)
      const P_dam = Math.sqrt(Math.pow(R_disc_phys, 3) / Math.max(M, 1e-9));   // yr (model period convention)
      const t_drift = (1 + PEBBLE_STOKES * PEBBLE_STOKES) / (2 * PEBBLE_STOKES * PEBBLE_ETA)
        * (P_dam / (2 * Math.PI)) / 1e6;                        // Myr (radial-drift time at the dam)
      const t_disc = gas_consumption_time(M, f_disc_derived);     // Myr (gas-dispersal clock)
      const eps_SI = inverted ? 1.0 : Math.min(1.0, t_drift / Math.max(t_disc, 1e-9));
      if (!inverted) {
        // Normal stellar: the pebble flux drains inward (Act 1). KBOs are dam-edge SI seeds whose
        // per-rank size DECLINE is set by ε_SI (carried via COMP_SI_RETENTION to the KBO loop): the
        // drawdown scales with the drained fraction (1−ε_SI), so a drift-dominated belt (Sol, ε_SI≈1%)
        // declines steeply while a trapped reservoir wouldn't decline at all.
        // CAPTURE EFFICIENCY ε_PA scales with disc COMPACTNESS, not a constant: a compact disc (R_A
        // close to R_disc) intercepts most of the inward-drifting flux; a wide one lets it drain to
        // the star. ε_PA = √(R_A/R_disc) — Sol (0.2/30) ≈ 0.08, Kepler-90 (0.2/1.2) ≈ 0.41. This is
        // the budget-split knob that lets a compact disc keep the recycled flux and build big planets.
        const eps_PA = Math.min(0.9, Math.sqrt(R_A_used / Math.max(R_disc_scale, 1e-9)));
        set_pebble_flux_budget(eps_PA * (1 - eps_SI) * S_outer);
        set_kbo_budget(eps_SI * S_outer);                       // the 1% the SI retains (KBO factory ceiling)
        set_si_retention(eps_SI);
      } else {
        set_pebble_flux_budget(0);                              // trapped — no inward pebble flux
        reset_kbo_budget();
        reset_si_retention();                                   // (inverted uses the phase-3 branch, not the KBO loop)
      }
    } else {
      reset_pebble_flux_budget();                               // sub-cascade → legacy disc-ice flux
      reset_kbo_budget();
      reset_si_retention();                                     // sub-cascade moons: no KBO-style decline
    }
    // SUHL PARAMETRIC SUBHARMONIC (wavelength doubling) — set the cascade-wave order FORWARD, from the
    // cavity geometry and the field, never from observed planets. The 1×→2× onset is a 2-D FARADAY
    // TONGUE: doubling fires when the cavity is past the tongue tip (N > WAVE_DOUBLING_N_MIN) AND the
    // dynamo field is below the tongue's field-tolerance there, B < B_width(N) = WAVE_TONGUE_SLOPE·(N −
    // N_MIN) — the tongue opens linearly from the tip, so a wide cavity (47 UMa, N=8.6) tolerates a
    // moderate field (B=0.19) while a near-tip one (HD 20794, N=7.6) needs a weak field and stays 1×.
    // (A flat B_crit can't separate them — 47 UMa doubles at HIGHER field.) The 2×→4× depth is the
    // δ-spaced Feigenbaum floor (constants), still a flat damping floor. (docs: wavelength-doubling)
    reset_wave_doubling();
    if (f_disc_derived != null && !inverted && !parent
        && R_disc_phys != null && R_A_mag != null && R_A_mag > 0) {
      const N_rungs = CASCADE_ALPHA * Math.log(R_disc_phys / R_A_mag) / Math.PI;
      const B_field = dynamo_field_strength(M, omega as number);
      const B_tongue = WAVE_TONGUE_SLOPE * (N_rungs - WAVE_DOUBLING_N_MIN);   // Faraday tongue field-tolerance at this N
      let m = 1;
      // Faraday tongues are PERIODIC (one 2× resonance at each integer N/2), and the tongue WIDENS with
      // cavity size (Q ∝ N): B_width grows with N, so a huge cavity doubles even at a strong field. The
      // tip is N_MIN (N/2 = 3.5, first mode). Sol/HR 8799 (N≈9–10) have a strong field above their modest
      // B_width → 1×; Alpha Cen (N=19.8, N/2≈10) has a wide tongue (B_width≈2) → 2× despite B≈1.
      if (N_rungs > WAVE_DOUBLING_N_MIN && B_field < B_tongue) {
        m = 2;
        if (N_rungs > WAVE_DOUBLING_N_MIN_4X && B_field < B_PARAMETRIC_CRIT_4X) m = 4;
      }
      if (m > 1) { set_wave_doubling(m); budget_wave_doubling = m; }
    }
    let f: number;
    let fit: FitResult;
    if (f_disc_derived != null) {
      // FORWARD MODEL: f_disc is the DERIVED dam reservoir (above) — a pure function of
      // spin + budget, blind to the observed planets. One pass: f → Ṁ → snow line →
      // formation clock → allocate. A bare system and a populated one get the IDENTICAL
      // disc geometry, snow line and slot masses; the planets only fill what physics laid.
      f = f_disc_derived;
      set_snow_line(snow_of(f));
      set_mdot(Mdot_of(f));
      const om_slot = omega;
      fit = slot_aware_fit(planets, M, spin, f, { auto_compress: false, omega: om_slot, defer_post_formation: true });
      // INVERTED in-situ: the observed bodies are the dense pile-up's in-situ factory
      // products. The self-similar reservoir under-counts that compressed pile, so close
      // f_disc to the observed in-situ total (snow line stays frozen from the derived reservoir).
      // Normal/forward systems keep the pure derived f_disc — only the inverted dense pile
      // is closed to its products. (No effect when there are no observed targets.)
      if (inverted) {
        const tot = sel(fit).reduce((a, s) => a + (s.observed || 0), 0);
        if (tot > 0) {
          const tol = Math.max(1e-6, 0.001 * tot);
          let lo = 1e-5, hi = 1.0;
          for (let i = 0; i < 60; i++) {
            const fm = Math.sqrt(lo * hi);
            const f2 = slot_aware_fit(planets, M, spin, fm, { auto_compress: false, omega: om_slot, defer_post_formation: true });
            const e = sel(f2).reduce((a, s) => a + (s.predicted - (s.observed || 0)), 0);
            f = fm; fit = f2;
            if (Math.abs(e) < tol) break;
            if (e > 0) hi = fm; else lo = fm;
          }
        }
      }
    } else {
      // SUB-CASCADE fallback (gas-giant satellite disc — parent-fed, no stellar dam):
      // f_disc still closed to the parent-fed products by bisection. Targets: the
      // uniform-disc cascade slots (inverted → the pile-up factory products).
      const bisectF = (): { f: number; fit: FitResult } => {
        let lo = 0.0005, hi = 0.5, ff = 0.01;
        let fr = slot_aware_fit(planets, M, spin, ff, { auto_compress: false, omega, defer_post_formation: true });
        const tgt0 = sel(fr);
        const totalTarget = tgt0.reduce((a, s) => a + s.observed, 0);
        if (totalTarget > 0) {
          const smallest = tgt0.reduce((m, s) => Math.min(m, s.observed), Infinity);
          const tol = Math.max(1e-6, 0.001 * smallest);
          for (let i = 0; i < 60; i++) {
            const fm = Math.sqrt(lo * hi);
            const f2 = slot_aware_fit(planets, M, spin, fm, { auto_compress: false, omega, defer_post_formation: true });
            const e = sel(f2).reduce((a, s) => a + (s.predicted - s.observed), 0);
            ff = fm; fr = f2;
            if (Math.abs(e) < tol) break;
            if (e > 0) hi = fm; else lo = fm;
          }
        }
        return { f: ff, fit: fr };
      };
      reset_snow_line();
      const fA = bisectF().f;
      set_snow_line(snow_of(fA));
      set_mdot(Mdot_of(fA));
      const passB = bisectF();
      f = passB.f;
      fit = passB.fit;
    }
    reset_cascade_inner_dam();   // scope the binary terminus override to slot generation
    reset_pebble_flux_budget();  // scope the outer-sourced pebble flux to this fit
    reset_kbo_budget();          // scope the KBO budget to this fit
    reset_si_retention();        // scope the KBO drift-retention (M_G·ε_SI) to this fit
    // The Davis dam is fixed by the budget − core − captured-planets (f_disc-
    // independent). The outermost body's distance from it is the fit-quality metric —
    // no longer forced to zero by an anchor.
    const R_disc_final = R_disc_phys != null ? R_disc_phys : outermost;
    const dam_align = (R_disc_phys != null && R_disc_final > 0)
      ? (outermost - R_disc_final) / R_disc_final : 0;
    // Sign-modulated solid transfer (post-process; conserves total):
    // + dips drain inward to − bumps, cascade scaled by C = R_A/R_disc.
    apply_sign_modulation(fit.slots, R_A_used / R_disc_final, R_disc_final, R_A_used, M, f);
    // Conserved hydrogen draw-down: the gas envelopes draw from the finite disc
    // hydrogen reservoir (f_disc·M_star = the disc's share of b_hydrogen). The
    // un-captured remainder is dispersed (onto the star / flung out). `exhausted`
    // ⇒ the giants want more gas than the disc holds: raise the budget / spin.
    // DISC HOST mass: a circumstellar disc's H scales with its HOST star, not the whole
    // system. For a binary the planet-forming disc is the PRIMARY's — the co-primary is a
    // sibling fragment in the CORE bucket (it drives the wind/dam, but isn't extra disc-
    // hosting mass). Summing A+B over-allocates H ~2× (Proxima +125%). Single stars: no
    // co-primary ⇒ M_disc_host = M (unchanged).
    // The planet-forming disc is hosted by the PRIMARY; the co-primary (observed or forward-
    // synthesized) is a core-bucket sibling, not extra disc-hosting mass.
    const hasCoPrimary = planets.some(p => p.core && (p.observed || 0) > 0);
    const M_disc_host = (hasCoPrimary && primaryMass != null && isFinite(primaryMass) && primaryMass > 0)
      ? primaryMass : M;
    const H_reservoir = f * m_star_earth(M_disc_host);
    const Hcons = apply_hydrogen_conservation(fit.slots, H_reservoir, M_disc_host, spin);
    // RE-CLASSIFY after the H-cap: classify_slot ran in the cascade with the PRE-cap mass, so a
    // far-dam slot that wanted a stellar gas envelope but lost it to the dam-slot kept a stale
    // "O-class star" prefix even at a few hundred M⊕. Re-derive the leading class token from the
    // capped primordial (unfilled slots are classed by primordial; filled by observed, untouched);
    // keep the cause-of-death suffix.
    for (const s of fit.slots) {
      if (s.filled || s.core_component || s.external || !s.primordial) continue;
      const prefix = s.interpretation.split(' (')[0];
      if (!COMPOSITION_CLASS_TOKENS.has(prefix)) continue;
      const cls = composition_class(s.primordial.core || 0, s.primordial.ice || 0,
                                    s.primordial.h_he || 0, s.primordial.total || 0);
      if (cls !== prefix) s.interpretation = cls + s.interpretation.slice(prefix.length);
    }
    // POST-FORMATION (relocated here, AFTER gas conservation): run scatter + devour +
    // void-remnant on the FINAL gas-conserved masses. This is why scatter now reads e.g.
    // HR 8799 slot 4 as its 10 M⊕ gas-conserved core, not the pre-cap 4024 M⊕ phantom
    // envelope — the forward model finalises formation, THEN the scatter physics acts.
    fit._run_post_formation?.();
    const tgt = sel(fit);
    const tot = tgt.reduce((a, s) => a + s.observed, 0);
    const resid = tot > 0
      ? Math.abs(tgt.reduce((a, s) => a + (s.predicted - s.observed), 0)) / tot : 0;
    const om_eff = (omega !== undefined) ? omega : spin;
    // Report the accretion rate / snow line ACTUALLY USED — from the same f_disc
    // (derived dam reservoir, or sub-cascade bisection) that drove the allocation.
    const Mdot = Mdot_of(f);
    // MULTI-CORE DESTABILIZATION (Holman-Wiegert 1999, generalized to N elements):
    // core elements orbiting the barycentre clear the annulus [hw_in, hw_out] =
    // [0.3·a_min, 2.4·a_max] — outside the tightest pair's circum-element stable
    // region and inside the widest pair's circum-system region. Any product there is
    // destroyed. Radii are barycentre-relative; core elements are exempt (they ARE
    // the perturbers).
    if (hw_out > 0) {
      const nco = co_cores.length + 1;   // co-primaries + primary
      for (const s of fit.slots) {
        if (s.core_component || s.external) continue;
        if (s.slot_r > hw_in && s.slot_r < hw_out) {
          // KEEP the formation composition (core + any captured H/He) — the body DID form, then the
          // binary instability ejected it. Flag it destroyed (excluded from the fit/score) but show
          // the giant it was, rather than zeroing it to a bare nothing.
          s.destroyed = true;
          s.err_pct = 0; s.implied_dM = s.observed ? -s.observed : 0;
          s.interpretation = `destroyed by ${nco}-body core instability — the ${hw_in.toFixed(1)}–${hw_out.toFixed(1)} AU annulus is dynamically unstable (Holman-Wiegert; separations ${a_min.toFixed(1)}–${a_max.toFixed(1)} AU); formed ${(s.predicted/332946).toFixed(4)} M☉ before ejection`;
        }
      }
    }
    // PRIMARY STAR as a core body: shown with its formation composition (the well-
    // mixed reservoir — H/He-dominated with the system's Z metals), orbiting the
    // barycentre at r_bary (0 for a single star). Like the co-primaries it's external
    // (not a disc product), so it doesn't enter the disc-mass total.
    if (primaryMass != null && isFinite(primaryMass) && primaryMass > 0) {
      const Mp = primaryMass * 332946;
      const p_rock = Mp * Z * f_rock, p_ice = Mp * Z * (1 - f_rock), p_h = Mp * (1 - Z);
      // The primary orbits the barycentre OPPOSITE the co-primaries, so its
      // barycentre-relative position is −r_bary (0 for a single star).
      fit.slots.push({
        slot_n: -1, slot_r: -r_bary, r_used: -r_bary, filled: true, name: "primary star",
        rock: p_rock, ice: p_ice, pebble: 0, core: p_rock + p_ice, t_form: 0, h_he: p_h,
        predicted: Mp, observed: Mp, err_pct: 0, implied_dM: 0,
        stripped: false, in_void: true, external: true, core_component: true,
        primordial: { rock: p_rock, ice: p_ice, pebble: 0, h_he: p_h, core: p_rock + p_ice, total: Mp },
        interpretation: `primary star: ${primaryMass.toFixed(3)} M☉ — formation composition ${(100 * (1 - Z)).toFixed(1)}% H/He + ${(100 * Z).toFixed(2)}% metals (Z)${r_bary > 0 ? `, orbiting the barycentre at ${r_bary.toFixed(2)} AU (opposite the co-primaries)` : ', at the system centre'}`,
      });
    }
    return {
      spin, nebula_density: nebula_density_from_spin(spin),
      omega_rot: (omega !== undefined) ? omega : null,
      f_disc: f, anchor_slot: 0, iterations: 1, converged: true,
      target_residual: resid, target_names: tgt.map(s => s.name), fit,
      score: 0,
      budget_M: M, budget_Z: Z, budget_f_rock: f_rock, budget_inverted: inverted,
      budget_R_A: alfven_radius(M, om_eff), budget_lambda: om_eff,
      budget_Mdot: Mdot, budget_snow: inverted ? Math.max(pile_snow_line(M, f, alfven_radius(M, 1.0), 1.0), irradiation_snow_line(M)) : mulders_snow_line(M, Mdot), budget_C: C,
      budget_h_reservoir: H_reservoir, budget_h_captured: Hcons.captured,
      budget_h_dispersed: Hcons.dispersed, budget_h_exhausted: Hcons.exhausted,
      budget_barycentre: r_bary,
      budget_hw_inner: hw_in, budget_hw_outer: hw_out,
      budget_R_disc: R_disc_final, budget_dam_align: dam_align,
      budget_R_A_outer: cascade_inner_dam != null ? cascade_inner_dam : alfven_radius(M, om_eff),
      budget_wave_doubling,
      // CONDUCTOR-LADDER magnetosphere classification (exposed, non-driving for now):
      // does the dynamo field project beyond the body → exterior Alfvén Dam, or is it
      // BURIED (single-body infall)? Then magnetized → normal / inverted by R_A vs R_disc.
      ...(() => {
        const M_E = M * M_SUN_TO_EARTH;
        const rock_E = budget.rock, h_E = budget.hydrogen;
        const B_G = dynamo_surface_field(M_E, rock_E, h_E, om_eff);
        const R_body_AU = body_radius_earth(M_E) * EARTH_RE_IN_AU;
        const R_A_m = R_A_mag != null ? R_A_mag : alfven_radius(M, om_eff);
        const regime = (R_A_m < R_body_AU) ? 'buried'
          : (R_A_m >= R_disc_final ? 'inverted' : 'normal');
        return { budget_field_G: B_G, budget_R_A_mag: R_A_m, budget_R_body_AU: R_body_AU, budget_regime: regime };
      })(),
    };
  } finally { reset_composition(); reset_r_disc_norm(); reset_snow_line(); reset_mdot(); reset_form_spin(); reset_fragmenting(); reset_dam_inputs(); reset_hill_radius(); reset_wide_dam(); reset_wave_doubling(); }
}
