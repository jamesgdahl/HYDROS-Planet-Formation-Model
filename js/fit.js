"use strict";
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
function half_site_allowed(p, M_star) {
    const HALF_GAP = 1 / Math.sqrt(CASCADE_RATIO) - 1; // 0.3089 of r
    const m = Math.max(p.observed || 0, 1e-3);
    const rh_mut = 1.154 * Math.pow((2 * m * (3e-6 / M_PRIM_TO_MSUN)) / (3 * M_star), 1 / 3);
    return HALF_GAP / rh_mut >= 7.0;
}
// All candidate formation sites: the full rungs, plus (inverted regime
// only) the interstitial midpoints at r_n·√ρ.
function cascade_sites(M_star, spin, min_slots, omega, f_disc) {
    const slots_r = cascade_slot_positions(M_star, spin, min_slots, omega, f_disc);
    const sites = slots_r.map((r, n) => ({ n, r, interstitial: false }));
    const om_s = (omega === undefined) ? spin : omega;
    const inverted = alfven_radius(M_star, om_s) >= disc_radius(M_star, spin, om_s, f_disc);
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
    return sites;
}
function assign_planets_to_slots(planets, M_star, spin, f_disc, omega) {
    const observed = planets.filter(p => (p.observed || 0) > 0);
    const sites = cascade_sites(M_star, spin, observed.length, omega, f_disc);
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
    const pair_score = (p, n) => {
        if (sites[n].interstitial && !half_site_allowed(p, M_star))
            return 1e9;
        return Math.abs(Math.log(p.r) - Math.log(slots_r[n]));
    };
    const n_sites = sites.length;
    const assignments = new Array(n_sites).fill(null);
    const unassigned = observed.slice();
    while (unassigned.length) {
        let best = null;
        for (const p of unassigned) {
            for (let n = 0; n < n_sites; n++) {
                if (assignments[n] !== null)
                    continue;
                const s = pair_score(p, n);
                if (s >= 1e9)
                    continue; // gated interstitial
                if (best === null || s < best.score)
                    best = { score: s, planet: p, n };
            }
        }
        if (!best)
            break;
        assignments[best.n] = best.planet.name;
        unassigned.splice(unassigned.indexOf(best.planet), 1);
    }
    // Output: every full rung (filled or lost, as before) plus OCCUPIED
    // interstitials. Empty interstitials are optional sites, not lost
    // planets — they produce no rows and carry no score cost.
    const out = [];
    for (let n = 0; n < n_sites; n++) {
        if (assignments[n] !== null) {
            const p = planets.find(q => q.name === assignments[n]);
            out.push({
                slot_n: sites[n].n, slot_r: sites[n].r, filled: true,
                interstitial: sites[n].interstitial,
                name: p.name, r_obs: p.r, observed: p.observed || 0,
                slot_predicted_mass: slot_pred[n],
            });
        }
        else if (!sites[n].interstitial) {
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
const STRIP_RT_C = 0.28;
const STRIP_RT_EXP = -0.32; // Breslau et al. 2014
const STRIP_STIR_IN = 0.5; // stirred zone inner edge, fraction of r_t
const STRIP_L0 = 0.6; // max stirred-zone loss fraction (at r_t)
const STRIP_F_IN = 0.15; // fraction of freed inventory captured inward
const STRIP_SWEEP = 0.8; // per-body sweep-up capture probability
function stripping_radius(M_star, cfg) {
    return STRIP_RT_C * cfg.q
        * Math.pow(cfg.M_pert / M_star, STRIP_RT_EXP);
}
function slot_aware_fit(planets, M_star, spin, f_disc, opts) {
    opts = opts || {};
    const auto_compress = (opts.auto_compress !== false);
    const bisect_tol = opts.bisect_tolerance || 1e-5;
    const max_iter = opts.max_iterations || 100;
    // Primordial spin factor for the accretion clock (≡1 at Sol). formation_time reads
    // this; it scales the Myr accretion time off Sol to the orbital-period cascade.
    set_form_spin((spin && spin > 0) ? spin : 1.0);
    // All observed bodies participate in the cascade — consistent with
    // the framework's predicted-stellar-companion patterns (HD 60532, etc.).
    // The stellar-mass label is preserved in classification but doesn't
    // exclude bodies from cascade fitting.
    const external_bodies = []; // no bodies excluded by mass anymore
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
        ? planets.filter(p => !p.core && (p.observed || 0) >= 0)
        : planets.filter(p => p.kbo && (p.observed || 0) >= 0);
    // CORE COMPONENTS: catalog-flagged central fragments (co-primaries). Excluded
    // from the cascade fit entirely (no slot, no anchor weight, no target) — they
    // belong to the core that DRIVES the dams, not the products it forms.
    const core_bodies = planets.filter(p => !!p.core && (p.observed || 0) > 0);
    const observed_all = all_factory ? []
        : planets.filter(p => !p.kbo && !p.core && (p.observed || 0) > 0);
    if (auto_compress && (spin === undefined || spin === null)) {
        // Anchor search sees only the interior population — KBOs and core
        // components carry no weight in the cascade geometry.
        spin = auto_spin_with_anchor_search(planets.filter(p => !p.kbo && !p.core), M_star, f_disc).spin;
    }
    else if (spin === undefined || spin === null) {
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
        ? spin : opts.omega;
    const R_A_now = alfven_radius(M_star, omega);
    const inverted = R_A_now >= disc_radius(M_star, spin, omega, f_disc);
    // Only the DEEP void (r < 0.5 R_A) is exclusion-eligible: the dam
    // edge is not razor-sharp, and marginal cases remain fittable.
    const VOID_DEPTH = 0.5;
    const void_bodies = inverted ? []
        : observed_all.filter(p => p.r < VOID_DEPTH * R_A_now);
    const disc_planets = inverted ? observed_all
        : observed_all.filter(p => p.r >= VOID_DEPTH * R_A_now);
    const slot_data = assign_planets_to_slots(disc_planets, M_star, spin, f_disc, omega);
    const planet_by_slot = {};
    for (const s of slot_data) {
        if (s.filled) {
            planet_by_slot[s.slot_n] = disc_planets.find(q => q.name === s.name);
        }
    }
    // fit_r: ON-SLOT DOCTRINE — planets form at their slots exactly, so
    // cascade allocation is evaluated at slot_r for everyone. Observed
    // minus slot position is post-formation displacement (the event
    // ledger), not a formation input. Nearest-site machinery retained for
    // migration tagging.
    const sites_pre = cascade_sites(M_star, spin, disc_planets.length, omega, f_disc);
    const R_disc_local = sites_pre.length ? sites_pre[0].r : 0;
    const nearest_site_n = (r_obs) => {
        const log_obs = Math.log(r_obs);
        let nearest = sites_pre.length ? sites_pre[0].n : 0, best = Infinity;
        for (const st of sites_pre) {
            const d = Math.abs(log_obs - Math.log(st.r));
            if (d < best) {
                best = d;
                nearest = st.n;
            }
        }
        return nearest;
    };
    const fit_r = (s) => s.slot_r;
    const sl = slope(M_star, f_disc);
    const pebble_total = total_pebble_bonus_budget(M_star, f_disc);
    // Pebble bonus allocation across gas-eligible slots
    const cores = {};
    for (const s of slot_data) {
        const r = fit_r(s);
        cores[s.slot_n] = rock_allocation(r, M_star, spin, f_disc, omega)
            + ice_allocation(r, M_star, spin, f_disc, omega);
    }
    const weights = {};
    for (const s of slot_data) {
        const r = fit_r(s);
        const tf_casc = formation_time(r, cores[s.slot_n], M_star, f_disc);
        const eligible = (cores[s.slot_n] > gas_threshold_mass(r, M_star, f_disc)) && (tf_casc < gas_dispersal_time(M_star, f_disc));
        weights[s.slot_n] = eligible ? pebble_allocation_weight(r, M_star, f_disc) : 0.0;
    }
    const total_w = Object.values(weights).reduce((a, b) => a + b, 0);
    const pebble = {};
    for (const s of slot_data) {
        pebble[s.slot_n] = total_w > 0 ? pebble_total * weights[s.slot_n] / total_w : 0;
    }
    // AVAILABILITY CAP — mass = min(accretion potential, availability). The AAF
    // (rock+ice) is the local accretion POTENTIAL; the standing wave concentrates
    // only so much MATERIAL at each slot (availability = the disc-solid budget
    // shared out by waveform amplitude). An accreted core can't exceed the
    // material present, so core = min(potential, availability). This caps the
    // over-predicted outer cores (Uranus' AAF solid ~18.8 → ~11.9), opening the
    // room the H/He envelope then fills, while potential-limited slots (the
    // terrestrials) are untouched (min = potential). NORMAL accretors only:
    // fragments (collapse, unbounded) and the inverted factory bypass the cap.
    const avail_amp = (rr) => Math.pow(Math.min(rr, R_disc_local) / Math.max(R_disc_local, 1e-9), rr > snow_line(M_star, f_disc) ? INV_ICE_DESCENT : INV_ROCK_DESCENT);
    let avail_sumA = 0;
    for (const s of slot_data)
        if (fit_r(s) > 0)
            avail_sumA += avail_amp(fit_r(s));
    const disc_solid_budget = f_disc * m_star_earth(M_star) * COMP_Z;
    const cap_active = !inverted && !COMP_FRAGMENTING && R_disc_local > 0 && avail_sumA > 0;
    const availability_of = (rr) => cap_active ? disc_solid_budget * avail_amp(rr) / avail_sumA : Infinity;
    // First pass: identify migrants for MISSING-slot attribution.
    // Nearest checks run over all candidate sites (rungs + interstitials).
    const migrants = [];
    for (const s of slot_data) {
        if (!s.filled)
            continue;
        const p = planet_by_slot[s.slot_n];
        if (nearest_site_n(p.r) !== s.slot_n)
            migrants.push(p.name);
    }
    const results = [];
    for (const s of slot_data) {
        const n = s.slot_n;
        const r = fit_r(s);
        let rock = rock_allocation(r, M_star, spin, f_disc, omega);
        let ice = ice_allocation(r, M_star, spin, f_disc, omega);
        // Pebbles are a drift flux of the SAME bulk composition — fold them into
        // their constituent rock/ice (f_rock : 1−f_rock = 22%:78% for Sol) rather
        // than carrying a separate component. peb stays 0 (the field is retained for
        // the type, but pebbles no longer appear in results).
        rock += COMP_F_ROCK * pebble[n];
        ice += (1 - COMP_F_ROCK) * pebble[n];
        let peb = 0;
        let core = rock + ice + peb;
        // POTENTIAL core (pre-cap): the formation clock and the gas runaway are set by the
        // accretion the body actually did over time — NOT by the availability cap on the final
        // solid. Capping the core here shrank t_form (Jupiter 1.6 → 0.9 Myr) and blew the gas
        // window wide open. So the clock + gas read potential_core; only the SOLID is capped.
        const potential_core = core;
        // Cap the accreted core at the available material (preserve rock:ice ratio).
        const availability = availability_of(r);
        if (core > availability && core > 0) {
            const cap_k = availability / core;
            rock *= cap_k;
            ice *= cap_k;
            peb *= cap_k;
            core = availability;
        }
        const in_void = false;
        const observed = s.filled ? s.observed : 0;
        // Inverted bodies CAN become gas giants too — if the aggregate core
        // reaches the gas threshold and an envelope is available (an inverted hot
        // Jupiter). So no special suppression: gas-eligible on core mass alone.
        const gas_eligible = (potential_core > gas_threshold_mass(r, M_star, f_disc));
        // Strip detection: filled slots use observed mass as escape gate;
        // lost slots use primordial core mass (what would have been there).
        // Lost-slot predictions then reflect post-strip survival mass.
        const mass_for_strip_gate = s.filled ? (planet_by_slot[n].observed || 0) : core;
        const strip_r = s.filled ? planet_by_slot[n].r : r;
        const stripped = is_stripped({ r: strip_r, observed: mass_for_strip_gate }, M_star);
        let t_form, h_he, total;
        // Outward-migrant gas giants: t_form capped at the giant-pair
        // destabilization window (~2 Myr).
        const MIGRATION_T_FORM_CAP = 2.0;
        const is_outward_migrant = s.filled
            && R_disc_local > 0
            && planet_by_slot[n]
            && planet_by_slot[n].r > R_disc_local * 1.5;
        const t_form_hi = is_outward_migrant ? MIGRATION_T_FORM_CAP : 50.0;
        // ISU (immutable) handling:
        //  - If ANY planet is ISU, only ISU planets bisect t_form; non-ISU
        //    use cascade-default t_form so observed vs primordial surfaces
        //    post-formation modifications (impact loss, late delivery).
        //  - If NO planet is ISU, all gas-eligible bisect t_form (no
        //    diagnostic mode — just consensus fit to observed).
        const is_immutable_planet = s.filled
            && planet_by_slot[n] && planet_by_slot[n].immutable;
        const any_isu = Object.values(planet_by_slot).some(p => p && p.immutable);
        const should_bisect_t_form = s.filled && observed > 0
            && (is_immutable_planet || !any_isu);
        if (!gas_eligible) {
            // Sub-threshold rocky: total = core, t_form from cascade (potential core).
            t_form = formation_time(r, potential_core, M_star, f_disc);
            h_he = 0;
            total = core;
        }
        else if (should_bisect_t_form) {
            // Bisect t_form to fit the FORMATION mass: observed minus any
            // devour credit (meals are post-prediction mass — a migrant fit
            // to its post-meal total would be an invalid formation).
            const credit_n = (opts.devour_credit && s.filled
                && opts.devour_credit[s.name]) || 0;
            const target_mass = Math.max(core * 1.0001, observed - credit_n);
            let lo = 0.01, hi = t_form_hi;
            t_form = (lo + hi) / 2;
            h_he = 0;
            total = core;
            for (let i = 0; i < max_iter; i++) {
                h_he = hydrogen_capture(core, t_form, spin, r, M_star, f_disc, omega);
                total = core + h_he;
                const err = (total - target_mass) / target_mass;
                if (Math.abs(err) < bisect_tol)
                    break;
                if (total > target_mass)
                    lo = t_form;
                else
                    hi = t_form;
                t_form = (lo + hi) / 2;
            }
            if (is_outward_migrant && t_form >= MIGRATION_T_FORM_CAP * 0.99) {
                t_form = MIGRATION_T_FORM_CAP;
                h_he = hydrogen_capture(core, t_form, spin, r, M_star, f_disc, omega);
                total = core + h_he;
            }
        }
        else {
            // FORWARD (no fit): the clock runs on the potential core (full accretion time), so
            // the gas window isn't artificially widened by the cap. Gas sits on the capped solid.
            t_form = formation_time(r, potential_core, M_star, f_disc);
            h_he = hydrogen_capture(potential_core, t_form, spin, r, M_star, f_disc, omega);
            total = core + h_he;
        }
        // Snapshot PRIMORDIAL composition (with cascade-default t_form, no
        // bisection, no stripping) — used by classifier for diagnostic tags.
        const t_form_p = formation_time(r, potential_core, M_star, f_disc);
        const h_he_p = gas_eligible
            ? hydrogen_capture(potential_core, t_form_p, spin, r, M_star, f_disc, omega) : 0;
        const primordial = {
            rock, ice, pebble: peb, h_he: h_he_p,
            core, total: core + h_he_p,
        };
        // Apply mantle stripping: small rocky planets inside the strip zone
        // lose envelope, ice, and mantle down to the iron-core floor.
        if (stripped) {
            const [rk2, ic2, pb2, hh2] = apply_mantle_stripping(rock, ice, peb, h_he, strip_r, M_star);
            rock = rk2;
            ice = ic2;
            peb = pb2;
            h_he = hh2;
            core = rock + ice + peb;
            total = core + h_he;
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
            }
            else {
                migrated_flag = (nearest_site_n(p.r) !== n);
            }
        }
        const r_snow_now = snow_line(M_star, f_disc);
        const interpretation = classify_slot({
            filled: s.filled, slot_r: s.slot_r, r_used: r_used_class,
            observed, stripped, predicted: total,
            rock, ice, pebble: peb, h_he,
        }, primordial, r_snow_now, migrated_flag, migrants);
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
    // Gravitational stripping transform (flagged systems only): edit
    // the baseline predictions in the encounter's three zones, then
    // recompute residual bookkeeping. Runs BEFORE the dynamical
    // detectors (they should see the post-encounter state) and before
    // protostellar consumption (innermost slots are far below r_stir).
    let stripping_freed = 0; // freed encounter inventory (void rows read it)
    if (opts.stripping && opts.stripping.q !== null
        && opts.stripping.q !== undefined) {
        const r_t = stripping_radius(M_star, opts.stripping);
        const r_stir = STRIP_STIR_IN * r_t;
        let freed = 0;
        for (const s of results) {
            if (s.external || s.remnant)
                continue;
            if (s.slot_r > r_t) {
                if (!s.filled) {
                    freed += s.predicted;
                    s.predicted = 0;
                    s.rock = 0;
                    s.ice = 0;
                    s.pebble = 0;
                    s.core = 0;
                    s.h_he = 0;
                    s.interpretation = "stripped by stellar encounter (exterior to"
                        + " r_t = " + r_t.toFixed(2) + " AU; inventory removed)";
                }
                else {
                    s.interpretation += " [exterior to encounter truncation r_t = "
                        + r_t.toFixed(2) + " AU — survival requires post-encounter"
                        + " arrival or a wide periapsis]";
                }
            }
            else if (s.slot_r > r_stir) {
                const L = STRIP_L0 * (s.slot_r - r_stir) / (r_t - r_stir);
                const loss = s.predicted * L;
                freed += loss;
                const keep = 1 - L;
                s.predicted *= keep;
                s.rock *= keep;
                s.ice *= keep;
                s.pebble *= keep;
                s.core *= keep;
                s.h_he *= keep;
                if (!s.filled) {
                    s.interpretation += " (encounter-stirred: "
                        + (L * 100).toFixed(0) + "% lost)";
                }
            }
        }
        // Asymmetric-split fragment: the freed inventory follows the
        // 5%/95% inward/outward rule (the same split that delivers Theia
        // and the Mars survivor in Sol), and the inward share can arrive
        // as a single coherent fragment flung far below its source. A
        // small filled body near/under the Alfvén dam, far inside its
        // assigned site, whose mass sits at the inward share of the freed
        // total (4-10%) IS that fragment — its mass and position are
        // encounter output, not fit error (remnant semantics).
        // HD 20794 b: 2.7 M⊕ = 4.6% of the 58 M⊕ freed inventory, parked
        // at 0.121 AU = 0.89 R_A, at 0.23x its nearest site.
        const R_A_here = alfven_radius(M_star, omega);
        for (const s of results) {
            if (!s.filled || s.external || s.remnant)
                continue;
            const m = s.observed;
            if (m <= 0 || freed <= 0)
                continue;
            const frac = m / freed;
            const p_obj = planet_by_slot[s.slot_n];
            const r_obs = p_obj ? p_obj.r : s.r_used;
            if (r_obs < 1.2 * R_A_here && r_obs < 0.4 * s.slot_r
                && frac >= 0.04 && frac <= 0.10) {
                s.remnant = true;
                s.predicted = m;
                s.err_pct = 0;
                s.implied_dM = 0;
                s.interpretation = "encounter fragment: ~"
                    + (frac * 100).toFixed(1) + "% of the stripped inventory ("
                    + freed.toFixed(1) + " M⊕) — the inward share of the 5%/95%"
                    + " split, flung under the dam to " + r_obs + " AU";
            }
        }
        // Debris rains inward; filled bodies inside r_stir sweep it up in
        // order, outermost first.
        const gainers = results
            .filter(s => !s.external && !s.remnant && s.filled
            && s.slot_r <= r_stir)
            .sort((a, b) => b.slot_r - a.slot_r);
        if (gainers.length > 0 && freed > 0) {
            const shares = gainers.map((_, i) => STRIP_SWEEP * Math.pow(1 - STRIP_SWEEP, i));
            const tot = shares.reduce((a, b) => a + b, 0);
            const budget = STRIP_F_IN * freed;
            gainers.forEach((s, i) => {
                const dm = budget * shares[i] / tot;
                s.predicted += dm;
                s.rock += dm;
                s.core += dm;
            });
        }
        for (const s of results) {
            if (s.external || s.remnant)
                continue;
            s.err_pct = s.observed > 0
                ? ((s.predicted - s.observed) / s.observed * 100) : 0;
            s.implied_dM = (s.filled && s.observed > 0)
                ? (s.observed - s.predicted) : 0;
        }
        stripping_freed = freed;
    }
    // Impact-merger detection — retention scales with impact energy,
    // and impact energy scales with orbital velocity difference between
    // outer and inner slots. Adjacent slots → low energy → high retention
    // (clean merger). Distant slots → high energy → low retention (iron-
    // enriched survivor, mantle stripped).
    const IMPACT_MASS_TOLERANCE = 0.20;
    for (let i = 0; i < results.length - 1; i++) {
        const outer = results[i], inner = results[i + 1];
        if (!outer.filled || inner.filled)
            continue;
        if (outer.observed <= 0)
            continue;
        const rocky_combined = outer.primordial.rock + outer.primordial.ice + outer.primordial.pebble +
            inner.primordial.rock + inner.primordial.ice + inner.primordial.pebble;
        if (rocky_combined <= 0)
            continue;
        // Impact retention model (on-slot calibration):
        //   v_orbit(r) = 29.785 · √(M_star/r)  [km/s; r in AU, M_star in M_sun]
        //   v_esc(M)   = 11.186 · M^(1/3)      [km/s; M in M_E, rocky]
        //   retention = max(0.05, 0.969 - 0.605 · Δv/v_esc)
        // Two anchors, two constants, both at SLOT-radius allocations:
        //   Mercury–Vulcan (Sol slots 8/9, combined 0.789 M_E primordial):
        //     Δv≈15.4 km/s, v_esc≈10.3 → ratio≈1.49 → retention 0.070
        //   Tau Ceti e (slots 1.5/2, combined 4.90 M_E primordial):
        //     ratio≈0.275 → retention 0.803
        // Intercept 0.969 < 1: even the gentlest merger sheds percent-level
        // ejecta. The old (0.3 floor, 0.37 slope) carried the observed-radius
        // conflation and underestimated primordial masses.
        const v_orbit_r = (r) => (29.785 * Math.sqrt(M_PRIM_TO_MSUN)) * Math.sqrt(M_star / r);
        const dv = Math.abs(v_orbit_r(inner.slot_r) - v_orbit_r(outer.slot_r));
        const v_esc = 11.186 * Math.pow(rocky_combined, 1.0 / 3.0);
        const retention_model = v_esc > 0
            ? Math.max(0.05, 0.969 - 0.605 * dv / v_esc)
            : 0.05;
        const expected = retention_model * rocky_combined;
        const merge_err = Math.abs(expected - outer.observed) / outer.observed;
        if (merge_err < IMPACT_MASS_TOLERANCE) {
            const retention_obs = outer.observed / rocky_combined;
            inner.interpretation = `impacted ${outer.name}`;
            const suffix = retention_obs < 0.5 ? ", iron-enriched" : "";
            outer.interpretation = `merger (absorbed slot ${inner.slot_n}${suffix})`;
        }
    }
    // Mutual-eviction detection: adjacent MISSING slots both predicting
    // brown-dwarf-or-larger mass cannot coexist (Sep/R_H,mutual << 3.5).
    const M_BROWN_DWARF_LOCAL = 4131.0;
    for (let i = 0; i < results.length - 1; i++) {
        const outer = results[i], inner = results[i + 1];
        if (outer.filled || inner.filled)
            continue;
        if (outer.predicted < M_BROWN_DWARF_LOCAL
            || inner.predicted < M_BROWN_DWARF_LOCAL)
            continue;
        const m_sum = outer.predicted + inner.predicted;
        const a_avg = (outer.slot_r + inner.slot_r) / 2;
        const R_H_mutual = a_avg * Math.pow(m_sum * (3e-6 / M_PRIM_TO_MSUN) / (3 * M_star), 1.0 / 3.0);
        const sep = outer.slot_r - inner.slot_r;
        if (sep / R_H_mutual < 3.5) {
            outer.interpretation = `${outer.interpretation.split(' (')[0]} (mutually evicted with slot ${inner.slot_n})`;
            inner.interpretation = `${inner.interpretation.split(' (')[0]} (mutually evicted with slot ${outer.slot_n})`;
        }
    }
    // Lissauer-instability detection: an unfilled slot adjacent to a
    // filled larger neighbor with sep/R_H,mutual < 7 (Lissauer stability
    // limit) was destabilized by mutual Hill instability.
    const LISSAUER_THRESHOLD = 7.0;
    const EJECTION_MASS_FLOOR = 100; // M⊕; gas-giant scale for ejection
    for (let i = 0; i < results.length; i++) {
        const target = results[i];
        if (target.filled || target.external)
            continue;
        if (!target.slot_r || target.slot_r <= 0)
            continue;
        if (target.predicted < 0.05)
            continue;
        for (let j = 0; j < results.length; j++) {
            if (i === j)
                continue;
            const neighbor = results[j];
            if (!neighbor.filled || neighbor.external)
                continue;
            if (Math.abs(neighbor.slot_n - target.slot_n) > 1)
                continue; // adjacent only
            const m_n = Math.max(neighbor.observed, neighbor.predicted);
            const m_t = target.predicted;
            if (m_n <= m_t)
                continue; // neighbor must be larger
            const a_avg = (target.slot_r + neighbor.slot_r) / 2;
            const R_H_mutual = a_avg
                * Math.pow((m_n + m_t) * (3e-6 / M_PRIM_TO_MSUN) / (3 * M_star), 1.0 / 3.0);
            const sep = Math.abs(target.slot_r - (neighbor.r_used || neighbor.slot_r));
            if (sep / R_H_mutual >= LISSAUER_THRESHOLD)
                continue;
            // Δv ≈ v_orbital × √(m_smaller/m_larger), cumulative over encounters
            const v_orbital = (29.785 * Math.sqrt(M_PRIM_TO_MSUN)) * Math.sqrt(M_star / a_avg); // km/s
            const dv_per_encounter = v_orbital * Math.sqrt(m_t / m_n);
            const v_esc = (29.785 * Math.sqrt(M_PRIM_TO_MSUN)) * Math.SQRT2 * Math.sqrt(M_star / a_avg);
            const dv_cumulative = 2.5 * dv_per_encounter;
            const ejected = (m_t >= EJECTION_MASS_FLOOR && dv_cumulative > v_esc);
            const base = target.interpretation.split(' (')[0];
            if (ejected) {
                target.interpretation = `${base} (Lissauer-destabilized by ${neighbor.name}, ejected to interstellar)`;
            }
            else {
                target.interpretation = `${base} (Lissauer-destabilized by ${neighbor.name}, scattered within system)`;
            }
            break;
        }
    }
    // Slot-dispersal detection: any cascade slot within ~10 R_H of a much
    // larger perturber has its zone dispersed by asymmetric Jupiter-style
    // scattering. ROUTING (on-slot doctrine): the zone's consolidated
    // PLANET (>85% of the allocation) is scattered OUTWARD at high
    // velocity — in Sol, the slot-4 planet struck Saturn and the slot-5
    // planet struck Uranus — while the lighter sibling planetesimals
    // scatter inward (Theia to Earth, Borealis to Mars).
    //
    // Quantitative predictions for the inward-scattered sibling survivor:
    //   - Position: r_survivor ≈ r_perturber − 11·R_H (Sol: Jupiter at
    //     5.20 AU, R_H ≈ 0.34 AU → 1.46 AU; Mars observed at 1.524 AU).
    //   - Mass: ~5-10% of the slot's primordial cascade allocation.
    const SCATTER_MASS_RATIO = 10;
    // 11 R_H: matched to SURVIVOR_N_SAFETY (the chaotic zone's own reach).
    // At slot-frame radii Mars sits 10.1 R_H from Jupiter; the old 10
    // threshold was tuned on observed-radius separations.
    const SCATTER_RH_THRESHOLD = 11;
    const SURVIVOR_FRACTION_MAX = 0.15;
    const SURVIVOR_N_SAFETY = 11;
    const SURVIVOR_MASS_FRAC_MIN = 0.05;
    const SURVIVOR_MASS_FRAC_MAX = 0.10;
    const target_perturbers = new Map();
    for (let i = 0; i < results.length; i++) {
        const target = results[i];
        if (!target.slot_r || target.slot_r <= 0)
            continue;
        if (target.external)
            continue;
        if (target.predicted < 0.05)
            continue;
        const tp_obs = planet_by_slot[target.slot_n];
        const target_r = (target.filled && tp_obs && tp_obs.r > 0)
            ? tp_obs.r : target.slot_r;
        const matches = [];
        for (let j = 0; j < results.length; j++) {
            if (i === j)
                continue;
            const perturber = results[j];
            if (!perturber.slot_r || perturber.slot_r <= 0)
                continue;
            if (perturber.external)
                continue;
            const m_perturber = perturber.filled
                ? Math.max(perturber.observed, perturber.predicted)
                : perturber.predicted;
            if (m_perturber < target.predicted * SCATTER_MASS_RATIO)
                continue;
            // TWO EPOCHS: a perturber threatens at its formation seat AND at
            // its observed (arrival) position — a migrated giant murders its
            // new neighborhood too.
            const pp_obs = planet_by_slot[perturber.slot_n];
            const hill = (r) => r
                * Math.pow(m_perturber * (3e-6 / M_PRIM_TO_MSUN) / (3 * M_star), 1.0 / 3.0);
            const epochs = [{ r: perturber.slot_r, epoch: 'formation' }];
            if (perturber.filled && pp_obs && pp_obs.r > 0
                && Math.abs(pp_obs.r - perturber.slot_r) / perturber.slot_r > 0.02) {
                epochs.push({ r: pp_obs.r, epoch: 'arrival' });
            }
            const final_r = (perturber.filled && pp_obs && pp_obs.r > 0)
                ? pp_obs.r : perturber.slot_r;
            const final_RH = hill(final_r);
            const form_r = perturber.slot_r;
            const form_RH = hill(form_r);
            let bm = null;
            for (const ep of epochs) {
                const R_H = hill(ep.r);
                const sep = Math.abs(target_r - ep.r);
                if (sep / R_H >= SCATTER_RH_THRESHOLD)
                    continue;
                if (!bm || sep / R_H < bm.sep / bm.R_H) {
                    bm = { perturber, sep, R_H, perturber_r: ep.r, target_r, target,
                        final_r, final_RH, epoch: ep.epoch, form_r, form_RH };
                }
            }
            if (bm)
                matches.push(bm);
        }
        if (matches.length > 0)
            target_perturbers.set(i, matches);
    }
    // Group single-perturber targets by perturber for the energy-ordering
    // settled-survivor attribution; multi-perturber targets are obliterated.
    //
    // Hill-space compression for distant perturbers: the absolute
    // sep < 10 R_H membership criterion degenerates for massive, distant
    // perturbers — once R_H ≥ a_p/10 (m ≳ 3e-3 M_star), the annulus
    // reaches r = 0 and the entire interior gets attributed (55 Cnc d at
    // 5.96 AU "dispersing" slots at 0.03-0.09 AU). Physically a single
    // perturber's chaotic zone is LOCAL to its orbit; deep-interior
    // orbits are dynamically decoupled (Holman-Wiegert-like interior
    // stability at ~0.27 a_p — the floor preserves Mars at
    // r/r_J = 0.293 with margin). MULTI-perturber targets are exempt:
    // chain relaxation destroys through eccentric excursions whose
    // members physically traverse the interior (HR 8799, Beta Pic, the
    // stellar triples), not through static reach.
    const SCATTER_INTERIOR_FLOOR = 0.27;
    const scatter_groups = new Map();
    const multi_perturbed = [];
    for (const matches of target_perturbers.values()) {
        if (matches.length >= 2) {
            multi_perturbed.push(matches);
        }
        else {
            const m = matches[0];
            if (m.target_r < m.perturber_r
                && m.target_r / m.perturber_r < SCATTER_INTERIOR_FLOOR) {
                continue; // deep-interior: outside the perturber's chaotic zone
            }
            const key = m.perturber.name;
            if (!scatter_groups.has(key))
                scatter_groups.set(key, []);
            scatter_groups.get(key).push(m);
        }
    }
    // Single-perturber attribution: the FURTHEST-from-perturber slot hosts
    // the settled survivor; closer slots are scattered deeper.
    for (const [perturberName, group] of scatter_groups) {
        if (group.length === 0)
            continue;
        let settled = group[0];
        for (const g of group) {
            if (Math.abs(g.target_r - g.perturber_r)
                > Math.abs(settled.target_r - settled.perturber_r)) {
                settled = g;
            }
        }
        // Survivors settle inside the band SWEPT by the perturber's zone
        // edge as it moved from formation to final position: the parking
        // spot froze somewhere mid-sweep (Sol: Jupiter's edge swept
        // 1.68 -> 1.46 AU; Mars sits at 1.52).
        const edge_form = settled.form_r - SURVIVOR_N_SAFETY * settled.form_RH;
        const edge_final = settled.final_r - SURVIVOR_N_SAFETY * settled.final_RH;
        const rb_lo = Math.min(edge_form, edge_final);
        const rb_hi = Math.max(edge_form, edge_final);
        const r_boundary = (rb_lo + rb_hi) / 2;
        const boundary_valid = rb_hi > 0;
        for (const g of group) {
            const target = g.target;
            const base = target.interpretation.split(' (')[0];
            const m_survivor_min = target.predicted * SURVIVOR_MASS_FRAC_MIN;
            const m_survivor_max = target.predicted * SURVIVOR_MASS_FRAC_MAX;
            const is_settled_slot = (g === settled);
            if (!target.filled) {
                if (is_settled_slot && boundary_valid) {
                    target.interpretation = `${base} (planet scattered outward by ${perturberName}; sibling survivor predicted ${m_survivor_min.toFixed(2)}-${m_survivor_max.toFixed(2)} M⊕ at ~${rb_lo.toFixed(2)}-${rb_hi.toFixed(2)} AU, the zone edge's swept band)`;
                }
                else if (!boundary_valid) {
                    target.interpretation = `${base} (planet + siblings scattered outward by ${perturberName}, fully dispersed)`;
                }
                else {
                    target.interpretation = `${base} (planet scattered outward by ${perturberName}; sibling planetesimals inward as impactors)`;
                }
            }
            else if (target.observed > 0
                && target.observed < target.predicted * SURVIVOR_FRACTION_MAX) {
                const pct = Math.round(target.observed / target.predicted * 100);
                if (is_settled_slot && boundary_valid) {
                    target.interpretation = `${base} (sibling survivor ~${pct}% of slot — its planet scattered outward by ${perturberName}; sibling predicted ${m_survivor_min.toFixed(2)}-${m_survivor_max.toFixed(2)} M⊕ at ~${rb_lo.toFixed(2)}-${rb_hi.toFixed(2)} AU, the zone edge's swept band)`;
                }
                else {
                    target.interpretation = `${base} (zone dispersed by ${perturberName}, only ~${pct}% remains)`;
                }
            }
        }
    }
    // Multi-perturber attribution: simultaneous scattering by 2+ massive
    for (const matches of multi_perturbed) {
        const target = matches[0].target;
        const base = target.interpretation.split(' (')[0];
        const perturberNames = matches.map(m => m.perturber.name + (m.epoch === 'arrival' ? ' (on arrival)' : '')).join(', ');
        if (!target.filled) {
            target.interpretation = `${base} (totally obliterated by simultaneous scattering: ${perturberNames})`;
        }
        else if (target.observed > 0
            && target.observed < target.predicted * SURVIVOR_FRACTION_MAX) {
            const pct = Math.round(target.observed / target.predicted * 100);
            target.interpretation = `${base} (anomalous remnant ~${pct}%; multi-perturber scattering: ${perturberNames})`;
        }
    }
    // DEVOURED-MASS LEDGER (wrecking class): a giant that migrated
    // inward ACROSS SEATS ate the interior cascade it traversed. The
    // swallowed condensables arrive post-gas-accumulation: they enrich
    // the interior (the anomalous 10-100 M⊕ heavy-element inventories of
    // hot Jupiters; Thorngren et al. 2016) without seeding further
    // envelope capture, so they are reported as a post-formation gain,
    // never folded into the Tanigawa-Ikoma core² term. Within-seat
    // displacement (Jupiter's -0.78 AU) does not qualify; the migrant
    // must have left its seat.
    const wreckers = [];
    for (const s of results) {
        if (!s.filled || s.external || s.exterior)
            continue;
        const p = planet_by_slot[s.slot_n];
        if (!p || !(p.r > 0))
            continue;
        if (nearest_site_n(p.r) === s.slot_n)
            continue; // displaced, not migrated
        if (p.r >= s.slot_r)
            continue; // inward migrants only
        wreckers.push(s);
    }
    const eaten = new Map();
    for (const o of results) {
        if (o.filled || o.external || o.exterior)
            continue;
        if (/scattered outward/.test(o.interpretation))
            continue;
        let leader = null;
        for (const m of wreckers) {
            const pr = planet_by_slot[m.slot_n].r;
            if (o.slot_r < m.slot_r && o.slot_r > pr) {
                if (leader === null || m.slot_r < leader.slot_r)
                    leader = m;
            }
        }
        if (!leader)
            continue;
        // TABLE MANNERS: a migrant cannot swallow a victim larger than its
        // own final self — bigger bodies in the corridor are eviction
        // stories, not meals. And the meal ledger caps below: retained
        // mass cannot dominate the eater's observed mass.
        const m_eater = leader.observed > 0 ? leader.observed : leader.predicted;
        if (o.predicted > m_eater)
            continue;
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
        if (meal.retained + ret * o.predicted > 0.6 * m_eater)
            continue;
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
        }
        else {
            o.interpretation += ` — ${victim_note}`;
        }
    }
    for (const [m, meal] of eaten) {
        if (meal.retained <= 0.1)
            continue;
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
    const REMNANT_MAX_MASS = 30.0; // M⊕ — above this it kept an envelope
    for (const p of void_bodies) {
        const m_obs = p.observed || 0;
        const is_small = m_obs > 0 && m_obs <= REMNANT_MAX_MASS;
        let bound = null;
        if (is_small) {
            let best_d = Infinity;
            for (const s of results) {
                if (s.filled || s.external || s.predicted <= 0)
                    continue;
                const frac = m_obs / s.predicted;
                if (frac < SURVIVOR_MASS_FRAC_MIN || frac > SURVIVOR_MASS_FRAC_MAX)
                    continue;
                const d = Math.abs(Math.log(frac
                    / Math.sqrt(SURVIVOR_MASS_FRAC_MIN * SURVIVOR_MASS_FRAC_MAX)));
                if (d < best_d) {
                    best_d = d;
                    bound = s;
                }
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
                : (is_small && stripping_freed > 0
                    && m_obs / stripping_freed >= 0.04
                    && m_obs / stripping_freed <= 0.12)
                    ? `interior to Alfven Dam (encounter fragment: ~${(m_obs / stripping_freed * 100).toFixed(1)}% of the ${stripping_freed.toFixed(1)} M⊕ encounter-stripped inventory — the inward share of the 5%/95% split, flung under the dam)`
                    : is_small
                        ? `interior to Alfven Dam (Martian-type scatter remnant: ~5-10% of a ${(m_obs / SURVIVOR_MASS_FRAC_MAX).toFixed(0)}-${(m_obs / SURVIVOR_MASS_FRAC_MIN).toFixed(0)} M⊕ parent, stripped and flung under the dam; parent slot indeterminate)`
                        : "interior to Alfven Dam (void: no slot at observed r — delivered inward by scattering or migration; formation slot indeterminate)",
        });
    }
    // CORE COMPONENTS (catalog-flagged): central fragments / co-primaries, NOT
    // slot products. Reported alongside the predicted main star as the system's
    // core, whose summed mass drives the dams + barycentre. predicted := observed.
    for (const p of core_bodies) {
        const m_obs = p.observed || 0;
        const lam_break = breakup_spin(M_star);
        results.push({
            slot_n: -1, slot_r: p.r, r_used: p.r,
            filled: true, name: p.name,
            rock: 0, ice: 0, pebble: 0, core: 0, t_form: 0, h_he: 0,
            predicted: m_obs, observed: m_obs, err_pct: 0, implied_dM: 0,
            stripped: false, in_void: true, external: true, core_component: true,
            primordial: { rock: 0, ice: 0, pebble: 0, h_he: 0, core: 0, total: m_obs },
            interpretation: `core component (co-primary): ${(m_obs / 332946).toFixed(3)} M☉ at ${p.r} AU — a rotational-fragmentation sibling star (λ_break ≈ ${lam_break.toFixed(1)}), not a slot product. With the predicted main star, both masses drive the wind/field dams and the barycentre the products orbit.`,
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
            : disc_radius(M_star, spin, omega, f_disc);
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
            const r_snow_k = snow_line(M_star, f_disc); // pile-up density-gradient snow line (parked)
            // PHASE-3 nebula is a CONSERVED pile (no slots beyond R_A): the marching
            // dam sweeps it up inner-first, so the closest KBO to R_A collects most
            // of the nebula and outer ones are thinning tails — "the nebula used most
            // of its matter to produce the first product."
            // PILE-UP ACCRETION (the second accretion regime). The snow line gates ICE
            // ONLY — rock condenses EVERYWHERE, ice only BEYOND R_snow. So the ROCK budget
            // is distributed across ALL bodies; the ICE budget only across those beyond the
            // line. Inside the line = rock-only; beyond = rock + ice (not ice-only). Within
            // each pile the mass follows the density gradient (Σ_pile ∝ R^−γ, feeding zone
            // ∝ R² ⇒ weight ∝ R^(2−γ), descending outward). Conserves the disc solids;
            // f_disc closes the total to the observed chain.
            const disc_solid = f_disc * m_star_earth(M_star) * COMP_Z;
            // Inverted slots gather FERROMAGNETIC rock preferentially → the pile is rock-
            // ENRICHED vs the bulk f_rock (ties to the ferromagnetic-descent split).
            const rock_frac = Math.min(0.95, COMP_F_ROCK * INV_ROCK_ENRICH);
            const rock_budget = disc_solid * rock_frac;
            const ice_budget = disc_solid * (1 - rock_frac);
            // ROCK descends OUTWARD from the inner pile, consumed inner-first to a flat cap
            // (the b≈c plateau, d cliff). ICE is consumed the SAME way but with a per-slot
            // appetite that GROWS with the feeding zone (∝ r^ICE_FEED_EXP): the inner icy slots
            // (e<f<g) eat the ice budget and the OUTERMOST gets only the dregs — the ice cliff
            // (h). (Stevenson & Lunine cold-trap feeds the ice; the marching factory's depletion
            // is what tapers it — the old crest weighting had no depletion so the outer slot hoarded.)
            const outside = kbo_bodies.filter(p => p.r > r_snow_k);
            const rock_share = {};
            const ice_share = {};
            // ROCK fills the slots inner-first to a SATURATION CAPACITY. Pile-up rock
            // accretion is more efficient than a uniform disc — slot zero's magnetic pull
            // AND the pressure pile-up both concentrate solids — so the innermost slots
            // each saturate at ROCK_SLOT_CAP × (rock budget) and the budget is consumed
            // inward-out: the first slots fill flat (b≈c), then it runs dry mid-slot (the
            // d cliff), and the remaining slots get nothing (rock exhausted).
            const rock_cap = ROCK_SLOT_CAP * rock_budget;
            let rock_left = rock_budget;
            for (const p of [...kbo_bodies].sort((a, b) => a.r - b.r)) {
                const take = Math.min(rock_cap, rock_left);
                rock_share[p.name] = take;
                rock_left -= take;
            }
            let ice_left = ice_budget; // ice consumed inner-icy-first
            for (const p of [...outside].sort((a, b) => a.r - b.r)) {
                const appetite = ICE_SLOT_CAP * ice_budget * Math.pow(p.r / Math.max(r_snow_k, 1e-9), ICE_FEED_EXP);
                const take = Math.min(appetite, ice_left);
                ice_share[p.name] = take;
                ice_left -= take;
            }
            // VINTAGE: the Davis Dam marches OUTWARD through the pile over the disc
            // lifetime, minting each product in turn — so each body's formation epoch is
            // the disc dispersal time × the fraction of the solid budget already swept up
            // inward of it. Inner bodies are the early vintage, outer the late vintage.
            const disp_t = gas_dispersal_time(M_star, f_disc);
            const sorted_in = [...kbo_bodies].sort((a, b) => a.r - b.r);
            const total_solid = sorted_in.reduce((s, p) => s + (rock_share[p.name] || 0) + (ice_share[p.name] || 0), 0) || 1;
            const vintage = {};
            let cum_solid = 0;
            for (const p of sorted_in) {
                cum_solid += (rock_share[p.name] || 0) + (ice_share[p.name] || 0);
                vintage[p.name] = disp_t * cum_solid / total_solid;
            }
            for (const p of kbo_bodies) {
                const rr = p.r, observed = p.observed || 0;
                let rock = rock_share[p.name] || 0; // rock condenses at every radius
                let ice = ice_share[p.name] || 0; // ice only beyond R_snow
                let peb = 0;
                let core = rock + ice + peb;
                const t_form = vintage[p.name]; // marching-dam formation epoch
                let h_he = (core > gas_threshold_mass(rr, M_star, f_disc))
                    ? hydrogen_capture(core, t_form, spin, rr, M_star, f_disc, omega) : 0;
                let total = core + h_he;
                const primordial = { rock, ice, pebble: peb, h_he, core, total };
                const stripped = is_stripped({ r: rr, observed }, M_star);
                if (stripped) {
                    const [rk, ic, pb, hh] = apply_mantle_stripping(rock, ice, peb, h_he, rr, M_star);
                    rock = rk;
                    ice = ic;
                    peb = pb;
                    h_he = hh;
                    core = rock + ice + peb;
                    total = core + h_he;
                }
                const comp = classify_slot({ filled: true, slot_r: rr, r_used: rr, observed, stripped,
                    predicted: total, rock, ice, pebble: peb, h_he }, primordial, r_snow_k, false, migrants);
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
        }
        else {
            // product-mass law, Sol-anchored at the dam face
            const SIGMA_SOL = 0.0103830 * m_star_earth(1.0) / Math.pow(30.07, 2);
            // anchor = TRITON, the firstborn: captured by the dam-keeper at
            // the gate, it is the true at-dam product (zero displacement).
            // Pluto and Eris are lighter -> minted slightly farther out.
            const M_EXT_SOL = 0.00359;
            const sigma_dam = f_disc * m_star_earth(M_star) / (R_dam * R_dam);
            const m_at_dam = M_EXT_SOL * Math.pow(sigma_dam / SIGMA_SOL, 2);
            const t_disc_myr = gas_dispersal_time(M_star, f_disc);
            const R_cliff = 1.6 * R_dam, BETA = 0.138;
            // assembly-line order: earliest vintage first (bigger product =
            // denser supply = earlier; onset ties resolve by mass descending)
            kbo_bodies.sort((a, b) => (b.observed || 0) - (a.observed || 0));
            for (const p of kbo_bodies) {
                const m_obs_k = p.observed || 0;
                const onset = m_obs_k >= m_at_dam * 0.999;
                const R_birth = onset ? R_dam
                    : R_dam * Math.pow(m_at_dam / m_obs_k, 0.25);
                // NUMERIC vintage (Myr) → carried in t_form so the slot column shows it (like
                // the inverted factory products); the era qualifier stays in the description.
                let t_vintage, era;
                if (onset) {
                    t_vintage = t_disc_myr;
                    era = 'firehose onset';
                }
                else if (R_birth <= R_cliff) {
                    t_vintage = t_disc_myr + 3 * (R_birth - R_dam) / (0.6 * R_dam);
                    era = 'firehose';
                }
                else {
                    t_vintage = (t_disc_myr + 3) * Math.pow(R_birth / R_cliff, 1 / BETA);
                    era = 'retreat era';
                }
                const disp = (p.r - R_birth) / R_birth;
                let where;
                if (p.captured !== undefined) {
                    const captor = results.find(s => s.filled && !s.exterior && !s.external && s.slot_n === p.captured);
                    where = `CAPTURED by ${captor ? captor.name : 'slot ' + p.captured}`
                        + (Math.abs(disp) < 0.15 ? ' at the gate (co-orbital, zero displacement)' : '');
                }
                else {
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
                results.push({
                    slot_n: -Math.max(0.01, Math.log(R_birth / R_dam) / Math.log(1 / CASCADE_RATIO)),
                    slot_r: R_birth, r_used: p.r,
                    filled: true, name: p.name,
                    rock: 0, ice: 0, pebble: 0, core: 0,
                    t_form: t_vintage, h_he: 0,
                    predicted: m_obs_k, observed: m_obs_k,
                    err_pct: 0,
                    implied_dM: 0,
                    stripped: false, in_void: false, exterior: true,
                    primordial: { rock: 0, ice: 0, pebble: 0, h_he: 0, core: 0,
                        total: m_obs_k },
                    interpretation: `factory product (${era}) — minted at the dam's outer face when it stood at ${R_birth.toFixed(1)} AU (size-clock); ${where}`,
                });
            }
            // PER-VINTAGE COUNT AUDIT: the census law (stance stock / product
            // mass) gives the expected member count of each represented
            // vintage bin; catalogued members within the x2.5 mass mapping
            // fill it. A shortfall is a SIBLING DEFICIT — same vintage, more
            // members predicted, hiding where the survival law says survivors
            // hide (scattered: high inclination, far from perihelion).
            const C_STOCK = 5.1e-6;
            const stock = C_STOCK * f_disc * m_star_earth(M_star);
            {
                const binned = new Set();
                for (const p of kbo_bodies) {
                    if (binned.has(p))
                        continue;
                    const members = kbo_bodies.filter(pp => Math.abs(Math.log((pp.observed || 1e-12) / (p.observed || 1e-12)))
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
                if (m_t < MENTION_CUTOFF)
                    continue;
                const matched = kbo_bodies.some(pp => Math.abs(Math.log((pp.observed || 1e-12) / m_t)) < Math.log(2.5));
                if (matched)
                    continue;
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
        } // end normal-regime size-clock (else of the inverted branch)
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
        if (victim.filled)
            continue;
        for (const purger of purgers) {
            if (purger.slot_r <= victim.slot_r)
                continue;
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
    const hayashi_radius = (t_myr) => 2.3 * R_SUN_AU * Math.pow(M_star * M_PRIM_TO_MSUN, 2 / 3)
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
            if (s.external || !s.slot_r || s.slot_r <= 0)
                continue;
            if (s.slot_r >= R_prim_AU)
                continue;
            if (!s.filled) {
                const eaten = s.predicted;
                s.predicted = 0;
                s.rock = 0;
                s.ice = 0;
                s.pebble = 0;
                s.core = 0;
                s.h_he = 0;
                s.interpretation = "fallback: slot lies beneath the primary's"
                    + " surface (slot radius " + s.slot_r.toFixed(5)
                    + " AU vs primary radius " + R_prim_AU.toFixed(5) + " AU; "
                    + (eaten * 1000).toFixed(2) + " mE allocation re-accreted"
                    + " by the primary; predicted body mass: zero)";
            }
            else {
                s.interpretation += " [slot beneath the primary's surface"
                    + " — in-situ origin impossible; delivered or migrated]";
            }
        }
    }
    else
        for (const s of results) {
            if (s.external || !s.slot_r || s.slot_r <= 0)
                continue;
            const R_HT = hayashi_radius(s.t_form);
            if (s.slot_r >= R_HT)
                continue;
            if (!s.filled) {
                // The model PREDICTS ZERO PLANET MASS here: the allocation is
                // real, but its destination is the star. Zeroing the prediction
                // also zeroes the slot's missing-planet cost in the brute score
                // — predicting absence where nothing is observed is a success,
                // not a loss.
                const eaten = s.predicted;
                s.predicted = 0;
                s.rock = 0;
                s.ice = 0;
                s.pebble = 0;
                s.core = 0;
                s.h_he = 0;
                s.interpretation = "consumed by the protostar (slot radius "
                    + s.slot_r.toFixed(4) + " AU inside the Hayashi-track photosphere "
                    + R_HT.toFixed(4) + " AU at formation; "
                    + eaten.toFixed(2) + " M⊕ allocation accreted by the star;"
                    + " predicted planet mass: zero)";
            }
            else {
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
        if (s.external || s.exterior || !s.slot_r || s.slot_r <= 0)
            continue;
        if (s.slot_r >= d_roche_AU)
            continue;
        if (s.predicted <= 0 && !s.filled)
            continue; // already consumed
        if (!s.filled) {
            const shredded = s.predicted;
            s.predicted = 0;
            s.rock = 0;
            s.ice = 0;
            s.pebble = 0;
            s.core = 0;
            s.h_he = 0;
            s.interpretation = "Roche-forbidden (slot radius "
                + s.slot_r.toFixed(5) + " AU inside the primary's fluid Roche"
                + " limit " + d_roche_AU.toFixed(5) + " AU; "
                + (shredded * 1000).toFixed(2) + " mE allocation cannot"
                + " consolidate — persists as ring/feed material;"
                + " predicted body mass: zero)";
        }
        else {
            s.interpretation += " [inside the fluid Roche limit ("
                + d_roche_AU.toFixed(5) + " AU) — rigid-body survivor,"
                + " ring shepherd, or later arrival]";
        }
    }
    return {
        slots: results,
        ratio: CASCADE_RATIO,
        R_disc: disc_radius(M_star, spin, omega),
        spin,
    };
}
// ============================================================
//  bestFit — the calibration entry point shared by UI and CLI.
//  One pass = anchor search (spin) followed by f_disc bisection
//  (driving sum(predicted - observed) → 0 over the ISU subset, or
//  over all filled slots when no ISU planets exist). Iterated to a
//  fixed point so spin and f_disc are mutually consistent.
// ============================================================
function bestFit(planets, M_star, f_disc_initial, max_outer_iterations) {
    let f_disc = f_disc_initial;
    let spin = null;
    let anchor_slot = 0;
    let fit = null;
    let converged = false;
    let iterations = 0;
    let target_residual = 0;
    let target_names = [];
    const max_outer = max_outer_iterations || 8;
    const immutable_names = new Set(planets.filter(p => p.immutable).map(p => p.name));
    const sel = (f) => (immutable_names.size > 0
        ? f.slots.filter(s => s.filled && !s.external && !s.remnant && !s.exterior && immutable_names.has(s.name))
        : f.slots.filter(s => s.filled && !s.external && !s.remnant && !s.exterior));
    // Objective mass of a slot: formation prediction plus any devour
    // credit (the meals close the books against observed).
    const objMass = (s) => s.predicted + (s.devoured_credit || 0);
    for (let iter = 0; iter < max_outer; iter++) {
        iterations = iter + 1;
        const ar = auto_spin_with_anchor_search(planets.filter(p => !p.kbo), M_star, f_disc);
        const spin_new = ar.spin;
        anchor_slot = ar.anchor_slot;
        fit = slot_aware_fit(planets, M_star, spin_new, f_disc, { auto_compress: false });
        const totalErr = (f) => sel(f).reduce((a, s) => a + (s.predicted - s.observed), 0);
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
                f_new = fm;
                fit = f2;
                if (Math.abs(e) < tol)
                    break;
                if (e > 0)
                    hi = fm;
                else
                    lo = fm;
            }
            target_residual = Math.abs(totalErr(fit)) / totalTarget;
        }
        const conv = spin !== null
            && Math.abs(f_new - f_disc) / Math.max(f_disc, 1e-12) < 1e-3
            && Math.abs(spin_new - spin) / Math.max(spin_new, 1e-12) < 1e-3;
        spin = spin_new;
        f_disc = f_new;
        if (conv) {
            converged = true;
            break;
        }
    }
    target_names = sel(fit).map(s => s.name);
    return {
        spin: spin, f_disc, anchor_slot, iterations, converged,
        target_residual, target_names, fit: fit,
    };
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
function inverted_signature(planets, M_star) {
    const obs = planets.filter(p => (p.observed || 0) > 0 && !p.kbo)
        .sort((a, b) => a.r - b.r);
    if (obs.length < 3)
        return { compact: false, maxima: 0, likely: false };
    const compact = obs[obs.length - 1].r < 0.2 * disc_radius(M_star, 1.0);
    // Count local mass maxima INCLUDING endpoints — the phase-start "bigs"
    // (rock / ice / nebula) often sit at the ends (the innermost rock product
    // is the first body). ≥2 ⇒ the big-small-big multi-phase fingerprint.
    let maxima = 0;
    for (let i = 0; i < obs.length; i++) {
        const m = obs[i].observed || 0;
        const lok = (i === 0) || m > (obs[i - 1].observed || 0);
        const rok = (i === obs.length - 1) || m > (obs[i + 1].observed || 0);
        if (lok && rok)
            maxima++;
    }
    return { compact, maxima, likely: compact && maxima >= 2 };
}
function bruteFit(planets, M_star, stripping, vice) {
    const BIG = 1e6;
    const K_PENALTY = 1.5;
    const STAGE2_PENALTY = 2.0;
    // KBO-class bodies are a distinct population: they never anchor the
    // cascade and never count toward the interior planet census.
    const obs_disc = planets.filter(p => !p.kbo && (p.observed || 0) > 0);
    const n_obs = obs_disc.length;
    const immutable_names = new Set(planets.filter(p => p.immutable).map(p => p.name));
    const sel = (f) => (immutable_names.size > 0
        ? f.slots.filter(s => s.filled && !s.external && !s.remnant && !s.exterior && immutable_names.has(s.name))
        : f.slots.filter(s => s.filled && !s.external && !s.remnant && !s.exterior));
    // Objective mass of a slot: formation prediction plus any devour
    // credit (the meals close the books against observed).
    const objMass = (s) => s.predicted + (s.devoured_credit || 0);
    const by_name = {};
    for (const p of planets)
        by_name[p.name] = p;
    // Canonical f_disc bisection at a fixed spin: drive the target-sum
    // objective sum(predicted - observed) → 0 (ISU subset, or all filled).
    // When stripping is flagged, q is threaded into every fit evaluation.
    let devour_credit = null;
    const fit_opts = (q, omega) => {
        const o = { auto_compress: false };
        if (stripping && q !== null)
            o.stripping = { M_pert: stripping.M_pert, q };
        if (omega !== undefined)
            o.omega = omega;
        if (devour_credit)
            o.devour_credit = devour_credit;
        return o;
    };
    const bisectF = (spin, q = null, omega) => {
        let f = 0.01;
        let fit = slot_aware_fit(planets, M_star, spin, f, fit_opts(q, omega));
        const totalTarget = sel(fit).reduce((a, s) => a + s.observed, 0);
        if (totalTarget <= 0)
            return { f, fit, residual: 0 };
        let lo = 0.0005, hi = F_DISC_MAX;
        const smallest = sel(fit).reduce((m, s) => Math.min(m, s.observed), Infinity);
        const tol = Math.max(1e-6, 0.001 * smallest);
        let e = Infinity;
        for (let i = 0; i < 60; i++) {
            const fm = Math.sqrt(lo * hi);
            const f2 = slot_aware_fit(planets, M_star, spin, fm, fit_opts(q, omega));
            e = sel(f2).reduce((a, s) => a + (objMass(s) - s.observed), 0);
            f = fm;
            fit = f2;
            if (Math.abs(e) < tol)
                break;
            if (e > 0)
                hi = fm;
            else
                lo = fm;
        }
        return { f, fit, residual: Math.abs(e) / totalTarget };
    };
    // Anchor-family score of a fitted candidate (canonical convention):
    // unassigned·BIG + position residual + missing cost (+ penalties),
    // with stellar-mass empty slots rejected via BIG.
    const scoreFit = (fit, penalty) => {
        let score = penalty;
        let n_filled = 0;
        for (const s of fit.slots) {
            if (s.external || s.exterior)
                continue;
            if (s.filled) {
                n_filled++;
                // Remnant binding: mass and position are scatter output — a
                // satisfied fit contributes no residual (REMNANT_PENALTY in
                // consider() carries the parsimony cost instead). KBO rows are
                // a distinct population with independent inputs — zero cost.
                if (s.remnant || s.exterior)
                    continue;
                const p = by_name[s.name];
                if (p)
                    score += Math.abs(Math.log(p.r / s.slot_r));
            }
            else {
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
                        if (!s2.filled || s2.external || s2.exterior)
                            continue;
                        if (Math.abs(s2.slot_n - s.slot_n) > 2)
                            continue;
                        const p2 = by_name[s2.name];
                        if (!p2 || !(p2.r > 0))
                            continue;
                        if ((p2.observed || 0) >= M_STELLAR_BOUNDARY
                            && p2.r > 3 * s2.slot_r) {
                            eviction_partner = true;
                            break;
                        }
                    }
                    if (eviction_partner) {
                        score += 3 + Math.log10(1 + corpse_cost);
                    }
                    else {
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
                        if (!s2.filled || s2.external || s2.exterior)
                            continue;
                        const p2 = by_name[s2.name];
                        if (!p2 || !(p2.r > 0))
                            continue;
                        if (p2.r < s.slot_r && s.slot_r < s2.slot_r) {
                            in_corridor = true;
                            break;
                        }
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
            if (!s.filled || s.external || s.exterior || s.remnant)
                continue;
            if (!(s.observed > 0))
                continue;
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
            if (g.filled || g.external || g.exterior)
                continue;
            if (g.predicted > m_max_obs) {
                score += BIG;
                break;
            }
        }
        for (const g of fit.slots) {
            if (g.filled || g.external || g.exterior)
                continue;
            const m_g = g.predicted;
            if (m_g <= 0 || m_g <= m_max_obs)
                continue; // removable ghost
            // eviction-partner exemption: a corpse removed EARLY by a mutual
            // eviction (observed stellar partner within two rungs, displaced
            // far outward) never lived alongside the bystanders — its zone
            // threat is moot
            let evict_ok = false;
            for (const s2 of fit.slots) {
                if (!s2.filled || s2.external || s2.exterior)
                    continue;
                if (Math.abs(s2.slot_n - g.slot_n) > 2)
                    continue;
                const p2 = by_name[s2.name];
                if (!p2 || !(p2.r > 0))
                    continue;
                if ((p2.observed || 0) >= M_STELLAR_BOUNDARY
                    && p2.r > 3 * s2.slot_r) {
                    evict_ok = true;
                    break;
                }
            }
            if (evict_ok)
                continue;
            const RH = g.slot_r * Math.pow(m_g * (3e-6 / M_PRIM_TO_MSUN) / (3 * M_star), 1.0 / 3.0);
            for (const s of fit.slots) {
                if (!s.filled || s.external || s.exterior || s.remnant)
                    continue;
                const p = by_name[s.name];
                if (!p || (p.observed || 0) <= 0)
                    continue;
                if (m_g < 10 * Math.max(p.observed || 0, s.predicted))
                    continue;
                if ((p.observed || 0) <= 0.15 * Math.max(s.predicted, 1e-12))
                    continue;
                // TWO EPOCHS: the bystander must be justified at its observed
                // position AND at its formation seat — migrating out of the
                // ghost's zone afterwards does not explain surviving birth
                // inside it at full mass.
                let threatened = false;
                for (const rb of [p.r, s.slot_r]) {
                    if (Math.abs(rb - g.slot_r) >= 11 * RH)
                        continue;
                    if (rb < g.slot_r && rb / g.slot_r < 0.27)
                        continue;
                    threatened = true;
                    break;
                }
                if (!threatened)
                    continue;
                score += BIG; // unjustified existence under this hypothesis
                break;
            }
        }
        return score;
    };
    const topCands = [];
    let best = null;
    let q_pin = null; // fixed-point pass-2 periapsis
    const VOID_PENALTY = 5.0; // per planet relegated to the deep Alfven void
    const REMNANT_PENALTY = 2.0; // per void orphan bound to a parent slot
    // VICE mode: geometry (spin = the density dial, anchor k, stripping q)
    // is selected by the LOCKED scan exactly as in the default mode; omega
    // (inner jaw: R_A, intercept, wind) then refines WITHIN the winning
    // geometry over a breakup-bounded grid. This keeps every validated
    // geometry (Beta Pic 28.4 AU dam, Sol ladder, ...) while letting the
    // physical rotation decouple from the environmental squeeze.
    const evalCandidate = (spin, k, penalty, omega) => {
        // Physicality floor: spin < 0.02 means D < 0.003 — a cloud more
        // diffuse than any star-forming medium, reached only by runaway
        // deep-k anchors on wide stellar companions. Reject.
        if (spin < 0.02)
            return null;
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
        if (!inv_try && nebula_density_from_spin(spin) > MAX_NEBULA_DENSITY)
            return null;
        const n_void_pre = inv_try ? 0
            : planets.filter(p => (p.observed || 0) > 0 && p.r < 0.5 * R_A_try).length;
        const n_eff = n_obs - n_void_pre;
        if (n_eff < 1)
            return null;
        // count SITES (integer + inverted half-steps), not just integer slots —
        // the inverted regime fills two interleaved factory ladders.
        if (cascade_sites(M_star, spin, n_eff, omega).length < n_eff)
            return null;
        // Resolve the stripping periapsis: given q used directly; null q
        // golden-sectioned (in log space) to minimize the mean PER-PLANET
        // |log(pred/obs)| — exactly the quantity the consensus f-bisection
        // cannot see, which is what encounter editing must close.
        const perPlanetJ = (f2) => {
            const rows = f2.slots.filter(s => s.filled && !s.external
                && !s.remnant && s.observed > 0 && s.predicted > 0);
            if (!rows.length)
                return 0;
            return rows.reduce((a, s) => a + Math.abs(Math.log(s.predicted / s.observed)), 0) / rows.length;
        };
        let f, fit, residual;
        let q_used = null, J = 0;
        if (!stripping) {
            ({ f, fit, residual } = bisectF(spin, null, omega));
            if (vice)
                J = perPlanetJ(fit);
        }
        else if (stripping.q !== null && stripping.q !== undefined) {
            q_used = stripping.q;
            ({ f, fit, residual } = bisectF(spin, q_used, omega));
            J = perPlanetJ(fit);
        }
        else if (q_pin !== null) {
            // Fixed-point second pass: all candidates compete at the first
            // pass's winning periapsis.
            q_used = q_pin;
            ({ f, fit, residual } = bisectF(spin, q_used, omega));
            J = perPlanetJ(fit);
        }
        else {
            const GR = 0.6180339887;
            let lo_q = Math.log(1.0), hi_q = Math.log(300.0);
            const evalQ = (lq) => {
                const r = bisectF(spin, Math.exp(lq), omega);
                return { ...r, J: perPlanetJ(r.fit) };
            };
            let x1 = hi_q - GR * (hi_q - lo_q), x2 = lo_q + GR * (hi_q - lo_q);
            let e1 = evalQ(x1), e2 = evalQ(x2);
            for (let i = 0; i < 22; i++) {
                if (e1.J <= e2.J) {
                    hi_q = x2;
                    x2 = x1;
                    e2 = e1;
                    x1 = hi_q - GR * (hi_q - lo_q);
                    e1 = evalQ(x1);
                }
                else {
                    lo_q = x1;
                    x1 = x2;
                    e1 = e2;
                    x2 = lo_q + GR * (hi_q - lo_q);
                    e2 = evalQ(x2);
                }
            }
            const win = e1.J <= e2.J ? { lq: x1, e: e1 } : { lq: x2, e: e2 };
            q_used = Math.exp(win.lq);
            f = win.e.f;
            fit = win.e.fit;
            residual = win.e.residual;
            J = win.e.J;
        }
        // Void accounting AFTER the fit: an orphan bound to a parent slot
        // as a Martian-type remnant is an explained body (cheap), not a
        // void relegation (expensive) — geometries that can name the
        // parent beat geometries that cannot.
        const n_void_rows = fit.slots.filter(s => s.external && s.in_void).length;
        const n_remn = fit.slots.filter(s => s.remnant).length;
        const pen = penalty + VOID_PENALTY * n_void_rows + REMNANT_PENALTY * n_remn;
        // Residual term: candidates whose f-bisection cannot reach the mass
        // target are penalized in proportion (10 × fractional residual), so
        // position alone cannot carry an unfittable configuration. For
        // stripped systems the per-planet term joins the score: encounter
        // editing exists to close individual masses, not just the sum.
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
        return { score, spin, f, k, fit, residual, q: q_used,
            omega: (omega === undefined) ? null : omega, penalty_base: penalty };
    };
    const consider = (spin, k, penalty) => {
        const r = evalCandidate(spin, k, penalty, undefined);
        if (r) {
            topCands.push({ score: r.score, spin, k, penalty_base: penalty });
            topCands.sort((a, b) => a.score - b.score);
            if (topCands.length > 4)
                topCands.length = 4;
        }
        if (r && (best === null || r.score < best.score))
            best = r;
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
                if (outermost.r <= R_disc)
                    continue;
                if ((outermost.observed || 0) > GAS_OBS_THRESHOLD) {
                    const spin_check = spin_for_disc_radius(M_star, R_disc);
                    const wind_term = (spin_check / 30.0) * Math.pow(0.5 / Math.max(R_disc, 0.01), 2);
                    if (1.0 / (1.0 + wind_term) < 0.1)
                        continue;
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
                if (!(spin_anchor > 0.02 && spin_anchor < 1e7))
                    continue;
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
                            if (topCands.length > 4)
                                topCands.length = 4;
                            if (best === null || r.score < best.score)
                                best = r;
                        }
                    }
                }
            }
        }
    };
    runStages();
    // Stripping fixed-point pass: per-candidate golden-section finds
    // LOCAL q optima on a rugged (anchor, q) landscape — pin the winning
    // q and let every anchor family compete at it, so the result is
    // idempotent under q round-tripping (fit(q=null) agrees with
    // fit(q=q*)).
    if (stripping && (stripping.q === null || stripping.q === undefined)
        && best !== null && best.q !== null) {
        q_pin = best.q;
        best = null;
        runStages();
    }
    // VICE omega refinement: breakup-bounded inner-jaw grid evaluated at
    // the locked winner's geometry (spin, k, and its base penalty).
    if (vice && best !== null) {
        const bw = best;
        const ob = breakup_spin(M_star);
        // grid extends DOWN to slow inner jaws: a decoupled rim can sit
        // far inside the geometric lock (deep ladders seating hot giants).
        // Scan the TOP candidates, not just the winner: the lock-frame
        // ranking can invert once the rim is free to move.
        const seeds = [{ spin: bw.spin, k: bw.k, penalty_base: bw.penalty_base || 0 },
            ...topCands];
        const seen = new Set();
        for (const sd of seeds) {
            const key = sd.spin.toFixed(6) + ':' + sd.k;
            if (seen.has(key))
                continue;
            seen.add(key);
            for (const frac of [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.4, 0.65, 1.0]) {
                const r = evalCandidate(sd.spin, sd.k, sd.penalty_base, ob * frac);
                if (r && r.score < best.score)
                    best = r;
            }
        }
    }
    if (best === null) {
        // No candidate satisfied the slot-count constraint; fall back to
        // the inverted-regime spin that the outermost-anchor would give.
        const spin = auto_spin_from_outermost(obs_disc, M_star, 0);
        const { f, fit, residual } = bisectF(spin);
        best = { score: Infinity, spin, f, k: 0, fit, residual, q: null,
            omega: null, penalty_base: 0 };
    }
    let b = best;
    // SECOND PASS — devour-aware refit. If the chosen fit contains
    // wrecking migrants with meals, the migrants' formation seats must
    // be refit to (observed - retained): a migrant fit to its post-meal
    // total is an invalid formation and does not justify its observed
    // existence. Harvest the meals, refit at the chosen (spin, k, q)
    // with credits applied, and iterate once more so the meal masses
    // themselves converge (victims' predictions shift with f).
    for (let pass = 0; pass < 2; pass++) {
        const credits = {};
        let any = false;
        for (const s of b.fit.slots) {
            if (s.filled && s.devoured && s.devoured > 0.1) {
                credits[s.name] = s.devoured;
                any = true;
            }
        }
        if (!any)
            break;
        devour_credit = credits;
        // FIXED-f refit: re-bisecting f here can hop assignment basins and
        // return a fit that was never scored (the B-class-eating-planet
        // failure mode). Hold the winner's f; only the credits change.
        const fit2 = slot_aware_fit(planets, M_star, b.spin, b.f, fit_opts(b.q, b.omega ?? undefined));
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
        }
        else {
            devour_credit = null;
            break;
        }
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
        stripping_q: b.q,
        stripping_rt: (stripping && b.q !== null)
            ? stripping_radius(M_star, { M_pert: stripping.M_pert, q: b.q })
            : null,
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
const SIGN_DRAIN_K = 17.6; // φ = drain fraction of a +slot's solids = K·C² (cap 0.6)
const SIGN_LEAK_K = 6.4; // fraction a −slot passes further inward = K·C (cap 0.95)
function apply_sign_modulation(slots, C, R_disc, R_A, M_star, f_disc, immune) {
    const phi = Math.min(0.6, SIGN_DRAIN_K * C * C);
    const leak = Math.min(0.95, SIGN_LEAK_K * C);
    if (!(phi > 0) || !(R_disc > 0) || !(R_A > 0))
        return;
    // ISU (in-situ-unchanged) bodies are EXEMPT — "unchanged" means their solids
    // were never redistributed by the feeding-zone transfer, so it skips them.
    // This is what lets the f_disc bisection target an ISU subset cleanly: the
    // transfer can't drain an anchor-frozen ISU slot (e.g. Sol's dam Neptune,
    // pinned to observed) that the bisection then can't restore — which would
    // force f_disc to run away and balloon the gas giants. Non-ISU bodies (e.g.
    // Jupiter's moons, where the transfer is what lands them) are still moved.
    const body = slots.filter(s => s.filled && !s.external && !s.exterior
        && s.slot_r > 0 && s.core > 0
        && !(immune && immune.has(s.name))).sort((a, b) => b.slot_r - a.slot_r); // outer→inner
    let acc = 0;
    let lastBump = null;
    for (const s of body) {
        const A = superposition_amplitude(s.slot_r, R_disc, R_A);
        if (A >= 0) { // + (dip): drain solids inward
            const drain = phi * s.core;
            const keep = 1 - phi;
            s.rock *= keep;
            s.ice *= keep;
            s.pebble *= keep;
            s.core *= keep;
            s.predicted -= drain;
            acc += drain;
        }
        else { // − (bump): trap (1−leak)·acc, pass the rest
            const gain = (1 - leak) * acc;
            s.rock += gain;
            s.core += gain;
            s.predicted += gain;
            acc -= gain;
            lastBump = s;
        }
    }
    if (acc > 0 && lastBump) { // innermost bump catches the remainder
        lastBump.rock += acc;
        lastBump.core += acc;
        lastBump.predicted += acc;
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
// Budget-share the gas-rich-gorging WANTS (s.predicted−s.core from hydrogen_capture) against the
// finite disc reservoir. Two regimes fall out, no per-system knob:
//   WINDOW-limited (Σwant ≤ budget): every giant keeps its full want — Sol's short-lived disc lets
//     the planets eat only ~10%, the rest drains to the star (the "90% to Sol" emerges).
//   BUDGET-limited (Σwant > budget): share PROPORTIONALLY to want (∝ window) — HR 8799's long-lived
//     disc lets the giants consume nearly all of it; flat profile, latest/shortest-window the runt.
// The gas INTERIOR to the innermost giant has no planet to catch it ⇒ clears to the star (reduces
// the planet-available budget); for a compact disc this barely binds (window-limited anyway).
function apply_hydrogen_conservation(slots, reservoir) {
    const giants = slots.filter(s => s.filled && !s.external && !s.exterior && (s.predicted - s.core) > 1e-9);
    const total_res = Math.max(0, reservoir);
    if (!giants.length)
        return { captured: 0, dispersed: total_res, exhausted: false };
    // DRAINAGE to the star = the gorging WINDOW itself (τ = R_disc³/M, set in
    // hydrogen_capture), NOT a geometric position clamp. A NEAR dam (small τ) gives short
    // windows ⇒ the giants want little ⇒ the remainder disperses to the star (Sol's ~90%);
    // a FAR dam (huge τ) gives windows so long the giants want the whole reservoir ⇒ nothing
    // drains (Proxima sits at the dam, keeps it, and ignites). `dispersed = total − captured`
    // IS the drained gas. The old √r "interior clearing" was a hack with no τ in it — it
    // declared interior gas drained by position alone, starving any body at a far dam (−87%).
    const total_want = giants.reduce((a, s) => a + (s.predicted - s.core), 0);
    const scale = (total_want > total_res && total_want > 0) ? total_res / total_want : 1.0;
    let captured = 0;
    for (const s of giants) {
        const got = (s.predicted - s.core) * scale;
        s.predicted = s.core + got;
        captured += got;
        if (s.observed > 0) {
            s.err_pct = (s.predicted - s.observed) / s.observed * 100;
            s.implied_dM = s.observed - s.predicted;
        }
    }
    return { captured, dispersed: total_res - captured, exhausted: scale < 1.0 };
}
// Core barycentre: the mass-weighted centre of all core elements (the primary at
// r=0, mass primaryMass; plus every co-primary core body at its own r). Everything
// the core emits — wind, field, the dams — and every product orbit is referenced to
// it. Single-star systems have no co-primary ⇒ barycentre = 0 (the primary itself).
function core_barycentre(primaryMass, planets) {
    if (primaryMass == null || !isFinite(primaryMass))
        return 0;
    let m = primaryMass * 332946; // primary mass in M⊕, at r=0
    let mr = 0;
    for (const p of planets) {
        const mo = p.observed || 0;
        if (p.core && mo > 0) {
            m += mo;
            mr += mo * p.r;
        }
    }
    return m > 0 ? mr / m : 0;
}
function budgetFit(planets, budget, lambda, parent, primaryMass) {
    // Re-reference every body to the core barycentre: the dams are emitted from it and
    // products orbit it, so positions are measured from the barycentre, not the primary.
    const r_bary = core_barycentre(primaryMass, planets);
    // Core-element separations (primary-relative, captured BEFORE the barycentre shift).
    // For N core elements the Holman-Wiegert clearing generalizes to [0.3·a_min,
    // 2.4·a_max]: stable inside the TIGHTEST pair's circum-element region and outside
    // the WIDEST pair's circum-system region; everything between is swept. N=2 reduces
    // to the binary [0.3·a_bin, 2.4·a_bin].
    const co_seps = planets.filter(p => p.core && (p.observed || 0) > 0).map(p => p.r);
    const a_min = co_seps.length ? Math.min(...co_seps) : 0;
    const a_max = co_seps.length ? Math.max(...co_seps) : 0;
    const hw_in = a_max > 0 ? BINARY_HW_INNER * a_min : 0;
    const hw_out = a_max > 0 ? BINARY_HW_OUTER * a_max : 0;
    if (r_bary !== 0)
        planets = planets.map(p => {
            const shifted = p.r - r_bary;
            // Core/co-primary bodies keep their SIGNED barycentre-relative position (they're
            // not fit to log-spaced slots, so a negative — on the primary's side — is fine and
            // should display as negative). Disc products clamp to a tiny positive: a negative
            // would break the log-spaced slot assignment, and an inside-barycentre product is
            // in the destabilization annulus anyway.
            return { ...p, r: p.core ? shifted : Math.max(shifted, 1e-9) };
        });
    const M = mass_from_budget(budget);
    const Z = metallicity_from_budget(budget);
    const f_rock = f_rock_from_budget(budget);
    let inverted = is_inverted_budget(M); // refined to the magnetopause regime in the physics-dam path
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
        let R_disc_phys = null;
        let R_A_mag = null;
        let f_disc_derived = null;
        let spin;
        if (usePhysicsDam) {
            const co = planets.filter(p => p.core && (p.observed || 0) > 0);
            set_fragmenting(co.length > 0); // co-primaries ⇒ fragmenting binary ⇒ centrifugal dam
            const M_core_earth = primaryMass * M_SUN_EARTH
                + co.reduce((a, p) => a + (p.observed || 0), 0);
            // DERIVED nebula density (no calibration constant). The disc mass is the nebula
            // M_d = budget − core (budget minus the stars). It spreads over the centrifugal
            // disc (Terebey-Shu-Cassen R_c = j²/GM ∝ spin² — "extended by spin"), giving the
            // self-similar surface density D ∝ M_d / R_c². D is Sol-normalized by Sol's OWN
            // budget − core (a derived value). The spin is capped at the fragmentation
            // (breakup) limit: a core can't rotate faster — the excess angular momentum goes
            // into the co-primary, so a binary's disc isn't spun out to absurd radii.
            const M_d = Math.max(M * M_SUN_TO_EARTH - M_core_earth, 1e-3); // nebula = budget − core
            const spin_eff = Math.min(omega, breakup_spin(M)); // disc rotation ≤ breakup
            // Combined outward FLUX (Σ core-element luminosity, super-linear in mass).
            let flux = Math.pow(primaryMass, 3.54);
            for (const p of co)
                flux += Math.pow((p.observed || 0) / M_SUN_EARTH, 3.54);
            // Park the dam INPUTS (nebula mass, flux) as context, then the TWO UNIVERSAL LAWS
            // compute the dams — no inline formula, no override, no back-solve. The cascade and
            // allocations call the SAME disc_radius/alfven_radius, so the factory marches from the
            // real Davis Dam and the regime is the real magnetopause vs Davis comparison.
            set_dam_inputs(M_d, flux);
            R_disc_phys = disc_radius(M, omega, omega); // Davis = outward pressure ⇄ density
            R_A_mag = alfven_radius(M, omega); // Alfvén = magnetic field reach
            spin = omega; // real spin everywhere — no fake geometry spin
            const M_E_body = M * M_SUN_TO_EARTH;
            // DERIVED f_disc — dam reservoir: self-similar nebula mass (LBP γ=1) between the two
            // dams over R_c=SOL_R_C·spin²/M. From spin + budget alone; bare ≡ populated disc.
            const R_c = SOL_R_C * spin_eff * spin_eff / M;
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
        }
        else {
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
        const Mdot_of = (fd) => accretion_rate(M, Z, f_rock, fd, R_disc_scale, B, C);
        const om_for_RA = (omega !== undefined) ? omega : spin;
        const R_A_used = alfven_radius(M, om_for_RA);
        const immut = new Set(planets.filter(p => p.immutable).map(p => p.name));
        // Fit-quality selector: filled slot products (inverted → pile-up factory products).
        // Used for the residual readout, and (sub-cascade only) the f_disc bisection.
        const sel = (fr) => fr.slots.filter(s => s.filled && !s.external && !s.remnant && (inverted || !s.exterior)
            && (immut.size ? immut.has(s.name) : true));
        // TWO accretion regimes, two snow-line laws — both VISCOUS, so both SPIN-
        // INDEPENDENT (viscous heating dominates bolometric during accretion):
        //  • UNIFORM-DISC (normal regime): the smooth viscous disc → Mulders line (R_SL ∝ Ṁ^4/9).
        //  • PILE-UP (inverted regime): same viscous heating but in a DIFFUSE pile, so
        //    Mulders (a uniform-disc equivalent density) over-reads — pile_snow_line tracks
        //    Σ_pile → Σ_crit. Maxed against the bolometric line. (Ref spin 1; spin-independent.)
        const SNOW_REF_SPIN = 1.0;
        const snow_of = (fd) => inverted
            ? Math.max(pile_snow_line(M, fd, alfven_radius(M, SNOW_REF_SPIN), SNOW_REF_SPIN), irradiation_snow_line(M))
            : mulders_snow_line(M, Mdot_of(fd));
        let f;
        let fit;
        if (f_disc_derived != null) {
            // FORWARD MODEL: f_disc is the DERIVED dam reservoir (above) — a pure function of
            // spin + budget, blind to the observed planets. One pass: f → Ṁ → snow line →
            // formation clock → allocate. A bare system and a populated one get the IDENTICAL
            // disc geometry, snow line and slot masses; the planets only fill what physics laid.
            f = f_disc_derived;
            set_snow_line(snow_of(f));
            set_mdot(Mdot_of(f));
            const om_slot = omega;
            fit = slot_aware_fit(planets, M, spin, f, { auto_compress: false, omega: om_slot });
            // INVERTED in-situ: the observed bodies are the dense pile-up's in-situ factory
            // products. The self-similar reservoir under-counts that compressed pile, so close
            // f_disc to the observed ISU total (snow line stays frozen from the derived reservoir).
            // Normal/forward systems keep the pure derived f_disc — only the inverted dense pile
            // is closed to its products. (No effect when there are no observed targets.)
            if (inverted) {
                const tot = sel(fit).reduce((a, s) => a + (s.observed || 0), 0);
                if (tot > 0) {
                    const tol = Math.max(1e-6, 0.001 * tot);
                    let lo = 1e-5, hi = 1.0;
                    for (let i = 0; i < 60; i++) {
                        const fm = Math.sqrt(lo * hi);
                        const f2 = slot_aware_fit(planets, M, spin, fm, { auto_compress: false, omega: om_slot });
                        const e = sel(f2).reduce((a, s) => a + (s.predicted - (s.observed || 0)), 0);
                        f = fm;
                        fit = f2;
                        if (Math.abs(e) < tol)
                            break;
                        if (e > 0)
                            hi = fm;
                        else
                            lo = fm;
                    }
                }
            }
        }
        else {
            // SUB-CASCADE fallback (gas-giant satellite disc — parent-fed, no stellar dam):
            // f_disc still closed to the parent-fed products by bisection. Targets: the
            // uniform-disc cascade slots (inverted → the pile-up factory products).
            const bisectF = () => {
                let lo = 0.0005, hi = 0.5, ff = 0.01;
                let fr = slot_aware_fit(planets, M, spin, ff, { auto_compress: false, omega });
                const tgt0 = sel(fr);
                const totalTarget = tgt0.reduce((a, s) => a + s.observed, 0);
                if (totalTarget > 0) {
                    const smallest = tgt0.reduce((m, s) => Math.min(m, s.observed), Infinity);
                    const tol = Math.max(1e-6, 0.001 * smallest);
                    for (let i = 0; i < 60; i++) {
                        const fm = Math.sqrt(lo * hi);
                        const f2 = slot_aware_fit(planets, M, spin, fm, { auto_compress: false, omega });
                        const e = sel(f2).reduce((a, s) => a + (s.predicted - s.observed), 0);
                        ff = fm;
                        fr = f2;
                        if (Math.abs(e) < tol)
                            break;
                        if (e > 0)
                            hi = fm;
                        else
                            lo = fm;
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
        // The Davis dam is fixed by the budget − core − captured-planets (f_disc-
        // independent). The outermost body's distance from it is the fit-quality metric —
        // no longer forced to zero by an anchor.
        const R_disc_final = R_disc_phys != null ? R_disc_phys : outermost;
        const dam_align = (R_disc_phys != null && R_disc_final > 0)
            ? (outermost - R_disc_final) / R_disc_final : 0;
        // Sign-modulated solid transfer (post-process; conserves total, ISU-exempt):
        // + dips drain inward to − bumps, cascade scaled by C = R_A/R_disc.
        apply_sign_modulation(fit.slots, R_A_used / R_disc_final, R_disc_final, R_A_used, M, f, immut);
        // Conserved hydrogen draw-down: the gas envelopes draw from the finite disc
        // hydrogen reservoir (f_disc·M_star = the disc's share of b_hydrogen). The
        // un-captured remainder is dispersed (onto the star / flung out). `exhausted`
        // ⇒ the giants want more gas than the disc holds: raise the budget / spin.
        // DISC HOST mass: a circumstellar disc's H scales with its HOST star, not the whole
        // system. For a binary the planet-forming disc is the PRIMARY's — the co-primary is a
        // sibling fragment in the CORE bucket (it drives the wind/dam, but isn't extra disc-
        // hosting mass). Summing A+B over-allocates H ~2× (Proxima +125%). Single stars: no
        // co-primary ⇒ M_disc_host = M (unchanged).
        const hasCoPrimary = planets.some(p => p.core && (p.observed || 0) > 0);
        const M_disc_host = (hasCoPrimary && primaryMass != null && isFinite(primaryMass) && primaryMass > 0)
            ? primaryMass : M;
        const H_reservoir = f * m_star_earth(M_disc_host);
        const Hcons = apply_hydrogen_conservation(fit.slots, H_reservoir);
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
            const nco = co_seps.length + 1; // co-primaries + primary
            for (const s of fit.slots) {
                if (s.core_component || s.external)
                    continue;
                if (s.slot_r > hw_in && s.slot_r < hw_out) {
                    s.predicted = 0;
                    s.rock = 0;
                    s.ice = 0;
                    s.pebble = 0;
                    s.core = 0;
                    s.h_he = 0;
                    s.err_pct = 0;
                    s.implied_dM = s.observed ? -s.observed : 0;
                    s.interpretation = `destroyed by ${nco}-body core instability — the ${hw_in.toFixed(1)}–${hw_out.toFixed(1)} AU annulus is dynamically unstable (Holman-Wiegert; separations ${a_min.toFixed(1)}–${a_max.toFixed(1)} AU)`;
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
            score: 0, stripping_q: null, stripping_rt: null,
            budget_M: M, budget_Z: Z, budget_f_rock: f_rock, budget_inverted: inverted,
            budget_R_A: alfven_radius(M, om_eff), budget_lambda: om_eff,
            budget_Mdot: Mdot, budget_snow: inverted ? Math.max(pile_snow_line(M, f, alfven_radius(M, 1.0), 1.0), irradiation_snow_line(M)) : mulders_snow_line(M, Mdot), budget_C: C,
            budget_h_reservoir: H_reservoir, budget_h_captured: Hcons.captured,
            budget_h_dispersed: Hcons.dispersed, budget_h_exhausted: Hcons.exhausted,
            budget_barycentre: r_bary,
            budget_hw_inner: hw_in, budget_hw_outer: hw_out,
            budget_R_disc: R_disc_final, budget_dam_align: dam_align,
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
    }
    finally {
        reset_composition();
        reset_r_disc_norm();
        reset_snow_line();
        reset_mdot();
        reset_form_spin();
        reset_fragmenting();
        reset_dam_inputs();
    }
}
