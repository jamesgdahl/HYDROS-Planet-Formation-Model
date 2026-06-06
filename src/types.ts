// Shared types for the HYDROS cascade model.
// Global-script style: no imports/exports - interfaces are ambient and
// erased at compile time; this file emits nothing of consequence.

interface Planet {
  name: string;
  /** Current (observed) orbital radius in AU. */
  r: number;
  /** Observed mass in Earth masses; 0/undefined = predicted-only row. */
  observed?: number;
  /** ISU (in-situ unchanged): mass+position treated as absolute truth. */
  immutable?: boolean;
  /** KBO-class only: slot number of the interior body that CAPTURED
   *  this factory product (Triton: 0 = Neptune, co-orbital at the
   *  gate). Display resolves the slot to its occupant's name. */
  captured?: number;
  /** Dam-exterior cohort object (Kuiper mechanism): a DISTINCT
   *  population with independent inputs - excluded from the interior
   *  cascade fit entirely (no anchor influence, no penalties), then
   *  evaluated against the exterior ladder r = R_disc·(1/ρ)^n
   *  (half-integer rungs) anchored on the fitted Davis Dam. */
  kbo?: boolean;
}

interface SystemInputs {
  M_star: number;   // primordial stellar mass, M_sun
  spin: number;     // primordial rotation, 1.0 = Sol
  f_disc: number;   // disc-to-star mass ratio
}

interface SystemPreset {
  id: string;
  name: string;
  ly: number;
  inputs: SystemInputs;
  notes?: string;
  planets: Planet[];
}

interface Composition {
  rock: number;
  ice: number;
  pebble: number;
  h_he: number;
  core: number;
  total: number;
}

interface AssignedSlot {
  slot_n: number;          // half-integers mark interstitial sites
  slot_r: number;
  filled: boolean;
  name: string;
  r_obs: number;
  observed: number;
  slot_predicted_mass: number;
  // Half-step site (inverted regime only): r = r_n·√ρ between rungs,
  // open to bodies below the Hill gate. Empty interstitials produce
  // no rows and carry no cost.
  interstitial?: boolean;
}

interface FitSlot {
  slot_n: number;
  slot_r: number;
  r_used: number;
  filled: boolean;
  name: string;
  rock: number;
  ice: number;
  pebble: number;
  core: number;
  t_form: number;
  h_he: number;
  predicted: number;
  observed: number;
  err_pct: number;
  implied_dM: number;
  stripped: boolean;
  in_void: boolean;
  external?: boolean;
  // Martian-type scatter remnant bound to this slot: observed mass is
  // ~5-10% of the slot's predicted parent. Mass delta and delivered
  // position are scatter OUTPUT - excluded from fit residuals/score.
  remnant?: boolean;
  // Occupied half-step site (inverted regime). slot_n is half-integer.
  interstitial?: boolean;
  // Dam-exterior cohort member (the Kuiper mechanism): body beyond
  // R_disc sitting on the exterior ladder r = R_disc·(1/ρ)^n. Geometry
  // is the fit; mass calculus deferred (predicted := observed) -
  // excluded from f-bisection target. slot_n = -n (negative rung).
  exterior?: boolean;
  // Wrecking-class ledger: condensables of the interior slots this
  // migrant traversed and ate en route to its parking seat. Arrives
  // POST-H/He accumulation (heavy-element enrichment; not fed into the
  // core² gas term). The Thorngren-class M_Z excess prediction.
  devoured?: number;
  // Devour credit APPLIED to this slot's t_form bisection: the
  // formation seat is fit to (observed - credit), the meals being
  // post-prediction mass. Set when opts.devour_credit names this body.
  devoured_credit?: number;
  primordial: Composition;
  interpretation: string;
}

interface FitResult {
  slots: FitSlot[];
  ratio: number;
  R_disc: number;
  spin: number;
}

interface AnchorResult {
  spin: number;
  anchor_slot: number;
}

interface BestFitResult {
  spin: number;
  /** Nebula density D = spin^(3/2), Sol = 1: the outer jaw's physical
   *  variable under the jaw-lock (R_disc = 30.07·(M/1.14)·D^(-1/3)). */
  nebula_density?: number;
  /** VICE inner-jaw rotation (breakup-bounded) when decoupled; null under the jaw-lock. */
  omega_rot?: number | null;
  f_disc: number;
  anchor_slot: number;
  iterations: number;
  converged: boolean;
  /** Achieved bisection objective: |sum(predicted-observed)| over the
   *  target subset, as a fraction of the target's total observed mass. */
  target_residual: number;
  /** Names of planets the bisection targeted (ISU subset, or all filled). */
  target_names: string[];
  fit: FitResult;
}
