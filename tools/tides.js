#!/usr/bin/env node
// HYDROS tide ledger - CLI front-end. ALL PHYSICS LIVES IN
// js/tides.js (tide_ledger), shared with the web UI.
//
// What a bound stellar companion's recurring tide does to a satellite
// system: the standing tide-dam (Breslau r_t, cross-checked against
// the independent Holman-Wiegert N-body stability radius), the
// conveyor erosion of boundary seats, and the priced inward/outward
// split - including the WATER ledger (ocean units) for the safe
// interior seats. This is the volatile-delivery audit for truncated
// systems: a giantless compact system's only watering channel is its
// own tide-stirred icy boundary seat.
//
// Seats come from the fitted slots when the system has observed
// planets, or straight from the cascade ladder + allocation for
// fully-predicted systems (planets: []).
//
// usage: node tools/tides.js --system alphacen_b [--abin 23.52]

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
                 'classify.js', 'cascade.js', 'fit.js', 'tides.js']) {
  load(path.join('js', f));
}

const args = process.argv.slice(2);
const arg = (k) => args.includes(k) ? args[args.indexOf(k) + 1] : null;
const id = arg('--system') || 'alphacen_b';
const sys = ctx.window.EXOPLANETS.find(s => s.id === id);
if (!sys) { console.error('unknown system: ' + id); process.exit(1); }
const inp = sys.inputs || {};
const strip = inp.stripping;
if (!strip || !strip.q) {
  console.error(id + ' carries no stripping/tide config (M_pert, q)');
  process.exit(1);
}
const a_bin = arg('--abin') ? parseFloat(arg('--abin'))
  : (strip.a_bin || null);

// --- seats: the PRIMORDIAL cascade ladder (shared builder in
//     js/tides.js - pre-stripping allocations; fitted slots supply
//     occupant names only) ------------------------------------------
const obs = (sys.planets || []).filter(p => !p.kbo && p.observed > 0);
let slots = null;
if (obs.length) {
  const r = ctx.bruteFit(sys.planets.map(p => ({ ...p })), inp.M_star,
    strip, false);
  slots = r.fit.slots;
}
const seats = ctx.tide_seats(inp.M_star, inp.spin, inp.f_disc, slots);

const L = ctx.tide_ledger(seats, inp.M_star, strip.M_pert, strip.q, a_bin);

console.log(`${sys.name}: standing tide from ${strip.M_pert} M_sun`
  + ` companion, q = ${strip.q} AU`
  + (a_bin ? `, a_bin = ${a_bin} AU (e_bin ${L.e_bin.toFixed(2)})` : ''));
console.log(`  tide-dam r_t = ${L.r_t.toFixed(2)} AU`
  + ` (stirred zone ${L.r_stir.toFixed(2)}-${L.r_t.toFixed(2)})`);
if (L.a_crit !== null) {
  console.log(`  Holman-Wiegert a_crit = ${L.a_crit.toFixed(2)} AU`
    + (L.hw_valid ? '' : '  [outside fit range - indicative only]')
    + `  <- independent N-body cross-check of the wall`);
}
console.log(`  VERDICT: ${L.verdict}`);

console.log('\nseats:');
for (const x of L.rows) {
  const tag = x.zone === 'DESTROYED' ? 'DESTROYED (outside the wall: never a planet)'
    : x.zone === 'CONVEYOR' ? `CONVEYOR (Breslau-stirred + HW-unstable: feedstock, ~${(x.L * 100).toFixed(0)}% processed over Gyr)`
    : x.zone === 'STIRRED' ? `STIRRED (~${(x.L * 100).toFixed(0)}% eroded)`
    : 'SAFE';
  console.log(`  ${(x.name || '').padEnd(12)} slot ${x.slot_n}`
    + `  r ${x.r.toFixed(2).padStart(6)}  m ${x.mass.toFixed(2).padStart(7)} M_E`
    + `  ${x.icy ? 'icy' : 'dry'}  ${tag}`);
}

console.log(`\nerosion budget: icy ${L.eroded_icy.toFixed(2)} M_E,`
  + ` dry ${L.eroded_dry.toFixed(2)} M_E`
  + ` (+ ${L.destroyed.toFixed(2)} outside the wall, never assembled)`);
console.log(`  inward share (Sol-calibrated 5-10%):`
  + ` ${L.inward_lo.toFixed(3)}-${L.inward_hi.toFixed(3)} M_E of icy`
  + ` material crosses the inner system`);
console.log(`  outward share: ~${L.outward.toFixed(2)} M_E ejected by the`
  + ` recurring stellar periapsis or handed to the companion's own`
  + ` space (cross-system veneer - the perturber's planets are the`
  + ` other receiver)`);

if (L.receivers.length) {
  const hz = ctx.habitable_zone(inp.M_star, inp.L || null);
  console.log('\nwater ledger (per safe seat, Opik arrival + retention line;');
  console.log('  per-seat PRINCIPAL-RECEIVER brackets - not additive across seats):');
  for (const rc of L.receivers) {
    const inHZ = rc.r >= hz[0] && rc.r <= hz[1];
    const world = rc.oceans_lo > 20 ? ' (OCEAN WORLD: surface km-deep)'
      : rc.oceans_hi > 20 ? ' (possibly an ocean world)' : '';
    console.log(`  ${(rc.name || '').padEnd(12)} r ${rc.r.toFixed(2)}`
      + `  dv ${rc.dv.toFixed(1)} km/s  ret ${rc.ret.toFixed(2)}`
      + `  retained ${rc.retained_lo.toFixed(4)}-${rc.retained_hi.toFixed(4)} M_E`
      + `  = ${rc.oceans_lo.toFixed(0)}-${rc.oceans_hi.toFixed(0)} oceans`
      + (inHZ ? `  <- HABITABLE ZONE (${hz[0].toFixed(2)}-${hz[1].toFixed(2)})${world}` : ''));
  }
} else {
  console.log('\nwater ledger: NO icy feedstock erodes - bone-dry forecast stands');
}
