#!/usr/bin/env node
// HYDROS firehose generator — predict each system's dam-exterior
// cohort (its "KBOs") from the environment alone.
//
// THE PRODUCT-MASS LAW: the dam is one production line at every scale;
// what changes is the boundary surface density, and the product mass
// follows it QUADRATICALLY:
//
//   Sigma_dam = f_disc · M_star[M_E] / R_disc^2      [M_E / AU^2]
//   m_ext     = m_Sol · (Sigma_dam / Sigma_Sol)^2
//
// Calibrated at two points spanning 6 decades:
//   Sol (Sigma 4.4):    rung cohort ~2.2 mE (Pluto-class)  [anchor]
//   ups And (Sigma 5.4e3): rung-1 corpse, BD-grade ~3-6k M_E
//     (the body whose star-grazer sinking pays B's eviction)
// One level up, the galactopause mints cloud-mass products and the
// galaxy simulator (tools/galaxy.js) already generates the entire
// stellar disc from environment density: same machine, same logic,
// different Sigma.
//
// Throughput budget scales with the disc itself (Sol: 660 M_E drove
// through; residue is percent-level). Caveats: normal-regime dams
// only (inverted-regime D_eff is not a boundary density); two-point
// calibration, quadratic exponent 2.06 rounded to 2.
//
// usage: node tools/firehose.js [--system id]   (default: tour)

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

const M_SUN_TO_EARTH = 332946.0 * 1.14;
const m_star_earth = M => M * M_SUN_TO_EARTH;
const RHO = 1 - Math.sqrt(Math.log(2)) / 2;

// Sol anchors
const SIGMA_SOL = 0.0103830 * m_star_earth(1.0) / Math.pow(30.07, 2);
const M_EXT_SOL = 0.00218;           // Pluto, rung 0.5 cohort [M_E]
const FIREHOSE_SOL = 660;            // throughput [M_E]

const cls = m => m >= 25400 ? 'STELLAR'
  : m >= 4131 ? 'brown dwarf'
  : m >= 100 ? 'giant-class'
  : m >= 1 ? 'super-Earth-class'
  : m >= 0.001 ? 'Pluto-class'
  : 'comet/asteroid-class';

const args = process.argv.slice(2);
const only = args.includes('--system') ? args[args.indexOf('--system') + 1] : null;

console.log('system'.padEnd(22), 'D_neb'.padStart(9), 'R_disc'.padStart(8),
  'Sigma_dam'.padStart(10), 'm_ext [M_E]'.padStart(12), '  product class',
  '   throughput');
for (const sys of ctx.window.EXOPLANETS) {
  if (only && sys.id !== only) continue;
  const inp = sys.inputs || {};
  if (!inp.M_star || !inp.spin || !inp.f_disc) continue;
  // stellar dams only: sub-cascades and kinetic (impact) discs have
  // their own capture physics (ring/moonlet grammar, not firehose)
  if (inp.M_star < 0.075) continue;
  const D = Math.pow(inp.spin, 1.5);
  const R = 30.07 * inp.M_star * Math.pow(inp.spin, -0.5);
  const C = 0.2 * inp.M_star * Math.pow(inp.spin, 4 / 7) / R;
  if (C >= 1) {                      // inverted regime: no boundary density
    console.log(sys.name.slice(0, 21).padEnd(22), D.toFixed(1).padStart(9),
      '—'.padStart(8), '(inverted regime: dam semantics differ)'.padStart(30));
    continue;
  }
  const S = inp.f_disc * m_star_earth(inp.M_star) / (R * R);
  const m_ext = M_EXT_SOL * Math.pow(S / SIGMA_SOL, 2);
  const budget = FIREHOSE_SOL
    * (inp.f_disc * inp.M_star) / (0.0103830 * 1.0);
  console.log(sys.name.slice(0, 21).padEnd(22), D.toFixed(1).padStart(9),
    R.toFixed(1).padStart(8), S.toFixed(2).padStart(10),
    (m_ext < 0.01 ? (m_ext * 1000).toPrecision(3) + 'm' : m_ext.toFixed(1)).padStart(12),
    ('  ' + cls(m_ext)).padEnd(20),
    ' ~' + budget.toFixed(0) + ' M_E');
  // exterior rung radii (first three stances of the retreating dam)
  if (only) {
    for (const n of [0.5, 1, 1.5, 2]) {
      console.log('    rung ' + n + ':', (R * Math.pow(1 / RHO, n)).toFixed(1), 'AU');
    }
  }
}
