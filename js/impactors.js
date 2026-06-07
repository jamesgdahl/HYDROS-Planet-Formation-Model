"use strict";
// Impact forensics: identification, dating, routing. Shared by the web
// UI (index.html) and the CLI (tools/impactors.js) so the two cannot
// drift. Every input is a mass or an orbit - no tilts, portable to
// exoplanet systems.
//
// Mechanism: an impact mid-gas-runaway TRUNCATES accretion (energy
// budgets rule out literal envelope blow-off), so a gas deficit is a
// CLOCK: kept = 1 - e^(-k (t* - t_form)) -> t*. Bodies with
// t_form > t* never gassed: observed mass should equal bare core.
//
// Routing (the POLARITY LAW): retention sets the sign of the impact's
// da. Accretive hits brake the target (da < 0); erosive hits boost it,
// the backward plume carrying retrograde momentum plus entrained
// target material down-well (da > 0). The assignment of dispersed-zone
// primaries to struck targets must reproduce each observed da.
function firstborn_forecast(all_slots, planets, M_star, spin, f_disc) {
    const R = disc_radius(M_star, spin);
    const C = alfven_radius(M_star, spin) / R;
    if (C >= 1)
        return null; // inverted regime: no boundary density
    const SIGMA_SOL = 0.0103830 * m_star_earth(1.0) / Math.pow(30.07, 2);
    const sigma = f_disc * m_star_earth(M_star) / (R * R);
    const m_ext = 0.00359 * Math.pow(sigma / SIGMA_SOL, 2);
    // keeper: stellar member if any, else the body nearest the dam
    let keeper = null, kd = Infinity;
    for (const pl of planets) {
        if (pl.kbo || !(pl.observed && pl.observed > 0))
            continue;
        if (pl.observed >= 25400) {
            keeper = pl;
            break;
        }
        const d = Math.abs(Math.log(pl.r / R));
        if (d < kd) {
            kd = d;
            keeper = pl;
        }
    }
    if (!keeper)
        return null;
    const onDam = Math.abs(Math.log(keeper.r / R)) < 0.2;
    // observed match: a captured KBO, or any KBO within x2 of m_ext
    let obs = planets.find(pl => pl.kbo && pl.captured !== undefined) || null;
    if (!obs) {
        obs = planets.find(pl => pl.kbo && (pl.observed || 0) > 0
            && Math.abs(Math.log((pl.observed || 1) / m_ext)) < Math.log(2)) || null;
    }
    return { keeper: keeper.name, onDam, m_ext,
        observed: obs ? obs.name : null,
        observedMass: obs ? (obs.observed || 0) : 0 };
}
function impact_forensics(all_slots, planets, M_star, f_disc) {
    const slots = all_slots.filter(s => !s.exterior && !s.external);
    // gas e-fold for this system (mirrors hydrogen_capture)
    const k = 0.691 * Math.max(1.0, Math.pow((0.01 * m_star_earth(1.0)) / (f_disc * m_star_earth(M_star)), 2.0));
    // --- candidate impactors: dispersed-zone primaries ------------------
    const sources = [];
    for (const s of slots) {
        if (!s.filled && s.predicted > 0.05
            && /scattered outward/.test(s.interpretation)) {
            sources.push({ slot: s.slot_n, mass: s.predicted, from: '(unfilled zone)' });
        }
        if (s.filled && /sibling survivor|zone dispersed/.test(s.interpretation)) {
            sources.push({ slot: s.slot_n, mass: s.predicted - s.observed,
                from: s.name + ' zone' });
        }
    }
    // --- inward mass ledger: 5-10% of each dispersed allocation ---------
    // Generic sinks, engine-identifiable in ANY system: the settled
    // survivor at the zone, plus positive delivery excesses on interior
    // rocky bodies (observed > predicted), each attributed to its
    // nearest dispersed zone in log-radius. The residual is a PREDICTED
    // unidentified impact: hit-and-run on a mass-pinned body
    // (orientation receipt, no mass signature), a star-grazer, or
    // ejecta lost past a kinetic dam.
    const zones = sources.map(src => {
        const sl = slots.find(x => x.slot_n === src.slot);
        const alloc = sl ? sl.predicted : src.mass;
        const survivor = (sl && sl.filled) ? sl.observed : 0;
        const lo = 0.05 * alloc, hi = 0.10 * alloc;
        return { slot: src.slot, alloc, survivor, delivered: 0, receivers: [],
            lo, hi, residual_lo: 0, residual_hi: 0 };
    });
    if (zones.length) {
        for (const s of slots) {
            if (!s.filled || s.observed <= 0)
                continue;
            const core_s = s.rock + s.ice + s.pebble;
            if (core_s > 3.0)
                continue; // rocky receivers only
            const excess = s.observed - s.predicted;
            if (excess <= 0 || excess / s.predicted < 0.02)
                continue;
            // Reconstruct the LAUNCHED impactor through the retention line,
            // run backwards: the retained excess is ret x impactor. Arrival:
            // grazing-perihelion convention q = 0.85 r_t (Opik: collision
            // probability peaks for orbits whose perihelion grazes the
            // target's orbit). The ledger counts the launched mass; the
            // difference is lost to the impact disc / past the target's dam.
            const cands = zones
                .map(z => ({ z, zr: slots.find(x => x.slot_n === z.slot) }))
                .filter(c => c.zr && s.slot_r < c.zr.slot_r)
                .sort((a, b) => Math.abs(Math.log(a.zr.slot_r / s.slot_r))
                - Math.abs(Math.log(b.zr.slot_r / s.slot_r)));
            if (!cands.length)
                continue;
            // attribute to the nearest zone with band CAPACITY for the
            // launched mass; spill outward when the implied impactor cannot
            // fit (this recovers parentage from arithmetic alone)
            for (let ci = 0; ci < cands.length; ci++) {
                const c = cands[ci];
                const r0 = c.zr.slot_r, rt = s.slot_r;
                const q = 0.85 * rt, ao = (q + r0) / 2, e = (r0 - q) / (r0 + q);
                const vc = 29.785 * Math.sqrt(1.14 * M_star / rt);
                const vv = Math.sqrt(2 - rt / ao); // v/vc
                const vt = Math.sqrt(ao * (1 - e * e) / rt); // v_t/vc
                const vr = Math.sqrt(Math.max(0, vv * vv - vt * vt));
                const dv = vc * Math.sqrt((vt - 1) ** 2 + vr * vr);
                const vesc = 11.186 * Math.pow(Math.max(s.observed, 0.01), 1 / 3);
                const ret = Math.max(0.05, 0.969 - 0.605 * dv / vesc);
                const imp = excess / ret;
                const cap = c.z.hi - (c.z.survivor + c.z.delivered);
                if (imp <= cap + 0.02 || ci === cands.length - 1) {
                    c.z.delivered += imp;
                    c.z.receivers.push({ name: s.name, excess, impactor: imp,
                        dv, ret, lost: imp - excess, zoneSlot: c.z.slot });
                    break;
                }
            }
        }
        for (const z of zones) {
            const known = z.survivor + z.delivered;
            z.residual_lo = Math.max(0, z.lo - known);
            z.residual_hi = Math.max(0, z.hi - known);
        }
    }
    // --- water ledger: ocean equivalents of the inward deliveries ------
    const OCEAN_ME = 2.3e-4; // one Earth ocean [M_E]
    const ICE_SURV_LO = 0.5, ICE_SURV_HI = 1.0; // ice surviving the impact
    const W_PHI_LO = 0.35, W_PHI_HI = 0.70; // residual share launched
    //   at one body (Sol gauge)
    const water = [];
    for (const z of zones) {
        const zr = slots.find(x => x.slot_n === z.slot);
        if (!zr)
            continue;
        const ztot = zr.rock + zr.ice + zr.pebble;
        const ice_frac = ztot > 0 ? zr.ice / ztot : 0;
        if (ice_frac <= 0.01)
            continue; // dry zone: no water line
        // identified receipts: the receiver's retained excess IS the
        // delivered bulk; its water content is the zone's ice fraction
        for (const rc of z.receivers) {
            const w_lo = rc.excess * ice_frac * ICE_SURV_LO;
            const w_hi = rc.excess * ice_frac * ICE_SURV_HI;
            water.push({ name: rc.name, kind: 'receipt', zoneSlot: z.slot,
                ice_frac, ret: rc.ret, water_lo: w_lo, water_hi: w_hi,
                oceans_lo: w_lo / OCEAN_ME, oceans_hi: w_hi / OCEAN_ME });
        }
        // the unaccounted residual crossed every interior rocky orbit:
        // price an UPPER BOUND at each body the zone has not receipted
        // (Mars's ancient surface water is slot-4 crossing debris)
        if (z.residual_hi <= 0.005)
            continue;
        for (const s of slots) {
            if (!s.filled || s.observed <= 0)
                continue;
            const core_s = s.rock + s.ice + s.pebble;
            if (core_s > 3.0)
                continue; // rocky receivers only
            if (s.slot_r >= zr.slot_r)
                continue;
            if (z.receivers.some(rc => rc.name === s.name))
                continue;
            const r0 = zr.slot_r, rt = s.slot_r;
            const qa = 0.85 * rt, ao = (qa + r0) / 2, ee = (r0 - qa) / (r0 + qa);
            const vc = 29.785 * Math.sqrt(1.14 * M_star / rt);
            const vv = Math.sqrt(2 - rt / ao);
            const vt = Math.sqrt(ao * (1 - ee * ee) / rt);
            const vr = Math.sqrt(Math.max(0, vv * vv - vt * vt));
            const dv = vc * Math.sqrt((vt - 1) ** 2 + vr * vr);
            const vesc = 11.186 * Math.pow(Math.max(s.observed, 0.01), 1 / 3);
            const ret = Math.max(0.05, 0.969 - 0.605 * dv / vesc);
            const w_lo = ret * W_PHI_LO * z.residual_lo * ice_frac * ICE_SURV_LO;
            const w_hi = ret * W_PHI_HI * z.residual_hi * ice_frac * ICE_SURV_HI;
            if (w_hi / OCEAN_ME < 0.1)
                continue; // below mention grade
            water.push({ name: s.name, kind: 'bound', zoneSlot: z.slot,
                ice_frac, ret, water_lo: w_lo, water_hi: w_hi,
                oceans_lo: w_lo / OCEAN_ME, oceans_hi: w_hi / OCEAN_ME });
        }
    }
    const gasTargets = [];
    for (const s of slots) {
        if (!s.filled || s.observed <= 0)
            continue;
        const core = s.rock + s.ice + s.pebble;
        if (core <= 3.0)
            continue;
        const gas_pred = s.predicted - core;
        const gas_obs = s.observed - core;
        if (gas_pred < 1)
            continue;
        gasTargets.push({ s, core, gas_pred, gas_obs });
    }
    let tstar = null;
    const datings = [];
    for (const t of gasTargets) {
        const kept = t.gas_obs / t.gas_pred;
        if (kept > 0.02 && kept < 0.95) {
            const ts = t.s.t_form - Math.log(1 - kept) / k;
            datings.push({ name: t.s.name, kept, t_form: t.s.t_form, tstar: ts });
            if (tstar === null)
                tstar = ts;
        }
    }
    const neverGassed = [];
    if (tstar !== null) {
        for (const t of gasTargets) {
            if (t.s.t_form > tstar) {
                neverGassed.push({
                    name: t.s.name, t_form: t.s.t_form, core: t.core,
                    observed: t.s.observed,
                    err_pct: (t.s.observed - t.core) / t.core * 100,
                });
            }
        }
    }
    // --- routing by the polarity law -------------------------------------
    const hypotheses = [];
    let verdict = null;
    if (tstar !== null && sources.length >= 1) {
        const ts_final = tstar;
        const struck = gasTargets
            .filter(t => (t.gas_obs / t.gas_pred < 0.95) || t.s.t_form > ts_final)
            .sort((a, b) => a.s.slot_r - b.s.slot_r);
        const prims = [...sources].sort((a, b) => b.mass - a.mass);
        if (struck.length >= 1 && prims.length >= struck.length) {
            const perm = (arr) => arr.length <= 1 ? [arr] :
                arr.flatMap((x, i) => perm(arr.slice(0, i).concat(arr.slice(i + 1))).map(rr => [x, ...rr]));
            const launch = (sn) => {
                const f = slots.find(x => x.slot_n === sn);
                return f ? f.slot_r : 1;
            };
            const ENTRAIN = 1.0; // entrained target mass per unit unretained impactor
            let bestScore = Infinity;
            for (const ass of perm(prims.slice(0, struck.length))) {
                let score = 0;
                const rows = [];
                for (let i = 0; i < struck.length; i++) {
                    const tg = struck[i], src = ass[i];
                    const r0 = launch(src.slot), rt = tg.s.slot_r;
                    const vt_vc = Math.sqrt(2 * r0 / (r0 + rt));
                    const vc = 29.785 * Math.sqrt(1.14 * M_star / rt);
                    // pumped corridor arrival: v_inf ~ perturber's circular speed
                    const vinf = 29.785 * Math.sqrt(1.14 * M_star / Math.max(r0 * 1.7, 1));
                    const varr = Math.sqrt(vinf * vinf + 2 * vc * vc);
                    const dv = Math.sqrt(varr * varr + vc * vc) - vc * vt_vc;
                    const vesc = 11.186 * Math.pow(Math.max(tg.s.observed, 1), 1 / 3);
                    const ret = Math.max(0.05, 0.969 - 0.605 * dv / vesc);
                    const m_acc = ret * src.mass;
                    const m_ej = (1 - ret) * src.mass * (1 + ENTRAIN);
                    const da_net = 2 * rt * (1 - vt_vc) * (m_ej - m_acc) / tg.s.observed;
                    const p = planets.find(pp => pp.name === tg.s.name);
                    const da_obs = p ? p.r - tg.s.slot_r : 0;
                    score += Math.abs(da_net - da_obs);
                    rows.push({ target: tg.s.name, srcSlot: src.slot, srcMass: src.mass,
                        dv, vesc, ret, da_net, da_obs,
                        t_form: tg.s.t_form, kept: tg.gas_obs / tg.gas_pred });
                }
                hypotheses.push({
                    label: ass.map(s => 'slot ' + s.slot).join(', '), score, rows
                });
                if (score < bestScore) {
                    bestScore = score;
                    verdict = rows;
                }
            }
        }
    }
    // --- event closures ---------------------------------------------------
    const closures = [];
    const close = (name, reason) => {
        if (!closures.some(c => c.name === name))
            closures.push({ name, reason });
    };
    for (const s of slots) {
        if (!s.filled)
            continue;
        if (/merger \(absorbed/.test(s.interpretation)) {
            close(s.name, 'merger remnant (retention-model match)');
        }
        if (/sibling survivor/.test(s.interpretation)) {
            close(s.name, 'dispersal survivor (within the 5-10% band)');
        }
        if (s.devoured && s.devoured > 0.1) {
            close(s.name, `wrecking migrant (formation ${(s.observed - s.devoured).toFixed(0)} + devoured ${s.devoured.toFixed(0)} = observed, budget-closed)`);
        }
    }
    if (verdict && tstar !== null) {
        for (const v of verdict) {
            const ng = neverGassed.find(n => n.name === v.target);
            if (ng && Math.abs(ng.err_pct) > 15)
                continue; // cross-pred must hold
            close(v.target, `impact (slot ${v.srcSlot} primary, dated t* = ${tstar.toFixed(2)} Myr)`);
        }
    }
    for (const z of zones) {
        for (const rc of z.receivers) {
            close(rc.name, `delivery (slot ${rc.zoneSlot} sibling, budget-closed)`);
        }
    }
    return { k, tstar, datings, neverGassed, sources, zones, water,
        hypotheses, verdict, closures };
}
