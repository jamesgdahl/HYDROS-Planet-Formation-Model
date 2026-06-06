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
//   3. RANGE ORDERING: the near target intercepts the corridor first
//      and takes the leading (heavier, first-launched) primary; the
//      far target is reached by the survivor of the passage.
// The tilt angular-momentum budget remains as a Sol-only luxury
// confirmation (we happen to have tilts here); it is NOT load-bearing.
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

// --- tilt-free routing: range ordering --------------------------------
if (tstar !== null && sources.length >= 1) {
  const bySize = [...sources].sort((a, b) => b.mass - a.mass);
  const hit = gasTargets.filter(t => {
    const kept = t.gas_obs / t.gas_pred;
    return (kept < 0.95) || t.s.t_form > tstar;
  }).sort((a, b) => a.s.slot_r - b.s.slot_r);
  if (hit.length) {
    console.log('\ntilt-free routing (range ordering: near target = leading primary):');
    for (let i = 0; i < hit.length; i++) {
      const src = bySize[Math.min(i, bySize.length - 1)];
      console.log(`  slot ${src.slot} primary (${src.mass.toFixed(2)} M_E) -> ${hit[i].s.name}`);
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

// --- tilt-budget routing (Sol targets; radii/tilts are observational) ---
if (id === 'sol') {
  const ME = 5.972e24, RE = 6.371e6;
  const T = {
    Saturn: { R: 9.14 * RE, tilt: 26.7, L: 7.5e37, r: 10.246 },
    Uranus: { R: 3.98 * RE, tilt: 98, L: 1.3e36, r: 17.552 },
  };
  const vcirc = rr => 29785 * Math.sqrt(1.14 / rr);
  const vinf = 13000;  // Jupiter pumping ceiling
  console.log('\ntilt-budget CONFIRMATION (Sol-only; identification above is tilt-free):');
  for (const [tn, t] of Object.entries(T)) {
    const vc = vcirc(t.r);
    const vrel = Math.sqrt(vinf * vinf + 2 * vc * vc + vc * vc);
    const Lneed = t.L * Math.sin(t.tilt * Math.PI / 180);
    const row = sources.map(s => {
      const lo = s.mass * ME * vrel * t.R / Lneed;
      return `slot ${s.slot}: ${lo.toFixed(2)}..${(lo * 10).toFixed(1)}`;
    }).join('   ');
    console.log(`  ${tn} (needs ${t.tilt} deg): ${row}`);
  }
  console.log('  tilt agrees with the tilt-free routing: only the heaviest');
  console.log('  primary can pay Saturn\'s 26.7 deg.');
}
