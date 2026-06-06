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
  // PRODUCT-MASS DECAY along the retreat: Sigma ~ R^-2 so m ~ R^-4.
  // SURVIVAL LAW: the dam-keeper's chaos reach is 11 R_H; each rung is
  //   SWEPT (inside the zone: ~0%, parking-lot capture excepted),
  //   EDGE (within ~10% of the zone boundary: resonant islands ~10%,
  //         calibrated on Sol's plutino/cold-classical census), or
  //   SAFE (beyond: ~100%, grinding aside).
  // Keeper = stellar member if any, else the body nearest the dam.
  if (only) {
    let keeper = null, kd = Infinity;
    for (const pl of sys.planets) {
      if (pl.kbo || !(pl.observed > 0)) continue;
      if (pl.observed >= 25400) { keeper = pl; break; }
      const d = Math.abs(Math.log(pl.r / R));
      if (d < kd) { kd = d; keeper = pl; }
    }
    if (keeper) {
      const reach = 11 * Math.pow(keeper.observed
        / (3 * m_star_earth(inp.M_star)), 1 / 3);   // in units of R_disc
      console.log('  dam-keeper: ' + keeper.name + ' (' + keeper.observed
        + ' M_E), chaos reach ' + (reach * R).toFixed(1) + ' AU ('
        + (1 + reach).toFixed(2) + ' R_disc)');
      // UNDISCOVERED CENSUS: stance stock is supply-proportional and
      // therefore ~constant per stance, C*f*M with C = 5.1e-6
      // (calibrated on Sol's cold-classical stock, ~0.02 M_E/stance).
      // N = stock / m_product = count of CHARACTERISTIC-mass members
      // per ring (the size-distribution tail multiplies the smaller).
      const C_STOCK = 5.1e-6;
      const stock = C_STOCK * inp.f_disc * m_star_earth(inp.M_star);
      for (const n of [0.5, 1, 1.5, 2, 2.5]) {
        const Rn = R * Math.pow(1 / RHO, n);
        const mn = m_ext * Math.pow(R / Rn, 4);
        const x = Rn / R;
        const surv = x <= (1 + reach) * 0.97 ? 0
          : x <= (1 + reach) * 1.10 ? 0.1 : 1.0;
        const status = surv === 0 ? 'SWEPT (parking-lot capture only)'
          : surv === 0.1 ? 'EDGE (resonant islands, ~10%)'
          : 'SAFE (survivors expected)';
        const N = surv > 0 ? Math.round(stock * surv / mn) : 0;
        console.log('    rung ' + n + ': ' + Rn.toFixed(1) + ' AU  ->  ~'
          + (mn < 0.01 ? (mn * 1000).toPrecision(3) + ' mE' : mn.toFixed(1) + ' M_E')
          + ' (' + cls(mn) + ')  ' + status
          + (N > 0 ? '  N~' + N : ''));
      }
      // FACTORY VINTAGE: size IS the clock. m ~ Sigma^2 ~ R^-4 inverts
      // each observed exterior body's mass to its minting stance
      // (ORIGINAL AU), and the dam's three-gear chronology dates it:
      //   gear 1: parked at R_disc through the gas era (t_disc)
      //   gear 2: the firehose sweep, R_disc -> 1.6 R_disc (the cliff)
      //           over ~3 Myr
      //   gear 3: the long retreat, R ~ t^0.138 (Sol-calibrated:
      //           heliopause 120 AU at 4,570 Myr)
      // Bodies more massive than the at-dam product are firehose-onset
      // vintage (densest supply). Rung residence is NOT the clock —
      // scattered bodies sit anywhere; their mass still dates them.
      const kbos = sys.planets.filter(pl => pl.kbo && pl.observed > 0);
      if (kbos.length) {
        const t_disc = 5.0 * Math.sqrt(
          (inp.f_disc * m_star_earth(inp.M_star)) / (0.01 * m_star_earth(1.0)));
        const R_cliff = 1.6 * R;
        const BETA = 0.138;
        console.log('  FACTORY VINTAGES (size-clock):');
        for (const pl of kbos.sort((a, b) => b.observed - a.observed)) {
          const Rb = Math.max(R, R * Math.pow(m_ext / pl.observed, 0.25));
          let when;
          if (pl.observed >= m_ext * 0.999) when = '<' + t_disc.toFixed(1) + ' (firehose onset, at the dam face)';
          else if (Rb <= R_cliff) when = (t_disc + 3 * (Rb - R) / (0.6 * R)).toFixed(1);
          else when = ((t_disc + 3) * Math.pow(Rb / R_cliff, 1 / BETA)).toFixed(0);
          const disp = Math.abs(pl.r - Rb) / Rb;
          const tag = disp < 0.15 ? 'in situ at its stance'
            : pl.r > Rb ? 'scattered/combed OUTWARD from ' + Rb.toFixed(1)
            : 'displaced INWARD from ' + Rb.toFixed(1);
          console.log('    ' + pl.name.padEnd(10)
            + (pl.observed * 1000).toPrecision(3).padStart(8) + ' mE'
            + '  born ' + Rb.toFixed(1).padStart(6) + ' AU'
            + '  vintage ' + String(when).padStart(6) + ' Myr'
            + '  now ' + pl.r.toFixed(1).padStart(6) + '  ' + tag);
        }
      }
    }
  }
}
