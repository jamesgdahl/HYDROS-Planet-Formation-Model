#!/usr/bin/env node
// HYDROS catalog fitter — runs the SAME bestFit() the web UI uses,
// loaded from the compiled js/ files (no bundler, no dependencies).
//
// Usage:
//   node tools/fit.js                 # fit every observational system
//   node tools/fit.js --system sol    # full slot table for one system
//   node tools/fit.js --write         # write fitted spin/f_disc back
//                                     # into exoplanets.js
//
// Metrics:
//   resid%  — achieved bisection objective: |sum(pred-obs)| over the fit
//             TARGET subset (ISU planets, or all filled when no ISU), as
//             % of the target's total observed mass. This is the fit
//             quality. Diagnostic deltas on non-target planets (impact
//             loss, late delivery, scattering) are the model's OUTPUT,
//             not fit error, and are reported separately as n_diag.

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

const EXOPLANETS = ctx.window.EXOPLANETS;
const bestFit = ctx.bestFit;
const LATE_DELIVERY_PCT = 0.5 * (0.02 / 0.107) * 100; // 9.35%

const SKIP = new Set(['sol_progenitor', 'crab_progenitor',
  'earth', 'mars']); // thought experiments + kinetic regime (impact-physics inputs)

const args = process.argv.slice(2);
const onlyId = args.includes('--system') ? args[args.indexOf('--system') + 1] : null;
const doWrite = args.includes('--write');
// --all: write every CONVERGED fit (rails/non-convergence/unassigned
// still block); informational flags don't. Alpha Centauri is excluded
// pending the seating ruling.
const writeAll = args.includes('--all');
// No exclusions: the catalog is fully self-governing. The overlord
// rule + dam-anchor candidates carry Alpha Cen (B-on-the-dam /
// Proxima-evicted) and Upsilon And (companion-completed, B sourced on
// the dam) natively.
const WRITE_EXCLUDE = new Set([]);
const doBrute = !args.includes('--iterated'); // brute (joint scan) is the default
// v5: VICE (decoupled rotation ω, breakup-bounded) is the DEFAULT. The old
// jaw-lock (Ω = D^(2/3)) is available with --no-vice for comparison only.
const doVice = !args.includes('--no-vice');
const bruteFit = ctx.bruteFit;

function fitSystem(sys) {
  const planets = sys.planets.map(p => ({ ...p }));
  // Gravitational-stripping flag: { M_pert, q } with q null => bisected.
  const stripping = sys.inputs.stripping
    ? { M_pert: sys.inputs.stripping.M_pert || 0.5,
        q: (sys.inputs.stripping.q === undefined) ? null : sys.inputs.stripping.q }
    : null;
  const r = doBrute
    ? bruteFit(planets, sys.inputs.M_star, stripping, doVice)
    : bestFit(planets, sys.inputs.M_star, sys.inputs.f_disc);
  // EVENT CLOSURES: bodies whose deviation is explained by an
  // identified, budget-closed event (impact/merger/survivor/delivery)
  // count as PERFECT fits — the deviation is model output, not error.
  // n_diag counts only the OPEN (unexplained) deviations.
  let closures = [];
  try {
    const F = ctx.impact_forensics(r.fit.slots, planets, sys.inputs.M_star, r.f_disc);
    closures = F.closures || [];
  } catch (e) { /* forensics unavailable: all deviations stay open */ }
  const closedNames = new Set(closures.map(c => c.name));
  const targets = new Set(r.target_names);
  let n_diag = 0;
  for (const s of r.fit.slots) {
    if (!s.filled || s.external || s.exterior || targets.has(s.name)) continue;
    if (closedNames.has(s.name)) continue;
    if (s.observed > 0 && Math.abs(s.err_pct) > LATE_DELIVERY_PCT) n_diag++;
  }
  const flags = [];
  if (closures.length) flags.push('CLOSED:' + closures.length);
  if (r.f_disc <= 0.0006) flags.push('F_LO_RAIL');
  if (r.f_disc >= 1.9) flags.push('F_HI_RAIL');
  if (r.f_disc > 1.0) flags.push('F_EXTREME'); // disc heavier than star
  if (!r.converged) flags.push('NO_CONV');
  if (r.target_residual > 0.01) flags.push('RESID');
  // Identifiability: f_disc only has leverage when at least one fit
  // target is sub-threshold rocky (core ≤ 3 M⊕, mass ∝ f_disc) or
  // stripped, or when ISU anchors pin the target. In a no-ISU system
  // where every target is gas-eligible, the per-planet t_form bisection
  // absorbs any f_disc — the objective is flat and the "fitted" value
  // is a bisection-lattice artifact, not a measurement.
  const THRESHOLD_GAS_LOCAL = 3.0;
  const anyISU = planets.some(p => p.immutable);
  const anyRockyTarget = r.fit.slots.some(s =>
    s.filled && !s.external && targets.has(s.name)
    && (s.core <= THRESHOLD_GAS_LOCAL || s.stripped));
  if (!anyISU && !anyRockyTarget) flags.push('F_UNCONSTRAINED');
  // Degenerate cascade: fitted spin yields fewer slots than observed
  // planets, so some planets were silently dropped from the target.
  const n_obs = planets.filter(p => !p.kbo && (p.observed || 0) > 0).length;
  const n_void = r.fit.slots.filter(s => s.external && s.in_void).length;
  const n_remn = r.fit.slots.filter(s => s.remnant).length;
  if (n_void > 0) flags.push('VOID:' + n_void);
  if (n_remn > 0) flags.push('REMNANT:' + n_remn);
  if (r.target_names.length < n_obs - n_void - n_remn && !anyISU) flags.push('UNASSIGNED');
  // Primordial packing diagnostic: min sep/R_H_mutual over ALL adjacent
  // slot pairs at slot radii — lost slots included at their PREDICTED
  // masses, since the at-formation configuration is what packing
  // measures (HD 134987's perpetrator is a lost slot-1 8 M_J giant).
  // Below the Lissauer limit (7) the chain was born dynamically hot —
  // informational; predicts the system's scatter/migration/remnant/
  // displacement tags. Stellar pairs included: Alpha Cen B–Proxima
  // packs at 0.8, predicting the lightweight's ejection onto its
  // observed wide bound orbit (the Hill formalism is only indicative
  // at stellar mass ratios).
  const chain = r.fit.slots
    .filter(s => !s.external && s.slot_n >= 0)
    .sort((a, b) => a.slot_n - b.slot_n);
  let minPack = Infinity;
  for (let i = 0; i + 1 < chain.length; i++) {
    const o = chain[i], n = chain[i + 1];
    if (n.slot_n - o.slot_n > 1.01) continue; // adjacent, incl. half-steps
    const m_o = Math.max(o.observed, o.predicted);
    const m_n = Math.max(n.observed, n.predicted);
    if (m_o <= 0 || m_n <= 0) continue;
    const a_avg = (o.slot_r + n.slot_r) / 2;
    const RHm = a_avg * Math.pow((m_o + m_n) * (3e-6 / 1.14) / (3 * sys.inputs.M_star), 1 / 3);
    minPack = Math.min(minPack, (o.slot_r - n.slot_r) / RHm);
  }
  if (minPack < 7) flags.push('PACKED:' + minPack.toFixed(1));
  // KBO-class population (distinct entity, independent inputs):
  // n on-rung / n total exterior bodies.
  const ext_rows = r.fit.slots.filter(s => s.exterior && s.filled);
  if (ext_rows.length > 0) {
    const on = ext_rows.filter(s =>
      s.interpretation.includes('in situ at its stance')
      || s.interpretation.includes('CAPTURED by')).length;
    flags.push('KBO:' + on + '/' + ext_rows.length);
  }
  if (doVice && r.omega_rot != null) flags.push('OMEGA:' + r.omega_rot.toFixed(2));
  // INVERTED-regime predictor from observables (compact + multi-big mass
  // pattern): independent of the geometric fit — corroboration check.
  const isig = ctx.inverted_signature(sys.planets, sys.inputs.M_star);
  if (isig.likely) flags.push('INV_PRED:' + isig.maxima + 'max');
  if (stripping && r.stripping_q != null) {
    flags.push('STRIPPED:q=' + r.stripping_q.toFixed(1)
      + ',rt=' + r.stripping_rt.toFixed(2));
  }
  return { r, n_diag, flags };
}

// Mass display: sub-cascade moons live at micro-Earth masses where
// .toFixed(3) collapses to 0.000 — switch to milliEarths (suffix m)
// below 0.01 M⊕ (single-digit mE and down). Internal math stays in
// M⊕ (doubles carry 16 digits; only the DISPLAY needed rescuing).
function fmtMass(m) {
  if (!(m > 0)) return '—';
  return m < 0.01 ? (m * 1000).toPrecision(4) + 'm' : m.toFixed(3);
}
function printSlotTable(sys, r) {
  console.log(`\n${sys.name}  (M*=${sys.inputs.M_star})`);
  console.log(`  spin=${r.spin.toFixed(6)}  f_disc=${r.f_disc.toFixed(6)}  anchor_k=${r.anchor_slot}  iters=${r.iterations}${r.converged ? '' : ' NOT-CONVERGED'}`);
  console.log(`  target=[${r.target_names.join(', ')}]  residual=${(r.target_residual * 100).toFixed(4)}%`);
  for (const s of [...r.fit.slots].sort((a, b) => b.slot_n - a.slot_n)) {
    const name = (s.filled || s.exterior) ? s.name : `(slot ${s.slot_n})`;
    const lbl = s.exterior ? 'ext' : String(s.slot_n);
    const obs = s.observed > 0 ? fmtMass(s.observed) : '—';
    const pred = fmtMass(s.predicted);
    const dm = (s.filled && s.observed > 0 && !s.exterior)
      ? ((s.observed - s.predicted) / s.predicted * 100).toFixed(1) + '%' : '—';
    const sr = s.slot_r < 0.01 ? s.slot_r.toExponential(3) : s.slot_r.toFixed(3);
    // On-slot doctrine: r_form = slot; da = r_obs - r_slot is the
    // post-formation displacement (the event ledger).
    const pl = s.filled ? sys.planets.find(pp => pp.name === s.name) : null;
    const robs = pl ? (pl.r < 0.01 ? pl.r.toExponential(3) : pl.r.toFixed(3)) : '—';
    const da = pl ? ((pl.r - s.slot_r >= 0 ? '+' : '') + (pl.r - s.slot_r).toFixed(2)) : '—';
    console.log(`   ${name.padEnd(14)} ${lbl.padStart(7)}  r_form=${sr.padStart(9)}  r_obs=${robs.padStart(9)}  da=${da.padStart(6)}  tf=${s.t_form.toFixed(2).padStart(6)}  pred=${pred.padStart(10)}  obs=${obs.padStart(10)}  dm=${dm.padStart(8)}  | ${s.interpretation}`);
  }
}

const systems = EXOPLANETS.filter(s => !SKIP.has(s.id) && (!onlyId || s.id === onlyId));
if (onlyId && systems.length === 0) {
  console.error(`Unknown system id: ${onlyId}`);
  process.exit(1);
}

const results = [];
for (const sys of systems) {
  try {
    const { r, n_diag, flags } = fitSystem(sys);
    results.push({ sys, r, n_diag, flags });
    if (onlyId) printSlotTable(sys, r);
  } catch (e) {
    results.push({ sys, error: String(e) });
  }
}

if (!onlyId) {
  console.log('system'.padEnd(26), 'M*'.padStart(6), 'spin_fit'.padStart(10),
    'D_neb'.padStart(9), 'f_fit'.padStart(8), 'k', 'resid%'.padStart(8),
    'n_tgt'.padStart(5), 'n_diag'.padStart(6), ' flags');
  for (const o of results) {
    if (o.error) { console.log(o.sys.name.padEnd(26), 'ERROR:', o.error.slice(0, 60)); continue; }
    const D = o.r.nebula_density != null
      ? o.r.nebula_density : Math.pow(o.r.spin, 1.5);
    console.log(o.sys.name.slice(0, 25).padEnd(26),
      o.sys.inputs.M_star.toFixed(3).padStart(6),
      o.r.spin.toFixed(3).padStart(10),
      (D >= 100 ? D.toFixed(0) : D.toFixed(3)).padStart(9),
      o.r.f_disc.toFixed(4).padStart(8),
      String(o.r.anchor_slot),
      (o.r.target_residual * 100).toFixed(3).padStart(8),
      String(o.r.target_names.length).padStart(5),
      String(o.n_diag).padStart(6),
      ' ' + o.flags.join(','));
  }
}

if (doWrite) {
  let src = fs.readFileSync(path.join(root, 'exoplanets.js'), 'utf8');
  let written = 0;
  for (const o of results) {
    const blocking = writeAll
      ? o.flags.filter(f => f === 'NO_CONV' || f === 'RESID'
          || f === 'UNASSIGNED' || f === 'F_LO_RAIL' || f === 'F_HI_RAIL'
          || f === 'F_EXTREME')
      : o.flags.filter(f => !f.startsWith('VOID:')
          && !f.startsWith('REMNANT:') && !f.startsWith('PACKED:')
          && !f.startsWith('STRIPPED:') && !f.startsWith('KBO:')
          && !f.startsWith('OMEGA:') && !f.startsWith('CLOSED:'));
    if (o.error || blocking.length) continue; // only write converged fits
    if (WRITE_EXCLUDE.has(o.sys.id)) continue;
    // Inputs may contain one nested object (the stripping config) —
    // match braces one level deep, and preserve/refresh the flag.
    const re = new RegExp(`("id": "${o.sys.id}",[\\s\\S]*?"inputs": )\\{(?:[^{}]|\\{[^{}]*\\})*\\}`);
    const stripPart = o.sys.inputs.stripping
      ? `, "stripping": {"M_pert": ${o.sys.inputs.stripping.M_pert}, "q": ${
          (o.r.stripping_q != null)
            ? Math.round(o.r.stripping_q * 100) / 100
            : (o.sys.inputs.stripping.q ?? null)}}`
      : '';
    // v5 DECOUPLED schema: nebula_density (D) sets the Davis Dam; spin is
    // now the stellar rotation ω (sets the Alfvén Dam), breakup-clamped.
    // The old jaw-locked single `spin` is gone.
    const D_write = (o.r.nebula_density != null)
      ? o.r.nebula_density : Math.pow(o.r.spin, 1.5);
    const omega_raw = (o.r.omega_rot != null) ? o.r.omega_rot : o.r.spin;
    const omega_write = Math.min(omega_raw, ctx.breakup_spin(o.sys.inputs.M_star));
    const inputs = `{"M_star": ${o.sys.inputs.M_star}, "nebula_density": ${+D_write.toPrecision(6)}, "spin": ${+omega_write.toPrecision(6)}, "f_disc": ${o.r.f_disc}${stripPart}}`;
    if (!re.test(src)) { console.error(`write: pattern not found for ${o.sys.id}`); continue; }
    src = src.replace(re, `$1${inputs}`);
    written++;
  }
  fs.writeFileSync(path.join(root, 'exoplanets.js'), src);
  console.log(`\n--write: updated inputs for ${written} cleanly-fitted systems (flagged systems untouched)`);
}
