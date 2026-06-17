"use strict";
// Post-formation SCATTERING physics. A distinct physical process from the FIT
// (which matches predicted formation slots to observed bodies): these routines
// run AFTER formation and rewrite the slot results in place to model dynamical
// destruction and scatter — inner-magnetosphere bombardment + catastrophic
// collision remnants (Mercury), mutual eviction, Lissauer destabilisation, and
// the slot-dispersal attribution that produces scatter remnants (Mars) and
// destroyed slots (the asteroid-belt body). Migration-driven consumption (the
// devoured-mass ledger) and the void-interior / core-component loop stay in fit.ts.
// Global-script style: depends on constants.ts + types being loaded first; must
// load BEFORE fit.ts (slot_aware_fit calls apply_scattering at run time).
// Inward-scatter survivor mass band (Mars retains ~5-10% of its slot parent).
// Shared with the void-interior remnant loop in fit.ts, so module-level.
const SURVIVOR_MASS_FRAC_MIN = 0.05;
const SURVIVOR_MASS_FRAC_MAX = 0.10;
// SCATTERING MASS BUDGET. A disrupted parent of allocation A splits three ways:
// the inward fragment (the 7.5% survivor/impactor — current Mars; the Theia that
// hit Earth), an equal debris field that becomes the asteroid belt, and the
// remaining ~85% consolidated PLANET flung outward to impact an outer giant.
const SCATTER_INWARD_FRAC = (SURVIVOR_MASS_FRAC_MIN + SURVIVOR_MASS_FRAC_MAX) / 2; // 0.075
const SCATTER_BELT_FRAC = 0.075; // debris field → asteroid belt (depletes ~10³× to today's belt)
// Belt taxonomy from the parent's primordial ice fraction (three tiers, mirroring the
// real S→C→P/D heliocentric gradient): a DRY parent leaves silicaceous S-types; a
// HYDRATED (rock-dominated, ice-bearing) parent leaves carbonaceous C-types; an
// ICE-DOMINATED parent leaves a cometary D-type belt. Sol: Mars-parent 0% ice → S;
// Theia 36% ice → C; no Sol parent is ice-dominated, so Sol has no D belt. A system
// whose snow line sits well inside its scattered zone (HR 8799) yields D belts too.
const SCATTER_BELT_ICE_C = 0.05; // ice fraction ≥ this ⇒ C-type (hydrated, rock-dominated)
const SCATTER_BELT_ICE_D = 0.50; // ice fraction ≥ this ⇒ D-type (ice-dominated, cometary)
// Mass-conserved decomposition of one scattering event. Attaches a `scatter`
// object itemising the inward fragment, the debris belt (C/S), the outward
// primary (named outer-giant impact) and the angular-momentum recoil it imparts
// to the perturber. Diagnostic OUTPUT — never folded into the f_disc fit target.
function decompose_scatter(target, perturber, perturberName, outwardTargetName, outwardTargetAu, inwardAu, inwardFate) {
    const A = (target.primordial && target.primordial.total > 0)
        ? target.primordial.total : (target.predicted || 0);
    if (!(A > 0))
        return;
    const fin = SCATTER_INWARD_FRAC, fbelt = SCATTER_BELT_FRAC;
    const fout = Math.max(0, 1 - fin - fbelt);
    const pm = target.primordial || { rock: 0, ice: 0, pebble: 0, h_he: 0, core: 0, total: 0 };
    const solids = (pm.rock || 0) + (pm.ice || 0) + (pm.pebble || 0);
    const icefrac = solids > 0 ? ((pm.ice || 0) + (pm.pebble || 0)) / solids : 0;
    const formation_au = (target.form_r != null && target.form_r > 0) ? target.form_r : target.slot_r;
    const m_in = fin * A, m_belt = fbelt * A, m_out = fout * A;
    // Angular-momentum recoil on the perturber: L = m·√(GM·a); flinging the outward
    // primary out (and the fragment in) drains/adds the perturber's L, shifting its a.
    // da_p ≈ -2·√a_p · ΔL_scattered / m_p (the √(GM) factor cancels in the ratio).
    const sq = (x) => x > 0 ? Math.sqrt(x) : 0;
    const dL = m_out * (sq(outwardTargetAu) - sq(formation_au))
        + m_in * (sq(inwardAu) - sq(formation_au));
    // FORWARD-ONLY: the recoil uses the perturber's PREDICTED mass and formation seat,
    // never its observed mass/position (a prediction cannot read the observed system).
    const m_p = perturber.predicted > 0 ? perturber.predicted : perturber.observed;
    const a_p = perturber.slot_r;
    const da_p = (m_p > 0 && a_p > 0) ? -2 * sq(a_p) * dL / m_p : 0;
    target.scatter = {
        allocation: A, formation_au, perturber: perturberName,
        inward: { mass: m_in, au: inwardAu, fate: inwardFate },
        belt: {
            mass: m_belt, au: formation_au,
            type: icefrac >= SCATTER_BELT_ICE_D ? 'D' : icefrac >= SCATTER_BELT_ICE_C ? 'C' : 'S',
        },
        outward: { mass: m_out, target: outwardTargetName },
        recoil: { perturber_da_au: da_p },
    };
}
// Filled giants exterior to a perturber, nearest-first — the menu of outer-planet
// impact targets for outward-flung primaries.
function outer_giants(results, perturber) {
    // FORWARD-ONLY: rank by PREDICTED mass and formation seat (slot_r), not observed.
    return results
        .filter(s => !s.external && !s.exterior && s.predicted >= 10
        && s.slot_r > perturber.slot_r)
        .sort((a, b) => a.slot_r - b.slot_r);
}
// The inner planet a destroyed slot's inward fragment collides with, by ORBIT-CROSSING
// (not mass): the 5-10% fragment is flung sunward onto an eccentric, planet-crossing orbit
// and strikes the FIRST real planet it crosses going inward — i.e. the OUTERMOST in-situ
// planet interior to the parent's seat. Fellow scatter products (remnants / destroyed
// slots / already-decomposed) are skipped — the fragment passes through their depleted
// zones. Sol: Theia's fragment from 3.62 AU crosses primordial Earth's orbit at ~1.23 AU
// (Mars, a co-scattered remnant, is skipped) and no other planet's — the Moon-forming
// impact. FORWARD-ONLY: predicted seats only.
// The inward fragment's perihelion when chaotic e-pumping drives it to cross the perturber
// (aphelion → a_p at e = a_p/a_t − 1): q = a_t(1 − e) = 2·a_t − a_p. From PREDICTED seats
// only. q ≤ 0 ⇒ a_t < a_p/2 ⇒ the body can never reach the giant ⇒ no deep scatter (it
// survives — this is why Mars, at 2.11 AU with Jupiter at 6.2, cannot collide).
function inward_perihelion(parent_seat_au, perturber_seat_au) {
    return 2 * parent_seat_au - perturber_seat_au;
}
// The in-situ planet the inward fragment collides with: orbit-crossing, NOT mass, NOT
// snapped to a chosen planet. The fragment's orbit is [q, parent]; it strikes the FIRST
// real planet it crosses (outermost in-situ planet with orbit ≥ the calculated perihelion
// q). Planets interior to q are out of reach; fellow scatter products are passed through.
// Returns null when no planet lies in [q, parent] — then the fragment is lost/ejected, NOT
// forced onto a planet. (Sol: Theia q=1.04 → Earth at 1.23 qualifies, Venus at 0.70 < q does not.)
function inner_collision_target(results, parent_form_au, q, scattered) {
    if (!(q < parent_form_au))
        return null; // perihelion above the parent ⇒ no inward crossing
    let best = null;
    for (const s of results) {
        if (s.external || s.exterior || s.core_component)
            continue;
        if (scattered.has(s) || s.remnant || s.destroyed)
            continue; // fellow scatter products — passed through
        if (s.predicted >= 10)
            continue; // a giant is an eviction, not an impact victim
        const r = (s.form_r && s.form_r > 0) ? s.form_r : s.slot_r;
        if (!(r > 0) || r >= parent_form_au || r < q)
            continue; // must lie within the orbit [q, parent]
        if (!best || r > ((best.form_r && best.form_r > 0) ? best.form_r : best.slot_r))
            best = s; // OUTERMOST in reach (first crossed)
    }
    return best;
}
function apply_scattering(results, M_star, R_A_now, planet_by_slot) {
    // Inner-magnetosphere bombardment + general catastrophic collision. v_orbit(r)=29.785·√(M/r)
    // km/s; v_esc(M)=11.186·M^(1/3) km/s (M in M⊕, rocky).
    const COLLISION_SURVIVOR_MAX = 0.15; // survivor observed < this × combined ⇒ a collision happened
    const v_orbit_r = (r) => (29.785 * Math.sqrt(M_PRIM_TO_MSUN)) * Math.sqrt(M_star / r);
    for (let i = 0; i < results.length - 1; i++) {
        const outer = results[i], inner = results[i + 1];
        if (!outer.filled || inner.filled)
            continue; // survivor is the FILLED body; impactor an empty slot
        if (outer.observed <= 0)
            continue;
        const outer_rocky = outer.primordial.rock + outer.primordial.pebble;
        const inner_rocky = inner.primordial.rock + inner.primordial.pebble;
        const rocky_combined = outer.primordial.rock + outer.primordial.ice + outer.primordial.pebble +
            inner.primordial.rock + inner.primordial.ice + inner.primordial.pebble;
        if (rocky_combined <= 0)
            continue;
        // INNER-MAGNETOSPHERE BOMBARDMENT (Mercury). An unfilled slot at/inside the Alfvén Dam can't
        // hold a planet — the rotating field magnetically accelerates its planetesimals OUTWARD (the
        // same magnetocentrifugal push that drives the Davis Dam). Launched at ~the dam's orbital
        // velocity (≫ the target's escape velocity), they sandblast the first ROCKY body just outside
        // R_A, ejecting its silicate mantle; the dense iron cores (target + impactors) survive →
        // an iron-rich CORE REMNANT. This is why Mercury is iron-rich AND the innermost planet.
        if (inner.slot_r <= 1.3 * R_A_now && outer_rocky > 0 && outer.primordial.core < 3.0) {
            const v_launch = v_orbit_r(Math.max(R_A_now, 1e-6)); // magnetocentrifugal launch at the dam
            const v_esc_m = 11.186 * Math.pow(Math.max(outer_rocky, 0.01), 1.0 / 3.0);
            if (v_launch > v_esc_m) {
                const iron = IRON_FRACTION * (outer_rocky + inner_rocky); // both mantles blasted off; iron cores retained
                const klass = outer.interpretation.split(' (')[0];
                outer.predicted = iron;
                outer.rock = iron;
                outer.ice = 0;
                outer.pebble = 0;
                outer.h_he = 0;
                outer.core = iron;
                outer.remnant = true;
                outer.err_pct = outer.observed > 0 ? (iron - outer.observed) / outer.observed * 100 : 0;
                outer.implied_dM = outer.observed > 0 ? outer.observed - iron : 0;
                outer.interpretation = `${klass} (core remnant: planetesimals magnetically flung outward from the Alfvén Dam (slot ${inner.slot_n}) at ~${v_launch.toFixed(0)} km/s ≫ v_esc ${v_esc_m.toFixed(1)} sandblasted ${outer.name}'s silicate mantle off — only the iron core survives, ${iron.toFixed(3)} M⊕)`;
                inner.destroyed = true;
                inner.interpretation = `destroyed (magnetically scattered from the Alfvén Dam — too close for a planet to survive; its planetesimals are flung outward to bombard ${outer.name})`;
                continue;
            }
        }
        // GENERAL catastrophic collision (non-inner): the inner slot's body crosses the filled outer
        // body at Δv > v_esc and shatters it; the survivor keeps the retained remnant + the impactor's
        // iron core. Gated on a small observed survivor so quiet/wide systems don't mis-fire.
        const dv = Math.abs(v_orbit_r(inner.slot_r) - v_orbit_r(outer.slot_r));
        const v_esc = 11.186 * Math.pow(rocky_combined, 1.0 / 3.0);
        if (!(dv > v_esc))
            continue;
        if (!(outer.observed < COLLISION_SURVIVOR_MAX * rocky_combined))
            continue;
        const retention = v_esc > 0 ? Math.max(0.05, 0.969 - 0.605 * dv / v_esc) : 0.05;
        const inner_core = IRON_FRACTION * inner_rocky;
        const expected = retention * rocky_combined + inner_core;
        const klass = outer.interpretation.split(' (')[0];
        outer.predicted = expected;
        outer.rock = expected;
        outer.ice = 0;
        outer.pebble = 0;
        outer.h_he = 0;
        outer.core = expected;
        outer.remnant = true;
        outer.err_pct = outer.observed > 0 ? (expected - outer.observed) / outer.observed * 100 : 0;
        outer.implied_dM = outer.observed > 0 ? outer.observed - expected : 0;
        outer.interpretation = `${klass} (collision remnant: the predicted slot-${inner.slot_n} body collided with ${outer.name} at Δv ≈ ${dv.toFixed(1)} km/s — catastrophic, mantle stripped to an iron-rich core; ${(retention * 100).toFixed(0)}% retained → ${expected.toFixed(3)} M⊕)`;
        inner.destroyed = true;
        inner.interpretation = `destroyed (collided with ${outer.name} at Δv ≈ ${dv.toFixed(1)} km/s — catastrophic impact, mantle stripped)`;
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
    const target_perturbers = new Map();
    for (let i = 0; i < results.length; i++) {
        const target = results[i];
        if (!target.slot_r || target.slot_r <= 0)
            continue;
        if (target.external)
            continue;
        if (target.predicted < 0.05)
            continue;
        const target_r = target.slot_r; // FORWARD: predicted formation seat
        const matches = [];
        for (let j = 0; j < results.length; j++) {
            if (i === j)
                continue;
            const perturber = results[j];
            if (!perturber.slot_r || perturber.slot_r <= 0)
                continue;
            if (perturber.external)
                continue;
            const m_perturber = perturber.predicted > 0 ? perturber.predicted : perturber.observed;
            if (m_perturber < target.predicted * SCATTER_MASS_RATIO)
                continue;
            const hill = (r) => r
                * Math.pow(m_perturber * (3e-6 / M_PRIM_TO_MSUN) / (3 * M_star), 1.0 / 3.0);
            // Single predicted epoch: the perturber's formation seat.
            const form_r = perturber.slot_r;
            const form_RH = hill(form_r);
            const R_H = form_RH;
            const sep = Math.abs(target_r - form_r);
            if (sep / R_H >= SCATTER_RH_THRESHOLD)
                continue;
            matches.push({ perturber, sep, R_H, perturber_r: form_r, target_r, target,
                final_r: form_r, final_RH: form_RH, epoch: 'formation', form_r, form_RH });
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
    // All scattered slots — the inward-fragment collision search skips these (a fragment
    // passes through fellow scatter products' depleted zones; Theia skips co-scattered Mars).
    const scattered_targets = new Set();
    for (const i of target_perturbers.keys())
        scattered_targets.add(results[i]);
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
        // OUTWARD-PRIMARY impact targets: the ~85% consolidated planet flung outward
        // strikes an outer giant. Nearest-perturber victim → nearest giant out (Sol:
        // slot-4/Theia → Saturn, slot-5/Mars → Uranus); pile onto the outermost if the
        // victims outnumber the giants.
        const perturberSlot = group[0].perturber;
        const giants = outer_giants(results, perturberSlot);
        const ordered = [...group].sort((a, b) => Math.abs(a.target_r - a.perturber_r) - Math.abs(b.target_r - b.perturber_r));
        const outAssign = new Map();
        ordered.forEach((g, i) => {
            const giant = giants.length ? giants[Math.min(i, giants.length - 1)] : null;
            outAssign.set(g, giant
                ? { name: giant.name, au: giant.slot_r } // FORWARD: predicted formation seat
                : { name: 'an outer giant / ejection', au: perturberSlot.slot_r * 2 });
        });
        const r_in_fallback = (g) => boundary_valid ? r_boundary : 0.4 * ((g.target.form_r && g.target.form_r > 0) ? g.target.form_r : g.target.slot_r);
        for (const g of group) {
            const target = g.target;
            const klass = target.interpretation.split(' (')[0];
            // THE SURVIVING REMNANT IS THE PREDICTION (settled slot). The slot's consolidated planet
            // was flung outward by the perturber; only the inward sibling survives, and THAT is what
            // the model predicts: mass = the 5-10% survivor-range midpoint (7.5% of the slot
            // allocation), location = the centre of the swept inward-scatter band. Flagged remnant so
            // it carries its real error but stays OUT of the f_disc bisection (scatter output, not a
            // disc-mass calibration point). Other members of the group keep no planet — destroyed.
            if (g === settled && boundary_valid) {
                const m_survivor = target.predicted * (SURVIVOR_MASS_FRAC_MIN + SURVIVOR_MASS_FRAC_MAX) / 2;
                const scale = target.predicted > 0 ? m_survivor / target.predicted : 0;
                target.rock *= scale;
                target.ice *= scale;
                target.pebble *= scale;
                target.h_he *= scale;
                target.core = target.rock + target.ice + target.pebble;
                target.predicted = m_survivor;
                target.form_r = target.slot_r; // preserve the PRE-scatter formation slot (the chart's predicted marker rides this antinode); slot_r becomes the settled location
                target.slot_r = r_boundary;
                target.remnant = true;
                target.err_pct = target.observed > 0 ? (target.predicted - target.observed) / target.observed * 100 : 0;
                target.implied_dM = target.observed > 0 ? target.observed - target.predicted : 0;
                target.interpretation = `${klass} (scatter remnant: the slot's planet was flung outward by ${perturberName}; the surviving inward sibling — ${m_survivor.toFixed(3)} M⊕, settled at the swept-band centre ~${r_boundary.toFixed(2)} AU — is what survived)`;
                const o = outAssign.get(g);
                decompose_scatter(target, perturberSlot, perturberName, o.name, o.au, r_boundary, `settled inward survivor (${target.name})`);
            }
            else {
                // FORWARD: every NON-settled member of the group is destroyed — the disc formed
                // a planet here and the perturber scattered it out. Not zeroed: the allocation
                // disperses as the inward impactor + the debris belt + the outward primary
                // (decompose_scatter conserves it). Purely geometric — no observed-body branch.
                target.destroyed = true;
                const o = outAssign.get(g);
                // The inward fragment's perihelion q = 2·a_t − a_p (calculated from predicted seats);
                // its orbit [q, parent] crosses an interior planet ⇒ COLLISION (Sol: Theia q=1.04 →
                // crosses Earth at 1.23). No planet in reach ⇒ lost/ejected (not forced onto one).
                const parentSeat = (target.form_r && target.form_r > 0) ? target.form_r : target.slot_r;
                const q = inward_perihelion(parentSeat, perturberSlot.slot_r);
                const ct = inner_collision_target(results, parentSeat, q, scattered_targets);
                const inwardAu = ct ? ct.slot_r : Math.max(q, 0.05);
                const inwardFate = ct
                    ? `perihelion q=${q.toFixed(2)} AU (=2·${parentSeat.toFixed(2)}−${perturberSlot.slot_r.toFixed(2)}); orbit crosses ${ct.name} at ${ct.slot_r.toFixed(2)} AU ⇒ predicted COLLISION`
                    : `perihelion q=${q.toFixed(2)} AU; orbit crosses no in-situ planet ⇒ lost to the star / ejected`;
                decompose_scatter(target, perturberSlot, perturberName, o.name, o.au, inwardAu, inwardFate);
                const sc = target.scatter;
                const impactNote = ct
                    ? `${sc.inward.mass.toFixed(3)} M⊕ flung inward → impacts ${ct.name} at ~${ct.slot_r.toFixed(2)} AU`
                    : `${sc.inward.mass.toFixed(3)} M⊕ flung inward (no inner target)`;
                target.interpretation = `destroyed (slot's ${sc.allocation.toFixed(2)} M⊕ planet scattered by ${perturberName} → ${sc.outward.mass.toFixed(2)} M⊕ primary scattered outward to strike ${o.name}, ${impactNote}, ${sc.belt.mass.toFixed(3)} M⊕ left as a ${sc.belt.type}-type debris belt at ${sc.formation_au.toFixed(2)} AU)`;
            }
        }
    }
    // Multi-perturber attribution: simultaneous scattering by 2+ massive
    for (const matches of multi_perturbed) {
        const target = matches[0].target;
        const base = target.interpretation.split(' (')[0];
        const perturberNames = matches.map(m => m.perturber.name + (m.epoch === 'arrival' ? ' (on arrival)' : '')).join(', ');
        // FORWARD: a slot reached by 2+ giants is obliterated — a mass-conserved debris source
        // regardless of whether a body is observed there. Attribute the recoil to the most
        // massive (PREDICTED) perturber and fling the primary to the nearest giant beyond it.
        // This is the HR 8799 case: a wholesale-scattered inner cascade leaves a SEQUENCE of
        // debris belts, each typed by its parent's ice fraction (S → C → D outward).
        let dom = matches[0];
        for (const m of matches) {
            const md = m.perturber.predicted > 0 ? m.perturber.predicted : m.perturber.observed;
            const mdom = dom.perturber.predicted > 0 ? dom.perturber.predicted : dom.perturber.observed;
            if (md > mdom)
                dom = m;
        }
        const giants = outer_giants(results, dom.perturber);
        const o = giants.length
            ? { name: giants[0].name, au: giants[0].slot_r }
            : { name: 'an outer giant / ejection', au: dom.perturber.slot_r * 2 };
        const parent_au = (target.form_r && target.form_r > 0) ? target.form_r : target.slot_r;
        const q = inward_perihelion(parent_au, dom.perturber.slot_r);
        const ct = inner_collision_target(results, parent_au, q, scattered_targets);
        const inwardAu = ct ? ct.slot_r : Math.max(q, 0.05);
        const inwardFate = ct
            ? `perihelion q=${q.toFixed(2)} AU; orbit crosses ${ct.name} at ${ct.slot_r.toFixed(2)} AU ⇒ predicted COLLISION`
            : `perihelion q=${q.toFixed(2)} AU; crosses no in-situ planet ⇒ lost / ejected`;
        decompose_scatter(target, dom.perturber, perturberNames, o.name, o.au, inwardAu, inwardFate);
        target.destroyed = true;
        const sc = target.scatter;
        const impactNote = ct ? `impacts ${ct.name} at ~${ct.slot_r.toFixed(2)} AU` : 'inward impactor';
        target.interpretation = `${base} (obliterated by simultaneous scattering: ${perturberNames} → ${sc.belt.mass.toFixed(3)} M⊕ ${sc.belt.type}-type debris belt at ${sc.formation_au.toFixed(2)} AU; ${sc.outward.mass.toFixed(2)} M⊕ primary scattered outward to strike ${o.name}, ${sc.inward.mass.toFixed(3)} M⊕ ${impactNote})`;
    }
}
