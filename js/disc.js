"use strict";
// Derived disc properties, computed from the system inputs + constants.
// Global-script style: depends on constants.ts being loaded first.
function m_star_earth(m_sun) {
    return m_sun * M_SUN_TO_EARTH;
}
// The Davis Dam is a stellar-wind ⇄ nebula ram-pressure balance (v5).
// Wind: Ṁ ∝ R²·F_X^0.77 (Wood et al. 2021); F_X = L_X/R² with L_X ∝ L_bol ∝
// M⁴ (activity) AND ∝ rotation (Cranmer & Saar 2011). Folding luminosity in:
// Ṁ ∝ R²·(M⁴/R²)^0.77 ⟹ wind strength ∝ M^3.54·Ω^0.77 (R∝M^0.9, v_esc). So
//   R_disc = 30.07 · √( M^3.54 · Ω^0.77 / D ) = 30.07·M^1.77·Ω^0.385·D^(−0.5).
// The M^1.77 (vs the old M^0.925 that dropped the L term) makes the M-dwarf
// wind properly FEEBLE — the dam sits close-in at MODEST density, which is
// why M-dwarfs invert without an impossible nebula. D = spin^1.5.
// Sol-normalized (M=Ω=D=1 ⟹ 30.07 AU). A feeble (low-Ω, spun-down)
// wind and/or a dense (high-D) nebula both pull the dam inward — which
// is why M-dwarfs are commonly INVERTED (Davis Dam advances past R_A).
// `spin` carries the nebula density (D = spin^1.5, the outer/density
// dial); `omega` is the stellar rotation Ω (the wind driver), defaulting
// to spin (the old jaw-lock) when not supplied.
// Inverted-dam plunge (v5.2). drop = R_disc/R_A from a wind ⇄ disc-weight
// balance: once inverted, the disc's OWN weight (∝ f_disc) supplies the inward
// pressure beyond the bare inversion, and R_disc ∝ P^(−1/2) ⟹
//   drop(f_disc) = (1 + DISC_PLUNGE_K·f_disc)^(−1/2),
// → 1 as f_disc → 0 (no disc weight ⇒ dam rests right at R_A). Calibrated so
// TRAPPIST (f_disc≈0.0152, R_A≈first-KBO 0.047) plunges to its innermost
// planet (b, 0.011): drop≈0.234. This is what lets the STORED nebula density
// stay modest — the deep drop to the innermost slot is f_disc's doing, not an
// impossible nebula. See memory: inverted-regime-model.
const DISC_PLUNGE_K = 1135.0;
function inverted_dam_drop(f_disc) {
    return Math.pow(1 + DISC_PLUNGE_K * Math.max(0, f_disc), -0.5);
}
// The MODEST nebula density that JUST inverts the system: the D where the
// wind-balance edge R_density(D) reaches the magnetosphere R_A. With
// R_density = 30.07·M^1.77·Ω^0.385·D^(−1/2) and R_A = 0.20·M·Ω^(4/7):
//   D_inv = (30.07·M^1.77·Ω^0.385 / R_A)².
// This is the value to STORE/REPORT for an inverted system — "enough to invert
// and no more"; f_disc carries the dam the rest of the way down.
function inversion_threshold_density(M_star, omega) {
    const R_A = alfven_radius(M_star, omega);
    const base = SOL_R_DISC * Math.pow(M_star / SOL_M_PRIMORDIAL, 1.77) * Math.pow(omega, 0.385);
    return Math.pow(base / R_A, 2.0);
}
function disc_radius(M_star, spin, omega, f_disc) {
    const Omega = (omega === undefined) ? spin : omega;
    // FRAGMENTING CORE (β = E_rot/|E_grav| = BETA_SOL·λ² ≥ the bar-mode limit): the core splits
    // into co-primaries (the CLOSE fission product sits at a_bin = close_binary_separation(λ),
    // e.g. Alpha Cen B at ~23.5 AU), and the excess angular momentum that tore it pushes the
    // CENTRIFUGAL Davis Dam out to R_c = R_wind(M)·λ² (Terebey-Shu-Cassen). The wind/pressure law
    // below is suppressed by the large disc mass (D^−½) and badly under-predicts that far dam —
    // the dam reaches ~9000 AU, not ~300 (wind). The WIDE stellar companion observed out there
    // (Proxima, GJ 667 C) is NOT the fragment: it is a slot-0 ACCRETION product that formed on
    // this far dam, and its position is what pins the dam (the centrifugal λ-anchor — there is no
    // GI/direct-collapse channel for it). BETA_SOL is calibrated so the same λ fragments the core
    // AND sets the dam. Gated on COMP_FRAGMENTING (real co-primary present) so it fires only for
    // fragmenting BINARIES — not a high-spin moon disc (Saturn) or an artifact-spin single star.
    if (COMP_FRAGMENTING && core_fragments(Omega)) {
        // The OBSERVED wide stellar companion pins the centrifugal dam at its own position (R_c is
        // over-determined by where this slot-0 accretor landed); else fall back to R_c = R_wind·λ².
        return COMP_WIDE_DAM > 0 ? COMP_WIDE_DAM : centrifugal_radius(M_star, Omega);
    }
    // UNIVERSAL DAVIS DAM (one law, all scales): the wind-balance radius where the OUTWARD
    // pressure equals the INWARD nebula density. Outward = combined stellar FLUX (Σ M_i^3.54,
    // parked) + a coronal magnetic-wind baseline (fusing stars only); inward = the nebula
    // density D = (M_d / M_d_sol) / spin⁴ (Terebey-Shu-Cassen centrifugal spread, capped at
    // breakup). No inverted-plunge kludge: a feeble-wind body simply gets a small R_disc and
    // the magnetosphere (R_A) overtakes it ⇒ inverted falls out. Sol (M_d_sol, flux 1, spin 1)
    // → 30 AU. Needs the parked dam-inputs (COMP_NEBULA, COMP_FLUX); else legacy fallback.
    if (COMP_NEBULA > 0 && COMP_FLUX >= 0) {
        const M_d_sol = M_SUN_TO_EARTH - M_SUN_EARTH;
        const spin_eff = Math.min(Omega, breakup_spin(M_star));
        const D = (COMP_NEBULA / M_d_sol) / Math.pow(Math.max(spin_eff, 1e-6), 4);
        const mag_base = (M_star >= IGNITION_MASS) ? WIND_MAG_FRAC : 0.0; // coronal wind: fusing stars only
        const W = (COMP_FLUX + mag_base) / (1.0 + WIND_MAG_FRAC); // Sol-normed outward push
        return SOL_R_DISC * Math.sqrt(W * Math.pow(Omega, WIND_OMEGA_EXP)) * Math.pow(D, -0.5);
    }
    // LEGACY fallback ({M,D,spin} catalog, no parked nebula): the old density-power form.
    const D = Math.pow(spin, 1.5);
    const R_density = SOL_R_DISC * Math.pow(M_star / SOL_M_PRIMORDIAL, 1.77)
        * Math.pow(Omega, 0.385) * Math.pow(D, -0.5);
    if (f_disc !== undefined && f_disc > 0) {
        const R_A = alfven_radius(M_star, Omega);
        if (R_A >= R_density)
            return R_A * inverted_dam_drop(f_disc);
    }
    return R_density;
}
// EQUILIBRIUM GAS PRESSURE P — the MASTER variable of the gas disc. It is the disc gas pressure
// (∝ Σ_gas = f_disc·M/(π R_disc²)) that balances the stellar-wind ram at the inner edge. ONE P does
// THREE things at once: (1) sets the inner edge R_inner = √(GAS_EDGE_K·W/P) — lower P ⇒ edge further
// out; (2) IS the gas density a planet's Hill zone captures — higher P ⇒ more gas; (3) sets the
// stellar H-consumption rate Ṁ_* ∝ W·P (the wind strips H's angular momentum so it falls in —
// higher P, faster eating). As the star eats the H, P falls, marching R_inner out, thinning the
// planet supply, and slowing its own consumption. The radius is just a readout of P.
function equilibrium_pressure(M_star, R_disc, f_disc) {
    const fd = (f_disc > 0) ? f_disc : 1e-6;
    return fd * m_star_earth(M_star) / (Math.PI * Math.max(R_disc * R_disc, 1e-12)); // ∝ Σ_gas
}
// The dam-setting wind flux W (≡ COMP_FLUX ∝ M⋆^3.54; falls back to M⋆^3.54 off the budget path).
function wind_flux(M_star) {
    return (COMP_FLUX > 0) ? COMP_FLUX : Math.pow(Math.max(M_star, 1e-9), 3.54);
}
// (1) GAS-DISC INNER EDGE = the wind-ram ⇄ gas-pressure equilibrium: W/r² = P ⇒ R_inner = √(W/P)
// (scaled by GAS_EDGE_K so Sol ⇒ ~3 AU). Inside it the wind strips the gas to the star (rocky);
// outside, the gas holds and envelopes form. Bounded to [0, R_disc]; marches outward as P decays.
function gas_inner_edge(M_star, R_disc, f_disc) {
    const P = equilibrium_pressure(M_star, R_disc, f_disc);
    const R_inner = Math.sqrt(GAS_EDGE_K * wind_flux(M_star) / Math.max(P, 1e-30));
    return Math.min(R_inner, R_disc);
}
// CONSUMPTION FRONT — the magnetic-braking inner edge (see memory ram-pressure-is-magnetic-braking).
// The magnetized wind torques the disc gas (lever arm R_A), strips its angular momentum, and consumes
// it onto the star INSIDE-OUT; the SAME torque spins the star down. We integrate the coupled front
// position R_inner(t) and stellar spin Ω(t) forward and return tedge(r) = the time the front reaches
// radius r (a planet captures gas/pebbles only until then). With the MMSN slope p=1.5 the per-radius
// march factor is flat, so at fixed Ω the front moves at constant speed; the spin-down (Ω falls → R_A
// shrinks → torque drops) is what DECELERATES it — fast early (clears slot 4 → rocky), slow late
// (Jupiter sits in gas for Myr). Returns { tedge, r0 } with r0 = the initial front position (=R_A).
function consumption_front(M_star, omega, f_disc) {
    const fd = (f_disc > 0) ? f_disc : F_DISC_REF;
    const disc_scale = (fd / F_DISC_REF) * M_star; // MMSN Σ normalization (more gas ⇒ slower front)
    const r0 = alfven_radius(M_star, omega); // the front starts at the magnetosphere edge
    let R_inner = r0;
    let Om = omega;
    // DERIVED wind torque J̇ = Ṁ_wind·Ω·r_A,wind² and spin-down dΩ/dt = −J̇/I (I = k·M·R*²). All Sol-
    // relative: Ṁ_wind ∝ M, the moment of inertia ∝ M·R*². As the star brakes, B drops ⇒ r_A,wind shrinks
    // ⇒ torque falls ⇒ the front decelerates — the deceleration is now the real magnetic-braking law,
    // not a free SPIN coefficient. FRONT_SPIN_COEF/FRONT_MARCH_COEF carry only the Sol unit anchor.
    const Mdot_w_rel = Math.max(M_star, 1e-6); // Ṁ_wind ∝ Ṁ_acc ∝ M (accretion–outflow)
    const R_rel = body_radius_earth(M_star * M_SUN_TO_EARTH) / body_radius_earth(M_SUN_TO_EARTH);
    const I_rel = Math.max(M_star * R_rel * R_rel, 1e-9); // stellar moment of inertia ∝ M·R*² (k folded)
    const traj = [[0, R_inner]];
    const dt = 0.005; // Myr (fine — the Ω⁵ torque collapse is abrupt)
    const T_MAX = 60.0;
    for (let t = dt; t <= T_MAX; t += dt) {
        const rA = wind_alfven_radius_rel(M_star, Om); // WIND Alfvén radius (lever arm), Ω-dependent via B
        const Jdot = Mdot_w_rel * Om * rA * rA; // J̇ = Ṁ_wind·Ω·r_A²  (the wind torque)
        R_inner += FRONT_MARCH_COEF * Jdot / Math.max(disc_scale, 1e-6) * dt; // consumption-driven march
        Om = Math.max(Om - FRONT_SPIN_COEF * Jdot / I_rel * dt, 1e-6); // dΩ/dt = −J̇/I (DERIVED spin-down)
        traj.push([t, R_inner]);
        if (R_inner > 200)
            break;
    }
    const tedge = (r) => {
        if (r <= traj[0][1])
            return 0; // already inside the front (in the magnetosphere)
        for (let i = 1; i < traj.length; i++) {
            if (traj[i][1] >= r) {
                const t0 = traj[i - 1][0], r_0 = traj[i - 1][1], t1 = traj[i][0], r_1 = traj[i][1];
                return t0 + (t1 - t0) * (r - r_0) / Math.max(r_1 - r_0, 1e-12);
            }
        }
        return Infinity; // front stalled before reaching r ⇒ stays in gas
    };
    return { tedge, r0 };
}
// (3) STELLAR HYDROGEN-CONSUMPTION RATE Ṁ_* ∝ W·P — the wind (W) strips angular momentum from the
// gas (at pressure P) so it accretes; higher equilibrium pressure ⇒ faster eating. The H reservoir
// drains at this rate, which is what makes P decay (and R_inner march out, the disc clear inside-out).
function stellar_hydrogen_rate(M_star, R_disc, f_disc) {
    return STELLAR_EAT_COEF * wind_flux(M_star) * equilibrium_pressure(M_star, R_disc, f_disc);
}
// Invert the wind-balance R_disc: the geometry/density dial `spin`
// (D = spin^1.5) that puts the Davis Dam at R_target. Replaces the old
// (30.07·M/R)^2 anchor inversions everywhere. base = 30.07·(M/M_sol)^0.925.
//  - jaw-lock (omega omitted, Ω=spin): R = base·spin^(−0.365) ⇒ spin = (base/R)^(1/0.365)
//  - decoupled (omega given):          R = base·Ω^0.385·spin^(−0.75) ⇒ spin = (base·Ω^0.385/R)^(4/3)
function spin_for_disc_radius(M_star, R_target, omega) {
    const base = SOL_R_DISC * Math.pow(M_star / SOL_M_PRIMORDIAL, 1.77);
    if (omega === undefined)
        return Math.pow(base / R_target, 1 / 0.365);
    return Math.pow(base * Math.pow(omega, 0.385) / R_target, 4 / 3);
}
// Inverse Alfvén Dam: the rotation Ω that puts the magnetosphere at R_target.
// R_A = 0.20·(M/M_sol)·Ω^(4/7)  ⇒  Ω = (R_target / (0.20·M/M_sol))^(7/4).
function omega_for_alfven_radius(M_star, R_target) {
    return Math.pow(R_target / (SOL_R_A_FORMATION * (M_star / SOL_M_PRIMORDIAL)), 7.0 / 4.0);
}
// INSOLATION snow line — distinct from the disc-temperature `snow_line` used
// for normal-regime allocation. This is where the STELLAR-INSOLATION
// equilibrium temperature falls to water condensation (~170 K): inside it,
// water stays a GAS from insolation alone and is lost from the (atmosphere-
// less) forming body → rocky; outside it, ice is retained. Used to give the
// inverted-regime KBO aggregates a composition mix. T_eq = 278 K·(L/L_sun)^¼·
// (1−A)^¼ / √(r/AU); solve T_eq = 170 K ⇒ r = [278·L^¼·(1−A)^¼ / 170]².
// L defaults to the main-sequence M–L estimate; pass measured L when known.
function insolation_snow_line(M_star, L_obs) {
    const L = (L_obs && L_obs > 0) ? L_obs
        : M_star > 0.43 ? Math.pow(M_star, 4)
            : 0.23 * Math.pow(M_star, 2.3);
    const T_ICE = 170.0; // K, water condensation
    const T_EQ_1AU = 278.0; // K, equilibrium temp at 1 AU, L=L_sun, A=0
    const s = T_EQ_1AU * Math.pow(L, 0.25) * Math.pow(1 - ALBEDO, 0.25) / T_ICE;
    return s * s;
}
// VISCOUS snow line (inverted regime). The dense inversion pile-up is
// VISCOUSLY heated by its own rapid accretion, keeping water GASEOUS out to a
// radius far beyond the insolation snow line — so the inner factory vintages
// are ROCK-only (water excluded). T_visc^4 ∝ Ṁ·M★/r³ with Ṁ ∝ f_disc·M★ (the
// pile accretes fast) ⟹ the 170 K line sits at r_visc ∝ (f_disc·M★²)^(1/3).
// As the rocky budget is consumed the heating attenuates; beyond r_visc the
// disc cools and ICE condenses. Calibrated (VISC_COEFF) so TRAPPIST's rock
// phase is exhausted by ~vintage 3 (b,c,d rock; e,f ice). Distinct from
// `insolation_snow_line` (stellar irradiation) and `snow_line` (disc temp).
function viscous_snow_line(M_star, f_disc) {
    return VISC_COEFF * Math.pow(Math.max(f_disc, 0) * Math.pow(M_star / SOL_M_PRIMORDIAL, 2.0), 1.0 / 3.0);
}
// Nebula density D (Sol = 1): the physical free variable of the VICE's
// outer jaw. The formation cloud's ambient pressure establishes the
// Davis Dam — R_disc = 30.07 · (M/1.14) · D^(-1/3) — and Sol's D = 1
// corresponds to n(H2) ≈ 1e6 cm^-3 (a clustered prestellar core: the
// density whose collapse centrifugal radius puts the dam at Neptune's
// exact 30.07 AU). Under the default JAW-LOCK (inner and outer jaws
// correlated through birth-site density) the recorded spin is
// Ω = D^(2/3) — Sol has spin 1, density 1 — and the anchor-family
// scan that solves R_disc from the outermost planet IS the D
// bisection expressed through the lock. In the inverted regime D_eff
// exceeds any static cloud (TRAPPIST ~5e4): the outer jaw there
// includes more than birth pressure — the decoupled-jaw signature.
// Habitable zone, ASYMMETRIC empirical bounds scaled by sqrt(L):
//   inner 0.72 AU — the recent-Venus limit (Kopparapu et al. 2013):
//     a delivered Venus is hot but habitable; the delivery receipt,
//     not the thermostat, is the framework's discriminator.
//   outer 1.37 AU — the first-CO2-condensation limit (Kasting et
//     al. 1993): beyond it CO2 clouds defeat the greenhouse. Mars
//     (1.52) is the empirical cold case — too cold even Earth-sized
//     with oceans and atmosphere — so the edge sits INSIDE its orbit.
// L defaults to the main-sequence mass-luminosity estimate (M^4
// above 0.43 M_sun; 0.23 M^2.3 for M dwarfs); pass the system's
// measured luminosity when known (preset inputs.L) — real stars
// scatter around the M-L law (ACen B: true 0.50 vs estimate 0.41).
function habitable_zone(M_star, L_obs) {
    const L = (L_obs && L_obs > 0) ? L_obs
        : M_star > 0.43 ? Math.pow(M_star, 4)
            : 0.23 * Math.pow(M_star, 2.3);
    const s = Math.sqrt(L);
    return [0.72 * s, 1.37 * s];
}
function nebula_density_from_spin(spin) {
    return Math.pow(spin, 1.5);
}
function spin_from_nebula_density(D) {
    return Math.pow(D, 2.0 / 3.0);
}
function disc_radius_from_density(M_star, D) {
    return SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) * Math.pow(D, -1.0 / 3.0);
}
// Centrifugal disc radius R_c = j²/GM (∝ spin²/M) — the disc profile scale. For a sub-cascade
// (moon disc) the central mass is tiny, so the bare 1/M scaling explodes (Saturn → ~10⁷ AU);
// the disc physically cannot exceed the planet's Hill sphere, so it is capped at the parked
// Hill radius (COMP_R_HILL = Infinity for a top-level star ⇒ no cap).
function disc_centrifugal_radius(M_star, spin) {
    return Math.min(SOL_R_C * spin * spin / Math.max(M_star, 1e-9), COMP_R_HILL);
}
// Formation-era stellar breakup spin (Sol-primordial units, Ω = 1 ↔
// P = 1.55 d). On the Hayashi track R_HT ≈ 2.3 R☉·M^(2/3), the breakup
// period is P_min = 2π√(R³/GM) ≈ 0.41·√M d, so Ω_break ≈ 3.8/√M.
// The inner jaw (true stellar rotation, hence the physical Alfvén Dam)
// cannot exceed this; effective dials beyond it are the outer jaw's
// territory (VICE mode decouples them).
function breakup_spin(M_star) {
    return 3.8 / Math.sqrt(M_star * M_PRIM_TO_MSUN);
}
function alfven_radius(M_star, spin) {
    // UNIVERSAL ALFVÉN DAM (one law, all scales): the magnetic field's reach — NOT a pressure
    // balance (a magnetosphere can't be compressed by external pressure; that's the Davis Dam).
    // R_A = R_dynamo_core · (dynamo field)^⅓, the field from the conductor ladder (plasma /
    // metallic-H / iron, set by composition) organized by spin. The length scale is the
    // CONDUCTING DYNAMO CORE, not the puffy optical radius: a gas giant's molecular-H₂ envelope
    // doesn't conduct, so the field's reach is set by the deep dynamo core — far smaller than
    // body_radius. (Using body_radius left Jupiter's R_A outside its own moons.) Sol (solar
    // comp, spin 1) → 0.2 AU. Composition comes from the parked context (COMP_Z/F_ROCK).
    const M_E = M_star * M_SUN_TO_EARTH;
    const rock = M_E * COMP_Z * COMP_F_ROCK;
    const H = M_E * (1.0 - COMP_Z);
    const B_REL_SOL = Math.pow(M_SUN_TO_EARTH / M_SUN_EARTH, DYNAMO_SAT_EXP);
    // R_A is derived purely from composition (the calibrated conductor ladder:
    // rock / metallic-H / plasma) organized by spin — there is no ad-hoc
    // fully-convective multiplier. The old DYNAMO_CONV_BOOST (a 50×, [TO CALIBRATE]
    // placeholder gated only by an upper mass bound) was removed: it inflated R_A
    // ~3.7× and leaked the stellar boost onto every sub-0.35-M☉ body, gas giants
    // included.
    const B_RA = dynamo_field_rel(M_E, rock, H, spin) / B_REL_SOL;
    return SOL_R_A_FORMATION
        * (dynamo_core_radius(M_E, rock) / body_radius_earth(M_SUN_TO_EARTH))
        * Math.pow(Math.max(B_RA, 1e-9), 1.0 / 3.0);
}
// Relative dynamo field strength B/B☉ (the Alfvén-wave drive), from the conductor ladder organized
// by spin — Sol = 1. This is the damping knob for the Suhl parametric subharmonic (wave doubling):
// a strong field (Sol/HR 8799 ≈ 1) suppresses the parametric decay; a weak field (≪ 1, low-spin
// stars) lets a strongly-driven cascade period-double. Composition comes from the parked context.
function dynamo_field_strength(M_star, spin) {
    const M_E = M_star * M_SUN_TO_EARTH;
    const rock = M_E * COMP_Z * COMP_F_ROCK;
    const H = M_E * (1.0 - COMP_Z);
    const B_REL_SOL = Math.pow(M_SUN_TO_EARTH / M_SUN_EARTH, DYNAMO_SAT_EXP);
    return dynamo_field_rel(M_E, rock, H, spin) / B_REL_SOL;
}
// MAGNETIC LEVER ARM λ of the STELLAR WIND (Blandford–Payne / Réville) — a property of the STAR.
// The wind's Alfvén radius r_A = R*·η*^¼ from the wind magnetization η* = B*²R*²/(Ṁ_wind·v∞); the
// lever arm λ = (r_A/r₀)² ∝ η*^½. We work Sol-relative (Sol → λ = LEVER_ARM_SOL): B from the dynamo,
// R* from the mass–radius relation, v∞ ∝ v_esc = √(M/R*), Ṁ_wind ∝ the accretion rate (accretion–
// outflow connection) ∝ M. The SAME λ governs the spin-down torque AND the gas density slope.
function wind_lever_arm(M_star, spin) {
    const M_E = M_star * M_SUN_TO_EARTH;
    const B_rel = dynamo_field_strength(M_star, spin); // B*/B☉  (Sol=1)
    const R_rel = body_radius_earth(M_E) / body_radius_earth(M_SUN_TO_EARTH); // R*/R☉  (Sol=1)
    const Mdot_rel = Math.max(M_star, 1e-6); // Ṁ_wind ∝ Ṁ_acc ∝ M  (Sol=1)
    const v_rel = Math.sqrt(Math.max(M_star, 1e-9) / Math.max(R_rel, 1e-9)); // v∞ ∝ v_esc=√(M/R*)  (Sol=1)
    const eta_rel = (B_rel * B_rel * R_rel * R_rel) / (Mdot_rel * v_rel); // η*/η*☉  (Sol=1)
    // λ − 1 ∝ η*^½ (since λ=(r_A/r₀)² ∝ η*^½), anchored so Sol (η_rel=1) gives LEVER_ARM_SOL.
    const lambda = 1.0 + (LEVER_ARM_SOL - 1.0) * Math.sqrt(Math.max(eta_rel, 0));
    return Math.min(Math.max(lambda, LEVER_ARM_MIN), LEVER_ARM_MAX);
}
// WIND ALFVÉN RADIUS, relative to Sol (Sol=1): r_A,wind = R*·η*^¼, η* = B*²R*²/(Ṁ_wind·v∞). This is
// the magnetic-braking lever arm — the SAME radius that sets the spin-down torque J̇ = Ṁ_wind·Ω·r_A²
// and the lever arm λ. Ω-dependent through the dynamo field B*(Ω): as the star brakes, B drops, r_A
// shrinks, the torque falls, and the consumption front decelerates.
function wind_alfven_radius_rel(M_star, spin) {
    const M_E = M_star * M_SUN_TO_EARTH;
    const B_rel = dynamo_field_strength(M_star, spin);
    const R_rel = body_radius_earth(M_E) / body_radius_earth(M_SUN_TO_EARTH);
    const Mdot_rel = Math.max(M_star, 1e-6); // Ṁ_wind ∝ Ṁ_acc ∝ M
    const v_rel = Math.sqrt(Math.max(M_star, 1e-9) / Math.max(R_rel, 1e-9)); // v∞ ∝ v_esc
    const eta_rel = (B_rel * B_rel * R_rel * R_rel) / (Mdot_rel * v_rel);
    return R_rel * Math.pow(Math.max(eta_rel, 1e-12), 0.25);
}
// DERIVED gas surface-density slope n: Σ ∝ r^n, n = (2λ−3)/(2(λ−1)) (wind-driven disc, Tabone/Lesur).
// λ<3/2 ⇒ n<0 (gas denser INWARD — the infall concentration); λ>3/2 ⇒ n>0 (inner cavity). Replaces
// the constant GAS_INFALL_SLOPE: the capture density is weighted ∝ r^n with this DERIVED n.
function wind_density_slope(M_star, spin) {
    const lambda = wind_lever_arm(M_star, spin);
    const n = (2.0 * lambda - 3.0) / (2.0 * (lambda - 1.0));
    return Math.min(Math.max(n, -3.0), 1.0);
}
// Radius (R⊕) of the conducting DYNAMO CORE — the length scale of the Alfvén Dam.
// A star conducts throughout (plasma), so its core is the whole body. A sub-stellar
// body's field is generated in its deep conductive core (iron/rock seed + metallic-H
// floor), NOT its molecular-H₂ envelope — so the optical radius hugely overstates the
// field's reach. Earth-anchored terran mass–radius (R ∝ M^0.28) on the conductive seed.
function dynamo_core_radius(M_E, M_rock_E) {
    if (M_E >= M_STELLAR_BOUNDARY)
        return body_radius_earth(M_E); // stellar: plasma throughout
    return M_rock_E > 0 ? Math.pow(M_rock_E, 0.28) : 1e-3; // sub-stellar: deep conductive core
}
// === CONDUCTOR LADDER ===============================================
// Physical body radius (R⊕) spanning rock → gas-giant degeneracy plateau →
// star. Piecewise mass–radius (terran / neptunian / jovian-plateau / stellar),
// anchored at Earth (1 R⊕), Jupiter (~11 R⊕) and Sol (109 R⊕).
function body_radius_earth(M_E) {
    const ME_PER_MSUN = 332946.0;
    const M_ign = 0.08 * ME_PER_MSUN; // hydrogen-burning limit in M⊕
    if (M_E <= 2.0)
        return Math.pow(M_E, 0.28); // terran
    if (M_E <= 130.0)
        return Math.pow(2, 0.28) * Math.pow(M_E / 2, 0.55); // neptunian
    if (M_E <= M_ign) { // gas-giant plateau
        const R130 = Math.pow(2, 0.28) * Math.pow(65, 0.55);
        return R130 * Math.pow(M_E / 130, -0.02);
    }
    return 109.0 * Math.pow(M_E / ME_PER_MSUN, 0.8); // stellar main sequence
}
// Metallic-hydrogen conducting fraction (by mass) of the H envelope, from an
// n=1 polytrope (R≈const across the giant regime — the polytrope gives that).
// ρ(r)=ρ_c·sin(πr/R)/(πr/R), ρ_c=(π²/3)·ρ̄. Solve ρ(r_d)=RHO_METALLIC_H for the
// dynamo radius, return the enclosed mass fraction. 0 if ρ_c never reaches ρ_t.
function metallic_h_fraction(M_E, R_E) {
    const M_g = M_E * EARTH_G_PER_ME;
    const R_cm = R_E * EARTH_CM_PER_RE;
    const rho_mean = M_g / ((4 / 3) * Math.PI * Math.pow(R_cm, 3)); // g/cc
    const rho_c = (Math.PI * Math.PI / 3) * rho_mean;
    if (rho_c <= RHO_METALLIC_H)
        return 0;
    const target = RHO_METALLIC_H / rho_c;
    // sinc(πx) decreasing 1→0 on x∈(0,1); bisect for x=r_d/R.
    let lo = 0, hi = 1, x = 0.5;
    for (let i = 0; i < 60; i++) {
        x = (lo + hi) / 2;
        const f = Math.sin(Math.PI * x) / (Math.PI * x);
        if (f > target)
            lo = x;
        else
            hi = x;
    }
    const xi = Math.PI * x; // enclosed-mass fraction (n=1)
    return Math.max(0, Math.min(1, (Math.sin(xi) - xi * Math.cos(xi)) / Math.PI));
}
// Total conductive mass (M⊕-equivalents), weighted by each conductor's relative
// dynamo potential. Stellar: whole mass is plasma. Sub-stellar: molten-iron rock
// (gated below IRON_MELT_MASS) + metallic hydrogen.
function conductive_mass_earth(M_E, M_rock_E, M_h_E) {
    const ME_PER_MSUN = 332946.0;
    if (M_E >= 0.08 * ME_PER_MSUN)
        return CONDUCT_PLASMA * M_E; // STELLAR: ionized plasma
    const melt = Math.max(0, Math.min(1, M_E / IRON_MELT_MASS_E)); // iron-melt ramp (Mars dark)
    const rock_cond = melt * M_rock_E;
    const mh = metallic_h_fraction(M_E, body_radius_earth(M_E)) * M_h_E;
    return CONDUCT_ROCK * rock_cond + CONDUCT_METALLIC_H * mh;
}
// Dynamo surface field relative to Sol (=1): saturated B ∝ (conductive mass)^exp,
// organized by spin. Returns 0 if there is no conducting fluid (unmagnetized).
function dynamo_field_rel(M_E, M_rock_E, M_h_E, spin) {
    const ME_PER_MSUN = 332946.0;
    const Mc = conductive_mass_earth(M_E, M_rock_E, M_h_E);
    if (Mc <= 0 || spin <= 0)
        return 0;
    const Mc_sol = CONDUCT_PLASMA * ME_PER_MSUN; // Sol: all plasma
    // Rotation organizes the field, but it SATURATES at a mass-dependent spin (Rossby): spin_sat ∝
    // M^DYNAMO_SAT_SPIN_EXP, capped at 1. Low-mass stars (long convective turnover) saturate at low
    // spin — a slow M-dwarf keeps a strong field (R_A ~0.02, inverted regime intact) — while a
    // solar-mass slow rotator (Kepler-90, spin 0.23 ≪ spin_sat≈1) is rotation-starved ⇒ feeble field
    // ⇒ R_A collapses inside its innermost planet. Below saturation B ∝ (spin/spin_sat)^4; zero spin
    // still ⇒ zero field. M≥M☉ has spin_sat=1, so Sol/Kepler-90/giants are unchanged.
    const spin_sat = Math.min(1.0, Math.pow(M_E / ME_PER_MSUN, DYNAMO_SAT_SPIN_EXP));
    const spinfac = Math.pow(Math.min(spin / spin_sat, 1.0), DYNAMO_SPIN_EXP);
    return Math.pow(Mc / Mc_sol, DYNAMO_SAT_EXP) * spinfac;
}
// Predictive surface field (Gauss): conductor ladder, organized by spin with a
// dynamo onset (Rossby) — sub-stellar fields die below DYNAMO_SPIN_ONSET; stars
// (plasma rung) run regardless via differential rotation. Earth-anchored (~0.5 G).
function dynamo_surface_field(M_E, M_rock_E, M_h_E, spin) {
    const ME_PER_MSUN = 332946.0;
    const Mc = conductive_mass_earth(M_E, M_rock_E, M_h_E);
    if (Mc <= 0 || spin <= 0)
        return 0;
    const Mc_earth = conductive_mass_earth(1.0, 0.32, 0.0); // Earth iron-core reference
    const stellar = M_E >= 0.08 * ME_PER_MSUN;
    const f_spin = stellar ? 1.0 : Math.min(1.0, Math.pow(spin / DYNAMO_SPIN_ONSET, 2.0));
    return DYNAMO_B_EARTH * Math.pow(Mc / Mc_earth, DYNAMO_SAT_EXP) * f_spin;
}
// Does the magnetosphere PROJECT beyond the body? Surface magnetic pressure
// B²/2μ₀ vs the external (formation-disc / ambient) pressure. ratio>1 ⇒ exterior
// Alfvén Dam exists; ratio<1 ⇒ BURIED (field confined inside R_body), all matter
// infalls to a single body. P_ext defaults to the formation disc pressure.
function magnetosphere_projection(M_E, M_rock_E, M_h_E, spin, P_ext = P_EXT_FORMATION) {
    const B = dynamo_surface_field(M_E, M_rock_E, M_h_E, spin); // Gauss
    const P_mag = Math.pow(B * 1e-4, 2) / (2 * MU0_SI); // Pa (B: G→T)
    return P_mag / P_ext;
}
function compression(M_star, spin, omega, f_disc) {
    const om = (omega === undefined) ? spin : omega;
    return alfven_radius(M_star, om) / disc_radius(M_star, spin, om, f_disc);
}
function snow_line(M_star, f_disc) {
    if (COMP_R_SNOW >= 0)
        return COMP_R_SNOW; // budget-path formation-L override
    const r_small = 1.6, r_large = 3.3, q = 2.2;
    const grain_term = r_small + (r_large - r_small) * Math.pow(GRAIN_OPACITY, q);
    const fd_ratio = f_disc / 0.01;
    const mass_factor = Math.pow(M_star / SOL_M_PRIMORDIAL, 2.0);
    const disc_factor = Math.pow(fd_ratio, 0.5);
    return grain_term * mass_factor * disc_factor;
}
/** Annulus Allocation Factor sigma_AAF [M_earth/AU]. */
function slope(M_star, f_disc) {
    // Normalize to the ANCHORED dam when the budget path supplies it (so f_disc is
    // the real disc fraction); else the spin=1 reference length (legacy convention).
    const r_disc = COMP_R_DISC > 0 ? COMP_R_DISC : disc_radius(M_star, 1.0);
    return m_star_earth(M_star) * COMP_Z * COMP_F_ROCK * f_disc * ETA_ROCK / r_disc;
}
// Formation time [Myr] — ONE clock for igniters and non-igniters (the old
// 0.10·r/AAF was wrong: it used ABSOLUTE r, so it read ~0 for a compact moon
// disc and ~31 Gyr for a body at 13,000 AU). The supply-limited clock is
//   t = M_core / Ṁ_local,   Ṁ_local = Ṁ · (R_disc / r),
// i.e. the local accretion rate falls ∝1/r (Σ·Ω·R_Hill²), so t scales UP with AU
// (outer planets slower → Sol's ice-giant ladder) while the gas-starvation term
// in Ṁ keeps a compact CPD at ~Myr (the Galilean fix). Normalising by R_disc
// (not absolute r) is what tames the 13,000 AU case. No ignition cap — an
// igniter keeps accreting H/He into its envelope after it lights; formation just
// runs until the gas disc disperses (the exp(−k·t) gas depletion does the rest).
// A t_form exceeding the disc lifetime means the body can't assemble by
// accretion → it is collapse-formed (a star), flagged downstream.
function formation_time(r, core, M_star, f_disc) {
    // ACCRETION TIME [Myr] — the supply-limited growth clock, Sol-anchored:
    // t = core·(r/R_disc)/(Z·Ṁ·FORM_CLOCK_COEFF) × the primordial SPIN. The ×spin is
    // the missing multiplier — it is ≡1 at Sol (λ=1), which is why ONLY Sol read the
    // correct Myr before; every other (non-unit-spin) system was off by its spin factor.
    // Physically the bare clock runs ∝ r, and ×spin upgrades it to the orbital-period
    // cascade (r ∝ spin² at a slot ⇒ t ∝ r^1.5 ∝ P_orbit): the fast-spinning inner disc
    // forms fastest, the slow outer disc slowest. Distinct from orbital_period() below
    // (the raw period in yr); this is the Myr accretion clock that gates gas capture.
    if (COMP_MDOT > 0 && core > 0 && COMP_R_DISC > 0 && r > 0) {
        return core * (r / COMP_R_DISC) / (COMP_Z * COMP_MDOT * FORM_CLOCK_COEFF) / COMP_SPIN;
    }
    return 0.10 * r / slope(M_star, f_disc); // fallback: non-budget legacy systems
}
// Keplerian orbital period [yr] at radius r: P = sqrt(r[AU]³ / M★[M☉]) (G, 2π absorbed
// by the AU/yr/M☉ unit system). Pure geometry — the disc's local rotation clock, the
// inner edge corotating with the star. Display/derived quantity; see formation_time
// for the Myr accretion clock that scales with this via the ×spin factor.
function orbital_period(r, M_star) {
    return (M_star > 0 && r > 0) ? Math.sqrt(r * r * r / M_star) : 0;
}
function intercept(M_star, spin) {
    return SOL_INTERCEPT * (M_star / SOL_M_PRIMORDIAL) * Math.pow(spin, 2.0 / 7.0);
}
function snow_line_pileup(r, M_star, f_disc) {
    const sl = slope(M_star, f_disc);
    const rs = snow_line(M_star, f_disc);
    const amp = sl * rs * SNOW_PILEUP_FACTOR;
    const sigma = SNOW_PILEUP_WIDTH_FRAC * rs;
    return amp * Math.exp(-((r - rs) ** 2) / (2 * sigma ** 2));
}
// GAS CONSUMPTION TIME [Myr]. The disc gas is CONSUMED, not "dispersed" on a timer — it drains
// onto the star (the dominant sink) at the accretion rate Ṁ. The gas-rich phase lasts exactly as
// long as the supply: T = M_gas_disc / Ṁ. When the star has drunk the disc, the gas is gone — no
// lifetime anchor, nothing "expires". (Replaces the old T_DISC_DISPERSAL_MYR·disc_mass^1.5 fiction.)
// M_star and the disc gas are in M⊙; Ṁ = COMP_MDOT (M⊙/yr), the stellar accretion set during the fit.
function gas_consumption_time(M_star, f_disc) {
    const disc_gas_msun = f_disc * M_star; // disc gas mass (M⊙)
    const Mdot = COMP_MDOT > 0 ? COMP_MDOT : 1e-8; // M⊙/yr — the star draining the disc
    return disc_gas_msun / Mdot / 1e6; // Myr
}
// Runaway gas-accretion GATE: the core mass at which the Kelvin-Helmholtz
// envelope-contraction timescale (Ikoma, Nakazawa & Emori 2000, τ_KH ∝ M^−2.5·κ)
// equals the gas-disc lifetime — below it the envelope can't run away before the
// gas is gone (ice giant / terrestrial), above it the planet goes runaway.
// τ_KH = TAU_KH0_MYR·(M/M⊕)^−2.5·κ; set τ_KH = τ_disc and solve for M:
//   M_crit = (TAU_KH0_MYR·κ / τ_disc)^(1/2.5).
// κ is taken as the grain-opacity knob (GRAIN_OPACITY ≈ 0.75 cm²/g in this fit).
// Sol → 2.93 M⊕ (≈ the legacy THRESHOLD_GAS=3); gas-poor discs read HIGHER
// (giants harder, e.g. TRAPPIST 4.4), gas-rich LOWER (Beta Pic 1.5).
function runaway_core_mass(M_star, f_disc) {
    const tau_disc = Math.max(gas_consumption_time(M_star, f_disc), 0.01);
    return Math.pow(TAU_KH0_MYR * GRAIN_OPACITY / tau_disc, 1.0 / 2.5);
}
// Wind-competition gas threshold: the core mass whose gravity wins H/He against
// the stellar wind that is competing for the same gas at radius r. The wind is
// the SAME wind that sets the Davis Dam (R_disc); its ram pressure dilutes as
// ∝1/r², equalling the disc pressure at the dam, so M_crit(r) =
// THRESHOLD_GAS·(GAS_DIVIDE_FRAC·R_disc/r)² — fierce close in (rocky planets),
// feeble far out (gas giants), the rocky→gassy divide at GAS_DIVIDE_FRAC·R_disc
// (Sol ≈3 AU). Combined with the τ_KH cooling floor via max(): a core must BOTH
// out-pull the local wind AND contract fast enough to run away. One wind, two
// jobs — it positions the dam and sets the gas threshold at every radius.
// Disc aspect ratio H/r (flared, irradiated): H/r ∝ r^¼ (c_s∝r^−¼, Ω∝r^−3/2 ⇒ H=c_s/Ω∝r^5/4).
function aspect_ratio(r) {
    return ASPECT_1AU * Math.pow(Math.max(r, 1e-6), 0.25);
}
// PEBBLE ISOLATION MASS [M⊕] — the runaway-gas TRIGGER (Lambrechts 2014 / Bitsch 2018): a core runs
// away on gas only once it reaches M_iso = M_ISO_COEF·(H/r / 0.05)³·(M*/M☉). Since H/r grows outward,
// M_iso RISES with distance — the inner giants reach it (→ runaway gas giants) while the ice giants
// never do (core < M_iso ⇒ they keep eating pebbles and hold only a thin hydrostatic envelope).
function pebble_isolation_mass(r, M_star) {
    const hr = aspect_ratio(r);
    return M_ISO_COEF * Math.pow(hr / 0.05, 3.0) * M_star;
}
function gas_threshold_mass(r, M_star, f_disc) {
    const R_disc = COMP_R_DISC > 0 ? COMP_R_DISC : disc_radius(M_star, 1.0);
    // Rocky→gassy divide = the gas-disc inner edge (wind-ram ⇄ gas-pressure equilibrium), NOT the
    // GAS_DIVIDE_FRAC·R_disc kludge. Inside it the wind strips the gas (M_crit rises steeply), outside
    // a modest core wins gas. M_crit(r) = THRESHOLD_GAS·(R_inner/r)².
    const ratio = gas_inner_edge(M_star, R_disc, f_disc) / Math.max(r, 1e-12);
    const wind_gate = THRESHOLD_GAS * ratio * ratio;
    return Math.max(wind_gate, runaway_core_mass(M_star, f_disc));
}
