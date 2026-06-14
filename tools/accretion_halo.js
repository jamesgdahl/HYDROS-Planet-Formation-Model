// PEBBLE-BARRIER capture SEQUENCE prototype (standalone — does not touch the catalogue).
// Resolution of the compact-system problem (see memory accretion-halo-decretion):
//   - Core metals flung out (X-wind); beyond the dam ~1% -> KBOs, 99% recycles inward as PEBBLE FLUX.
//   - The flux is captured by the planets in FORMATION order (first-former wins): the snow-line core
//     forms first (Sol -> Jupiter) or, with no snow line in the disc, the outermost (Kepler-90 -> h).
//     Each captures a share of the still-drifting flux; it declines inward; the interior starves.
//   - Total captured fraction scales with COMPACTNESS (compact disc intercepts more): eps_cap ~ sqrt(R_A/R_disc).
//   - Envelope gated by temperature: COLD (beyond snow) -> H/He GAS GIANT (core seeds runaway from the
//     H reservoir); WARM (inside snow, holds water not H/He) -> STEAM GIANT (water envelope from the icy
//     flux); HOT -> rock only.
// usage: node tools/accretion_halo.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { Math, console, JSON, isFinite, isNaN, Object, Array, Number, String, Boolean, Map, Set, parseFloat, parseInt, Infinity, window: {} };
vm.createContext(ctx);
for (const f of ['constants', 'disc', 'allocation', 'classify', 'cascade', 'budget', 'fit', 'impactors'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'exoplanets.js'), 'utf8'), ctx, { filename: 'x' });
const MSUNE = 332946, eps_SI = 0.01;

function analyze(id) {
  const e = ctx.window.EXOPLANETS.find(x => x.id === id);
  const b = e.budget, Mtot = b.rock + b.ice + b.hydrogen, Z = (b.rock + b.ice) / Mtot, frock = b.rock / (b.rock + b.ice);
  const rB = ctx.budgetFit(e.planets.map(p => ({ name: p.name, r: p.r, observed: p.observed || 0, kbo: p.kbo, core: p.core, e: p.e })), b, e.spin, null, e.star);
  const M = rB.budget_M, RA = rB.budget_R_A, Rd = rB.budget_R_disc, snow = rB.budget_snow;
  const Mbeyond = Math.max(0, Mtot - e.star * MSUNE - rB.f_disc * Mtot);
  const flux0 = (1 - eps_SI) * Z * Mbeyond;          // recycled inward pebble flux (solid M_E)
  const eps_cap = Math.sqrt(RA / Rd);                // compactness capture (Sol ~0.08, Kep90 ~0.41)
  const captured = eps_cap * flux0;                  // total solid the planets capture

  const pl = e.planets.filter(p => p.observed && !p.core && !p.kbo).slice().sort((a, b) => b.r - a.r); // outermost first
  // FORMATION order: first-former = innermost-beyond-snow (snow-line core) else outermost; then sweep inward
  const beyond = pl.filter(p => p.r > snow);
  const firstFormer = beyond.length ? beyond.reduce((a, b) => a.r < b.r ? a : b) : pl[0];
  // Capture sweep: order from the first-former, take its share of the declining flux, then the rest
  // outward-in. Share per planet ~ proportional to its observed gravity-cross-section M^(2/3) (runaway:
  // the bigger captures more) — here we use observed mass to VALIDATE the split sums to `captured`.
  const order = [firstFormer, ...pl.filter(p => p !== firstFormer)];   // first-former leads
  const wsum = order.reduce((a, p) => a + Math.pow(p.observed, 2 / 3), 0);
  console.log('\n=== ' + id + ' ===  snow=' + snow.toFixed(1) + '  flux=' + flux0.toFixed(0) + '  eps_cap=' + eps_cap.toFixed(3) + '  captured=' + captured.toFixed(0) + ' M_E');
  console.log('  first-former: ' + firstFormer.name + ' @ ' + firstFormer.r.toFixed(2) + ' AU');
  console.log('  planet       r     obs    capt-solid   class');
  for (const p of order.slice().sort((a, b) => b.r - a.r)) {
    const share = captured * Math.pow(p.observed, 2 / 3) / wsum;
    const cls = p.r > snow ? 'gas (H/He+core)' : (share > 5 ? 'STEAM (water+rock)' : 'rock');
    console.log('    ' + p.name.padEnd(11) + ' ' + p.r.toFixed(2).padStart(5) + '  ' + p.observed.toFixed(0).padStart(5) + '   ' + share.toFixed(1).padStart(7) + '     ' + cls);
  }
}
analyze('sol');
analyze('kep90');
