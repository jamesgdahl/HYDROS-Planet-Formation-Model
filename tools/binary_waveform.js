// PROTOTYPE (standalone): two-Alfven-waveform superposition for a binary.
// One Maas/Davis wave anchored at the shared outer dam + one Alfven wave per
// core, each with an amplitude ENVELOPE that decays away from its own dam
// (Alfven strong near its core's R_A, Maas strong near the outer R_disc).
// Scan orbital radius r from the barycentre, sample the field around the orbit
// (azimuth), measure mean amplitude and azimuthal incoherence:
//   high mean + low incoherence -> clean resonant slot (stable, low-e)
//   high incoherence            -> moire belt (no stable resonance -> unstable)
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = { Math, console, JSON, isFinite, isNaN, Object, Array, Number, String, Boolean, Map, Set, parseFloat, parseInt, Infinity, window: {} };
vm.createContext(ctx);
for (const f of ['constants.js','disc.js','allocation.js','classify.js','cascade.js','budget.js','fit.js'])
  vm.runInContext(fs.readFileSync(path.join('js', f), 'utf8'), ctx, { filename: f });

const RHO = 1.0 - Math.sqrt(Math.log(2.0)) / 2.0;   // CASCADE_RATIO ~ 0.5837
const ALPHA = Math.PI / (-Math.log(RHO));           // ~ 5.83  (one antinode cycle per rho-step)
const DECAY = 0.6;                                  // envelope falloff per dex away from a dam

// ---- Alpha Cen A+B ----
const M_A = 1.08, M_B = 0.909, a_bin = 23.5, Mtot = M_A + M_B;
const BETA_SOL = 0.274 / 32.4;
const spin = Math.sqrt(0.274 / BETA_SOL);           // fragmentation spin lambda~5.7
const R_disc = ctx.centrifugal_radius(Mtot, spin);  // shared Davis dam
const R_A_A = ctx.alfven_radius(M_A, spin), R_A_B = ctx.alfven_radius(M_B, spin);
const d_A = a_bin * M_B / Mtot, d_B = a_bin * M_A / Mtot;
console.log(`spin=${spin.toFixed(2)}  R_disc=${R_disc.toFixed(0)} AU  R_A: A=${R_A_A.toFixed(2)} B=${R_A_B.toFixed(2)}  rho=${RHO.toFixed(3)} alpha=${ALPHA.toFixed(2)}`);
console.log(`barycentre: A=-${d_A.toFixed(1)} B=+${d_B.toFixed(1)} AU\n`);

// one wave = envelope(distance-from-dam in dex) * cos(alpha*log(r/R_dam))
const env = (r, Rdam, outward) => {
  const dex = Math.log10(r / Rdam) * (outward ? 1 : -1);   // dex AWAY from the dam
  return Math.pow(10, -DECAY * Math.max(0, dex));
};
const alf = (r, RA) => env(r, RA, true)  * Math.cos(ALPHA * Math.log(r / RA));      // Alfven: decays outward
const maas = (r) => env(r, R_disc, false) * Math.cos(ALPHA * Math.log(r / R_disc)); // Maas:   decays inward
function field(x, y) {
  const rb = Math.hypot(x, y), rA = Math.hypot(x + d_A, y), rB = Math.hypot(x - d_B, y);
  return maas(rb) + alf(rA, R_A_A) + alf(rB, R_A_B);
}
const envelopeAt = (r) => env(r, R_disc, false) + env(r, R_A_A, true) + env(r, R_A_B, true);

// --- FRAGMENTATION ZONE: swept by the binary, NO central mass, no slots. ---
// S-type stability limit around each star (Holman-Wiegert 1999, mu,e):
const e_bin = 0.5, mu = M_B / Mtot;
const aS = (0.464 - 0.380*mu - 0.631*e_bin + 0.586*mu*e_bin + 0.150*e_bin*e_bin - 0.198*mu*e_bin*e_bin) * a_bin;
const aP = 2.4 * a_bin;                 // circumbinary (P-type) stability limit ~2.4 a
console.log(`FRAGMENTATION ZONE (cleared): S-type limit ${aS.toFixed(1)} AU around each star ... circumbinary onset ${aP.toFixed(1)} AU\n`);

// (1) S-TYPE: each star's OWN single-star cascade, R_A -> truncated at aS.
function sType(RA, name) {
  const out = [];
  for (let n = 0; ; n++) { const r = aS * Math.pow(RHO, n); if (r < RA) break; out.push(r); }
  console.log(`S-type around ${name}: ${out.map(s=>s.toFixed(2)).join(', ')} AU  (R_A=${RA.toFixed(2)}, truncated ${aS.toFixed(1)})`);
}
sType(R_A_A, 'A'); sType(R_A_B, 'B');

// (2) CIRCUMBINARY: barycentre-centred superposition, ONLY beyond aP.
console.log('\nCIRCUMBINARY cascade (r > ' + aP.toFixed(0) + ' AU):');
console.log('   r(AU)    mean   incoh');
const NAZ = 64; const slots = [];
const rows = [];
for (let i = 0; i <= 140; i++) {
  const r = Math.pow(10, Math.log10(aP) + i * (Math.log10(20000) - Math.log10(aP)) / 140);
  let s = 0, mn = 1e9, mx = -1e9;
  for (let k = 0; k < NAZ; k++) {
    const th = 2 * Math.PI * k / NAZ;
    const a = field(r * Math.cos(th), r * Math.sin(th));
    s += a; if (a < mn) mn = a; if (a > mx) mx = a;
  }
  rows.push({ r, mean: s / NAZ, incoh: (mx - mn) / (2 * envelopeAt(r)), env: envelopeAt(r) });
}
for (let i = 1; i < rows.length - 1; i++) {
  const R = rows[i];
  if (R.mean > rows[i-1].mean && R.mean > rows[i+1].mean && R.mean > 0.25 * R.env && R.incoh < 0.45) {
    slots.push(R.r);
    console.log(R.r.toFixed(0).padStart(9) + R.mean.toFixed(2).padStart(8) + R.incoh.toFixed(2).padStart(8) + '   << slot');
  }
}
console.log(`\nCircumbinary slots: ${slots.map(s=>s.toFixed(0)).join(', ')} AU`);
console.log(`Outermost ${slots.length?slots[slots.length-1].toFixed(0):'-'} AU  vs  Davis dam ${R_disc.toFixed(0)}  vs  Proxima (peri 4300, a 8700, apo 13000)`);
