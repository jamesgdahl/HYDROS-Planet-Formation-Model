"use strict";
// Per-radius mass allocation: rock, ice, pebble flux, H/He envelope.
// Global-script style: depends on constants.ts and disc.ts.
// Hexagonal-packing nearest-neighbor truncation at the outer Davis Dam.
// GEOMETRIC ORIGIN: in 2D hexagonal close-packing, each interior point
// has 6 nearest neighbors at 60° intervals. A planet at the disc edge
// (r = R_disc) loses 1 of these 6 to the void → retention = 5/6, loss = 1/6.
// Equivalent asymmetric formulation: L:S = 5:1 with S = outward range,
// L = inward range. f_trunc(R_disc) = L/(L+S) = 5/6 exactly.
// Same 1/6 truncation applies at the inner ramp via alpha = (5/6)*R_A.
function outer_feed_truncation(r, r_disc) {
    const S = 0.025 * r_disc;
    const L = 5.0 * S;
    const void_width = (r + S) - r_disc;
    if (void_width <= 0)
        return 1.0;
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
function factory_product(r, M_star, omega, f_disc) {
    if (!(r > 0))
        return { total: 0, rock: 0, ice: 0 };
    const R_disc = disc_radius(M_star, omega, omega, f_disc);
    const R_A = alfven_radius(M_star, omega);
    const r_visc = viscous_snow_line(M_star, f_disc);
    const R_in = Math.max(Math.min(R_A, R_disc), 1e-9); // inner dam
    const R_c = disc_centrifugal_radius(M_star, omega); // centrifugal disc extent (Hill-capped for sub-cascades)
    // OUTER boundary of the oligarchic (isolation-mass) zone. In the NORMAL regime the Davis Dam (R_disc)
    // is the outer wall and KBOs begin just beyond it. In the INVERTED regime the Davis Dam starts inside
    // R_A and MARCHES OUTWARD, crossing R_A (the system un-inverts at the crossing) and minting isolation-
    // mass bodies the whole way to the disc's physical edge R_c — so R_A is a crossing, NOT a wall, and the
    // streaming-instability/KBO zone only begins at R_c. (Without this the march was capped at R_A and every
    // body past it — e.g. TRAPPIST e/f/g/h beyond R_A=0.025 — was wrongly minted as ~0 SI dust.)
    const inverted_here = R_A > R_disc;
    const R_outer = inverted_here ? Math.max(R_c, R_A) : Math.max(R_A, R_disc);
    const M_star_E = M_star * M_SUN_EARTH; // central mass in M⊕ (Hill dynamics)
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
        const Sigma_cgs = Sigma * EARTH_G_PER_ME / (AU_CM * AU_CM); // g/cm²
        const r_cm = r * AU_CM;
        const Omega2 = G_CGS * (M_star * M_SUN_G) / (r_cm * r_cm * r_cm);
        const M_G_g = 4 * Math.pow(Math.PI, 5) * G_CGS * G_CGS * Math.pow(Sigma_cgs, 3) / (Omega2 * Omega2);
        // M_G = the streaming-instability seed (one self-gravitating clump) at the local solid Σ. This
        // is the right per-KBO scale (Sol dam-edge ≈ Triton); the DECLINING size trend comes from the
        // reservoir depleting as the factory mints (handled in the KBO loop), not from a global factor.
        const M_G = M_G_g / EARTH_G_PER_ME;
        return { total: M_G, rock: M_G * fr, ice: M_G * (1 - fr) };
    }
    // INTER-DAM ZONE: oligarchic isolation mass over the local solid surface density Σ; M_iso ∝ (r²·Σ)^1.5.
    const solid = f_disc * m_star_earth(M_star) * COMP_Z; // disc metals budget
    if (inverted_here) {
        // INVERTED PILE (the inverted-regime composition law). The disc piles against the INNER Davis Dam,
        // so the pile surface density is CONCENTRATED there and falls off outward (scale R_pile ~ R_in):
        //   Σ_pile ∝ r⁻¹·e^(−r/R_pile), normalized to the disc metals over [R_in, R_outer].
        // ROCK is refractory and tracks the pile everywhere, so the rock content DECLINES outward (the
        // OPPOSITE of the normal regime, where the spread disc gives a rising isolation mass). ICE condenses
        // only past the ACCRETIVE snow line r_acc — where the PILE'S accretion heating drops below freezing
        // (pile_snow_line; NOT the irradiation snow line) — and then RISES outward (f_cond: 0→1), mantling
        // the now-smaller rock seeds. Net Σ_solid = pile·[f_rock + (1−f_rock)·f_cond]: rock-high inner →
        // a DIP at r_acc (rock thinned, ice not yet condensed) → ice recovery outer. (Matches TRAPPIST's
        // big b/c → small d → recovering e/f/g pattern, which a single monotonic profile cannot.)
        const INV_PILE_SCALE = globalThis.__INV_PILE || 0.8; // pile scale in units of R_in (<1 ⇒ declining rock); TRAPPIST-calibrated
        const T_ACC_COEF = globalThis.__T_ACC || 1.0e4; // accretion-heating temperature coefficient; sets the ice (T_acc<270) transition
        const R_pile = Math.max(INV_PILE_SCALE * R_in, 1e-9);
        const norm = R_pile * (Math.exp(-R_in / R_pile) - Math.exp(-R_outer / R_pile));
        if (!(norm > 0))
            return { total: 0, rock: 0, ice: 0 };
        const Sig_pile = solid * Math.exp(-r / R_pile) / (2 * Math.PI * r * norm); // ∝ r⁻¹·e^(−r/R_pile), declining
        const Sig_rock = Sig_pile * COMP_F_ROCK; // refractory: tracks the pile (declines)
        // ICE is TEMPERATURE-gated, not snow-line-gated. The pile is heated by planetesimal accretion —
        // T_acc ∝ (Σ_rock·Ω²)^¼, high where rock piles densely, dropping as the rock declines outward. Ice
        // can accrete onto the seeds only once T_acc falls below water freezing (~270 K) — i.e. once the rock
        // content has thinned enough (a vaporization threshold like the rock-fission boiling point, NOT a
        // fixed radius). The water comes from the BROAD gas reservoir (extends past the compact rock pile),
        // and the condensed fraction RISES as T_acc drops further below 270. So Σ_solid = high-rock inner →
        // DIP where rock has thinned but T_acc is still > 270 → ice recovery once T_acc < 270 on small seeds.
        const Sig_rock_cgs = Sig_rock * EARTH_G_PER_ME / (AU_CM * AU_CM);
        const Omega2 = G_CGS * (M_star * M_SUN_G) / Math.pow(r * AU_CM, 3); // s⁻²
        const T_acc = T_ACC_COEF * Math.pow(Math.max(Sig_rock_cgs, 1e-30) * Omega2, 0.25); // K
        const ice_frac = (T_acc < 270) ? (1 - T_acc / 270) : 0; // rises as T_acc drops below freezing
        // Water vapour is flux-swept OUTWARD out of the hot inner pile and freezes/piles in the cold zone, so
        // the water reservoir is CONCENTRATED at the cold front (~R_A region), NOT spread over the broad gas
        // disc — that concentration is what lets the ice mantles recover the outer planets to ~1 M⊕.
        const R_gas = (globalThis.__INV_WATER || 2.0) * R_A; // water piled at the cold front (~R_A), TRAPPIST-calibrated
        const gnorm = R_gas * (Math.exp(-R_in / R_gas) - Math.exp(-R_outer / R_gas));
        const Sig_water = (gnorm > 0) ? solid * (1 - COMP_F_ROCK) * Math.exp(-r / R_gas) / (2 * Math.PI * r * gnorm) : 0;
        const Sig_ice = Sig_water * ice_frac;
        const Sig_solid = Sig_rock + Sig_ice;
        if (Sig_solid <= 0)
            return { total: 0, rock: 0, ice: 0 };
        const M_iso = Math.pow(2 * Math.PI * ISO_HILL_C * r * r * Sig_solid, 1.5) / Math.sqrt(3 * M_star_E);
        const fr_loc = Sig_rock / Sig_solid;
        return { total: M_iso, rock: M_iso * fr_loc, ice: M_iso * (1 - fr_loc) };
    }
    // NORMAL / sub-cascade inter-dam: LBP self-similar Σ ∝ r⁻¹·e^(−r/R_c), R_c = centrifugal disc extent.
    const R_c_prof = Math.max(R_c, R_in * 1.0001);
    const norm = R_c_prof * (Math.exp(-R_in / R_c_prof) - Math.exp(-R_outer / R_c_prof));
    if (!(norm > 0))
        return { total: 0, rock: 0, ice: 0 };
    const S_base = solid * Math.exp(-r / R_c_prof) / (2 * Math.PI * r * norm);
    const S_solid = (r > r_visc) ? S_base : S_base * COMP_F_ROCK;
    if (S_solid <= 0)
        return { total: 0, rock: 0, ice: 0 };
    const M_iso = Math.pow(2 * Math.PI * ISO_HILL_C * r * r * S_solid, 1.5) / Math.sqrt(3 * M_star_E);
    return { total: M_iso, rock: M_iso * fr, ice: M_iso * (1 - fr) };
}
function rock_allocation(r, M_star, spin, f_disc, omega) {
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
        let base;
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
        }
        else {
            base = a + sl * r;
        }
        return base * f_trunc + outer_pileup + snow_bump;
    }
    // INVERTED regime: the oligarchic FACTORY (no rock-only "phase", no descent fudge). Rock is
    // refractory and condenses at EVERY radius, so this returns the rock share of the local
    // isolation mass — even outer products carry rock. (See inverted_isolation.)
    return factory_product(r, M_star, om, f_disc).rock;
}
function ice_retention(r, M_star, spin, f_disc, omega) {
    const r_snow = snow_line(M_star, f_disc);
    const r_disc = disc_radius(M_star, spin, omega, f_disc);
    if (r <= r_snow)
        return 0;
    const scale = ETA_ICE_DECAY_FRACTION * r_disc;
    return Math.exp(-(r - r_snow) / scale);
}
function ice_allocation(r, M_star, spin, f_disc, omega) {
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
    if (r <= r_snow)
        return 0;
    const base_ice = sl * (r - r_snow) * F_LODDERS_ICE * ice_retention(r, M_star, spin, f_disc, omega);
    const snow_bump = snow_line_pileup(r, M_star, f_disc);
    // Outer-feeding-zone truncation: same asymmetric pebble-drift mechanism
    // as in rock_allocation. Applied to ice feeding-zone integral.
    const f_trunc = outer_feed_truncation(r, r_disc);
    return base_ice * f_trunc + snow_bump;
}
function total_pebble_bonus_budget(M_star, f_disc) {
    // CONSERVED pebble flux — sourced from the OUTER solids draining inward during the gas epoch
    // (budgetFit sets the captured mass ε_PA·(1−ε_SI)·Z·M_beyond from the beyond-dam reservoir, in
    // the budget's f_rock:1−f_rock ratio; 0 when there's no outer reservoir / it's trapped). It is
    // NOT minted from the inner disc ice (the old "mana" double-counted the disc's own metals).
    if (COMP_PEBBLE_FLUX >= 0)
        return COMP_PEBBLE_FLUX;
    // Sub-cascade fallback (moon disc — no stellar outer zone parked): legacy disc-ice drift flux.
    const disc_ice = f_disc * COMP_Z * (1 - COMP_F_ROCK) * m_star_earth(M_star);
    return disc_ice * PEBBLE_CAPTURE_EFFICIENCY;
}
function pebble_allocation_weight(r, M_star, f_disc) {
    const r_snow = snow_line(M_star, f_disc);
    const delta = r - r_snow;
    if (delta <= 0)
        return 0;
    return Math.pow(delta, -0.5);
}
// PEBBLE FLUX COMPETITION — the recycled solid budget drifts inward through the gas and is captured
// gravitationally by whatever cores exist when it passes. The flux enters at the dam, sweeps outer→
// inner; each core grabs a Hill-regime fraction εⱼ ∝ (M/M*)^⅔ (grows with mass → runaway → pebble
// isolation), and the remainder drifts on. Pebbles only lose angular momentum INSIDE the gas, so the
// drift is gated by the magnetic-braking consumption front R_inner(t) marching out from R_A: a core
// captures only while still in the gas (t < tedge(r)); a core too close to the edge is overtaken
// before it forms (tedge < tcrit) ⇒ nothing. When gas→0 the drift halts and the leftover reservoir
// freezes out as the KBO budget. Returns { cap: per-slot captured M⊕, residual: leftover→KBO }.
function pebble_competition(sinks, M_peb0, M_star, R_disc, f_disc, omega) {
    const cap = {};
    for (const s of sinks)
        cap[s.n] = 0;
    if (!(M_peb0 > 0) || sinks.length === 0)
        return { cap, residual: Math.max(0, M_peb0) };
    const R_inner = gas_inner_edge(M_star, R_disc, f_disc); // gas (hence pebble-drift) inner edge
    const M_star_E = m_star_earth(M_star);
    const W = wind_flux(M_star);
    // 1/k_star is the gas-density decay time (P(t)=e^{−k_star·t}) that gates the inward drift. The star
    // is NOT a pebble sink: pebbles are solids — what existing planets don't intercept stays as residual
    // (→ KBOs when the drift halts). So early, when only the first-formed core exists, it eats the whole
    // unobstructed flux; the residual freezes out once the gas (hence the drift) is gone.
    const k_star = STELLAR_EAT_COEF * W / (Math.PI * Math.max(R_disc * R_disc, 1e-12));
    const T_consume = 1.0 / Math.max(k_star, 1e-30);
    // Drift conductance scales R_disc^-1.5 (Sol-anchored): the drift TIME to cross the disc is
    // T_drift ~ R_disc/v_drift ∝ R_disc^1.5 (v_drift ∝ η·v_K ∝ √(M/R_disc)), while the gas lifetime
    // 1/k_star ∝ R_disc². So the delivered fraction 1-exp(-K_eff/k_star) ∝ √R_disc — NOT R_disc² (a
    // constant K gives R_disc², over-penalising compact discs by R_disc^2.5; e.g. ups And 2% vs Sol 78%).
    const K_eff = PEBBLE_DRIFT_K * Math.pow(SOL_R_DISC / Math.max(R_disc, 1e-9), 1.5);
    // OUTSIDE-IN drift filter (see header): the outermost active core gets first crack.
    const front = consumption_front(M_star, omega, f_disc);
    const st = sinks.map(s => ({
        n: s.n, r: s.r, M: Math.max(s.seed, 1e-6), cap: 0,
        tcrit: formation_time(s.r, Math.max(s.seed, 1e-6), M_star, f_disc),
        tedge: front.tedge(s.r),
    })).sort((a, b) => b.r - a.r); // outermost first
    const t_onset = st.reduce((m, x) => Math.max(m, x.tcrit), 0);
    const t_max = Math.max(10 * T_consume, 1.2 * t_onset, 1e-3);
    const N = 3000;
    const dt = t_max / N;
    let M_peb = M_peb0;
    let pile = 0; // BANKED pebbles (traffic jam at the barrier)
    for (let step = 0; step < N && (M_peb > M_peb0 * 1e-9 || pile > M_peb0 * 1e-6); step++) {
        const t = step * dt;
        const P = Math.exp(-k_star * t); // gas-density fraction (drives the drift)
        const released = M_peb * (1.0 - Math.exp(-K_eff * P * dt)); // flux drifting inward this step
        M_peb -= released; // it leaves the reservoir (drift is gas-driven)
        let flux = released; // enters at the dam, swept outer→inner
        let inner = null; // innermost ACTIVE core (eats the pile)
        for (const x of st) { // st is sorted outermost-first
            if (t < x.tcrit || t >= x.tedge)
                continue; // outside [tcrit, tedge]: not formed / edge passed
            // The marching consumption front (tedge, spin-coupled via J̇=Ṁ·Ω·r_A²) is the inner cutoff. The
            // old static R_inner=√(GAS_EDGE_K·W/P) gate was a DUPLICATE inner edge with no spin term — it
            // over-vetoed inner cores in compact discs (55cnc 85→16%, ups And c). Front-only now.
            if (flux > 0) {
                const eps = 1.0 - Math.exp(-PEBBLE_CAPTURE_K * Math.pow(x.M / (3 * M_star_E), 2.0 / 3.0));
                const got = flux * eps;
                x.cap += got;
                x.M += got;
                flux -= got; // remainder drifts further inward
            }
            inner = x; // track the innermost active core
        }
        // TRAFFIC JAM: what passes the innermost core does NOT drain to the star — it piles up at the
        // barrier (the gas inner edge / the innermost giant's bump) and WAITS.
        pile += flux;
        if (inner && pile > 0) {
            const eps_pile = 1.0 - Math.exp(-PEBBLE_CAPTURE_K * Math.pow(inner.M / (3 * M_star_E), 2.0 / 3.0));
            const eat = pile * eps_pile;
            inner.cap += eat;
            inner.M += eat;
            pile -= eat;
        }
        // DRAIN ONTO THE STAR: most of the inward drift is NOT captured (per-planet ε is a few percent,
        // Ormel & Liu 2018); the bulk spirals past the pile and is accreted by the SUN.
        pile -= pile * (1.0 - Math.exp(-PEBBLE_LEAK_FRAC * dt));
    }
    for (const x of st)
        cap[x.n] = x.cap;
    return { cap, residual: M_peb + pile }; // un-drifted reservoir + leftover pile → KBO budget
}
// H/He ENVELOPE — the gas-rich-capturing WINDOW model (the WANT; the shared-budget cap is applied
// system-wide by apply_hydrogen_conservation). Two epochs, one disc-lifetime clock:
//   τ = R_disc³/M·GAS_TRICKLE_COEF — the disc lifetime. The gas drains inward to the star by
//   GRAVITY (v ∝ g ∝ M/r² ⇒ drain time ∝ R³/M), so a FAR dam drains cubically slower and its
//   disc is long-lived. Sol R_disc≈30 ⇒ τ≈3.5 Myr; HR 8799 dam≈117 ⇒ τ≈160 Myr.
//   EPOCH 1 (gas-rich): a runaway core captures the replenished disc for its window (τ − t_form);
//     early formers (Jupiter) capture longest. SHORT-lived disc ⇒ lopsided windows ⇒ steep profile
//     (Jupiter ≫ Saturn, ice giants miss it). LONG-lived disc ⇒ everyone captures ⇒ flat (HR 8799).
//   EPOCH 2 (clearing): the residual drains to the star; post-window cores (ice giants) skim a
//     small slice of the inward through-flow (the pileup). Inner ≳ outer (∝(R_disc/r)^q).
// DAM-WIND SUPPRESSION: the SAME stellar wind that sets the Davis Dam (ram ∝ W/r², W = COMP_FLUX
//   = M⋆^3.54) only partially strips the gas's angular momentum (GAS_WIND_K = its efficiency), so
//   it suppresses capture most where strongest — the INNER giants. Jupiter (close) is zapped most;
//   the outer/far giants are spared because 1/r² beats their (larger) W — which is why HR 8799's
//   distant planets keep their gas. Replaces the abandoned gap-limited / global-ε models.
function hydrogen_capture(core_mass, t_form_myr, spin, r, M_star, f_disc, omega) {
    const om = (omega === undefined) ? spin : omega;
    if (core_mass < 3.0)
        return 0; // gas-capture floor (3 M⊕)
    const M_gas_disc = f_disc * m_star_earth(M_star);
    const r_disc = disc_radius(M_star, spin, om, f_disc);
    // DISC LIFETIME / gorging WINDOW (window model): gas drains inward to the star by GRAVITY, drain time
    // τ = R_disc³/M·COEF — a far dam (HR 8799) drains cubically slower ⇒ long-lived disc; compact Sol short.
    const tau_clock = Math.pow(r_disc, 3) / Math.max(M_star, 1e-9) * GAS_TRICKLE_COEF;
    const inverted_here = is_inverted_budget(M_star) || (alfven_radius(M_star, om) >= r_disc);
    const tau = inverted_here ? tau_clock : Math.max(gas_consumption_time(M_star, f_disc), tau_clock);
    const window = Math.max(0, tau - t_form_myr); // gorging window (Myr)
    // Dam-wind ram suppression (∝ W/r², W = M⋆^3.54 ≡ COMP_FLUX): the wind strips the gas, hardest inside.
    const W = (COMP_FLUX > 0) ? COMP_FLUX : Math.pow(Math.max(M_star, 1e-9), 3.54);
    const wind_suppression = 1.0 / (1.0 + GAS_WIND_K * W / Math.max(r * r, 1e-6));
    // INCREASING-INEFFICIENCY (self-limiting) gorge: instead of a LINEAR window gorge (rate·window), the
    // accumulation rate falls as the body grows (its spin runs down / its magnetosphere expands), so it eats
    // LESS efficiently the bigger it gets: dM/dt = A·(core/M)^c. Closed form (no loop):
    //   M_final = [core^(1+c) + (1+c)·A·window]^(1/(1+c)),  A = GAS_CAPTURE_RATE·wind_suppression.
    // c = 0 recovers the original linear window gorge exactly; c > 0 is the self-limit that tames the inner
    // giant's runaway and lets a long-window disc (HR 8799) saturate its giants to ~equal masses.
    const A = GAS_CAPTURE_RATE * wind_suppression;
    const c = GAS_SELFLIMIT_C;
    const M_final = Math.pow(Math.pow(Math.max(core_mass, 1e-12), 1 + c) + (1 + c) * A * window, 1.0 / (1 + c));
    const gorge = Math.max(0, M_final - core_mass);
    // Epoch-2 clearing pileup (the ice-giant skin; negligible vs a gorging giant).
    const pileup = GAS_PILEUP_EFF * M_gas_disc
        * Math.pow(Math.max(r_disc, 1e-9) / Math.max(r, 1e-9), GAS_PILEUP_Q) * wind_suppression;
    return gorge + pileup; // the WANT; shared budget cap applied in apply_hydrogen_conservation
}
