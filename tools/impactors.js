#!/usr/bin/env node
// HYDROS impactor identification and impact dating — CLI front-end.
// ALL PHYSICS LIVES IN js/impactors.js (impact_forensics), shared with
// the web UI so the two cannot drift.
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
//   1. THE CLOCK: dating + bare-core cross-prediction.
//   2. THE BUDGET: impactor masses come from the dispersed zones'
//      allocations (engine numbers), nowhere else.
//   3. THE POLARITY LAW: accretive impacts brake their target
//      (da < 0); erosive impacts boost it via backward ejecta
//      (da > 0). Retention sets the polarity, and the assignment
//      must reproduce each struck target's observed da.
//
// Sol verdict: slot-4 planet (2.57 ME) -> Saturn, slot-5 planet
// (1.23 ME) -> Uranus; t* = 4.6 Myr from Saturn's 61% kept gas;
// Uranus t_form 5.57 > t* -> never gassed, predicted = core 15.0 vs
// observed 14.54 (-3%). Uranus is an ice giant because its gas era
// was cancelled. t* coincides with Jupiter's destabilisation of
// slots 4-5 (after Jupiter completes, inside disc dispersal ~5.1).
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
                 'classify.js', 'cascade.js', 'fit.js', 'impactors.js']) {
  load(path.join('js', f));
}

const args = process.argv.slice(2);
const id = args.includes('--system') ? args[args.indexOf('--system') + 1] : 'sol';
const sys = ctx.window.EXOPLANETS.find(s => s.id === id);
if (!sys) { console.error('unknown system: ' + id); process.exit(1); }

const r = ctx.bruteFit(sys.planets.map(p => ({ ...p })), sys.inputs.M_star, null, false);
const F = ctx.impact_forensics(r.fit.slots, sys.planets, sys.inputs.M_star, r.f_disc);

console.log(`${sys.name}: gas e-fold k = ${F.k.toFixed(3)} /Myr`);

console.log('\ncandidate impactors (dispersed primaries):');
for (const s of F.sources) {
  console.log(`  slot ${s.slot} ${s.from}: ${s.mass.toFixed(3)} M_E`);
}

console.log('\nimpact dating (accretion truncation):');
for (const d of F.datings) {
  console.log(`  ${d.name}: kept ${(d.kept * 100).toFixed(0)}% of gas, t_form ${d.t_form.toFixed(2)} -> t* = ${d.tstar.toFixed(2)} Myr`);
}
if (F.tstar !== null && F.neverGassed.length) {
  console.log(`\ncross-prediction at t* = ${F.tstar.toFixed(2)} Myr:`);
  for (const n of F.neverGassed) {
    console.log(`  ${n.name}: t_form ${n.t_form.toFixed(2)} > t* -> NEVER GASSED; predicted = bare core ${n.core.toFixed(1)}, observed ${n.observed.toFixed(1)} (${n.err_pct.toFixed(1)}%)`);
  }
}

if (F.hypotheses.length) {
  console.log('\nrouting from deficit + orbit change alone (polarity law):');
  for (const h of F.hypotheses) {
    console.log(`  hypothesis [${h.label}], residual ${h.score.toFixed(2)} AU:`);
    for (const x of h.rows) {
      console.log(`    slot ${x.srcSlot} (${x.srcMass.toFixed(2)}) -> ${x.target}: ret ${x.ret.toFixed(2)}, da_net ${x.da_net >= 0 ? '+' : ''}${x.da_net.toFixed(2)} vs observed ${x.da_obs >= 0 ? '+' : ''}${x.da_obs.toFixed(2)} AU`);
    }
  }
  if (F.verdict) {
    console.log(`  VERDICT: ${F.verdict.map(x => `slot ${x.srcSlot} -> ${x.target}`).join('; ')}  (no tilts used)`);
    console.log('\nIMPACT FORENSICS (per struck body):');
    for (const x of F.verdict) {
      const when = (x.kept > 0.02 && x.kept < 0.95)
        ? `t* = ${(x.t_form - Math.log(1 - x.kept) / F.k).toFixed(2)} Myr (own gas clock)`
        : `t* < t_form ${x.t_form.toFixed(2)} (never gassed; dated by partner: ${F.tstar.toFixed(2)} Myr)`;
      const regime = x.ret > 0.7 ? 'additive (brakes target)'
                   : x.ret > 0.4 ? 'erosive (boosts target)' : 'catastrophic';
      console.log(`  ${x.target}:`);
      console.log(`    impactor: slot ${x.srcSlot} primary, ${x.srcMass.toFixed(2)} M_E`);
      console.log(`    velocity: ${x.dv.toFixed(1)} km/s arrival (dv/v_esc ${(x.dv / x.vesc).toFixed(2)})`);
      console.log(`    regime:   retention ${x.ret.toFixed(2)} -> ${regime}`);
      console.log(`    date:     ${when}`);
    }
  }
}

console.log('\ninward mass ledger (5-10% of each dispersed allocation):');
// Sol-specific identified sinks beyond the generic settled survivor:
const SOL_SINKS = {
  4: [['Earth excess (Theia delivery)', 0.029], ['Moon', 0.012],
      ['Borealis impactor (Mars)', 0.020]],
};
for (const z of F.zones) {
  const extra = (id === 'sol' && SOL_SINKS[z.slot]) ? SOL_SINKS[z.slot] : [];
  const known = z.survivor + extra.reduce((a, s) => a + s[1], 0);
  console.log(`  slot ${z.slot}: inward band ${z.lo.toFixed(3)}-${z.hi.toFixed(3)} M_E`);
  if (z.survivor > 0) console.log(`      settled survivor: ${z.survivor.toFixed(3)}`);
  for (const s of extra) console.log(`      ${s[0]}: ${s[1].toFixed(3)}`);
  const rlo = Math.max(0, z.lo - known), rhi = Math.max(0, z.hi - known);
  if (rlo > 0 || rhi > 0.05) {
    console.log(`      -> UNACCOUNTED: ${rlo.toFixed(2)}-${rhi.toFixed(2)} M_E`);
    console.log('         candidate receipt: Venus retrograde despin (hit-and-run');
    console.log('         forced by Venus ISU-exactness; no mass signature expected)');
  } else {
    console.log('      -> closed');
  }
}
