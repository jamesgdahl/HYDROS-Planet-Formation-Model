// Shared types for the HYDROS cascade model.
// Global-script style: no imports/exports — interfaces are ambient and
// erased at compile time; this file emits nothing of consequence.

interface Planet {
  name: string;
  /** Current (observed) orbital radius in AU. */
  r: number;
  /** Observed mass in Earth masses; 0/undefined = predicted-only row. */
  observed?: number;
  /** KBO-class only: slot number of the interior body that CAPTURED
   *  this factory product (Triton: 0 = Neptune, co-orbital at the
   *  gate). Display resolves the slot to its occupant's name. */
  captured?: number;
  /** Dam-exterior cohort object (Kuiper mechanism): a DISTINCT
   *  population with independent inputs — excluded from the interior
   *  cascade fit entirely (no anchor influence, no penalties), then
   *  evaluated against the exterior ladder r = R_disc·(1/ρ)^n
   *  (half-integer rungs) anchored on the fitted Davis Dam. */
  kbo?: boolean;
  /** CORE COMPONENT: a central fragment of the (over-spun) core, NOT a slot
   *  product. The predicted main star + any `core` bodies are the system's core
   *  components; their masses SUM to drive the wind pressure (Davis Dam), the
   *  magnetic field (Alfvén Dam) and the barycentre the slot/factory products
   *  orbit. Excluded from the cascade fit (predicted := observed). Alpha Cen B
   *  is the exemplar — a rotational-fragmentation co-primary. */
  core?: boolean;
  /** SUB-STELLAR rotational-fragmentation sibling (a "hot Jupiter" the disc can't build in situ:
   *  massive AND interior to the snow line). Like a co-primary `core` but planetary-mass — excluded
   *  from the slot/cascade fit and reported predicted:=observed, but WITHOUT the stellar barycentre /
   *  Holman-Wiegert side effects (those stay keyed on `core`). Auto-set in slot_aware_fit. */
  fragment?: boolean;
  /** INWARD-SWEPT REMNANT (the "small Mars" problem): a body depleted and migrated inward by the
   *  inner-disc sweep, so its OBSERVED position is post-sweep, not its formation slot. The matcher must
   *  NOT anchor it to its observed AU (it would squat on an inner slot and evict the in-situ neighbour
   *  that belongs there). Assigned AFTER all in-situ bodies have claimed their natural slots, so it
   *  takes the remaining slot OUTWARD of its observed position — its formation AU — and is recorded as
   *  an inward migrant (form_r > observed r). Catalog-flagged, like `core`/`kbo`. */
  swept?: boolean;
  /** Orbital eccentricity (co-primary cores). The binary destabilization uses the
   *  worst-case extremes — "destabilized is destabilized": the P-type circumbinary
   *  clear-out reaches the APASTRON a(1+e), the S-type circum-element stable edge is set
   *  by the PERIASTRON a(1-e). Default 0 (circular) ⇒ both reduce to the stored a. */
  e?: number;
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
  observed_r?: number;   // the planet's actual observed orbit (≠ slot_r when displaced); for the chart marker
  filled: boolean;
  name: string;
  rock: number;
  ice: number;
  pebble: number;
  core: number;
  potential_core?: number;   // pre-cap core — the accretion clock / gas runaway use this, not the capped solid
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
  // position are scatter OUTPUT — excluded from fit residuals/score.
  remnant?: boolean;
  // Predicted planet that did NOT survive: its zone was scattered out / consumed,
  // leaving no body at this orbit. Display says "destroyed", not "unobserved".
  destroyed?: boolean;
  // Pre-scatter FORMATION slot, preserved when slot_r is reassigned to a scatter remnant's
  // settled location — the waveform's predicted marker rides this (the antinode it formed on).
  form_r?: number;
  // Mass-conserved decomposition of a scattering event (scatter.ts): the formation
  // allocation A (= primordial.total) splits into an inward fragment (the survivor /
  // impactor), a debris belt (the asteroid belt — C-type if the parent was icy, S-type
  // if dry), and an outward primary that impacts an outer giant. Plus the angular-
  // momentum recoil the event imparts to the perturber. Diagnostic OUTPUT, not a fit target.
  scatter?: {
    allocation: number;        // A, the pre-scatter formation mass (M⊕)
    formation_au: number;      // the antinode the parent formed on
    perturber: string;         // the scatterer (e.g. Jupiter)
    inward: { mass: number; au: number; fate: string };   // 7.5%A survivor/impactor
    // debris field → asteroid belt, typed by the parent's primordial ice fraction:
    // S = dry/silicaceous (inner), C = hydrated/carbonaceous (mid), D = ice-dominated
    // cometary (outer; absent in Sol, present for HR 8799's icy outer parents).
    belt: { mass: number; au: number; type: 'C' | 'S' | 'D' };
    outward: { mass: number; target: string };            // ~85%A primary → outer-planet impact
    recoil: { perturber_da_au: number };                  // back-reaction on the scatterer
  };
  // Occupied half-step site (inverted regime). slot_n is half-integer.
  interstitial?: boolean;
  // Dam-exterior cohort member (the Kuiper mechanism): body beyond
  // R_disc sitting on the exterior ladder r = R_disc·(1/ρ)^n. Geometry
  // is the fit; mass calculus deferred (predicted := observed) —
  // excluded from f-bisection target. slot_n = -n (negative rung).
  exterior?: boolean;
  // CORE COMPONENT: a central fragment (co-primary), not a slot product. The
  // predicted main star + any core components are the system's core; their
  // masses SUM to drive the wind pressure (Davis Dam), the magnetic field
  // (Alfvén Dam) and the barycentre the slot/factory products orbit. Excluded
  // from the cascade fit (predicted := observed). A stellar-mass body observed
  // interior to R_A that the reservoir can't form IS one: a rotational-
  // fragmentation sibling — the core's spin exceeded breakup and tore off a
  // second star (Alpha Cen B). Replaces the earlier interior/stellar_fragment
  // pair — they were the same thing.
  core_component?: boolean;
  // SUB-STELLAR core fragment (hot Jupiter / warm Neptune): a planetary-mass
  // rotational-fragmentation sibling (not a slot product, not a stellar co-primary).
  // It clears its OWN Hill + resonance-overlap chaos zone of cascade slots — the
  // cleared span is [clear_lo, clear_hi] (clear_r = R_Hill + R_sweep). The chart renders
  // it on the centre line (y=0), NOT riding the Alfvén–Maas wave.
  core_fragment?: boolean;
  clear_r?: number;
  clear_lo?: number;
  clear_hi?: number;
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
  // Deferred post-formation thunk: when slot_aware_fit is called with
  // defer_post_formation, the scatter + devour + void-remnant passes are NOT run
  // inline; this runs them on the final (gas-conserved) slot set. budgetFit invokes
  // it once after gas conservation so scatter reads final masses, not the pre-cap ones.
  _run_post_formation?: () => void;
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
  /** Names of planets the bisection targeted (all filled slots). */
  target_names: string[];
  fit: FitResult;
}
