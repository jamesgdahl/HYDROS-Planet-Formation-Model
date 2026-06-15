"use strict";
// Cascade slot geometry and the anchor (auto-spin) search.
// Global-script style: depends on constants.ts, disc.ts, allocation.ts;
// uses assign_planets_to_slots from fit.ts (resolved at call time).
// BINARY / MULTI-CORE override of the ladder's inner terminus. A single star's cascade bottoms
// out at its R_A; a binary's CANNOT — no slot forms inside the cores' mutual orbit, so the
// circumbinary ladder terminates at the OUTERMOST core element's Alfvén Dam (its apastron from
// the barycentre + that element's R_A), not the combined R_A back at the barycentre. budgetFit
// sets this before the binary fit and resets it after; single stars leave it null. (The
// Holman-Wiegert instability separately destroys anything that forms further out.)
let CASCADE_INNER_DAM = null;
function set_cascade_inner_dam(r) { CASCADE_INNER_DAM = (r > 0) ? r : null; }
function reset_cascade_inner_dam() { CASCADE_INNER_DAM = null; }
function cascade_slot_positions(M_star, spin, min_slots = 0, omega, f_disc) {
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
    const out = [];
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
            if (!(step > 0) || !isFinite(step))
                break;
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
    // piles matter. No geometric ρ-ladder, no snap, no dip-filter: for the fundamental alone (low-Q,
    // Sol) the maxima land on the ρ-rungs (full-rung spacing); for a high-Q disc the 2nd harmonic
    // adds half-rung maxima, and a near-zero DIP between two peaks (a suppressed rung) is simply not
    // a maximum ⇒ not a slot. The phase shift, the Alfvén comb, the envelope and the 2nd harmonic
    // are all already baked into superposition_amplitude.
    const NS = 1200;
    const logHi = Math.log(R_disc), logLo = Math.log(R_A_phys);
    const rAt = (i) => Math.exp(logHi - (logHi - logLo) * i / NS);
    const ampAt = (i) => Math.abs(superposition_amplitude(rAt(i), R_disc, R_A_phys));
    let aL = ampAt(0), aC = ampAt(1);
    if (aL > aC)
        out.push(R_disc); // antinode right at the dam (fundamental peak)
    for (let i = 1; i < NS; i++) {
        const aR = ampAt(i + 1);
        if (aC > aL && aC >= aR)
            out.push(rAt(i)); // local |amplitude| maximum = a real antinode
        aL = aC;
        aC = aR;
    }
    return out;
}
// Alfvén–Maas superposition primitives (v5). ALPHA = π/(−ln ρ) ≈ 5.836 is
// the cascade's angular wavenumber: one full antinode cycle per ρ-step.
const CASCADE_ALPHA = Math.PI / (-Math.log(CASCADE_RATIO));
// Dam see-saw weights from compression C = R_A/R_disc: the dominant dam is
// normalized to 1, the weaker scaled by the ratio. Davis/Maas dominates the
// normal regime (C<1); Alfvén dominates when inverted (C>1).
function dam_weights(R_disc, R_A) {
    const C = R_A / R_disc;
    return C >= 1 ? { wM: 1 / C, wA: 1 } : { wM: 1, wA: C };
}
// Constant phase shift δ of the merged ρ-ladder, returned as the radial
// factor e^(−δ/α) that multiplies R_disc. 1.0 when Alfvén is negligible.
function superposition_phase_shift(R_disc, R_A) {
    if (!(R_disc > 0) || !(R_A > 0))
        return 1.0;
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
// Net (signed) Alfvén–Maas standing wave at radius r — THE SOURCE OF TRUTH for slot positions
// (its antinodes) and masses (its amplitude). A_M(r)·cos(φ_M) + A_A(r)·cos(φ_A): the Maas wave
// radiates from the Davis Dam (R_disc) attenuating inward; the Alfvén wave radiates from the
// Alfvén Dam (R_A, single-star comb centred at the star) attenuating outward.
function superposition_amplitude(r, R_disc, R_A) {
    const { wM, wA } = dam_weights(R_disc, R_A);
    const ampM = Math.pow(Math.min(r / R_disc, 1), CASCADE_DECAY); // Maas amplitude: attenuates inward from R_disc
    const dA = Math.max(r, R_A * 0.2); // Alfvén comb centred at the star (d=r), inner-clamped
    const ampA = Math.pow(Math.min(R_A / dA, 1), CASCADE_DECAY); // Alfvén amplitude: attenuates outward from R_A
    // The Alfvén wave launches NEGATIVE (π out of phase with Maas): the Davis Dam PILES matter
    // (positive antinode) while the magnetosphere EXCLUDES it (a density minimum at R_A).
    // SECOND HARMONIC (high-Q cavity, COMP_HARMONIC>0): a dense disc rings on the Maas 2nd harmonic,
    // which peaks at the fundamental's NODES — the HWHM half-rungs — seating a smaller pile between
    // each full rung. It's an ADDITION on top of the fundamental (multiple harmonics coexist in a
    // high-Q cavity), weighted h₂<1 so it stays SUBDOMINANT to the fundamental. Attenuates with the
    // Maas envelope; 0 for a low-Q disc (Sol) ⇒ full-rung only, unchanged.
    return wM * ampM * Math.cos(CASCADE_ALPHA * Math.log(R_disc / r))
        - wA * ampA * Math.cos(CASCADE_ALPHA * Math.log(dA / R_A))
        - COMP_HARMONIC * wM * ampM * Math.cos(2 * CASCADE_ALPHA * Math.log(R_disc / r));
}
// Snap a geometric-ladder guess to the nearest TRUE antinode (local |amplitude| max) of the
// enveloped superposition, searching only within the slot's own lobe so it can't jump to a
// neighbour. The ladder solves the anchor/spin in closed form; the snap places the seat where
// the real net wave actually peaks (inner slots shift out most, where the Alfvén bites).
function snap_to_antinode(r_guess, R_disc, R_A) {
    if (!(r_guess > 0) || !(R_disc > 0) || !(R_A > 0))
        return r_guess;
    let best = r_guess, bestA = Math.abs(superposition_amplitude(r_guess, R_disc, R_A));
    const N = 60, lo = r_guess * 0.82, hi = Math.min(r_guess * 1.30, R_disc);
    for (let i = 0; i <= N; i++) {
        const r = lo + (hi - lo) * i / N;
        const a = Math.abs(superposition_amplitude(r, R_disc, R_A));
        if (a > bestA) {
            bestA = a;
            best = r;
        }
    }
    return best;
}
// Predict the cascade: r_n = R_disc * 0.5837^n (geometric ratio from the
// half-amplitude-at-45° projection, 1 - sqrt(ln 2)/2). Slot 0 sits at the
// Davis Dam (R_disc); the innermost slot at the inner Alfven Dam
// vicinity. Returns slots split by snow line for display.
function predict_slots(M_star, spin, f_disc) {
    const r_snow = snow_line(M_star, f_disc);
    const slots_r = cascade_slot_positions(M_star, spin);
    return {
        inner: slots_r.filter(r => r <= r_snow * 1.05),
        outer: slots_r.filter(r => r > r_snow * 1.05),
    };
}
function slot_predicted_mass(r, M_star, spin, f_disc, t_form_cascade, omega) {
    const rock = rock_allocation(r, M_star, spin, f_disc, omega);
    const ice = ice_allocation(r, M_star, spin, f_disc, omega);
    const core = rock + ice;
    // Inverted aggregates can also capture gas IF the core reaches the gas
    // threshold (an inverted hot Jupiter) — so no inverted-specific suppression.
    if (core <= gas_threshold_mass(r, M_star, f_disc))
        return core;
    const sl = slope(M_star, f_disc);
    const tf = (t_form_cascade === undefined) ? formation_time(r, rock + ice, M_star, f_disc) : t_form_cascade;
    return core + hydrogen_capture(core, tf, spin, r, M_star, f_disc, omega);
}
function auto_spin_from_outermost(planets, M_star, anchor_slot) {
    if (anchor_slot === undefined)
        anchor_slot = 0;
    // All observed bodies are included in the cascade — even stellar-mass
    // ones. This is consistent with the framework's prediction that outer
    // slots can naturally allocate stellar-mass bodies (e.g. HD 60532's
    // predicted slot 0 stellar companion). Holman-Wiegert truncation is
    // retained only as a fallback when no observed body anchors R_disc.
    const disc_planets = planets.filter(p => (p.observed || 0) > 0);
    const truncation_cap = null;
    let max_r;
    if (disc_planets.length) {
        max_r = Math.max(...disc_planets.map(p => p.r));
        if (truncation_cap !== null && max_r > truncation_cap) {
            max_r = truncation_cap;
        }
    }
    else if (truncation_cap !== null) {
        max_r = truncation_cap;
    }
    else {
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
        spin = spin_for_disc_radius(M_star, R_disc_target); // inverts the v5 wind-balance formula
        shift = superposition_phase_shift(disc_radius(M_star, spin), alfven_radius(M_star, spin));
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
function ghost_refuted(slots, assignment, M_star, spin_try, f_disc_eval) {
    for (let g = 0; g < slots.length; g++) {
        if (assignment[g])
            continue; // ghosts only
        const m_ghost = slot_predicted_mass(slots[g], M_star, spin_try, f_disc_eval);
        if (m_ghost <= 0)
            continue;
        const r_g = slots[g];
        const RH = r_g * Math.pow(m_ghost * (3e-6 / M_PRIM_TO_MSUN) / (3 * M_star), 1.0 / 3.0);
        for (let n = 0; n < slots.length; n++) {
            const p = assignment[n];
            if (!p || (p.observed || 0) <= 0)
                continue;
            const m_pred_n = slot_predicted_mass(slots[n], M_star, spin_try, f_disc_eval);
            // ghost must DOMINATE the bystander to be a threat
            if (m_ghost < 10 * Math.max(p.observed || 0, m_pred_n))
                continue;
            const r_obs = p.r; // observed position
            if (Math.abs(r_obs - r_g) >= 11 * RH)
                continue; // outside the zone
            if (r_obs < r_g && r_obs / r_g < 0.27)
                continue; // decoupled interior
            if ((p.observed || 0) <= 0.15 * Math.max(m_pred_n, 1e-12))
                continue; // survivor
            return true; // calm full-mass body inside the ghost's chaos zone
        }
    }
    return false;
}
function auto_spin_with_anchor_search(planets, M_star, f_disc) {
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
    let best_spin = null;
    let best_k = 0;
    let best_pos_resid = Infinity, best_unassigned = Infinity;
    for (let k = 0; k < 12; k++) {
        const spin_try = auto_spin_from_outermost(planets, M_star, k);
        const slots = cascade_slot_positions(M_star, spin_try, obs_disc.length);
        if (!slots.length)
            continue;
        const remaining = slots.map((_, i) => i);
        const assignment = {};
        let unassigned = 0, pos_resid = 0;
        const ordered = [...obs_disc].sort((a, b) => b.r - a.r);
        for (const p of ordered) {
            if (!remaining.length) {
                unassigned++;
                continue;
            }
            let best_n = remaining[0], best_d = Infinity;
            for (const n of remaining) {
                const d = Math.abs(Math.log(p.r) - Math.log(slots[n]));
                if (d < best_d) {
                    best_d = d;
                    best_n = n;
                }
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
            if (assignment[n])
                continue;
            const m_pred = slot_predicted_mass(slots[n], M_star, spin_try, f_disc_eval);
            if (m_pred >= M_STELLAR_BOUNDARY) {
                stellar_missing = true;
                break;
            }
            missing_cost += Math.log10(1 + Math.max(0, m_pred));
        }
        if (stellar_missing)
            continue;
        if (ghost_refuted(slots, assignment, M_star, spin_try, f_disc_eval))
            continue;
        // Anchor must be in-situ: run the actual mass-scored assignment and
        // verify the outermost observed planet ends up at slot k. If the
        // mass scoring moves the anchor planet elsewhere, this k is unreliable.
        const outermost = ordered[0];
        const real_assign = assign_planets_to_slots(obs_disc, M_star, spin_try, f_disc_eval);
        const anchor_slot_data = real_assign.find(s => s.filled && s.name === outermost.name);
        if (!anchor_slot_data || anchor_slot_data.slot_n !== k)
            continue;
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
                if (ratio_mp < 0.75 || ratio_mp > 1.333)
                    continue;
            }
        }
        // Per-k penalty: prefer anchoring to the outermost slot (k=0).
        // Escalating k is only chosen when the missing-cost or positional
        // fit improvement outweighs this penalty — a default-to-in-situ
        // anchor at R_disc bias.
        const K_PENALTY = 1.5;
        const score = unassigned * BIG + pos_resid + missing_cost + K_PENALTY * k;
        if (score < best_score) {
            best_score = score;
            best_spin = spin_try;
            best_k = k;
            best_pos_resid = pos_resid;
            best_unassigned = unassigned;
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
            if (outermost.r <= R_disc)
                continue;
            // Feasibility for a gas-giant outermost: stellar wind suppression
            // at slot 0 must not be so extreme that gas capture is suppressed
            // below ~10%. Below this threshold, accreting Saturn-mass amounts
            // in the destabilization window is physically implausible.
            if ((outermost.observed || 0) > GAS_OBS_THRESHOLD) {
                const spin_check = Math.pow(SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) / R_disc, 2);
                const wind_term = (spin_check / 30.0) * Math.pow(0.5 / Math.max(R_disc, 0.01), 2);
                const wind_supp = 1.0 / (1.0 + wind_term);
                if (wind_supp < 0.1)
                    continue; // gas accretion too suppressed
            }
            const spin_try = Math.pow(SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) / R_disc, 2);
            const slots = cascade_slot_positions(M_star, spin_try, obs_disc.length);
            if (!slots.length)
                continue;
            // Outermost is FORCED to slot 0 (migrant) regardless of position.
            // Other planets assigned greedily to remaining slots.
            const remaining = slots.map((_, i) => i).filter(i => i !== 0);
            const assignment = { 0: outermost };
            let unassigned_s2 = 0, pos_resid_s2 = 0;
            // Process inner planets outer-to-inner.
            const inner_ordered = ordered_outer_in.slice(1);
            for (const p of inner_ordered) {
                if (!remaining.length) {
                    unassigned_s2++;
                    continue;
                }
                let bn = remaining[0], bd = Infinity;
                for (const n of remaining) {
                    const d = Math.abs(Math.log(p.r) - Math.log(slots[n]));
                    if (d < bd) {
                        bd = d;
                        bn = n;
                    }
                }
                pos_resid_s2 += bd;
                assignment[bn] = p;
                remaining.splice(remaining.indexOf(bn), 1);
            }
            // Reject if any MISSING slot would predict stellar mass.
            let stellar_missing_s2 = false;
            let missing_cost_s2 = 0;
            for (let n = 0; n < slots.length; n++) {
                if (assignment[n])
                    continue;
                const m_pred = slot_predicted_mass(slots[n], M_star, spin_try, f_disc_eval);
                if (m_pred >= M_STELLAR_BOUNDARY) {
                    stellar_missing_s2 = true;
                    break;
                }
                missing_cost_s2 += Math.log10(1 + Math.max(0, m_pred));
            }
            if (stellar_missing_s2)
                continue;
            if (ghost_refuted(slots, assignment, M_star, spin_try, f_disc_eval))
                continue;
            // Stage 2 base penalty: invoking a migration story is itself a cost.
            const STAGE2_PENALTY = 2.0;
            // k1 penalty: more vacated outer slots cost more.
            const K1_PENALTY = 1.0 * (k1 - 1);
            const score_s2 = unassigned_s2 * BIG + pos_resid_s2
                + missing_cost_s2 + STAGE2_PENALTY + K1_PENALTY;
            if (score_s2 < best_score) {
                best_score = score_s2;
                best_spin = spin_try;
                best_k = 0;
            }
        }
    }
    return {
        spin: best_spin !== null ? best_spin
            : auto_spin_from_outermost(planets, M_star, 0),
        anchor_slot: best_k,
    };
}
