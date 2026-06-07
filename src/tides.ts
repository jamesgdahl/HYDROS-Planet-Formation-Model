// HYDROS tide ledger - what a bound stellar companion's RECURRING
// tide does to a satellite system, and where the scattered mass goes.
//
// The single-flyby stripping transform (fit.ts: Breslau r_t, stirred
// zone, inward rain) edits a disc ONCE. A bound companion applies the
// same boundary every periapsis for the life of the system, which
// changes the reading in three ways:
//
//   1. THE TIDE-DAM IS PERMANENT. r_t is not an event scar but a
//      standing wall: nothing exterior to it survives, ever. The
//      companion is the dam-keeper of the satellite system's outside.
//      Independent cross-check: the empirical N-body stability
//      boundary for S-type planets in binaries (Holman & Wiegert
//      1999) is computed alongside r_t from (mu, e_bin, a_bin); the
//      two boundaries come from unrelated machinery (tidal truncation
//      vs resonance-overlap integrations) and should bracket the
//      same edge.
//
//   2. THE STIRRED ZONE IS A CONVEYOR, NOT A WOUND. A seat between
//      the Holman-Wiegert radius and r_t is eroded over Gyr rather
//      than in one pass: its inventory is FEEDSTOCK, processed
//      through the inner system. Erosion fraction uses the engine's
//      graduated law (up to STRIP_L0 at r_t).
//
//   3. THE SPLIT HAS NO RELAY LADDER. In Sol's dispersal the outward
//      share was relayed down a giant ladder (Fernandez-Ip). Here the
//      outward share meets a STAR at every periapsis: it is ejected,
//      or handed across to the perturber's own system (cross-system
//      delivery - the perturber's planets can receive a foreign
//      veneer). The inward share is the Sol-calibrated 5-10% of the
//      eroded mass; receivers are priced exactly like the impactors
//      ledger (Opik grazing-perihelion arrival + the retention line).
//
// The point of the ledger is the WATER: an icy stirred seat (beyond
// the system's own snow line) is the only volatile-delivery channel a
// truncated, giantless system has. The ledger turns "probably dry"
// into a priced forecast in ocean units (1 Earth ocean = 2.3e-4 M_E).

interface TideSeat {
  slot_n: number;
  r: number;            // AU
  mass: number;         // M_E (predicted/observed at the seat)
  name?: string;
  icy?: boolean;        // beyond the system snow line at formation
}

interface TideRow {
  slot_n: number; r: number; mass: number; name?: string; icy: boolean;
  zone: 'DESTROYED' | 'CONVEYOR' | 'STIRRED' | 'SAFE';
  L: number;            // erosion fraction (recurring-tide saturation)
  eroded: number;       // M_E processed off the seat over the system age
}

interface TideReceiver {
  slot_n: number; r: number; mass: number; name?: string;
  dv: number; vesc: number; ret: number;
  // retained icy mass, low/high gauge [M_E], and in ocean units
  retained_lo: number; retained_hi: number;
  oceans_lo: number; oceans_hi: number;
}

interface TideLedger {
  r_t: number; r_stir: number;
  mu: number; e_bin: number | null; a_crit: number | null;
  hw_valid: boolean;    // Holman-Wiegert fit range: e <= 0.8, mu 0.1-0.9
  rows: TideRow[];
  eroded_icy: number; eroded_dry: number;
  inward_lo: number; inward_hi: number;   // the 5-10% band, icy share
  receivers: TideReceiver[];
  outward: number;      // M_E ejected / handed to the perturber's system
  destroyed: number;    // M_E of seats outside r_t (never existed as planets)
  verdict: string;
}

// engine globals (module: none - all scripts share one scope)
declare function cascade_slot_positions(
  M_star: number, spin: number, min_slots?: number, omega?: number): number[];
declare function slot_predicted_mass(
  r: number, M_star: number, spin: number, f_disc: number,
  t_form_cascade?: number, omega?: number): number;
declare function snow_line(M_star: number, f_disc: number): number;

// Seats for the tide ledger are the PRIMORDIAL allocations (the bare
// cascade ladder, pre-stripping): the ledger prices what the standing
// tide did to the allocation, so post-strip fitted masses would
// double-count the erosion. Fitted slots, when supplied, contribute
// only the occupants' names.
function tide_seats(M_star: number, spin: number, f_disc: number,
                    slots?: FitSlot[]): TideSeat[] {
  const pos = cascade_slot_positions(M_star, spin, 10);
  const snow = snow_line(M_star, f_disc);
  const seats: TideSeat[] = [];
  for (let n = 0; n < pos.length; n++) {
    const m = slot_predicted_mass(pos[n], M_star, spin, f_disc,
      undefined, undefined);
    if (!(m > 0.01)) continue;
    const occ = slots ? slots.find(s => s.filled && s.slot_n === n) : null;
    seats.push({ slot_n: n, r: pos[n], mass: m,
      name: occ ? occ.name : '(seat ' + n + ')', icy: pos[n] > snow });
  }
  return seats;
}

const TIDE_OCEAN = 2.3e-4;       // one Earth ocean, M_E
const TIDE_IN_LO = 0.05;         // Sol-calibrated inward share of a
const TIDE_IN_HI = 0.10;         //   dispersed allocation (impactors.ts)
const TIDE_PHI_LO = 0.35;        // fraction of the inward band launched at
const TIDE_PHI_HI = 0.70;        //   the principal receiver (Sol: Theia
                                 //   0.09 of Earth's 0.129-0.257 band)

function tide_ledger(seats: TideSeat[], M_star: number,
                     M_pert: number, q: number,
                     a_bin: number | null): TideLedger {
  // the standing wall (same constants as the flyby transform)
  const r_t = 0.28 * q * Math.pow(M_pert / M_star, -0.32);
  const r_stir = 0.5 * r_t;

  // Holman & Wiegert (1999) critical semimajor axis - the independent
  // N-body resonance-overlap boundary, valid for e_bin <~ 0.8
  const mu = M_pert / (M_star + M_pert);
  let e_bin: number | null = null, a_crit: number | null = null;
  let hw_valid = false;
  if (a_bin !== null && a_bin > q) {
    e_bin = 1 - q / a_bin;
    a_crit = a_bin * (0.464 - 0.380 * mu - 0.631 * e_bin
      + 0.586 * mu * e_bin + 0.150 * e_bin * e_bin
      - 0.198 * mu * e_bin * e_bin);
    hw_valid = e_bin <= 0.8 && mu >= 0.1 && mu <= 0.9 && a_crit > 0;
  }

  const rows: TideRow[] = [];
  let eroded_icy = 0, eroded_dry = 0, destroyed = 0;
  for (const s of seats) {
    const icy = !!s.icy;
    let zone: TideRow['zone'], L = 0;
    if (s.r > r_t) { zone = 'DESTROYED'; destroyed += s.mass; }
    else if (s.r > r_stir) {
      // inside the wall but on the conveyor: a seat ALSO outside the
      // Holman-Wiegert radius is not a survivor at all - it is
      // feedstock, fully processed over Gyr (erosion floor = the
      // graduated one-pass law; ceiling = 1)
      L = 0.6 * (s.r - r_stir) / (r_t - r_stir);
      const conveyor = hw_valid && a_crit !== null && s.r > a_crit;
      if (conveyor) { zone = 'CONVEYOR'; L = Math.max(L, 0.9); }
      else zone = 'STIRRED';
      const er = L * s.mass;
      if (icy) eroded_icy += er; else eroded_dry += er;
    } else zone = 'SAFE';
    rows.push({ slot_n: s.slot_n, r: s.r, mass: s.mass, name: s.name,
                icy, zone, L, eroded: L * s.mass });
  }

  // the split: 5-10% of the eroded ICY mass crosses the inner system;
  // the rest is ejected by the recurring stellar periapsis (no relay
  // ladder, no parking band) or handed to the perturber's own space
  const inward_lo = TIDE_IN_LO * eroded_icy;
  const inward_hi = TIDE_IN_HI * eroded_icy;
  const outward = (eroded_icy + eroded_dry) - 0.5 * (inward_lo + inward_hi);

  // price the delivery at each safe interior seat - Opik
  // grazing-perihelion arrival from the innermost eroding seat,
  // retention line at the receiver (identical to impactors.ts)
  const sources = rows.filter(x => x.eroded > 0 && x.icy)
    .sort((a, b) => a.r - b.r);
  const receivers: TideReceiver[] = [];
  if (sources.length) {
    const r0 = sources[0].r;
    for (const s of rows) {
      if (s.zone !== 'SAFE' || s.r >= r0) continue;
      const rt = s.r, qa = 0.85 * rt, ao = (qa + r0) / 2;
      const e = (r0 - qa) / (r0 + qa);
      const vc = 29.785 * Math.sqrt(1.14 * M_star / rt);
      const vv = Math.sqrt(2 - rt / ao);
      const vt = Math.sqrt(ao * (1 - e * e) / rt);
      const vr = Math.sqrt(Math.max(0, vv * vv - vt * vt));
      const dv = vc * Math.sqrt((vt - 1) ** 2 + vr * vr);
      const vesc = 11.186 * Math.pow(Math.max(s.mass, 0.01), 1 / 3);
      const ret = Math.max(0.05, 0.969 - 0.605 * dv / vesc);
      const retained_lo = ret * TIDE_PHI_LO * inward_lo;
      const retained_hi = ret * TIDE_PHI_HI * inward_hi;
      receivers.push({ slot_n: s.slot_n, r: s.r, mass: s.mass,
        name: s.name, dv, vesc, ret, retained_lo, retained_hi,
        oceans_lo: retained_lo / TIDE_OCEAN,
        oceans_hi: retained_hi / TIDE_OCEAN });
    }
  }

  const n_safe = rows.filter(x => x.zone === 'SAFE').length;
  const verdict = n_safe > 0
    ? `system SURVIVES: ${n_safe} seat(s) safe inside ` +
      (hw_valid && a_crit !== null
        ? `min(r_t ${r_t.toFixed(2)}, a_crit ${a_crit.toFixed(2)}) AU`
        : `r_t ${r_t.toFixed(2)} AU`)
    : 'system DESTROYED: no seat survives the standing tide';

  return { r_t, r_stir, mu, e_bin, a_crit, hw_valid, rows,
           eroded_icy, eroded_dry, inward_lo, inward_hi, receivers,
           outward, destroyed, verdict };
}
