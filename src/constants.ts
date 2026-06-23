// ============================================================
//  HYDROS universal constants
//  Global-script style (no modules): compiled by tsc to js/constants.js
//  and loaded by index.html with an ordinary <script> tag.
// ============================================================

// Composition (solar)
const Z_METALLICITY = 0.014;
const F_ROCK = 0.22;

// ABUNDANCE → BUDGET reconstruction (budget_from_abundances in budget.ts).
// A star's conserved budget {rock, ice, hydrogen} is reconstructable from two
// spectroscopic indicators + its mass:
//   METAL content  ← [Fe/H]:  Z = Z☉ · 10^[Fe/H]   (total metal mass fraction).
//   WATER content  ← C/O:     the rock:ice split. Oxygen makes water from what's
//     left after Si/Mg/Fe take theirs; carbon competes for it. Above C/O≈0.8
//     (CO_RICH_THRESH) almost no free O remains ⇒ no water ⇒ all-rock; the Sun
//     sits at C/O≈0.55 (CO_SUN) ⇒ f_rock = F_ROCK = 0.22. K_CO is fixed by those
//     two anchors so f_rock(0.55)=0.22 and f_rock(0.8)=1.
// (Bond+2010 / Thiabaud+2015 / HARPS C-O-Mg-Si; Mg/Si is a mineralogy refinement
// not wired yet.) Helium is lumped with hydrogen (the H/He budget = 1−Z).
const CO_SUN = 0.55;            // solar C/O (Asplund 2009 ≈ 0.54)
const CO_RICH_THRESH = 0.80;    // C/O above which free oxygen ⇒ water vanishes
const K_CO = (1.0 / F_ROCK - 1.0) / (CO_RICH_THRESH - CO_SUN);  // ≈ 14.18

// PER-OBJECT COMPOSITION CONTEXT (v6 budget wiring). The allocation
// AMPLITUDE constants Z·F_ROCK are no longer universal — a budget-input
// object overrides them with its own metallicity / rock fraction (Jupiter
// is metal-enriched, so its disc carries ~2× the solids a solar-Z disc
// would). These default to the solar globals, so any system NOT using a
// budget (the entire legacy {M,D,spin,f_disc} catalog) is bit-identical.
// set_composition() is called on the budget path and ALWAYS paired with
// reset_composition() after the fit, so the context never leaks between
// systems. Z_METALLICITY / F_ROCK themselves stay fixed — they anchor the
// Sol budget basis in budget.ts (SOL_B_* must not move).
let COMP_Z = Z_METALLICITY;
let COMP_F_ROCK = F_ROCK;
function set_composition(z: number, f_rock: number): void {
  COMP_Z = z;
  COMP_F_ROCK = f_rock;
}
function reset_composition(): void {
  COMP_Z = Z_METALLICITY;
  COMP_F_ROCK = F_ROCK;
}

// SLOPE NORMALIZATION OVERRIDE (v6 budget wiring). slope() in disc.ts measures
// the disc's solid surface density as disc_budget / disc_radius(M, spin=1) — a
// fixed spin=1 reference length. For a sub-cascade primary the cascade is
// ANCHORED far from that reference (Jupiter's dam sits at 0.0126 AU, but
// disc_radius(M,1) ≈ 1e-4 AU), so f_disc has to absorb the ~100× length
// mismatch and comes out as a meaningless scale artifact. Setting this to the
// ANCHORED dam makes slope consistent with where the cascade actually lives, so
// the bisected f_disc becomes the REAL disc fraction (and the disc mass / Ṁ
// that the snow line needs). Negative sentinel = use the spin=1 reference (the
// legacy catalog never sets it ⇒ untouched). Always reset after the fit.
let COMP_R_DISC = -1.0;
function set_r_disc_norm(r: number): void { COMP_R_DISC = r; }
function reset_r_disc_norm(): void { COMP_R_DISC = -1.0; }

// SNOW-LINE OVERRIDE (v6 budget wiring). The disc-temperature snow line in
// disc.ts scales with the primary's MAIN-SEQUENCE luminosity (L∝M⁴ → the M²
// term), which vanishes for a substellar primary — so a gas giant's sub-disc
// would read as ice-everywhere. But the Galilean snow line (Io dry/rocky,
// Europa+ icy) is set by young Jupiter's FORMATION luminosity (KH/accretion),
// not fusion. The budget path computes that snow line and parks it here; a
// negative sentinel means "use the formula." Always reset after the fit.
let COMP_R_SNOW = -1.0;
function set_snow_line(r: number): void { COMP_R_SNOW = r; }
function reset_snow_line(): void { COMP_R_SNOW = -1.0; }

// DAM INPUTS (context, like composition). The two universal dam laws live in disc_radius
// (Davis = outward pressure ⇄ density) and alfven_radius (Alfvén = magnetic field reach).
// They need two per-system INPUTS the bare (M, spin) signature can't carry: the nebula mass
// M_d = budget − core (sets the density the wind pushes against) and the combined outward
// FLUX Σ(M_i)^3.54 (super-linear in mass, so a binary's two cores ≠ one big one). Parked
// here as context — NOT the dam outputs (those are computed from these). Negative sentinel
// = legacy {M,D,spin} fallback. Always reset after the fit.
let COMP_NEBULA = -1.0;   // M_d, nebula mass in M⊕ (budget − core)
let COMP_FLUX = -1.0;     // Σ (M_core_i / M☉)^3.54, the combined stellar-flux wind
function set_dam_inputs(m_d: number, flux: number): void { COMP_NEBULA = m_d; COMP_FLUX = flux; }
function reset_dam_inputs(): void { COMP_NEBULA = -1.0; COMP_FLUX = -1.0; }
// Hill-radius cap on the centrifugal disc radius R_c. A sub-cascade (moon disc) has a tiny
// central mass, so the bare R_c ∝ spin²/M explodes to ~10⁷ AU; physically the disc cannot
// exceed the planet's Hill sphere. Parked when fitting a sub-cascade; Infinity = no cap (star).
let COMP_R_HILL = Infinity;
function set_hill_radius(rh: number): void { COMP_R_HILL = (rh > 0) ? rh : Infinity; }
function reset_hill_radius(): void { COMP_R_HILL = Infinity; }
// Conserved captured-pebble mass (M⊕): ε_PA·(1−ε_SI)·Z·M_beyond, set by budgetFit from the OUTER
// reservoir (the Act-1 drift drainage that the inner cores catch). 0 when there's no beyond-dam
// material (binary / inverted — trapped, no inward flux). -1 = unset ⇒ legacy disc-ice fallback.
let COMP_PEBBLE_FLUX = -1.0;
function set_pebble_flux_budget(m: number): void { COMP_PEBBLE_FLUX = (m >= 0) ? m : 0; }
function reset_pebble_flux_budget(): void { COMP_PEBBLE_FLUX = -1.0; }
// Conserved KBO budget (M⊕): the SI-retained residual ε_SI·S_outer (the 1% the streaming
// instability sieves from the outer solids; the 99% is the inward pebble flux). The dam-march
// factory is capped at this — it can't mint more KBOs than the budget holds. Replaces the anchored
// census stock C_STOCK. -1 = unset (sub-cascade / legacy).
let COMP_KBO_BUDGET = -1.0;
function set_kbo_budget(m: number): void { COMP_KBO_BUDGET = (m >= 0) ? m : 0; }
function reset_kbo_budget(): void { COMP_KBO_BUDGET = -1.0; }
// Outer-zone (KBO) streaming-instability RETENTION ε_SI. M_G = 4π⁵G²Σ³/Ω⁴ is the UPPER bound — the
// full self-gravitating clump collapsing into one body, realised only when the trap holds the
// solids to completion (the inverted regime, ε_SI=1). Untrapped (normal outer zone), drift strips
// most solids before the clump finishes, so the collapsed body is M_G·ε_SI (ε_SI = min(1,
// t_drift/t_disc) ≈ 1% — Sol's Kuiper belt). Default 1 (full M_G): inverted products + sub-cascade
// moons. budgetFit sets <1 only for the NORMAL stellar regime.
let COMP_SI_RETENTION = 1.0;
function set_si_retention(e: number): void { COMP_SI_RETENTION = (e > 0 && e <= 1) ? e : 1.0; }
function reset_si_retention(): void { COMP_SI_RETENTION = 1.0; }

// FORMATION CLOCK (v6 budget wiring) — ONE supply-limited clock for igniters
// AND non-igniters: t_form = M_core·(r/R_disc)/(Z·Ṁ·FORM_CLOCK_COEFF). The local
// accretion rate Ṁ_local = Ṁ·(R_disc/r) falls ∝1/r, so t scales UP with AU
// (Sol's ice-giant ladder) while the gas-starvation term in Ṁ keeps a compact
// CPD at ~Myr (Galileans). Normalising by R_disc (not absolute r) tames the
// 13,000 AU case (Proxima 31 Gyr → 1.2 Gyr). COMP_MDOT is now set on EVERY
// budget fit (igniters too); <0 only on the non-budget legacy path (which keeps
// the 0.10·r/AAF fallback). FORM_CLOCK_COEFF calibrated so Sol's Jupiter forms
// in ~1.9 Myr (Neptune ~9.8 → ice giant). No ignition cap — the envelope keeps
// growing after the star lights; t_form > disc lifetime ⇒ collapse-formed.
let COMP_MDOT = -1.0;               // budget gas accretion rate Ṁ [M⊙/yr], or <0
const FORM_CLOCK_COEFF = 1.103e10;  // Sol Jupiter rock+ice core → ~1.65 Myr
const CLOCK_COEFF = FORM_CLOCK_COEFF;  // legacy alias (unused; kept for safety)
function set_mdot(md: number): void { COMP_MDOT = md; }
// Primordial SPIN factor on the accretion clock (≡1 at Sol, λ=1). Set per budget fit;
// the ×spin is the missing multiplier that scales formation_time off Sol to the
// orbital-period cascade. Defaults to 1 (legacy / non-budget paths unaffected).
let COMP_SPIN = 1.0;
function set_form_spin(s: number): void { COMP_SPIN = (s > 0) ? s : 1.0; }
function reset_form_spin(): void { COMP_SPIN = 1.0; }
// FRAGMENTING-BINARY flag: set per fit when the system carries co-primary core
// fragments (a real binary/multiple). Gates the centrifugal Davis Dam in disc_radius
// so it fires ONLY for fragmenting binaries (Alpha Cen → Proxima at R_c), not for any
// high-spin disc (Saturn's moons, an artifact-spin single star). Defaults false.
let COMP_FRAGMENTING = false;
function set_fragmenting(b: boolean): void { COMP_FRAGMENTING = b; }
function reset_fragmenting(): void { COMP_FRAGMENTING = false; }
// WIDE-COMPANION CENTRIFUGAL-DAM OVERRIDE. When a system has an OBSERVED wide stellar
// companion its POSITION over-determines the centrifugal Davis Dam (R_c = r_wide), so the
// fragmenting branch of disc_radius returns this parked value directly rather than recomputing
// disc_radius_wind(M)·λ² (which mass — primary vs total budget — is ambiguous, and the
// observed position is the ground truth). Defaults -1 (off ⇒ recompute as before, e.g. when
// only a forward-SYNTHESIZED companion exists, as in a bare Alpha-Cen-style run).
let COMP_WIDE_DAM = -1.0;
function set_wide_dam(r: number): void { COMP_WIDE_DAM = r; }
function reset_wide_dam(): void { COMP_WIDE_DAM = -1.0; }
function reset_mdot(): void { COMP_MDOT = -1.0; }
const F_LODDERS_ICE = 3.5;
const GAS_FRACTION = 0.95;
const H_FRACTION = 0.74;
// One PRIMORDIAL-solar mass unit = 1.14 current M_sun (Sol baseline:
// M = 1, spin = 1, nebula density = 1). Earth masses per unit:
const M_PRIM_TO_MSUN = 1.14;
const M_SUN_TO_EARTH = 332946.0 * M_PRIM_TO_MSUN;  // 379,558 M_E per M_prim

// Inverted-factory descent exponents (assembly mass ∝ (origin/r)^exp down the
// line). The Alfvén slots are MAGNETIC, so they concentrate FERROMAGNETIC
// material — rock/iron — and slot 0 + the cascade slots accrete rock fast and
// front-loaded (STEEP descent ⇒ rock consumed quickly). Water ICE is NOT
// ferromagnetic, so the slots can't concentrate it; ice accretes by
// gravity/drift alone, more slowly and spread out (SHALLOW descent). Hence rock
// is exhausted faster than ice along the vintages. (Memory: inverted-regime-model.)
// Inverted-factory knobs — CALIBRATED against TRAPPIST-1 (the clean in-situ
// reference). VISC_COEFF sets the viscous snow line r_visc = VISC_COEFF·
// (f_disc·M²)^(1/3) (the rock→ice phase boundary). Descents: rock steep/fast
// (ferromagnetic, slot-concentrated), ice shallow/slow (non-magnetic).
const VISC_COEFF = 0.67;
const INV_ROCK_DESCENT = 0.75;
const INV_ICE_DESCENT = 0.40;
// Inverted-regime oligarchic FACTORY: mutual-Hill-radius spacing of the isolation-mass products.
// The marching dam mints planetesimals that coagulate within ISO_HILL_C Hill radii into one
// isolation-mass planet, the next seeding a feeding-zone out. Sets BOTH the count and the mass
// (M_iso ∝ C^1.5; spacing a_{n+1}=a_n(1+C·(M/3M*)^⅓)). TRAPPIST's resonant chain ⇒ C ≈ 15.
const ISO_HILL_C = 15.0;
// Davis-dam nebula density: D = (budget − core) / NEBULA_SOL, the leftover disc mass
// that piles up outside the dam, resisting the combined stellar wind. f_disc-INDEPENDENT
// (it's the budget minus the stars, not the captured fraction). M_SUN_EARTH is the
// CURRENT solar mass in M⊕ (the core/star mass unit); NEBULA_SOL = Sol's primordial
// budget (M_SUN_TO_EARTH) minus the Sun (M_SUN_EARTH) ⇒ D(Sol)=1 → R_disc=30 AU.
const M_SUN_EARTH = 332946.0;   // current solar mass in M⊕ (the core/star mass unit)
// Binary-core instability annulus (Holman-Wiegert 1999): around a binary core of
// separation a_bin, the circumprimary stable region ends near 0.3·a_bin and the
// circumbinary stable region begins near 2.4·a_bin (for near-equal masses, low
// eccentricity); products forming between are dynamically cleared.
const BINARY_HW_INNER = 0.3;
const BINARY_HW_OUTER = 2.4;
// Stellar-wind reference for the envelope/vapor wind-balance: wind_term ∝
// (spin/WIND_SPIN_REF)·(WIND_R_REF/r)². Shared by the H/He envelope (hydrogen_capture)
// and the ice cold-trap so the SAME wind drives both.
const WIND_R_REF = 0.5;       // AU
const WIND_SPIN_REF = 30.0;
// Ice cold-trap crest: vapor sublimated at the snow line is pushed outward by the
// SAME wind that strips the H/He envelope, but water (18 amu) is 18× heavier than the
// wind's protons, so it is carried √(1/18) as far. The crest is the WATER wind-balance
// radius R_water = WIND_R_REF·√(spin/WIND_SPIN_REF)·√(m_proton/m_H₂O); at the inherited-
// disc spin 4–6 this lands on TRAPPIST g (~0.047 AU) with no free knob. Ice RISES to
// R_water (∝ (r/R_water)^ICE_RISE) then FALLS beyond it (∝ (R_water/r)^ICE_FALL).
const MOL_MASS_WIND = 1.0;    // stellar-wind protons (amu)
const MOL_MASS_WATER = 18.0;  // H₂O (amu)
const ICE_RISE = 1.2;
const ICE_FALL = 5.0;
// PHASE-3 nebula (beyond R_A, no slots): a single Alfvén-repelled pile the
// marching dam sweeps up inner-first. INV_NEB_FRAC sets the swept nebula
// budget (× f_disc·M·Z·ETA); NEB_DEPLETION is the fraction the first (inner)
// product takes, the next taking that fraction of the remainder, etc. — so the
// inner KBO consumes most of the nebula and outer ones are small tails.
const INV_NEB_FRAC = 0.318;
// The depletion fraction is DERIVED per system from the local nebula
// CONCENTRATION — density AND factory geometry — not a hard value:
//   Σ = D / R_factory²   (R_factory = R_A inverted / outer dam normal, in AU)
//   depletion = 1/(1 + (NEB_CONC_HALF/Σ)^NEB_CONC_STEEP).
// A compact factory packs the same nebula into a tiny area → high Σ → the first
// product takes most (ONE big body); a far-flung factory dilutes it → low Σ →
// many SIMILAR bodies. This is why TRAPPIST (D≈320, R_A≈0.04 AU ⇒ Σ huge) minted
// one big g + small h, while Sol (D≈1, dam ≈ 30 AU ⇒ Σ tiny) minted a swarm of
// Pluto-sized KBOs. Calibrated: TRAPPIST Σ≈2e5 → 0.75; Sol Σ≈1e-3 → ~0.1.
const NEB_CONC_HALF = 133.0;
const NEB_CONC_STEEP = 0.174;

// Universal physics
// GAS_DIVIDE_FRAC: legacy rocky→gassy divide as a fixed fraction of the Davis Dam — superseded by
// gas_inner_edge() (the real wind-ram ⇄ gas-pressure equilibrium). Kept only as a fallback.
const GAS_DIVIDE_FRAC = 0.10;
// GAS-DISC INNER EDGE calibration: the rocky→gassy divide is the radius where the stellar-wind ram
// pressure (∝ W/r², W = the dam-setting wind flux) equals the disc GAS pressure (∝ Σ_gas). Setting
// W/r² = K·Σ_gas ⇒ R_inner = √(K·W/Σ_gas). GAS_EDGE_K is fixed so Sol's divide sits at ~3 AU
// (Mars↔Jupiter); R_inner then marches OUTWARD as Σ_gas declines (the disc clears inside-out).
const GAS_EDGE_K = 50.0;
// STELLAR H-CONSUMPTION coefficient: Ṁ_* = STELLAR_EAT_COEF·W·P (the wind W strips H's angular
// momentum at the equilibrium pressure P so it falls in). Sets how fast the star drains the disc H,
// hence the rate P decays. Placeholder 1.0 — to be anchored when the depletion clock is wired.
const STELLAR_EAT_COEF = 1900.0;
// THRESHOLD_GAS: the giant-class MASS boundary used by the classifier
// (rock/ice/gas giant). The runaway gas-accretion GATE is no longer this fixed
// value — it is derived per system as runaway_core_mass() (Ikoma τ_KH = τ_disc),
// which evaluates to ~2.9 M⊕ for Sol (so Sol is unchanged) but rises for
// gas-poor discs and falls for gas-rich ones.
const THRESHOLD_GAS = 3.0;
// PEBBLE ISOLATION MASS = the runaway-gas TRIGGER (Lambrechts 2014 / Bitsch 2018): a core runs away
// on gas only once it reaches M_iso = M_ISO_COEF·(H/r / 0.05)³·(M*/M☉) — there it opens a pressure
// bump, traps the pebbles, solid accretion + its luminosity stop, the envelope contracts → runaway.
// CRUCIALLY M_iso ∝ (H/r)³ and H/r GROWS outward (flared disc), so M_iso RISES with distance: the
// inner giants reach it (→ gas giants) but the ice giants never do (→ keep only a thin envelope).
// Anchored so Sol's cliff falls between Saturn (core>M_iso, runs away) and Uranus (core<M_iso, ice).
const ASPECT_1AU = 0.025;       // disc aspect ratio H/r at 1 AU; H/r = ASPECT_1AU·r^0.25 (flared)
const M_ISO_COEF = 20.0;        // M_iso prefactor [M⊕] at H/r=0.05 (Lambrechts)
// Sub-isolation cores never run away — they hold only the HYDROSTATIC envelope a sub-critical core
// supports against the disc (Mizuno), ≈ a fixed fraction of the core mass. Caps the ice-giant H/He
// at the thin skin (Uranus ~2, Neptune ~3 of cores 13/15) instead of a competition-driven pile.
const ENV_HYDROSTATIC_FRAC = 0.118;
// GAS CAPTURE (core-accretion, derived — replaces the old fit constant
// A_0·M_core²). The local Tanigawa-Watanabe (2002) disc-limited rate
// (0.29·(M_p/M_*)^4/3·(H/r)^-2·Σ_gas·r²·Ω) hugely exceeds the disc gas SUPPLY at
// runaway (verified ~10^4 M⊕/Myr at 30 M⊕), so a runaway giant's envelope is
// SUPPLY-limited: it captures a universal fraction ε of the DISC GAS RESERVOIR
// (f_disc·M_star — a stable disc property, NOT the fluctuating cascade core, so
// it never needs re-tuning when the slot machinery moves), with exp(−k·t_form)
// the capture-window closing (gap-opening/local depletion, e-fold ~1.45 Myr).
// ε = 0.2864 is Sol-anchored ONCE on Jupiter's in-situ envelope (physical
// gas-capture-fraction range 0.1–0.3); k carries its gas-poor steepening.
// TAU_KH0_MYR = Ikoma, Nakazawa & Emori (2000) KH-contraction prefactor 10^8 yr.
const GAS_CAPTURE_EFF = 0.0999;  // legacy (old global runaway fraction; unused by the window model)
const GAS_WINDOW_K = 0.691;      // legacy (old exp window; unused by hydrogen_capture)
// WINDOW-CAPTURE capture rate [M⊕/Myr]: a runaway giant accretes gas at this rate over its gas-rich
// window (τ − t_form). Sets the gorge WEIGHTS (the cap from star_frac is binding, so this controls the
// J:S:U:N distribution, not the total). With the 3-D wind star_frac (0.901), rate 4500 ZEROES the two
// clean giants — Jupiter +0.2%, Neptune −0.5% — leaving Uranus at +8% (its giant-impact/axis-tip
// residual, a real anomaly, not a gas-model error). Rate steepens J vs the ice giants but TRADES
// Jupiter against Neptune, so it can't lift both; 4500 is the balance that lands both at obs.
const GAS_CAPTURE_RATE = 4500.0;
const GAS_SELFLIMIT_C = 0.5;
// MAGNETIC CAPTURE + GRAVITATIONAL RETENTION (the unified Sun/Jupiter capture model). H/He is NOT
// captured gravitationally — it's captured MAGNETICALLY, the same angular-momentum theft the Sun's wind
// does, by every magnetized body's particle flux (capture rate ∝ the body's conductive-mass dynamo, which
// runs away as captured H→metallic conductor). Capture continues until the local gas is gone. The
// CRITICAL GRAVITY threshold is then RETENTION, not capture: a body keeps H/He only if it can hold it
// against thermal (Jeans/hydrodynamic) escape — λ = HHE_RETAIN_K·M^(2/3)/T_eq > 1 (v_esc²∝M^(2/3),
// v_th²∝T). So a small body with a strong field CAPTURES H/He but can't RETAIN it (escapes) ⇒ stays rocky;
// massive/cold bodies retain ⇒ giants. K=50 ⇒ Sol's 4 giant cores retain, Earth/Mars lose (rocky).
const HHE_RETAIN_K = 50.0;
// INWARD-CONCENTRATED GAS PROFILE Σ(r) ∝ r^(−GAS_SIGMA_SLOPE). The pre-existing H envelope is centrally
// concentrated (collapse / Lynden-Bell), so most gas is in the dense INNER disc. Each body captures at
// the inner edge of its OWN pressure differential: the STAR's domain is the inner disc [R_A, R_inner]
// (which holds ~90% BECAUSE Σ is steep — this is what sets the slope, not a free knob), each planet's
// domain is its TERRITORY (midpoints to neighbours), and no body reaches another's. Slope ≈ 2.4 puts
// ~88% in the star's inner domain and feeds Jupiter/Saturn from theirs.
const GAS_SIGMA_SLOPE = 2.4;
// HILL-SPACE CAP on the magnetic capture. The conductive-mass dynamo runs away, but a planet cannot
// capture gas beyond its HILL SPHERE — past it the star's tide strips the gas. So the effective capture
// rate is min(magnetic, Hill-limited): magnetic-limited while the field's reach < R_Hill (small planets),
// Hill-limited once the runaway pushes the reach past R_Hill (Jupiter). This caps Jupiter's runaway (its
// magnetic reach blows past Hill) so Saturn isn't crushed — recovers the observed J:S ≈ 3.3:1.
const GAS_HILL_CAP = 260000.0;
const FEED_HILL = 7.0;
// DAM-WIND suppression strength = the wind's partial angular-momentum-stripping efficiency.
// wind_suppression = 1/(1 + GAS_WIND_K·W/r²), W = M⋆^3.54 (= COMP_FLUX, the dam-setting wind).
// Suppresses inner capture most (Jupiter zapped, outer/far giants spared since 1/r² beats W).
const GAS_WIND_K = 2.0;
// PEBBLE-FLUX COMPETITION (the unified reservoir model — see memory unified-reservoir-competition):
// the inward pebble flux is a reservoir drained by the SAME Hill-space competition as the gas, but
// its inward DRIFT rate is gated by the gas density P(t) (gas drag drives the drift). Two knobs:
//   PEBBLE_DRIFT_K  — drift conductance: fraction of the pebble reservoir released inward per Myr at
//                     full gas density (P=1). Larger ⇒ pebbles delivered faster (while gas lasts).
//   PEBBLE_CAPTURE_K — per-sink Hill capture conductance (the same form as GAS_CAPTURE_RATE); each
//                     core captures its branching share kᵢ/K of the released flux, kᵢ ∝ R_Hill²·Ω.
// When gas→0 the drift stops and the residual reservoir freezes out as KBOs.
const PEBBLE_DRIFT_K = 1.0;
const PEBBLE_CAPTURE_K = 5000.0;
// PEBBLE PILE-UP + LEAK (traffic jam at the barrier; leaky dust trap). Uncaptured drift does NOT
// drain away — it piles up at the gas inner edge / the innermost giant's pressure bump and waits, so
// the growing planet eats the BANKED reservoir as it runs away (the missing inner-giant core mass).
// A small fraction LEAKS inward each Myr (small grains coupled to the gas flow + snow-line vapor),
// carrying solids further into the system rather than feeding the giant.
const PEBBLE_LEAK_FRAC = 4.0;
// WIND STAND-OFF (gas-envelope inner edge). Wind ram P_wind=Ṁ_wind·v_wind/(4πr²) balanced by the gas-
// envelope pressure P_gas = M_gas/V (V = shell area between R_A and R_disc) at the stand-off radius
// R_inner = √(Ṁ_wind·v_wind/(4π·P_gas)). WIND_MOMENTUM_COEF carries Ṁ_wind·v_wind (∝ wind_flux), Sol-
// anchored so Sol's edge ≈ 4 AU. As gas is consumed P_gas falls ⇒ R_inner marches OUT (inside-out
// clearing). Diffuse wide disc (low P_gas) ⇒ edge far + slow consumption; dense Sol ⇒ close + fast.
const WIND_MOMENTUM_COEF = 281.0;
// SPIN-COUPLED STAND-OFF (magnetic braking). The ram pressure that sets the inner edge is the stellar
// WIND, which is powered by the star's SPIN. But consuming the gas brakes the star: every H molecule
// the wind torques (lever arm R_A) carries off the star's angular momentum (Weber–Davis). So as P_gas
// falls (gas eaten), the wind W∝Ω^WIND_SPIN_EXP falls IN STEP, and R_inner=√(W/P_gas) does NOT march
// out — it advances fast early (full spin) then STALLS as the spin crashes. SPINDOWN_FRAC = the
// fraction of the initial spin lost when the star eats the WHOLE reservoir (Ω → (1−SPINDOWN_FRAC)·Ω₀).
const WIND_SPIN_EXP = 1.0;       // W ∝ Ω^this (wind mass-loss ∝ spin)
const SPINDOWN_FRAC = 0.7;      // swept
const PLANET_SPINDOWN = 20.0;   // swept
// CONSUMPTION FRONT (see memory ram-pressure-is-magnetic-braking). The gas inner edge is NOT a
// radial pressure crossing — it is the magnetic-wind TORQUE extracting the gas's angular momentum
// (magnetic braking), consuming the disc INSIDE-OUT from R_A. The front R_inner(t) marches out at a
// rate ∝ the wind torque τ = Ω·R_A(Ω)² / (disc-gas normalization); the SAME torque spins the star
// down (Ω falls), so the front DECELERATES — fast early (clears the inner slots → rocky), slow late
// (the giants sit in gas for Myr). R_disc-INDEPENDENT; the scale is the wind torque, Sol-anchored.
const F_DISC_REF = 0.010410;     // Sol's f_disc — normalizes the MMSN disc-gas surface density
// GAS INFALL CONCENTRATION: the H being consumed (angular momentum stripped by the wind) drains
// INWARD and piles up at low AU, so the gas density steepens inward over the disc lifetime — denser
// where the inflow accumulates (just outside the front), thin in the outer disc whose gas has drained
// away. The local capture density is weighted ∝ r^−GAS_INFALL_SLOPE, so the outer giants (Uranus/
// Neptune), whose local gas has flowed inward, are starved (stay ice) while the inner giants gorge.
const GAS_INFALL_SLOPE = 1.0;   // legacy fallback only — the slope is now DERIVED from the wind lever arm
// MAGNETIC LEVER ARM (Blandford–Payne / Réville). The gas density slope is NOT a constant — it is set
// by the wind's lever arm λ=(r_A,wind/r₀)², itself a property of the STAR via the wind magnetization
// η* = B*²R*²/(Ṁ_wind·v∞): r_A=R*·η*^¼. The SAME λ sets the angular-momentum theft (spin-down) and the
// surface-density slope n=(2λ−3)/(2(λ−1)) — λ<3/2 ⇒ n<0 (gas denser inward, the infall concentration);
// λ>3/2 ⇒ n>0 (inner cavity, gas held out). Sol-anchored at λ=1.25 ⇒ n=−1 (Σ∝r⁻¹).
const LEVER_ARM_SOL = 1.35;
const LEVER_ARM_MIN = 1.04;     // floor (λ→1 makes n→−∞); keeps the inward slope finite
const LEVER_ARM_MAX = 3.0;      // cap (very strong wind ⇒ deep inner cavity)
// DAVIS-DAM GAS PILE-UP: the dam (R_disc) is the OUTER pressure maximum where the wind ram balances
// the infalling nebula, so gas ALSO accumulates there. The capture density gets an outer bump ∝
// (r/R_disc)^GAS_DAM_Q (peaks at the dam), feeding the outermost planet on it — the two-zone picture:
// inner concentration (r^n) + outer dam pile, trough between.
const GAS_DAM_WEIGHT = 0.015;
const GAS_DAM_Q = 5.0;
const FRONT_MARCH_COEF = 300.0;
const FRONT_SPIN_COEF = 50.0;
// DAM-TRICKLE gas clock: τ[Myr] = (R_disc³ / M) · GAS_TRICKLE_COEF. The Davis-Dam H/He pileup
// drains INWARD onto the star by GRAVITY-driven drift, v ∝ g ∝ M/r², so the drain time
// τ = ∫dr/v ∝ R_disc³/M — gravity ∝ 1/r² makes a far dam drain CUBICALLY slower. COEF anchors
// Sol (R_disc≈30 AU) to the ~3.5 Myr disc lifetime ⇒ COEF = 3.5/30³ ≈ 1.296e-4. Gas/ice-giant
// cliff falls between Saturn (3.1) and Uranus (6.5 Myr); HR 8799 (R_disc≈67) → τ≈30 Myr so its
// wide giants stay pre-cliff; Alpha Cen (R_disc≈9000 AU) → effectively never drains (Proxima eons).
const GAS_TRICKLE_COEF = 5.35e-5;
// STELLAR CONSUMPTION = metallicity-set drain with a large-disc (3-D volume) dilution CEILING.
// EMPIRICAL (apply_hydrogen_conservation): the observed planet-gas fraction (obs gas / H reservoir) is
// NON-monotonic in disc size (Sol the minimum) and tracks TWO things:
//   • METALLICITY — high Z ⇒ fat cores ⇒ planets run away and gorge ⇒ the star drains LESS. This sets the
//     spread among compact discs (55 Cnc metal-rich keeps 45%, tauCeti metal-poor → star takes ~all).
//   • LARGE-DISC 3-D VOLUME dilution — the wind fills the disc's 3-D volume; for a disc bigger than Sol's
//     it is spread so thin it can't drain (HR 8799 R_disc≈67 ⇒ planets keep 82% DESPITE low metallicity).
//     Gated by max(1,·): =1 below Sol's disc (compact systems are metallicity-ruled), dilutes only above.
// Spin came out unresolved at n=18 (confounded with Z) and BROKE HR 8799 (its high spin over-drained), so
// it is dropped — a monotonic spin²/R_disc³ wind saturated every compact disc to 100%. The big positive
// residuals (47 UMa, ups And, 55 Cnc b, Beta Pic) are the FISSION / gravitational-instability systems:
// their planet mass is NOT gas-captured, so a gas-capture drain correctly under-counts it. Fit ~10% (≈7%
// excluding fission). Form:
//   star_frac = STAR_CONSUME_K · (Z/STAR_Z_SOL)^−STAR_METAL_EXP / max(1, R_disc/STAR_DISC_REF)^STAR_VOL_EXP
const STAR_CONSUME_K = 0.9037;        // Sol anchor (Z=Z_sol, R_disc=ref ⇒ star_frac 0.9037 ⇒ Jup/Nep zeroed)
const STAR_METAL_EXP = 0.4;           // (Z/Z_sol)^−this — high metallicity ⇒ planets gorge ⇒ star drains less
const STAR_Z_SOL = 0.014;             // Sol disc metal fraction (rock+ice)/total — the Z normaliser
const STAR_DISC_REF = 30.1;           // AU — Sol's Davis Dam; the 3-D volume dilution gate (=1 below it)
const STAR_VOL_EXP = 2.5;             // dilution ∝ (R_disc/ref)^this above the gate (only large discs, HR 8799)
// TWO-STAGE PLANET DISTRIBUTION. Stage 1 = window-wants (hydrogen_capture); stage 2 = whatever the wants
// leave unclaimed is vacuumed up as core^Q by the biggest core. Sol's clock is alive ⇒ wants > budget ⇒ no
// stage 2. A compact disc's clock is dead (τ→0) ⇒ ~all budget is leftover ⇒ the biggest core monopolises it
// (55 Cnc's d → ~1000 M⊕, inner system starved). Q FALLS with disc size: compact ⇒ winner-take-all, wide ⇒
// the giants share. Q = STAR_VACUUM_QB·(STAR_DISC_REF/R_disc)^STAR_VACUUM_QS (55 Cnc≈4.3, HR 8799≈1.3).
const STAR_VACUUM_QB = 2.0;           // vacuum exponent at Sol's disc size
const STAR_VACUUM_QS = 0.5;           // how fast winner-take-all weakens with disc size
// SILICA-BOILING VISCOUS-VAPOR BONUS: for sub-~0.7-spin stars whose core accretion temperature reaches
// the silica/iron boiling point, the vaporized rock opens a second disc-spread channel that speeds
// planet formation by (1 + VAPOR_BONUS_K·Ω / M^VAPOR_GRAV_EXP) — saturated vapor × spin leverage Ω that
// FLINGS it, divided by the stellar GRAVITY it must climb out of. A low-mass star's shallow well lets
// the flung vapor spread far more, so the boost is intrinsically larger (the constant is NOT universal:
// a flat K serves ~1.2 M⊙ giant-hosts at ≈5 but starves the ~0.8 M⊙ small-planet systems that need
// ≈16 — the gravity term derives that split). Peaks at the highest spin that still boils (~0.7). M=1
// (Sol) ⇒ the gravity term is unity, so Sol is untouched. Anchored: ups And (M=1.27, Ω=0.42) ⇒ 3.1×.
const VAPOR_BONUS_K = 9.1;
const VAPOR_GRAV_EXP = 2.5;     // stellar-gravity (escape-energy ∝ M/R) exponent on the vapor-fling spread
// MAGNETIC HALO ACCELERATION: the Accretion-Halo march speed scales with the dam-setting wind flux
// W (∝ M⋆^3.54, Sol-normed to 1) raised to the system's Ω² (spin²) — the wind MAGNETIZATION η ∝ B² ∝
// Ω² (B∝Ω, dynamo), so the ionized rock vapor is flung with efficiency W^(Ω²). DERIVED (no fitted
// exponent): ≡1 at Sol (Ω=1,W=1); HR 8799 (Ω=1.21 ⇒ Ω²=1.46, W≈4) advances its halo ~8× faster so its
// wide outer giants form within the gas window instead of starving on the closed-window ice branch.
// (Wired in formation_time, disc.ts — uses COMP_SPIN² directly, no constant.)
// DAVIS-DAM H/He PILEUP (the ice-giant, post-cliff channel): M_pileup = GAS_PILEUP_EFF·M_gas·
// (r/R_disc)^GAS_PILEUP_Q, peaked at the dam, tapering inward; Alfvén-ungated (diamagnetic H/He).
const GAS_PILEUP_EFF = 5.9e-4;   // Sol-anchored on Neptune's envelope (~2.35 M⊕ at R_disc)
const GAS_PILEUP_Q = 0.22;       // inward GROWTH of the pileup (∝(R_disc/r)^q): Uranus ≳ Neptune
const TAU_KH0_MYR = 100.0;
// LITERATURE CEILING on the runaway critical core mass. The τ_KH=τ_disc gate over-inflates for
// COMPACT discs (short τ_disc ⇒ M_crit ∝ τ_disc^−0.4 → 16–29 M⊕ for ups And/55cnc/kep90), but the
// STATIC critical core mass never exceeds ~10 M⊕ even at interstellar grain opacity (Mizuno 1980;
// Piso & Youdin 2014: ~8.5 M⊕ at 5 AU), and drops to a FEW M⊕ for the warm, low-opacity, heavy-
// element-enriched envelopes these compact metal-rich discs actually have (Hori & Ikoma; ×3 lower
// per 10× opacity drop). So cap M_crit at the ISM ceiling — this lets enriched inner giants (ups And
// c) gorge while leaving every other system unchanged (cores that matter are already >10 M⊕).
const CRIT_CORE_CEILING = 10.0;
// ε_PA — fraction of the inward pebble FLUX the inner cores accrete (pebble-accretion efficiency,
// a few % in the literature). The flux is now sourced from the OUTER reservoir (~10× the old
// disc-ice pool), so this dropped from 0.40 (applied to the wrong, too-small pool) to ~0.03.
const PEBBLE_CAPTURE_EFFICIENCY = 0.03;
// Pebble drift physics: the drift-limited Stokes number (universal pebble size) and the
// sub-Keplerian pressure-gradient parameter η. Set the radial-drift timescale t_drift, hence the
// streaming-instability retention ε_SI = min(1, t_drift/t_disc) (the gas-off residual → KBOs).
const PEBBLE_STOKES = 0.1;
const PEBBLE_ETA = 0.002;
// KBO size DECLINE is NOT a free parameter — it's the Davis Dam marching outward as the nebula
// depletes. The nebula mass holds the dam in (disc_radius: R_disc ∝ M_nebula^−½), so M_nebula ∝ R⁻²;
// by the time the dam reaches R_birth the local Σ ∝ R⁻³ and the SI seed M_G ∝ Σ³/Ω⁴ ∝ R⁻³ ⇒
// M_k = M_seed·(R_dam/R_birth)³. Applied in the KBO loop (fit.ts); no coupling constant.
const ETA_ROCK = 0.78;
const SNOW_PILEUP_FACTOR = 0.5;
const SNOW_PILEUP_WIDTH_FRAC = 0.15;
const ETA_ICE_DECAY_FRACTION = 0.80;

// Grain-opacity parameter (paper §2): 0 = fully grain-grown (opacity-poor),
// 1 = ISM-like small-grain-dominated (opacity-rich). Set to 0.75 → Sol snow
// line 2.50 AU. The grain-axis midpoint 0.5 (snow line 1.97 AU, the Mulders
// disc-population median) pulled the line in far enough to hand Theia's slot
// an ice budget that pushed it over the gas-giant threshold — unphysical; so
// 0.75 keeps the terrestrial slots rock-dominant while still sitting inside
// the old Sol-fit 0.82/2.70 AU value (an artifact of anchoring on the
// Mars/Theia annihilation zone). Held constant across systems; the snow line
// then scales with M^2 and sqrt(f_disc).
const GRAIN_OPACITY = 0.75;

// Sol reference values (calibration anchors)
const SOL_M_PRIMORDIAL = 1.0;  // Sol IS the unit (1 = 1.14 current M_sun)
// The family constant IS Neptune's orbit (J2000 semi-major axis):
// Sol at (M, Ω, D) = (1, 1, 1) puts the Davis Dam exactly on slot-0
// Neptune.
const SOL_R_DISC = 30.069923;
const SOL_R_A_FORMATION = 0.20;
const SOL_INTERCEPT = 0.596;
// Sol's collapse centrifugal radius (Terebey-Shu-Cassen R_c = j²/GM ∝ spin²/M).
// Sets the self-similar nebula profile (Lynden-Bell & Pringle, γ=1): the disc
// reservoir f_disc·M is the nebula mass between R_A and R_disc, so f_disc is
// DERIVED from spin + budget, never fit to the observed planets. Anchored so
// Sol (spin 1, M 1) yields f_disc = 0.0104 (reservoir 3951 M⊕, ~8.5% of M_d).
const SOL_R_C = 337.01;

// === CONDUCTOR LADDER (dynamo source) ===============================
// A body's magnetic field comes from a rotating, electrically CONDUCTING FLUID.
// Which budget component is conducting is set by the internal ρ·g (pressure)
// crossing a phase boundary, GATED BY MASS — the same template as fusion
// ignition, generalized to a ladder:
//   • STELLAR (M ≥ IGNITION): H/He fully ionized → the whole mass is plasma.
//   • GAS GIANT: H past ~1 Mbar → metallic hydrogen (n=1 polytrope crossing).
//   • ROCKY: iron core molten/convecting (freezes below IRON_MELT_MASS → Mars).
// Each conductor contributes "conductive mass" weighted by its RELATIVE
// CONDUCTIVE POTENTIAL per Earth-mass (dynamo efficiency). These are the
// calibration constants — tune so Sol/Jupiter/Earth surface fields emerge.
const CONDUCT_ROCK = 1.0;          // molten-iron rock — reference, per M⊕
const CONDUCT_METALLIC_H = 1.0;    // metallic hydrogen, per M⊕   [TO CALIBRATE]
const CONDUCT_PLASMA = 1.0e-4;   // ionized stellar plasma, per M⊕ (feeble per mass)
const RHO_METALLIC_H = 0.7;        // g/cc — metallic-H transition density (P≈1 Mbar)
const IRON_MELT_MASS_E = 0.3;      // M⊕ — iron core freezes below this (Mars goes dark)
const DYNAMO_SAT_EXP = 0.16;       // B ∝ (conductive mass)^this — saturated dynamo (R&C ~1/6)
// TACHOCLINE-dynamo rotation law: B ∝ min(spin,1)^this (fully-convective stars are exempt —
// they saturate; see dynamo_field_rel). SATURATES at/above the Sol-anchor spin (spin≥1 ⇒
// field set by conductor mass alone, so fast rotators — Jupiter, Saturn, α Cen — keep their
// tight R_A); BELOW it the field is strongly rotation-starved, so a slow tachocline rotator
// (Kepler-90, spin 0.23) has a feeble field ⇒ small R_A ⇒ the Alfvén Dam retreats inside its
// innermost planet and the cascade reaches the whole compact system. The old 0.25 left the
// spin-INDEPENDENT conductor baseline dominant (Kepler-90's spin only knocked B to 69%),
// pinning R_A at ~0.2 for any solar-mass star regardless of spin.
const DYNAMO_SPIN_EXP = 4.0;
// Mass-dependent dynamo SATURATION spin (Rossby): the field plateaus once spin ≥ spin_sat,
// and spin_sat ∝ (M/M☉)^this — low-mass stars have long convective turnover (low Rossby) so
// they saturate at LOW spin (a slow M-dwarf still runs a strong field ⇒ R_A stays ~0.02 ⇒
// inverted regime intact), while solar-mass stars saturate only near spin≈1 (Kepler-90 at
// spin 0.23 is rotation-starved ⇒ R_A collapses to ~0.03). Capped at 1, so M≥M☉ is unchanged.
const DYNAMO_SAT_SPIN_EXP = 1.5;
const EARTH_G_PER_ME = 5.972e27;   // grams per Earth mass
const EARTH_CM_PER_RE = 6.371e8;   // cm per Earth radius
const G_CGS = 6.674e-8;            // gravitational constant, cm³ g⁻¹ s⁻²
const AU_CM = 1.495978707e13;      // cm per AU
const M_SUN_G = 1.98892e33;        // grams per solar mass
// Magnetosphere PROJECTION gate. The field projects beyond the body (an exterior
// Alfvén Dam exists) only when its surface magnetic pressure B²/2μ₀ beats the
// external FORMATION pressure (the dense disc/nebula it's embedded in — NOT the
// thin present-day wind). Below that the magnetopause is buried inside R_body:
// the BURIED regime, where all matter just infalls to one body (Mercury, Venus,
// pre-impact Earth). [TO CALIBRATE against the solar-system bodies + Theia.]
const DYNAMO_B_EARTH = 0.5;        // G — Earth iron-dynamo surface field (anchor)
const DYNAMO_SPIN_ONSET = 0.02;    // λ — dynamo onset; below this rotation B dies (Rossby)
const P_EXT_FORMATION = 6.0e-4;    // Pa — formation disc/nebula pressure the field must clear
const MU0_SI = 1.2566e-6;          // vacuum permeability (SI)
// Davis-Dam WIND = luminosity flux + small magnetic-only baseline (literature-grounded:
// the wind is magnetically amplified but SATURATES and is flux/luminosity-ceilinged —
// Shoda+2020 Alfvén-wave magnetic-rotator winds; Vidotto+2013 M-dwarf winds stay weak
// despite strong fields). So the field's strength feeds R_A (magnetopause), NOT the wind —
// a strong-field M-dwarf still has a feeble wind ⇒ small R_disc + large R_A ⇒ inverted.
const WIND_MAG_FRAC = 0.0;      // magnetic-only wind baseline, relative to Sol's flux
const WIND_OMEGA_EXP = 0.57;       // R_disc wind ram-pressure rotation dependence (Shoda+2020 P_w∝Ω^0.57)
// Fully-convective α² dynamo boost: below ~0.35 M⊙ a low-mass star loses its tachocline and
// runs a fully-convective dynamo saturating near kG (TRAPPIST-1 ~600 G vs Sun ~1 G). Applies
// to H-dominated convective bodies (M-dwarfs / BDs / giants), NOT rocky iron-core dynamos.
const DYNAMO_CONV_BOOST = 50.0;    // field multiplier for fully-convective bodies [TO CALIBRATE]
const FULLY_CONV_MASS_E = 116531.0; // M⊕ ≈ 0.35 M⊙ — fully-convective threshold
const EARTH_RE_IN_AU = 4.2635e-5;  // Earth radius in AU (for R_body vs R_A comparison)

// CASCADE_RATIO derivation: each slot sits at the half-amplitude-at-45°
// projection (1/(2√2)) of the previous slot's Gaussian HWHM (√(2 ln 2)).
// Equivalent forms: 1 - √(ln 2)/2 = 1 - 1/(2√2)·√(2 ln 2). The factor
// 1/(2√2) is a pure geometric constant — the half-diagonal-projection
// in any orthogonal decomposition, appearing in 45° polarization,
// Butterworth filter damping, and inscribed-circle-to-diagonal ratios.
const CASCADE_RATIO = 1.0 - Math.sqrt(Math.log(2.0)) / 2.0; // ~0.5837

// SUHL PARAMETRIC SUBHARMONIC (magnetic-resonance wavelength doubling). In a WEAK magnetic field the
// cascade standing wave period-doubles: it decays to half its rung frequency, so the rungs space out
// by 2× (the Suhl spin-wave / Faraday subharmonic — parametric instability only ever cascades DOWN in
// frequency, never up; that retro-justifies why a 2nd HARMONIC was always wrong). It is a genuine
// FEIGENBAUM period-doubling cascade in the cavity rung count N (the control parameter): the bifurcation
// points N_k crowd geometrically toward an accumulation N_∞ with the universal ratio δ = 4.66920…, so
// they are NOT independent free thresholds — δ ties the f/4 floor to the f/2 floor and N_∞. Each
// doubling also needs the field below a DAMPING floor. This explains the otherwise-baffling interleaving
// (muarae N=8.00→2×, hd134987 8.08→4×, 55 Cnc 8.13→2×, hd142 8.17→4×, Beta Pic 8.40→2×): the highest-N
// system (Beta Pic) is NOT the deepest because it is PAST N_∞ — the cascade's accumulation/chaos onset.
//
// The 1×→2× onset is a 2-D FARADAY TONGUE, not a flat field threshold (a flat B_crit failed: 47 UMa
// doubles at B=0.19 while HD 20794 stays 1× at B=0.10 — *lower* field, so no scalar B_crit separates
// them). Faraday tongues are PERIODIC — a 2× resonance at each integer N/2 (the subharmonic seats an
// integer number of rungs) — and the tongue WIDENS with cavity size (the resonator Q ∝ N), so the
// field-tolerance OPENS from the tip: B_width(N) = WAVE_TONGUE_SLOPE·(N − N_MIN), N_MIN at N/2 = 3.5
// (the first mode; rocky N<7 can't seat f/2). 47 UMa (N=8.6, N/2≈4.3) tolerates B=0.19; HD 20794 (N=7.6,
// near the narrow tip) needs B<0.10, excluded. Crucially the tongue does NOT close: a wide cavity has a
// wide tongue, so Alpha Cen (N=19.8, N/2≈10 — a higher resonance) DOUBLES even at B≈1, while Sol/HR 8799
// (N≈9–10, modest tongue) are 1× because their strong field clears B_width. (1× wrongly invents a 6240 M⊕
// phantom brown dwarf in Alpha Cen's slot 1 to absorb its over-budget; 2× is the parsimonious fit and the
// residual just exposes the budget overestimate — orthogonal to the regime.) [docs: wavelength-doubling]
const FEIGENBAUM_DELTA = 4.6692016091;   // universal period-doubling constant
const WAVE_DOUBLING_N_MIN = 7.0;         // Faraday-tongue tip: N/2 = 3.5 first-mode crossing (rocky N<7 can't seat f/2)
const WAVE_TONGUE_SLOPE = 0.155;         // tongue widens at this rate (Q∝N): field-tolerance B_width = slope·(N−N_MIN)
const WAVE_DOUBLING_N_ACCUM = 8.32;      // N_∞: cascade accumulation point (chaos beyond — Beta Pic N=8.40 is past it)
// 2×→4× bifurcation is δ-FIXED, not calibrated: N_2 = N_∞ − (N_∞ − N_1)/δ  (≈ 8.04, between muarae and hd134987)
const WAVE_DOUBLING_N_MIN_4X = WAVE_DOUBLING_N_ACCUM - (WAVE_DOUBLING_N_ACCUM - WAVE_DOUBLING_N_MIN) / FEIGENBAUM_DELTA;
const B_PARAMETRIC_CRIT_4X = 0.058;      // 2×→4× damping floor — the deeper bifurcation needs weaker damping

// Assignment scoring
const OVERPRED_PENALTY = 0.2;
const UNDERPRED_PENALTY = 5.0;  // slot prediction far BELOW observed:
                                // physical impossibility — planet must
                                // have migrated from an outer slot.
const UNDERPRED_RATIO = 5.0;    // observed/cascade_pred ratio threshold
const GAS_OBS_THRESHOLD = 5.0;
const GAS_INNER_PENALTY = 0.15;
const GAS_DECISIVE_DIST = 0.05;

// Stripping / composition
const IRON_FRACTION = 0.30;
const T_STRIP_K = 2000.0;       // silicate vaporization threshold (K)
const MERCURY_SANDBLAST = 0.70; // mantle fraction lost to inner-dam magnetic bombardment (Cameron 1985)
const MAG_BOMBARD_R_A = 2.0;    // bombardment zone extent in units of R_A (innermost survivor only)
const L_T_TAURI_FACTOR = 10.0;  // pre-MS luminosity boost over MS
const ALBEDO = 0.1;
const SIGMA_SB = 5.670374419e-8;
const L_SUN_W = 3.828e26;
const AU_M = 1.495978707e11;

// Late-delivery threshold: half of (Borealis impactor mass / Mars mass)
// = 0.5 * (0.02 / 0.107) ≈ 0.0935 (9.35% fractional mass gain).
const LATE_DELIVERY_FRAC = 0.5 * (0.02 / 0.107);

// Mass class boundaries (Earth masses)
const M_STELLAR_BOUNDARY = 25400.0;  // 0.08 M_sun, hydrogen burning
const DISC_TRUNCATION_FACTOR = 0.15; // Holman-Wiegert fallback only

// Accretion-pressure Hill-overflow fragment floor (M⊕): a gas-DOMINATED body that completed runaway
// H/He capture sits well above the critical core mass M_crit (~10–15 M⊕). This absolute floor (≈2×
// M_crit) is what separates a fission fragment (a runaway giant the disc can't build) from a disc
// super-Earth / Neptune, and — unlike the bare M_crit test — it does NOT collapse during the f_disc
// bisection sweep, so packed super-Earth systems (Kepler-90) and clean Neptune systems (HD 69830)
// are never mislabelled. See accretion-overflow-fragmentation.md.
const FRAG_GIANT_MIN = 30.0;
// Upper edge of the low-spin fragment WINDOW (primordial spin λ). Below it (and above the
// overflow floor) the accretion-pressure overflow can't be spread into a disc cascade, so it
// lumps off as a hot-Jupiter fragment; at/above it the spread is efficient and the would-be
// overflow becomes a normal planetary cascade instead (Sol λ=1, HR 8799 λ=1.21 — no lump). Used
// by the FORWARD fragment synthesis (predict the hot Jupiter from inputs with no observed body).
// The catalog's fragment systems sit at λ ≈ 0.42–0.52 (ups And, Beta Pic, HD 134987, 55 Cnc) and
// the non-fragment discs at λ ≥ 1, so 0.7 cleanly separates them (design-doc fragment window 0.3–0.7).
const FRAG_SPIN_MAX = 0.7;

// Hamano Type-II steam-retention mass (M⊕): a hot planet below this can't hold its delivered-water
// steam atmosphere against hydrodynamic escape (cosmic-shoreline scale, Zahnle & Catling) — it stays
// in the Type-II magma-ocean state and the pebble-delivered water is destroyed (dry until late
// delivery). Above it (or beyond the snow line, where ice is solid) the water is retained.
const STEAM_RETAIN_MASS = 3.0;

// Hamano Type-II proximity boundary (AU at Sol): inside this distance the stellar bolometric flux
// keeps a magma ocean molten for ~20 Myr, so the steam atmosphere is photodissociated / lost and the
// delivered water is destroyed (a small planet here stays dry). At Sol it reaches ~Mars's orbit; it
// scales with insolation as r ∝ √L. Beyond it the magma ocean solidifies (Type I) and water is kept.
const TYPE_II_AU = 1.52;

// ---- Physical guardrails (v5: reject fits requiring impossible inputs) ----
// A disc cannot exceed half the stellar mass (gravitationally it would be
// a binary, not a disc). The f_disc bisection is bounded by this.
const F_DISC_MAX = 0.5;
// Maximum physical formation-cloud density (Sol D = 1 ≈ 1e6 H2 cm^-3).
// Ceiling is the protostellar OPACITY LIMIT n(H2) ~ 1e10 cm^-3 (D ~ 1e4),
// where a collapsing core turns optically thick / forms the first
// hydrostatic core — denser than this is inside the protostar, not a
// disc-forming nebula. Dense (clustered, collapsing) cores legitimately
// reach here; combined with a feeble M-dwarf wind this puts the Davis Dam
// very close in (TRAPPIST). Still rejects the old jaw-lock artifacts
// (D ~ 1e6–1e7). Fits above this are flagged unphysical.
const MAX_NEBULA_DENSITY = 10000.0;
// breakup_spin(M) in disc.ts is the third guardrail (true stellar rotation).
