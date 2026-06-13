"use strict";
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
const CO_SUN = 0.55; // solar C/O (Asplund 2009 ≈ 0.54)
const CO_RICH_THRESH = 0.80; // C/O above which free oxygen ⇒ water vanishes
const K_CO = (1.0 / F_ROCK - 1.0) / (CO_RICH_THRESH - CO_SUN); // ≈ 14.18
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
function set_composition(z, f_rock) {
    COMP_Z = z;
    COMP_F_ROCK = f_rock;
}
function reset_composition() {
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
function set_r_disc_norm(r) { COMP_R_DISC = r; }
function reset_r_disc_norm() { COMP_R_DISC = -1.0; }
// SNOW-LINE OVERRIDE (v6 budget wiring). The disc-temperature snow line in
// disc.ts scales with the primary's MAIN-SEQUENCE luminosity (L∝M⁴ → the M²
// term), which vanishes for a substellar primary — so a gas giant's sub-disc
// would read as ice-everywhere. But the Galilean snow line (Io dry/rocky,
// Europa+ icy) is set by young Jupiter's FORMATION luminosity (KH/accretion),
// not fusion. The budget path computes that snow line and parks it here; a
// negative sentinel means "use the formula." Always reset after the fit.
let COMP_R_SNOW = -1.0;
function set_snow_line(r) { COMP_R_SNOW = r; }
function reset_snow_line() { COMP_R_SNOW = -1.0; }
// DAM INPUTS (context, like composition). The two universal dam laws live in disc_radius
// (Davis = outward pressure ⇄ density) and alfven_radius (Alfvén = magnetic field reach).
// They need two per-system INPUTS the bare (M, spin) signature can't carry: the nebula mass
// M_d = budget − core (sets the density the wind pushes against) and the combined outward
// FLUX Σ(M_i)^3.54 (super-linear in mass, so a binary's two cores ≠ one big one). Parked
// here as context — NOT the dam outputs (those are computed from these). Negative sentinel
// = legacy {M,D,spin} fallback. Always reset after the fit.
let COMP_NEBULA = -1.0; // M_d, nebula mass in M⊕ (budget − core)
let COMP_FLUX = -1.0; // Σ (M_core_i / M☉)^3.54, the combined stellar-flux wind
function set_dam_inputs(m_d, flux) { COMP_NEBULA = m_d; COMP_FLUX = flux; }
function reset_dam_inputs() { COMP_NEBULA = -1.0; COMP_FLUX = -1.0; }
// Hill-radius cap on the centrifugal disc radius R_c. A sub-cascade (moon disc) has a tiny
// central mass, so the bare R_c ∝ spin²/M explodes to ~10⁷ AU; physically the disc cannot
// exceed the planet's Hill sphere. Parked when fitting a sub-cascade; Infinity = no cap (star).
let COMP_R_HILL = Infinity;
function set_hill_radius(rh) { COMP_R_HILL = (rh > 0) ? rh : Infinity; }
function reset_hill_radius() { COMP_R_HILL = Infinity; }
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
let COMP_MDOT = -1.0; // budget gas accretion rate Ṁ [M⊙/yr], or <0
const FORM_CLOCK_COEFF = 6.669e9; // t[Myr] = M_core·(r/R_disc)/(Z·Ṁ·FORM_CLOCK_COEFF)·spin
const CLOCK_COEFF = FORM_CLOCK_COEFF; // legacy alias (unused; kept for safety)
function set_mdot(md) { COMP_MDOT = md; }
// Primordial SPIN factor on the accretion clock (≡1 at Sol, λ=1). Set per budget fit;
// the ×spin is the missing multiplier that scales formation_time off Sol to the
// orbital-period cascade. Defaults to 1 (legacy / non-budget paths unaffected).
let COMP_SPIN = 1.0;
function set_form_spin(s) { COMP_SPIN = (s > 0) ? s : 1.0; }
function reset_form_spin() { COMP_SPIN = 1.0; }
// FRAGMENTING-BINARY flag: set per fit when the system carries co-primary core
// fragments (a real binary/multiple). Gates the centrifugal Davis Dam in disc_radius
// so it fires ONLY for fragmenting binaries (Alpha Cen → Proxima at R_c), not for any
// high-spin disc (Saturn's moons, an artifact-spin single star). Defaults false.
let COMP_FRAGMENTING = false;
function set_fragmenting(b) { COMP_FRAGMENTING = b; }
function reset_fragmenting() { COMP_FRAGMENTING = false; }
function reset_mdot() { COMP_MDOT = -1.0; }
const F_LODDERS_ICE = 3.5;
const GAS_FRACTION = 0.95;
const H_FRACTION = 0.74;
// One PRIMORDIAL-solar mass unit = 1.14 current M_sun (Sol baseline:
// M = 1, spin = 1, nebula density = 1). Earth masses per unit:
const M_PRIM_TO_MSUN = 1.14;
const M_SUN_TO_EARTH = 332946.0 * M_PRIM_TO_MSUN; // 379,558 M_E per M_prim
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
// Inverted pile-up rock enrichment: the magnetic slots gather FERROMAGNETIC rock
// preferentially, so the pile's rock fraction exceeds the bulk f_rock by this
// factor (capped at 0.95). Calibrated so TRAPPIST's inner rock chain (b,c,d) bulks
// up to the observed ~1.3 M⊕ while the icy outer chain stays ice-dominated.
const INV_ROCK_ENRICH = 2.3;
// Pile-up rock SATURATION: each slot fills to at most this fraction of the rock
// budget before isolating (the magnetic slot + pressure pile-up concentrate solids
// efficiently). The budget is consumed inner-first, so the inner slots fill flat and
// the budget runs dry mid-chain — the flat b,c then the d-cliff exhaustion gap.
const ROCK_SLOT_CAP = 0.44;
// Inverted ICE consumption: ice is eaten by the marching factory inner-icy-first, with a
// per-slot appetite GROWING as the feeding zone (∝ r^ICE_FEED_EXP). So the inner icy slots
// consume the budget (e<f<g) and the OUTERMOST gets only the dregs — the ice cliff (h).
// Calibrated against TRAPPIST's icy chain (e,f,g rise, h drop). Replaces the old cold-trap
// crest weighting, which had no depletion so the outer slot hoarded the ice.
const ICE_SLOT_CAP = 0.16;
const ICE_FEED_EXP = 1.4;
// Davis-dam nebula density: D = (budget − core) / NEBULA_SOL, the leftover disc mass
// that piles up outside the dam, resisting the combined stellar wind. f_disc-INDEPENDENT
// (it's the budget minus the stars, not the captured fraction). M_SUN_EARTH is the
// CURRENT solar mass in M⊕ (the core/star mass unit); NEBULA_SOL = Sol's primordial
// budget (M_SUN_TO_EARTH) minus the Sun (M_SUN_EARTH) ⇒ D(Sol)=1 → R_disc=30 AU.
const M_SUN_EARTH = 332946.0; // current solar mass in M⊕ (the core/star mass unit)
// Binary-core instability annulus (Holman-Wiegert 1999): around a binary core of
// separation a_bin, the circumprimary stable region ends near 0.3·a_bin and the
// circumbinary stable region begins near 2.4·a_bin (for near-equal masses, low
// eccentricity); products forming between are dynamically cleared.
const BINARY_HW_INNER = 0.3;
const BINARY_HW_OUTER = 2.4;
// Stellar-wind reference for the envelope/vapor wind-balance: wind_term ∝
// (spin/WIND_SPIN_REF)·(WIND_R_REF/r)². Shared by the H/He envelope (hydrogen_capture)
// and the ice cold-trap so the SAME wind drives both.
const WIND_R_REF = 0.5; // AU
const WIND_SPIN_REF = 30.0;
// Ice cold-trap crest: vapor sublimated at the snow line is pushed outward by the
// SAME wind that strips the H/He envelope, but water (18 amu) is 18× heavier than the
// wind's protons, so it is carried √(1/18) as far. The crest is the WATER wind-balance
// radius R_water = WIND_R_REF·√(spin/WIND_SPIN_REF)·√(m_proton/m_H₂O); at the inherited-
// disc spin 4–6 this lands on TRAPPIST g (~0.047 AU) with no free knob. Ice RISES to
// R_water (∝ (r/R_water)^ICE_RISE) then FALLS beyond it (∝ (R_water/r)^ICE_FALL).
const MOL_MASS_WIND = 1.0; // stellar-wind protons (amu)
const MOL_MASS_WATER = 18.0; // H₂O (amu)
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
// GAS_DIVIDE_FRAC: the rocky→gassy divide as a fraction of the Davis Dam — the
// radius where the wind-competition gas threshold equals THRESHOLD_GAS. The
// stellar wind competes for the H/He (ram pressure ∝1/r²), so the gravity
// needed to win gas is M_crit(r) = THRESHOLD_GAS·(GAS_DIVIDE_FRAC·R_disc/r)²:
// fierce close in (rocky planets), feeble far out (gas giants). Sol's divide
// ≈ 3 AU = 0.10·30 AU (between Mars/asteroids and Jupiter).
const GAS_DIVIDE_FRAC = 0.10;
// THRESHOLD_GAS: the giant-class MASS boundary used by the classifier
// (rock/ice/gas giant). The runaway gas-accretion GATE is no longer this fixed
// value — it is derived per system as runaway_core_mass() (Ikoma τ_KH = τ_disc),
// which evaluates to ~2.9 M⊕ for Sol (so Sol is unchanged) but rises for
// gas-poor discs and falls for gas-rich ones.
const THRESHOLD_GAS = 3.0;
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
const GAS_CAPTURE_EFF = 0.0999; // legacy (old global runaway fraction; unused by the window model)
const GAS_WINDOW_K = 0.691; // legacy (old exp window; unused by hydrogen_capture)
// WINDOW-GORGING capture rate [M⊕/Myr]: a runaway giant accretes gas at this rate over its gas-rich
// window (τ − t_form). Calibrated on Sol's Jupiter (H/He ≈ 304 M⊕, window ≈ 1.9 Myr ⇒ ~177).
const GAS_CAPTURE_RATE = 170.0;
// DAM-WIND suppression strength = the wind's partial angular-momentum-stripping efficiency.
// wind_suppression = 1/(1 + GAS_WIND_K·W/r²), W = M⋆^3.54 (= COMP_FLUX, the dam-setting wind).
// Suppresses inner capture most (Jupiter zapped, outer/far giants spared since 1/r² beats W).
const GAS_WIND_K = 2.0;
// DAM-TRICKLE gas clock: τ[Myr] = (R_disc³ / M) · GAS_TRICKLE_COEF. The Davis-Dam H/He pileup
// drains INWARD onto the star by GRAVITY-driven drift, v ∝ g ∝ M/r², so the drain time
// τ = ∫dr/v ∝ R_disc³/M — gravity ∝ 1/r² makes a far dam drain CUBICALLY slower. COEF anchors
// Sol (R_disc≈30 AU) to the ~3.5 Myr disc lifetime ⇒ COEF = 3.5/30³ ≈ 1.296e-4. Gas/ice-giant
// cliff falls between Saturn (3.1) and Uranus (6.5 Myr); HR 8799 (R_disc≈67) → τ≈30 Myr so its
// wide giants stay pre-cliff; Alpha Cen (R_disc≈9000 AU) → effectively never drains (Proxima eons).
const GAS_TRICKLE_COEF = 1.296e-4;
// DAVIS-DAM H/He PILEUP (the ice-giant, post-cliff channel): M_pileup = GAS_PILEUP_EFF·M_gas·
// (r/R_disc)^GAS_PILEUP_Q, peaked at the dam, tapering inward; Alfvén-ungated (diamagnetic H/He).
const GAS_PILEUP_EFF = 5.9e-4; // Sol-anchored on Neptune's envelope (~2.35 M⊕ at R_disc)
const GAS_PILEUP_Q = 0.22; // inward GROWTH of the pileup (∝(R_disc/r)^q): Uranus ≳ Neptune
const TAU_KH0_MYR = 100.0;
const PEBBLE_CAPTURE_EFFICIENCY = 0.40;
const ETA_ROCK = 0.78;
const SNOW_PILEUP_FACTOR = 0.5;
const SNOW_PILEUP_WIDTH_FRAC = 0.15;
const T_DISC_DISPERSAL_MYR = 5.0;
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
const SOL_M_PRIMORDIAL = 1.0; // Sol IS the unit (1 = 1.14 current M_sun)
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
const CONDUCT_ROCK = 1.0; // molten-iron rock — reference, per M⊕
const CONDUCT_METALLIC_H = 1.0; // metallic hydrogen, per M⊕   [TO CALIBRATE]
const CONDUCT_PLASMA = 1.0e-4; // ionized stellar plasma, per M⊕ (feeble per mass)
const RHO_METALLIC_H = 0.7; // g/cc — metallic-H transition density (P≈1 Mbar)
const IRON_MELT_MASS_E = 0.3; // M⊕ — iron core freezes below this (Mars goes dark)
const DYNAMO_SAT_EXP = 0.16; // B ∝ (conductive mass)^this — saturated dynamo (R&C ~1/6)
const EARTH_G_PER_ME = 5.972e27; // grams per Earth mass
const EARTH_CM_PER_RE = 6.371e8; // cm per Earth radius
const G_CGS = 6.674e-8; // gravitational constant, cm³ g⁻¹ s⁻²
const AU_CM = 1.495978707e13; // cm per AU
const M_SUN_G = 1.98892e33; // grams per solar mass
// Magnetosphere PROJECTION gate. The field projects beyond the body (an exterior
// Alfvén Dam exists) only when its surface magnetic pressure B²/2μ₀ beats the
// external FORMATION pressure (the dense disc/nebula it's embedded in — NOT the
// thin present-day wind). Below that the magnetopause is buried inside R_body:
// the BURIED regime, where all matter just infalls to one body (Mercury, Venus,
// pre-impact Earth). [TO CALIBRATE against the solar-system bodies + Theia.]
const DYNAMO_B_EARTH = 0.5; // G — Earth iron-dynamo surface field (anchor)
const DYNAMO_SPIN_ONSET = 0.02; // λ — dynamo onset; below this rotation B dies (Rossby)
const P_EXT_FORMATION = 6.0e-4; // Pa — formation disc/nebula pressure the field must clear
const MU0_SI = 1.2566e-6; // vacuum permeability (SI)
// Davis-Dam WIND = luminosity flux + small magnetic-only baseline (literature-grounded:
// the wind is magnetically amplified but SATURATES and is flux/luminosity-ceilinged —
// Shoda+2020 Alfvén-wave magnetic-rotator winds; Vidotto+2013 M-dwarf winds stay weak
// despite strong fields). So the field's strength feeds R_A (magnetopause), NOT the wind —
// a strong-field M-dwarf still has a feeble wind ⇒ small R_disc + large R_A ⇒ inverted.
const WIND_MAG_FRAC = 1.0e-3; // magnetic-only wind baseline, relative to Sol's flux
const WIND_OMEGA_EXP = 0.57; // R_disc wind ram-pressure rotation dependence (Shoda+2020 P_w∝Ω^0.57)
// Fully-convective α² dynamo boost: below ~0.35 M⊙ a low-mass star loses its tachocline and
// runs a fully-convective dynamo saturating near kG (TRAPPIST-1 ~600 G vs Sun ~1 G). Applies
// to H-dominated convective bodies (M-dwarfs / BDs / giants), NOT rocky iron-core dynamos.
const DYNAMO_CONV_BOOST = 50.0; // field multiplier for fully-convective bodies [TO CALIBRATE]
const FULLY_CONV_MASS_E = 116531.0; // M⊕ ≈ 0.35 M⊙ — fully-convective threshold
const EARTH_RE_IN_AU = 4.2635e-5; // Earth radius in AU (for R_body vs R_A comparison)
// CASCADE_RATIO derivation: each slot sits at the half-amplitude-at-45°
// projection (1/(2√2)) of the previous slot's Gaussian HWHM (√(2 ln 2)).
// Equivalent forms: 1 - √(ln 2)/2 = 1 - 1/(2√2)·√(2 ln 2). The factor
// 1/(2√2) is a pure geometric constant — the half-diagonal-projection
// in any orthogonal decomposition, appearing in 45° polarization,
// Butterworth filter damping, and inscribed-circle-to-diagonal ratios.
const CASCADE_RATIO = 1.0 - Math.sqrt(Math.log(2.0)) / 2.0; // ~0.5837
// Assignment scoring
const OVERPRED_PENALTY = 0.2;
const UNDERPRED_PENALTY = 5.0; // slot prediction far BELOW observed:
// physical impossibility — planet must
// have migrated from an outer slot.
const UNDERPRED_RATIO = 5.0; // observed/cascade_pred ratio threshold
const GAS_OBS_THRESHOLD = 5.0;
const GAS_INNER_PENALTY = 0.15;
const GAS_DECISIVE_DIST = 0.05;
// Stripping / composition
const IRON_FRACTION = 0.30;
const T_STRIP_K = 2000.0; // silicate vaporization threshold (K)
const L_T_TAURI_FACTOR = 10.0; // pre-MS luminosity boost over MS
const ALBEDO = 0.1;
const SIGMA_SB = 5.670374419e-8;
const L_SUN_W = 3.828e26;
const AU_M = 1.495978707e11;
const STRIP_OBS_MAX = 15.0; // M_E — large planets retain envelope
// via escape velocity inside strip zone
// Late-delivery threshold: half of (Borealis impactor mass / Mars mass)
// = 0.5 * (0.02 / 0.107) ≈ 0.0935 (9.35% fractional mass gain).
const LATE_DELIVERY_FRAC = 0.5 * (0.02 / 0.107);
// Mass class boundaries (Earth masses)
const M_STELLAR_BOUNDARY = 25400.0; // 0.08 M_sun, hydrogen burning
const DISC_TRUNCATION_FACTOR = 0.15; // Holman-Wiegert fallback only
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
