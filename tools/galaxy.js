// galaxy.js - the all-purpose galaxy generator (2026-06-05).
// Plug in any founder seed and baryon budget; everything else is the
// construction framework run at face value:
//
//   Davis Dam   R(z) = 30.07 · M · D(z)^(-1/3)     [engine outer jaw]
//   Alfven Dam  R_A  = 0.20  · M · Omega^(4/7)      [engine inner jaw]
//   jaw-lock    Omega = D^(2/3)
//   lattice     r_n = R_anchor · rho^n,  rho = 1 - sqrt(ln 2)/2
//   allocation  engine law term for term (Mestel base, hex 1/6 dam
//               truncation, (5/6)R_A inner ramp, dam pile-up)
//
// D(z) = D0 (1+z)^6.3 is the relaxing protogalactic compression; D0 is
// the inherited record (default: n = 12 cm^-3, the CNM - universal cold
// gas, so dam radii scale with the seed alone unless you override it).
//
// The factory constant k is UNIVERSAL: calibrated once on the Milky Way
// (hits M* = 6e10 with the MW's burst history), then any other galaxy
// is a parameter-free prediction - its stellar mass is EMERGENT.
//
// usage:
//   node galaxy.js                          (Milky Way reference run)
//   node galaxy.js --seed 1.4e8 --budget 2.4e11 --name M31
//   flags: --seed Msun   founder (SMBH) mass        [4.3e6]
//          --budget Msun baryon budget f_b·M_halo   [1.9e11]
//          --n cm^-3     ambient density record      [12]
//          --d0 X        ...or directly in Sol units
//          --zgate z     dissipation gate epoch      [1.7]
//          --age Gyr     age of the system           [13.6]
//          --bursts      apply the MW burst history (default: MW only)
//          --tune M      retune k to hit M* = M (instead of universal k)
//          --quench Gyr  supply cutoff (stripping/starvation): delivery
//                        stops, the factory drains the remainder, and
//                        the Davis Dam stalls when the budget exhausts

const argv = process.argv;
const arg  = (f, d) => { const i = argv.indexOf('--'+f); return i > 0 ? parseFloat(argv[i+1]) : d; };
const has  = f => argv.includes('--'+f);
const nameArg = (() => { const i = argv.indexOf('--name'); return i > 0 ? argv[i+1] : null; })();

const RHO = 1 - Math.sqrt(Math.log(2)) / 2;     // 0.5837 (CASCADE_RATIO)
const PC = 206265, KPC = PC * 1000;             // AU per pc / kpc
const DT = 0.001;

// ---- Milky Way reference (the calibration galaxy) ---------------------
const MW = { seed: 4.3e6, budget: 1.9e11, n: 12, zgate: 1.7, age: 13.6,
             mstar: 6e10 };
const isMW = !has('seed') && !has('budget') && !has('n') && !has('d0')
          && !has('quench') && !has('tune');

// ---- This galaxy's inheritance pair and clock --------------------------
const SEED   = arg('seed',   MW.seed);
const BUDGET = arg('budget', MW.budget);
const D0     = has('d0') ? arg('d0', 0) : arg('n', MW.n) / 1e6;
const Z_GATE = arg('zgate',  MW.zgate);
const AGE    = arg('age',    MW.age);
const NAME   = nameArg || (isMW ? 'MILKY WAY' : 'GALAXY');
const useBursts = isMW || has('bursts');

// ---- Engine jaw laws applied to the founder ---------------------------
const M_PRIM = SEED / 1.14;                       // primordial-solar units
const D    = z => D0 * Math.pow(1 + z, 6.3);      // compression relaxation
const Rdam = z => 30.07 * M_PRIM * Math.pow(D(z), -1/3) / KPC;   // [kpc]
const OMEGA_GATE = Math.pow(D(Z_GATE), 2/3);                     // jaw-lock
const R_A  = 0.20 * M_PRIM * Math.pow(OMEGA_GATE, 4/7) / PC;     // [pc]

// ---- The boundary factory ---------------------------------------------
// Supply: the budget ARRIVES via the boundary as the halo assembles
// (e^-0.8z); the factory converts delivered-but-unconverted gas under
// ambient pressure. Bursts are accretion-history events, not machinery:
// the MW's two are its known mergers, so they ship with the MW preset.
const zof   = (t, T) => Math.pow(T / Math.max(t, 0.05), 2/3) - 1;
const burst = t => !useBursts ? 1
                 : (t>3.4 && t<3.7) ? 2.5 : (t>11.4 && t<11.6) ? 1.5 : 1;

// The dam is a pressure boundary HELD by the system's gas: it advances
// along the relaxation track only while unconverted budget remains at
// the boundary. Exhausted budget = nothing to push the shoreline - the
// dam stalls where the last deposition happened. Exhaustion is
// unconverted gas below EPS of what has been DELIVERED (the drain is
// asymptotic; a trickle holds no boundary - percent-level gas does).
// In supply-limited regimes the dam rides the delivery front: it
// stalls and resumes as budget arrives; tAdv records its LAST advance.
const T_QUENCH = arg('quench', Infinity);   // supply cutoff [Gyr]
const EPS_EXHAUST = 0.01;
function run(k, B, T, quench = Infinity) {
  let M = 0, used = 0, hist = [], R = 0, tAdv = 0;
  for (let t = DT; t <= T; t += DT) {
    const z = zof(t, T);
    const zSup = zof(Math.min(t, quench), T);     // delivery frozen at quench
    const delivered = B * Math.exp(-0.8 * zSup);
    const avail = Math.max(0, delivered - used);
    if (avail > EPS_EXHAUST * delivered) { const Rt = Rdam(z); if (Rt > R) { R = Rt; tAdv = t; } }
    const rate  = k * avail * Math.pow(1 + z, 2.25) * burst(t);
    const dm = rate * DT; M += dm; used += dm * 1.4;
    hist.push([t, rate, R]);
  }
  return { M, hist, used, R, tAdv };
}
function tune(target, B, T, quench = Infinity) {
  let lo = 1e-5, hi = 10, k;
  for (let i = 0; i < 60; i++) { k = Math.sqrt(lo * hi);
    if (run(k, B, T, quench).M > target) hi = k; else lo = k; }
  return k;
}

// k: universal (MW-calibrated, unquenched) unless --tune retargets it
// under THIS galaxy's scenario.
const k = has('tune') ? tune(arg('tune', 6e10), BUDGET, AGE, T_QUENCH)
                      : tune(MW.mstar, MW.budget, MW.age);
const kIsUniversal = !has('tune');
const { M: Mstar, hist, used, R: R_FINAL, tAdv } = run(k, BUDGET, AGE, T_QUENCH);

// Lattice anchor: where the (dynamic) dam actually stood at the gate -
// a stalled dam anchors the lattice at its stall radius, not the track.
const t_gate = AGE * Math.pow(1 + Z_GATE, -1.5);
const R_ANCHOR = hist[Math.min(hist.length - 1,
                 Math.max(0, Math.round(t_gate / DT) - 1))][2] * 1000;  // [pc]

// ---- The core lattice between the dams ---------------------------------
const slots = [];
for (let r = R_ANCHOR; r >= R_A; r *= RHO) slots.push(r);
let Mcore = 0;
for (const [t, r, rd] of hist) if (rd * 1000 < R_ANCHOR) Mcore += r * DT;

// Engine allocation law, mirrored term for term (allocation.ts):
const C = R_A / R_ANCHOR;
function alloc(r, sigma) {
  const S = 0.025 * R_ANCHOR, L = 5 * S, w = (r + S) - R_ANCHOR;
  const ftr  = w <= 0 ? 1 : Math.max(0, 1 - w / (L + S));
  const pile = sigma * R_ANCHOR * C *
               Math.exp(-((r - R_ANCHOR) ** 2) / (2 * (0.3 * R_ANCHOR) ** 2));
  const base = (r < 2 * R_A) ? Math.max(0, sigma * (r + (5/6) * R_A - R_A))
                             : sigma * r;
  return base * ftr + pile;
}
const sigma = slots.length ? Mcore / slots.reduce((s, r) => s + alloc(r, 1), 0) : 0;

// ---- Emergent gross statistics (Kroupa IMF + turnoff) ------------------
function seg(a,b,s){return [(Math.pow(b,s+1)-Math.pow(a,s+1))/(s+1),(Math.pow(b,s+2)-Math.pow(a,s+2))/(s+2)];}
const CK = Math.pow(0.5, 1.0);
const [n1,m1] = seg(0.08,0.5,-1.3), [n2,m2] = seg(0.5,120,-2.3);
const NN = n1 + CK*n2, meanM = (m1 + CK*m2) / NN;
const fracAbove = x => { let na = 0;
  if (x < 0.5) na = seg(x,0.5,-1.3)[0] + CK*seg(0.5,120,-2.3)[0];
  else na = CK*seg(Math.max(x,0.5),120,-2.3)[0];
  return na / NN; };
let Nal=0, Nwd=0, sfrNow=0, halfT=0, acc=0, Mb=0, Mgt8=0;
for (const [t, r, rd] of hist) {
  const age = AGE - t, dm = r * DT, dn = dm / meanM;
  const mto = age > 0.01 ? Math.pow(10 / age, 0.4) : 120;
  const fD = fracAbove(Math.min(mto, 120));
  Nal += dn * (1 - fD); Nwd += dn * Math.max(0, fD - fracAbove(8));
  if (t > AGE - 0.01) sfrNow = r; acc += dm;
  if (!halfT && acc >= Mstar / 2) halfT = t;
  if (rd * 1000 < R_ANCHOR) Mb += dm; if (age > 8) Mgt8 += dm;
}

// ---- Report -------------------------------------------------------------
console.log(`=== ${NAME}: seed ${SEED.toExponential(1)} Msun, budget ${BUDGET.toExponential(1)} Msun ===`);
console.log("k =", k.toExponential(2),
            kIsUniversal ? "(universal, MW-calibrated)" : "(retuned via --tune)",
            " bursts:", useBursts ? "MW history" : "none");

console.log("\n--- THE DAMS (derived from the seed by the engine jaw laws) ---");
console.log("record D0 =", D0.toExponential(2), "Sol units = n ~",
            (D0 * 1e6).toFixed(1), "cm^-3");
console.log("Davis Dam today:   ", R_FINAL.toFixed(1).padStart(8), "kpc ",
            R_FINAL >= 0.98 * Rdam(0)
              ? "(stellar shoreline, on track)"
              : `(STALLED since t = ${tAdv.toFixed(1)} Gyr - budget exhausted; relaxation track wanted ${Rdam(0).toFixed(1)} kpc)`);
console.log("  vs warm halo n 0.1-1 cm^-3:",
            (30.07*M_PRIM*Math.pow(1e-6,-1/3)/KPC).toFixed(0) + "-" +
            (30.07*M_PRIM*Math.pow(1e-7,-1/3)/KPC).toFixed(0),
            "kpc  (the -pause boundary)");
console.log("Davis Dam at gate: ", (R_ANCHOR/1000).toFixed(2).padStart(8),
            "kpc  (lattice anchor, z =", Z_GATE + ")");
console.log("Alfven Dam:        ", R_A.toFixed(3).padStart(8),
            "pc   (jaw-locked at the gate, zero freedom)");

const row = (a, b, c) => console.log(a.padEnd(34), String(b).padStart(10),
                                     c ? "   obs: " + c : "");
console.log(`\n--- GENERATED GALAXY at ${AGE} Gyr ---`);
row("stellar mass [Msun]", Mstar.toExponential(2),
    isMW ? "6e10 (k-calibration target)" : (kIsUniversal ? "EMERGENT (universal k)" : "(tuned)"));
row("stars alive now", Nal.toExponential(2), isMW ? "1-4e11" : "");
row("white dwarfs", Nwd.toExponential(2), isMW ? "~1e10" : "");
row("SFR today [Msun/yr]", (sfrNow/1e9).toFixed(2), isMW ? "0.7-2.7" : "");
row("half-mass epoch [Gyr]", halfT.toFixed(1), isMW ? "4-6" : "");
row("mass age>8 Gyr", (100*Mgt8/Mstar).toFixed(0)+"%", isMW ? "40-50%" : "");
row("core (R<anchor) fraction", (100*Mb/Mstar).toFixed(0)+"%", isMW ? "~25%" : "");
row("baryons unconverted", (100*(BUDGET-used)/BUDGET).toFixed(0)+"%", isMW ? "60-70%" : "");
row("founder ratio M*/M_seed", (Mstar/SEED).toExponential(1), isMW ? "1.4e4" : "");

console.log("\n--- THE CORE LATTICE: generated slot occupants ---");
console.log("anchor =", (R_ANCHOR/1000).toFixed(2), "kpc;", slots.length,
            "slots; core budget =", Mcore.toExponential(2), "Msun");
const cls = m => m >= 1e9 ? "spheroid block (bar/bulge)"
           : m >= 1e8 ? "nuclear-disc block"
           : m >= 1e7 ? "massive-cluster system"
           : m >= 1e5 ? "cluster system"
           : "association";
console.log("  n      r [pc]      M_occ [Msun]   occupant class");
slots.forEach((r, n) => {
  const m = alloc(r, sigma);
  console.log(String(n).padStart(3), r.toFixed(2).padStart(11),
              m.toExponential(2).padStart(16), "  " + cls(m));
});

const bin = f => slots.filter(f).reduce((s, r) => s + alloc(r, sigma), 0);
console.log("\n--- FOSSIL BINS (geometry-emergent fractions) ---");
row("NSC bin   r < 10 pc", bin(r => r < 10).toExponential(2),
    isMW ? "2.5e7 (Schodel 2014)" : "");
row("NSD bin   100-400 pc", bin(r => r >= 100 && r < 400).toExponential(2),
    isMW ? "1.4e9 (Launhardt 2002)" : "");
row("bar bin   r > 1 kpc", bin(r => r >= 1000).toExponential(2),
    isMW ? "~1e10 (bar/inner bulge)" : "");
console.log("\noccupants are child systems (gas blocks -> direct-collapse");
console.log("objects + massive clusters), phase-mixed after the gate; the");
console.log("deposition profile is the fossil that survives.");
