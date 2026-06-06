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
function cascade_sites(M_star, spin, min_slots, omega) {
    const slots_r = cascade_slot_positions(M_star, spin, min_slots, omega);
    const sites = slots_r.map((r, n) => ({ n, r, interstitial: false }));
    const inverted = alfven_radius(M_star, spin) >= disc_radius(M_star, spin);
    if (inverted) {
        const SQRT_RHO = Math.sqrt(CASCADE_RATIO);
        for (let n = 0; n < slots_r.length - 1; n++) {
            sites.push({ n: n + 0.5, r: slots_r[n] * SQRT_RHO, interstitial: true });
        }
    }
    return sites;
}
function assign_planets_to_slots(planets, M_star, spin, f_disc, omega) {
    const observed = planets.filter(p => (p.observed || 0) > 0);
    const sites = cascade_sites(M_star, spin, observed.length, omega);
    const site_pred = sites.map(s => slot_predicted_mass(s.r, M_star, spin, f_disc, undefined, omega));
    // Rocky inventory at each site (rock + ice). Used as match target for
    // stripped iron-core planets.
    const slot_rocky_inventory = sites.map(s => rock_allocation(s.r, M_star, spin, f_disc, omega)
        + ice_allocation(s.r, M_star, spin, f_disc));
    const slot_pred = site_pred;
    const slots_r = sites.map(s => s.r);
    const pair_score = (p, n) => {
        // Interstitial sites are open only to bodies below the Hill gate.
        if (sites[n].interstitial && !half_site_allowed(p, M_star))
            return 1e9;
        const r_dist = Math.abs(Math.log(p.r) - Math.log(slots_r[n]));
        let penalty = 0.0;
        const stripped = is_stripped(p, M_star);
        let mass_for_match, slot_target;
        if (stripped) {
            mass_for_match = effective_mass_for_assignment(p, M_star);
            slot_target = slot_rocky_inventory[n];
        }
        else {
            mass_for_match = p.observed || 0;
            slot_target = slot_pred[n];
        }
        if (slot_target > mass_for_match)
            penalty += OVERPRED_PENALTY;
        // STELLAR BODIES ARE ALLOCATION-MATCHED, not position-greedy: a
        // star's mass IS its seat allocation (no gas bisection above it),
        // and evicted companions sit nowhere near their seats. Mass match
        // dominates; position barely informs.
        if ((p.observed || 0) >= M_STELLAR_BOUNDARY && slot_target > 0) {
            return 0.1 * r_dist
                + 5.0 * Math.abs(Math.log(mass_for_match / slot_target));
        }
        // In-situ trust zone: a planet sitting essentially ON a site
        // (within ~6% in radius) is not exiled for a mass mismatch ---
        // position is primary and mass deltas are interpretable events
        // (late delivery, impact loss). Dam-edge sites in particular have
        // truncation-shaved allocations while dam-adjacent planets collect
        // the edge pile-up (TRAPPIST-1 g at site 0.5: 1% positional match,
        // 23x the shaved allocation). The envelope mass-ceiling penalty
        // below still applies --- that one is physics, not narrative.
        const IN_SITU_TRUST = 0.06;
        if (slot_target > 0 && mass_for_match > slot_target * UNDERPRED_RATIO
            && r_dist >= IN_SITU_TRUST) {
            penalty += UNDERPRED_PENALTY;
        }
        // Mass-ceiling violation (envelope-dominated bodies only): a gas
        // giant cannot exceed its slot's allocation ceiling — t_form
        // bisection only SHRINKS the envelope from the primordial maximum.
        // Penalty scales with the violation so a 4x overshoot cannot be
        // bought back by position proximity (55 Cnc b at slot 4: 255 vs
        // 63 M⊕ — it belongs at slot 2). Small rocky planets are exempt:
        // late delivery legitimately puts observed above prediction
        // (HD 20794 f at +310%).
        const CEILING_EXEMPT_MASS = 50.0; // M⊕ — below this, late delivery applies
        const CEILING_TOLERANCE = 1.5;
        if (slot_target > 0 && mass_for_match > CEILING_EXEMPT_MASS
            && mass_for_match > slot_target * CEILING_TOLERANCE) {
            penalty += UNDERPRED_PENALTY
                * (Math.log(mass_for_match / slot_target) - Math.log(CEILING_TOLERANCE));
        }
        if (mass_for_match > GAS_OBS_THRESHOLD
            && slots_r[n] < p.r
            && r_dist > GAS_DECISIVE_DIST) {
            penalty += GAS_INNER_PENALTY;
        }
        return r_dist + penalty;
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
    // All observed bodies participate in the cascade — consistent with
    // the framework's predicted-stellar-companion patterns (HD 60532, etc.).
    // The stellar-mass label is preserved in classification but doesn't
    // exclude bodies from cascade fitting.
    const external_bodies = []; // no bodies excluded by mass anymore
    // KBO-class bodies (dam-exterior cohort, the Kuiper mechanism) are a
    // DISTINCT population with independent inputs: they never enter the
    // interior cascade fit. They are evaluated afterward against the
    // exterior ladder anchored on the fitted dam.
    const kbo_bodies = planets.filter(p => p.kbo && (p.observed || 0) >= 0);
    const observed_all = planets.filter(p => !p.kbo && (p.observed || 0) > 0);
    if (auto_compress && (spin === undefined || spin === null)) {
        // Anchor search sees only the interior population — KBOs carry no
        // weight in the cascade geometry.
        spin = auto_spin_with_anchor_search(planets.filter(p => !p.kbo), M_star, f_disc).spin;
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
    const inverted = R_A_now >= disc_radius(M_star, spin);
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
    const sites_pre = cascade_sites(M_star, spin, disc_planets.length, omega);
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
            + ice_allocation(r, M_star, spin, f_disc);
    }
    const weights = {};
    for (const s of slot_data) {
        const r = fit_r(s);
        const tf_casc = 0.10 * r / sl;
        const eligible = (cores[s.slot_n] > THRESHOLD_GAS) && (tf_casc < T_DISC_DISPERSAL_MYR);
        weights[s.slot_n] = eligible ? pebble_allocation_weight(r, M_star, f_disc) : 0.0;
    }
    const total_w = Object.values(weights).reduce((a, b) => a + b, 0);
    const pebble = {};
    for (const s of slot_data) {
        pebble[s.slot_n] = total_w > 0 ? pebble_total * weights[s.slot_n] / total_w : 0;
    }
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
        let ice = ice_allocation(r, M_star, spin, f_disc);
        let peb = pebble[n];
        let core = rock + ice + peb;
        const in_void = false;
        const observed = s.filled ? s.observed : 0;
        const gas_eligible = (core > THRESHOLD_GAS);
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
            // Sub-threshold rocky: total = core, t_form from cascade.
            t_form = 0.10 * r / sl;
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
            t_form = 0.10 * r / sl;
            h_he = hydrogen_capture(core, t_form, spin, r, M_star, f_disc, omega);
            total = core + h_he;
        }
        // Snapshot PRIMORDIAL composition (with cascade-default t_form, no
        // bisection, no stripping) — used by classifier for diagnostic tags.
        const t_form_p = 0.10 * r / sl;
        const h_he_p = gas_eligible
            ? hydrogen_capture(core, t_form_p, spin, r, M_star, f_disc, omega) : 0;
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
            filled: s.filled, name: s.name,
            interstitial: s.interstitial,
            rock, ice, pebble: peb, core, t_form, h_he,
            predicted: total, observed, err_pct, implied_dM, stripped,
            in_void, primordial, interpretation,
        });
    }
    // KINETIC-regime transform: an impact disc is condensed rock vapor.
    // Undo the nebula metallicity chain (the disc IS condensables), and
    // zero the nebula-only channels (ice, pebbles, H/He).
    if (opts.kinetic) {
        const KIN = 1 / (Z_METALLICITY * F_ROCK * ETA_ROCK);
        for (const s of results) {
            if (s.external)
                continue;
            s.rock = s.rock * KIN;
            s.ice = 0;
            s.pebble = 0;
            s.h_he = 0;
            s.core = s.rock;
            s.predicted = s.rock;
            s.primordial = { rock: s.rock, ice: 0, pebble: 0, h_he: 0,
                core: s.rock, total: s.rock };
            if (s.filled && s.observed > 0) {
                s.err_pct = (s.predicted - s.observed) / s.observed * 100;
                s.implied_dM = s.observed - s.predicted;
            }
        }
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
        results.push({
            slot_n: -1, slot_r: p.r, r_used: p.r,
            filled: true, name: p.name,
            rock: 0, ice: 0, pebble: 0, core: 0,
            t_form: 0, h_he: 0,
            predicted: m_obs, observed: m_obs,
            err_pct: 0, implied_dM: 0,
            stripped: is_stripped(p, M_star), in_void: true, external: true,
            primordial: { rock: 0, ice: 0, pebble: 0, h_he: 0, core: 0, total: m_obs },
            interpretation: (is_small && stripping_freed > 0
                && m_obs / stripping_freed >= 0.04
                && m_obs / stripping_freed <= 0.12)
                ? `interior to Alfven Dam (encounter fragment: ~${(m_obs / stripping_freed * 100).toFixed(1)}% of the ${stripping_freed.toFixed(1)} M⊕ encounter-stripped inventory — the inward share of the 5%/95% split, flung under the dam)`
                : is_small
                    ? `interior to Alfven Dam (Martian-type scatter remnant: ~5-10% of a ${(m_obs / SURVIVOR_MASS_FRAC_MAX).toFixed(0)}-${(m_obs / SURVIVOR_MASS_FRAC_MIN).toFixed(0)} M⊕ parent, stripped and flung under the dam; parent slot indeterminate)`
                    : "interior to Alfven Dam (void: no slot at observed r — delivered inward by scattering or migration; formation slot indeterminate)",
        });
    }
    // KBO-class population (the Kuiper mechanism): a distinct entity
    // with independent inputs. Each body is evaluated against the
    // exterior ladder r = R_dam·(1/ρ)^n — half-integer rungs, the Luger
    // lattice continued outward through the dam (rung 0.5's period ratio
    // 1.497 ≈ 3:2 is the plutino resonance). Geometry is the test; the
    // exterior mass calculus is independent and deferred, so rows are
    // satisfied (predicted := observed) and carry no fit cost.
    if (kbo_bodies.length > 0) {
        const R_dam = R_disc_local > 0 ? R_disc_local
            : disc_radius(M_star, spin);
        const KBO_TOL = 0.035; // |ln(r/rung)| in-situ acceptance
        for (const p of kbo_bodies) {
            const n_raw = Math.log(p.r / R_dam) / Math.log(1 / CASCADE_RATIO);
            const n = Math.max(0.5, Math.round(n_raw * 2) / 2);
            const rung_r = R_dam * Math.pow(1 / CASCADE_RATIO, n);
            const dlog = Math.log(p.r / rung_r);
            const dr_pct = ((p.r / rung_r - 1) * 100).toFixed(1);
            const on_rung = Math.abs(dlog) <= KBO_TOL;
            results.push({
                slot_n: -n, slot_r: rung_r, r_used: p.r,
                filled: true, name: p.name,
                rock: 0, ice: 0, pebble: 0, core: 0,
                t_form: 0, h_he: 0,
                predicted: p.observed || 0, observed: p.observed || 0,
                err_pct: 0, implied_dM: 0,
                stripped: false, in_void: false, exterior: true,
                primordial: { rock: 0, ice: 0, pebble: 0, h_he: 0, core: 0,
                    total: p.observed || 0 },
                interpretation: on_rung
                    ? `dam-exterior cohort: IN SITU on exterior rung ${n} (${rung_r.toPrecision(4)} AU, Δr ${dr_pct}%) — formed against the Davis Dam's outer face (Kuiper mechanism; independent mass calculus deferred)`
                    : `dam-exterior object: off-rung (nearest exterior rung ${n} at ${rung_r.toPrecision(4)} AU, Δr ${dr_pct}%) — inter-rung belt member or scattered (Kuiper mechanism; independent mass calculus deferred)`,
            });
        }
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
    // formation: gas giants and the kinetic (impact-disc) regime, where
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
        R_disc: disc_radius(M_star, spin),
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
            let lo = 0.0005, hi = 2.0;
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
        let lo = 0.0005, hi = 2.0;
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
            if (s.external)
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
                if (Math.abs(p.r - g.slot_r) >= 11 * RH)
                    continue;
                if (p.r < g.slot_r && p.r / g.slot_r < 0.27)
                    continue;
                if ((p.observed || 0) <= 0.15 * Math.max(s.predicted, 1e-12))
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
        const inv_try = alfven_radius(M_star, spin) >= disc_radius(M_star, spin);
        const n_void_pre = inv_try ? 0
            : planets.filter(p => (p.observed || 0) > 0 && p.r < 0.5 * R_A_try).length;
        const n_eff = n_obs - n_void_pre;
        if (n_eff < 1)
            return null;
        if (cascade_slot_positions(M_star, spin, n_eff, omega).length < n_eff)
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
        const score = scoreFit(fit, pen) + 10 * residual + 2 * J
            + (residual > 0.05 ? BIG : 0);
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
                    const spin_check = Math.pow(SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) / R_disc, 2);
                    const wind_term = (spin_check / 30.0) * Math.pow(0.5 / Math.max(R_disc, 0.01), 2);
                    if (1.0 / (1.0 + wind_term) < 0.1)
                        continue;
                }
                const spin = Math.pow(SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) / R_disc, 2);
                consider(spin, 0, STAGE2_PENALTY + 1.0 * (k1 - 1));
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
