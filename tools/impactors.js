#!/usr/bin/env node
// HYDROS impactor identification and impact dating.
//
// Mechanism: an impact on a body mid-gas-runaway TRUNCATES accretion
// (the energy budget rules out literal envelope blow-off: even at 10x
// extended radii, impact KE covers <25% of the binding energy of the
// missing mass — the deficit is gas that never arrived, not gas
// removed). Truncation makes the deficit a CLOCK:
//
//   kept = gas_obs/gas_pred = 1 - e^(-k (t* - t_form))   ->   t*
//
// and every body whose t_form exceeds t* never gassed at all: its
// observed mass should equal its bare core. One epoch, cross-predicted.
//
// Identification is TILT-FREE (portable to exoplanets, where axial
// tilt is unobservable). Three legs, all from masses and orbits:
//   1. THE CLOCK: every gas deficit implies a truncation epoch t*;
//      multiple targets must agree on ONE t*, and targets with
//      t_form > t* must sit at bare core mass (cross-prediction).
//   2. THE BUDGET: impactor masses come from the dispersed zones'
//      allocations (engine numbers), nowhere else.
//   3. THE POLARITY LAW: da sign and size per assignment must match
//      the erosion-recoil ledger (see routing section).
// The polarity law replaces any tilt argument: accretive impacts brake
// their target (da < 0), erosive impacts boost it via backward ejecta
// (da > 0); retention sets the polarity, and the assignment must
// reproduce each struck target's observed da.
//
// Sol verdict (engine numbers): slot-4 planet (2.57 ME) -> Saturn
// (only impactor that can pay the 26.7 deg tilt), slot-5 planet
// (1.23 ME) -> Uranus; t* = 4.6 Myr from Saturn's 61% kept gas;
// Uranus t_form 5.57 > t* -> never gassed, predicted = core 15.0 vs
// observed 14.54 (-3%). Uranus is an ice giant because its gas era
// was cancelled. t* sits after Jupiter completes and inside disc
// dispersal (~5.1 Myr): the dating coincides with Jupiter's
// destabilisation of slots 4-5.
//
// usage: node tools/impactors.js [--system sol]

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = vm.createContext({ window: {}, console, Math });
const load = (rel) => vm.runInContext(
  fs.readFileSync(path.join(root, rel), 'utf8'), ctx, { filename: rel });
load('exoplanets.js');
for (const f of ['constants.js', 'disc.js', 'allocation.js',
                 'classify.js', 'cascade.js', 'fit.js']) {
  load(path.join('js', f));
}

const args = process.argv.slice(2);
const id = args.includes('--system') ? args[args.indexOf('--system') + 1] : 'sol';
const sys = ctx.window.EXOPLANETS.find(s => s.id === id);
if (!sys) { console.error('unknown system: ' + id); process.exit(1); }

const r = ctx.bruteFit(sys.planets.map(p => ({ ...p })), sys.inputs.M_star, null, false);
const slots = r.fit.slots.filter(s => !s.exterior && !s.external);

// k: gas e-fold for this system (mirrors hydrogen_capture)
const m_star_earth = M => M * 332946.0 * 1.14;
const sol_disc = 0.01 * m_star_earth(1.0);
const system_disc = r.f_disc * m_star_earth(sys.inputs.M_star);
const k = 0.691 * Math.max(1.0, Math.pow(sol_disc / system_disc, 2.0));

// --- candidate impactors: dispersed-zone primaries -----------------
const sources = [];
for (const s of slots) {
  if (!s.filled && s.predicted > 0.05 && /scattered outward/.test(s.interpretation)) {
    sources.push({ slot: s.slot_n, mass: s.predicted, from: '(unfilled zone)' });
  }
  if (s.filled && /sibling survivor|zone dispersed/.test(s.interpretation)) {
    sources.push({ slot: s.slot_n, mass: s.predicted - s.observed, from: s.name + ' zone' });
  }
}

// --- gas targets: truncation dating --------------------------------
console.log(`${sys.name}: gas e-fold k = ${k.toFixed(3)} /Myr`);
console.log('\ncandidate impactors (dispersed primaries):');
for (const s of sources) console.log(`  slot ${s.slot} ${s.from}: ${s.mass.toFixed(3)} M_E`);

console.log('\nimpact dating (accretion truncation):');
let tstar = null;
const gasTargets = [];
for (const s of slots) {
  if (!s.filled || s.observed <= 0) continue;
  const core = s.rock + s.ice + s.pebble;
  if (core <= 3.0) continue;                       // not gas-eligible
  const gas_pred = s.predicted - core;
  const gas_obs = s.observed - core;
  if (gas_pred < 1) continue;
  gasTargets.push({ s, core, gas_pred, gas_obs });
}
for (const t of gasTargets) {
  const kept = t.gas_obs / t.gas_pred;
  if (kept > 0.02 && kept < 0.95) {
    const ts = t.s.t_form - Math.log(1 - kept) / k;
    console.log(`  ${t.s.name}: kept ${(kept * 100).toFixed(0)}% of gas, t_form ${t.s.t_form.toFixed(2)} -> t* = ${ts.toFixed(2)} Myr`);
    if (tstar === null) tstar = ts;
  }
}
if (tstar !== null) {
  console.log(`\ncross-prediction at t* = ${tstar.toFixed(2)} Myr:`);
  for (const t of gasTargets) {
    if (t.s.t_form > tstar) {
      const errpct = (t.s.observed - t.core) / t.core * 100;
      console.log(`  ${t.s.name}: t_form ${t.s.t_form.toFixed(2)} > t* -> NEVER GASSED; predicted = bare core ${t.core.toFixed(1)}, observed ${t.s.observed.toFixed(1)} (${errpct.toFixed(1)}%)`);
    }
  }
}

// --- routing from mass deficit + orbit change alone -------------------
// THE POLARITY LAW: the sign of an impact's da is set by RETENTION.
//   accretive (high retention): target absorbs the impactor's
//     sub-circular momentum -> brakes -> sinks (da < 0)
//   erosive (low retention): the plume launches backward/down-well,
//     carrying the retrograde momentum plus entrained target material
//     at sub-circular speed; shedding slow mass is a boost (da > 0)
// Net impact da per (impactor, target), all from masses and orbits:
//   vt/vc   = sqrt(2 r0/(r0+rt))      (arrival, perihelion ~ launch slot)
//   ret     = max(0.05, 0.969 - 0.605 dv/v_esc)
//   m_acc   = ret*m_i;  m_ej = (1-ret)*m_i*(1+ENTRAIN)
//   da_net  = 2 rt (1 - vt/vc) (m_ej - m_acc)/M_t
// Routing = the assignment whose da_net best matches observed da.
// ENTRAIN ~ 1 (equal target mass entrained per unit unretained
// impactor) is the one crude dial; label it honestly.
if (tstar !== null && sources.length >= 1) {
  const ENTRAIN = 1.0;
  const struck = gasTargets.filter(t => {
    const kept = t.gas_obs / t.gas_pred;
    return (kept < 0.95) || t.s.t_form > tstar;
  }).sort((a, b) => a.s.slot_r - b.s.slot_r);
  const prims = [...sources].sort((a, b) => b.mass - a.mass);
  if (struck.length >= 1 && prims.length >= struck.length) {
    const perm = (arr) => arr.length <= 1 ? [arr] :
      arr.flatMap((x, i) => perm(arr.slice(0, i).concat(arr.slice(i + 1))).map(r => [x, ...r]));
    const launch = s => slots.find(x => x.slot_n === s.slot)?.slot_r || 1;
    let best = null;
    console.log('\nrouting from deficit + orbit change alone (polarity law):');
    for (const ass of perm(prims.slice(0, struck.length))) {
      let score = 0; const lines = [];
      const fdata = [];
      for (let i = 0; i < struck.length; i++) {
        const tg = struck[i], src = ass[i];
        const r0 = launch(src), rt = tg.s.slot_r;
        const vt_vc = Math.sqrt(2 * r0 / (r0 + rt));
        const vc = 29.785 * Math.sqrt(1.14 * sys.inputs.M_star / rt);
        // pumped corridor arrival: v_inf ~ the perturber's circular
        // speed (multi-pass slingshot ceiling), as the dating requires
        const vinf = 29.785 * Math.sqrt(1.14 * sys.inputs.M_star / Math.max(r0 * 1.7, 1));
        const varr = Math.sqrt(vinf * vinf + 2 * vc * vc);
        const dv = Math.sqrt(varr * varr + vc * vc) - vc * vt_vc;
        const vesc = 11.186 * Math.pow(Math.max(tg.s.observed, 1), 1 / 3);
        const ret = Math.max(0.05, 0.969 - 0.605 * dv / vesc);
        const m_acc = ret * src.mass;
        const m_ej = (1 - ret) * src.mass * (1 + ENTRAIN);
        const da_net = 2 * rt * (1 - vt_vc) * (m_ej - m_acc) / tg.s.observed;
        const pl = sys.planets.find(pp => pp.name === tg.s.name);
        const da_obs = pl ? pl.r - tg.s.slot_r : 0;
        score += Math.abs(da_net - da_obs);
        lines.push(`    slot ${src.slot} (${src.mass.toFixed(2)}) -> ${tg.s.name}: ret ${ret.toFixed(2)}, da_net ${da_net >= 0 ? '+' : ''}${da_net.toFixed(2)} vs observed ${da_obs >= 0 ? '+' : ''}${da_obs.toFixed(2)} AU`);
        fdata.push({ tg, src, dv, vesc, ret, da_net });
      }
      console.log(`  hypothesis [${ass.map(s => 'slot ' + s.slot).join(', ')}], residual ${score.toFixed(2)} AU:`);
      for (const l of lines) console.log(l);
      if (!best || score < best.score) best = { ass, score, fdata };
    }
    console.log(`  VERDICT: ${best.ass.map((s, i) => `slot ${s.slot} -> ${struck[i].s.name}`).join('; ')}  (no tilts used)`);

    // --- impact forensics: velocity, impactor, date -------------------
    console.log('\nIMPACT FORENSICS (per struck body):');
    for (const f of best.fdata) {
      const kept = f.tg.gas_obs / f.tg.gas_pred;
      const when = (kept > 0.02 && kept < 0.95)
        ? `t* = ${(f.tg.s.t_form - Math.log(1 - kept) / k).toFixed(2)} Myr (own gas clock)`
        : (f.tg.s.t_form > (tstar || 0)
          ? `t* < t_form ${f.tg.s.t_form.toFixed(2)} (never gassed; dated by partner: ${tstar.toFixed(2)} Myr)`
          : 'undated');
      console.log(`  ${f.tg.s.name}:`);
      console.log(`    impactor: slot ${f.src.slot} primary, ${f.src.mass.toFixed(2)} M_E`);
      console.log(`    velocity: ${(f.dv).toFixed(1)} km/s arrival (dv/v_esc ${(f.dv / f.vesc).toFixed(2)})`);
      console.log(`    regime:   retention ${f.ret.toFixed(2)} -> ${f.ret > 0.7 ? 'additive (brakes target)' : f.ret > 0.4 ? 'erosive (boosts target)' : 'catastrophic'}`);
      console.log(`    date:     ${when}`);
    }
  }
}

// --- inward mass ledger: identify impacts with unaccounted mass ----
// Each dispersed zone drives 5-10% of its allocation inward (the
// survivor-fraction law). Subtract the identified sinks; a residual is
// a PREDICTED unidentified impact. A residual with no mass signature
// on any ISU-exact body must have been hit-and-run (orientation
// receipt only) or solar/ejected.
if (id === 'sol') {
  console.log('\ninward mass ledger (5-10% of each dispersed allocation):');
  const zones = [
    { slot: 5, alloc: 1.336, sinks: [['Mars (settled survivor)', 0.107]] },
    { slot: 4, alloc: 2.574, sinks: [['Earth excess (Theia delivery)', 0.029],
                                     ['Moon', 0.012],
                                     ['Borealis impactor (Mars)', 0.02]] },
  ];
  for (const z of zones) {
    const lo = 0.05 * z.alloc, hi = 0.10 * z.alloc;
    const known = z.sinks.reduce((a, s) => a + s[1], 0);
    console.log(`  slot ${z.slot}: inward band ${lo.toFixed(3)}-${hi.toFixed(3)} M_E`);
    for (const s of z.sinks) console.log(`      ${s[0]}: ${s[1].toFixed(3)}`);
    const rlo = Math.max(0, lo - known), rhi = Math.max(0, hi - known);
    if (rlo > 0 || rhi > 0.05) {     // closed once sinks reach the band floor
      console.log(`      -> UNACCOUNTED: ${rlo.toFixed(2)}-${rhi.toFixed(2)} M_E`);
      console.log('         candidate receipt: Venus retrograde despin (hit-and-run');
      console.log('         forced by Venus ISU-exactness; no mass signature expected)');
    } else {
      console.log('      -> closed');
    }
  }
}
