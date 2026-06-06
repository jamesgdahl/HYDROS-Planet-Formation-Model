"use strict";
// Impact forensics: identification, dating, routing. Shared by the web
// UI (index.html) and the CLI (tools/impactors.js) so the two cannot
// drift. Every input is a mass or an orbit — no tilts, portable to
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
    const zones = sources.map(src => {
        const sl = slots.find(x => x.slot_n === src.slot);
        const alloc = sl ? sl.predicted : src.mass;
        const survivor = (sl && sl.filled) ? sl.observed : 0;
        const lo = 0.05 * alloc, hi = 0.10 * alloc;
        return { slot: src.slot, alloc, survivor, lo, hi,
            residual_lo: Math.max(0, lo - survivor),
            residual_hi: Math.max(0, hi - survivor) };
    });
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
    return { k, tstar, datings, neverGassed, sources, zones, hypotheses, verdict };
}
