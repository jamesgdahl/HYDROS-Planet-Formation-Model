"""
HYDROS Paradigm — Solar System Mass Allocation Model
=====================================================

Driven by FOUR fundamental inputs (3 per-system, 1 per-planet):

    Per system:
      1. M_*_primordial    (stellar mass at formation, in M_sun)
      2. spin_relative     (primordial stellar rotation, 1.0 = Sol's value)
      3. f_disc            (disc-to-star mass ratio at formation, fraction)

    Per planet:
      4. r                 (orbital radius, in AU)

The grain-opacity parameter (GRAIN_OPACITY = 0.82) is a constant:
calibrated on Sol and identical across every calibrated system.

f_disc is independent of M_* — observations show wide scatter across systems
of similar stellar mass (0.5–30%). It's set by formation history (cloud mass,
angular momentum, fragmentation), not derived from any other parameter.

All other disc properties (R_disc, R_A, snow line, slope, intercept, pebble
bonus, ice retention, gas capture) are derived from these inputs plus solar
composition (Z, Lodders abundances) and universal physics constants.

Reproduces Sol to ±5% with f_disc = 1%.
"""

import math


# ============================================================
#   FUNDAMENTAL INPUTS  (the only system-specific parameters)
# ============================================================

M_STAR_PRIMORDIAL = 1.14      # M_sun, before pre-MS mass loss
GRAIN_OPACITY = 0.82          # grain-opacity parameter: 0=grain-grown, 1=ISM-like
                              # (Mulders & Ciesla 2015 direction). Calibrated on Sol;
                              # identical across all calibrated systems — uniform at
                              # least across the local neighbourhood, treated as constant
SPIN_RELATIVE = 1.00          # 1.0 = Sol's primordial rotation rate
F_DISC = 0.0100               # disc-to-star mass ratio at formation
                              # Per-system parameter; not derived from M_*
                              # Sol's calibrated value = 1.0%
                              # ALMA-observed range: 0.5%-30% across systems


# ============================================================
#   COMPOSITION  (solar abundances, fixed)
# ============================================================

Z_METALLICITY = 0.014                # solar metallicity
F_ROCK = 0.22                        # rocky fraction of condensables (Lodders 2003)
F_LODDERS_ICE = 3.5                  # max ice/rock ratio past full condensation
GAS_FRACTION = 0.95                  # gas fraction of disc by mass
H_FRACTION = 0.74                    # hydrogen fraction of gas
M_SUN_TO_EARTH = 332946.0


# ============================================================
#   UNIVERSAL PHYSICS CONSTANTS
# ============================================================

THRESHOLD_GAS = 3.0                  # M_earth core mass for gas accretion onset
PEBBLE_CAPTURE_EFFICIENCY = 0.40     # Lambrechts pebble capture range 0.3-0.5
ETA_ROCK = 0.78                      # rock retention (Mulders pebble drift losses)
SNOW_PILEUP_FACTOR = 0.5             # Mulders pebble pile-up amplitude (universal)
SNOW_PILEUP_WIDTH_FRAC = 0.15        # bump width as fraction of r_snow (narrower)
# f_disc is now an independent fundamental input (see top of file).
# No M_*-derived default scaling; each system specifies its own f_disc.
T_DISC_DISPERSAL_MYR = 5.0           # disc gas-window cutoff for gas-giant formation
ETA_ICE_DECAY_FRACTION = 0.80        # ice retention e-fold as fraction of R_disc


# ============================================================
#   REFERENCE SOLAR VALUES (used only to anchor scaling laws)
# ============================================================

# These are the SOL outcomes; for other systems they're recomputed from inputs.
SOL_M_PRIMORDIAL = 1.14
SOL_R_DISC = 30.0
SOL_R_A_FORMATION = 0.20             # AU during Mercury epoch
SOL_R_A_LATE = 0.31                  # AU after pre-MS spin-down
SOL_INTERCEPT = 0.596                # M_earth backstop residue


# ============================================================
#   DERIVED SYSTEM PROPERTIES (computed from 4 inputs)
# ============================================================

def m_star_earth(m_star_sun):
    return m_star_sun * M_SUN_TO_EARTH


def f_disc(M_star=M_STAR_PRIMORDIAL, override=None):
    """
    Disc-to-star mass ratio at formation.

    Now a per-system fundamental input (not derived). The `override` param
    is kept for API compatibility but is the primary way to specify f_disc
    for systems other than the global default.

    ALMA-observed range: M_disc/M_* ~ 0.5%-30% across young stellar systems,
    with significant scatter even at fixed M_*. f_disc reflects each system's
    specific formation history (cloud mass, angular momentum, fragmentation).
    """
    if override is not None:
        return override
    return F_DISC


def disc_radius(M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE):
    """
    R_disc derived from stellar mass and spin.

    Higher mass → larger disc (alpha = 1.0; matches ALMA M-dwarf vs Sol).
    Faster spin → smaller disc (beta = -0.5; rotation-based compression).
    """
    return SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) ** 1.0 * spin ** (-0.5)


def alfven_radius(M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE):
    """
    R_A magnetospheric truncation. Linear scaling with stellar mass:
    R_A ∝ M_*. Calibrated so Sol's Mercury sits at ~2× R_A (similar to how
    Proxima-d at 0.029 AU sits ~1.4× R_A for M_* = 0.122).

    R_A(M_*, spin) = R_A_sol × (M_*/M_*_sol) × spin^(4/7)
    """
    return SOL_R_A_FORMATION * (M_star / SOL_M_PRIMORDIAL) * spin ** (4.0 / 7.0)


def compression(M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE):
    """
    Compression ratio: R_A / R_disc.

    < 1 (< 100%): normal regime, slope outward, allocation grows with r
    ≈ 1 (100%):   transitional, allocation flat
    > 1 (> 100%): inverted regime, R_A > R_disc, allocation reverses —
                  rocky mass concentrates at the inner edge and decreases
                  outward toward the snow line.
    """
    return alfven_radius(M_star, spin) / disc_radius(M_star, spin)


def snow_line(M_star=M_STAR_PRIMORDIAL, f_disc_override=None):
    """
    Snow line from viscous heating + grain opacity (Mulders et al.).

    Stellar luminosity contribution: r ∝ L_*^(1/2) ∝ M_*^2 (Hayashi PMS).
    Viscous heating contribution scales with disc mass: r ∝ f_disc^(1/2).
    Both multiply the grain-opacity term.

    Calibrated so Sol (M_*=1.14, g=0.82, fd=1%) → 2.7 AU.
    """
    r_small, r_large, q = 1.6, 3.3, 2.2
    grain_term = r_small + (r_large - r_small) * (GRAIN_OPACITY ** q)
    fd = f_disc(M_star, override=f_disc_override)
    fd_ratio = fd / 0.01    # ratio to Sol's calibrated 1%, for viscous heating scaling
    mass_factor = (M_star / SOL_M_PRIMORDIAL) ** 2.0
    disc_factor = fd_ratio ** 0.5
    return grain_term * mass_factor * disc_factor


def slope(M_star=M_STAR_PRIMORDIAL, f_disc_override=None):
    """
    Annulus Allocation Factor (sigma_AAF) — the intensive rate at which
    rocky mass is allocated per unit radius along the disc.

    sigma_AAF = M_* * Z * f_rock * f_disc * eta_rock / R_disc   [M_earth / AU]

    For an LBP Sigma ∝ r^-1 viscous-disc profile, sigma_AAF = dM/dr =
    2*pi*r*Sigma(r) is a radial CONSTANT — which is what makes the linear
    allocation rule M(r) = a + sigma_AAF * r well-defined as a function of
    r alone. The 1970s viscous-disc literature (Lynden-Bell & Pringle 1974;
    Pringle 1981) arrived at this constant implicitly via the self-similar
    solution but did not name it; we adopt "Annulus Allocation Factor".

    Function name `slope` is retained for backward compatibility with the
    html tool and exoplanets.js bindings.
    """
    r_disc = disc_radius(M_star)
    fd = f_disc(M_star, override=f_disc_override)
    return m_star_earth(M_star) * Z_METALLICITY * F_ROCK * fd * ETA_ROCK / r_disc


def snow_line_pileup(r, M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE, f_disc_override=None):
    """
    Universal pebble pile-up bump at snow line (Mulders pressure trap).

    Pebbles drift inward, accumulate at the snow-line pressure bump just
    inside the snow line, contributing extra mass to planets nearby.

    Amplitude: slope × r_snow × pile-up factor
    Width: 0.3 × r_snow
    Centered at: r_snow
    """
    sl = slope(M_star, f_disc_override)
    r_snow = snow_line(M_star, f_disc_override=f_disc_override)
    amp = sl * r_snow * SNOW_PILEUP_FACTOR
    sigma = SNOW_PILEUP_WIDTH_FRAC * r_snow
    return amp * math.exp(-((r - r_snow) ** 2) / (2 * sigma ** 2))


def gas_dispersal_time(M_star=M_STAR_PRIMORDIAL, f_disc_override=None):
    """
    Disc gas dispersal time scales with disc mass (universal).
    Low-mass discs (M dwarfs at modest f_disc) disperse faster.

    t_disc = T_DISC_DISPERSAL_MYR × (disc_mass / Sol_disc_mass)^0.5
    """
    fd = f_disc(M_star, override=f_disc_override)
    disc_mass = fd * m_star_earth(M_star)
    sol_disc_mass = 0.01 * m_star_earth(SOL_M_PRIMORDIAL)
    return T_DISC_DISPERSAL_MYR * (disc_mass / sol_disc_mass) ** 0.5


def intercept(M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE):
    """
    Inner-reservoir baseline mass at the Alfven Dam.

    Solids drifting inward via gas-drag aerodynamics pool against the
    magnetospheric truncation (R_A). The pile-up is a viscous pooling
    against a magnetic field barrier — NOT a gravitational trap. The
    pooled solids form an inner reservoir whose steady-state baseline
    mass is the intercept `a`. This is physically equivalent to the
    Chatterjee & Tan (2014) "Inside-Out Planet Formation" reservoir.

    Scales with M_*_primordial (more drift flux for bigger systems) and
    with spin (R_A ∝ spin^(4/7); reservoir mass tracks half-power as
    the dam pressure / holding capacity grows). Universal scaling:
        a ~ M_* * spin^(2/7)
    Anchored to Sol's calibrated 0.596 M_earth.
    """
    return SOL_INTERCEPT * (M_star / SOL_M_PRIMORDIAL) * spin ** (2.0 / 7.0)


# ============================================================
#   ALLOCATION FUNCTIONS
# ============================================================

def outer_feed_truncation(r, r_disc):
    """
    Hexagonal-packing nearest-neighbor truncation at the outer Anti-Alfven Dam.

    DERIVATION: In a 2D disc with material in approximate hexagonal close-pack
    distribution, each interior point has 6 nearest neighbors at 60-degree
    intervals. A planet sitting at the disc edge (r = R_disc) loses 1 of these
    6 neighbors to the void → retention = 5/6, loss = 1/6.

    This 1/6 truncation is GEOMETRIC, not calibrated. The same 5/6 retention
    applies at both dam edges (inner ramp at r = 2*R_A uses the symmetric
    alpha = (5/6)*R_A; outer truncation at r = R_disc uses L:S = 5:1).

    Equivalent asymmetric formulation:
        L:S = 5:1 with S being outward range, L being inward range
        f_trunc(r) = max(0, 1 - (r + S - R_disc) / (L + S))
            = 1.0 if r + S <= R_disc (planet well inside disc — all 6 neighbors inside)
            = L/(L+S) = 5/6 if r = R_disc (1 of 6 neighbors in void)
            = 0 if r >= R_disc + S (planet past disc edge)

    For Sol R_disc=30, S = 0.025*R_disc = 0.75 AU, L = 3.75 AU.
    Truncation activates only for r > R_disc - L = 26.25 AU; inner planets
    have all 6 nearest neighbors inside the disc, full allocation.
    Neptune at 30 AU is truncated to 5/6, giving the empirical 17% reduction
    that matches observed Neptune mass.
    """
    S = 0.025 * r_disc
    L = 5.0 * S
    void_width = (r + S) - r_disc
    if void_width <= 0:
        return 1.0
    return max(0.0, 1.0 - void_width / (L + S))


def rock_allocation(r, M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE, f_disc_override=None):
    """
    Rock allocation dispatched by compression regime.

    Normal (C < 1):    M = a + slope * r  (mass grows outward from R_A)
    Inverted (C > 1):  M = a - slope * r  scaled by compression
                       (mass piles at inner edge, decays outward toward snow)

    Boundary conditions: outer void past R_disc (Anti-Alfven Dam). The
    linear a + slope*r extrapolation is unphysical beyond the disc edge;
    no rocky material exists to be allocated past the outer dam.

    Outer-edge feeding-zone truncation: planets near R_disc lose part of
    their feeding zone to the outer void via the asymmetric pebble-drift
    mechanism (see outer_feed_truncation). Applied to the linear/ramp
    feeding-zone allocation but NOT to the outer-reservoir Gaussian
    (which is the dam pile-up itself, not feeding-zone-dependent).
    """
    r_disc = disc_radius(M_star, spin)
    # No hard cutoff at R_disc: outer_feed_truncation smoothly fades the
    # allocation from 5/6 at r=R_disc to 0 at r=1.125*R_disc. A hard guard
    # caused floating-point precision issues for planets sitting on the
    # disc edge (e.g., Neptune at 30.05 with R_disc rounding to 30.04999...).

    C = compression(M_star, spin)
    r_a = alfven_radius(M_star, spin)
    r_snow = snow_line(M_star, f_disc_override=f_disc_override)
    sl = slope(M_star, f_disc_override)
    a = intercept(M_star, spin)

    natural_mass_scale = sl * r_disc

    # UNIVERSAL outer pile-up at R_disc from rotational compression on outer
    # edge of disc. Amplitude scales with compression C (negligible at low C,
    # dominant in compressed/inverted systems).
    outer_width = 0.3 * r_disc
    outer_pileup = natural_mass_scale * C * math.exp(-((r - r_disc) ** 2) / (2 * outer_width ** 2))

    # UNIVERSAL snow-line pile-up bump (Mulders pebble trap).
    # Only contributes to rocky allocation if planet is inside r_snow.
    # Outside r_snow, the bump is captured by the ice_allocation function.
    snow_bump = snow_line_pileup(r, M_star, spin, f_disc_override) if r < r_snow else 0.0

    # Outer-feeding-zone truncation: applied to the linear/ramp feeding-zone
    # allocation. Reduces base mass for planets near R_disc due to the
    # asymmetric pebble-drift feeding zone (L:S = 5:1).
    f_trunc = outer_feed_truncation(r, r_disc)

    if C < 1.0:
        # Normal regime
        if r < 2.0 * r_a:
            # Inner ramp with alpha = (5/6) * R_A.
            # GEOMETRIC TRUNCATION: in 2D hexagonal close-packed pebble
            # distribution, a planet at the inner-disc edge (r = R_A)
            # loses 1 of its 6 nearest-neighbor feeding zones to the
            # inner void. Retention = 5/6 — SAME geometric mechanism
            # as the outer dam, just oriented inward (the lost neighbor
            # is on the inward side, inside R_A).
            #
            # ADDITIONAL ABLATION (separate from the geometric ramp):
            # The Alfven Dam is an ACTIVE dam — magnetic-reconnection
            # crack-burst events vaporize the planet's silicate mantle
            # (Mercury's ~70% mantle loss; Cameron 1985, Fegley & Cameron
            # 1987). This active ablation is layered on top of the
            # geometric 1/6 truncation and is modelled separately via
            # the post-formation modification dM_Mercury.
            #
            # Inner edge mass loss = geometric 1/6 (graded by ramp shape)
            #                      + active ablation (dM_Mercury)
            # Outer edge mass loss = geometric 1/6 only (Anti-Alfven Dam
            #                        is PASSIVE: stable MRI-revival trap
            #                        with no analogous ablation mechanism)
            inner_ramp_alpha = (5.0 / 6.0) * r_a
            # Ramp goes negative for r < r_a/6 — clamp at 0 (no rock can
            # be allocated inside the geometric inner edge).
            base = max(0.0, sl * (r + inner_ramp_alpha - r_a))
        else:
            base = a + sl * r
        return base * f_trunc + outer_pileup + snow_bump

    # Inverted regime: bi-modal — inner pile-up (linear decay) + outer pile-up.
    # M(r) is a LOCAL-CAPACITY rule (per AU position), not a mass-density.
    # Material flows through disc; planet at r gets whatever local accretion
    # conditions allow, not a fraction of disc budget.
    if r >= r_snow:
        return 0.0
    inner_fraction = max(0.0, 1.0 - r / r_snow)
    inner_contribution = natural_mass_scale * C * inner_fraction
    return max(0.0, inner_contribution * f_trunc + outer_pileup)


def ice_retention(r, M_star=M_STAR_PRIMORDIAL, f_disc_override=None):
    """
    Ice retention efficiency derived from r and disc size.

    eta_ice(r) = exp(-(r - r_snow) / (0.8 * R_disc))

    Bodies far into the disc relative to its size form slowly (orbital
    timescale scales with disc fraction); slower formation = more ice
    lost via drift, scattering, and gas dispersal before incorporation.
    """
    r_snow = snow_line(M_star, f_disc_override=f_disc_override)
    r_disc = disc_radius(M_star)
    if r <= r_snow:
        return 0.0
    scale = ETA_ICE_DECAY_FRACTION * r_disc
    return math.exp(-(r - r_snow) / scale)


def ice_allocation(r, M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE, f_disc_override=None):
    """
    Ice allocation past structural snow line, plus pebble pile-up bump at
    the snow line itself (Mulders pressure trap).

    Boundary conditions: outer void past R_disc (Anti-Alfven Dam).
    """
    r_disc = disc_radius(M_star, spin)
    # No hard cutoff at R_disc; outer_feed_truncation handles the soft edge.

    sl = slope(M_star, f_disc_override)
    r_snow = snow_line(M_star, f_disc_override=f_disc_override)
    if r <= r_snow:
        return 0.0
    base_ice = sl * (r - r_snow) * F_LODDERS_ICE * ice_retention(r, M_star, f_disc_override)

    # Universal snow-line pile-up (Mulders trap). Past snow line, bump tail
    # adds to ice budget (pebbles concentrating where ice condenses).
    snow_bump = snow_line_pileup(r, M_star, spin, f_disc_override)

    # Outer-feeding-zone truncation: same asymmetric pebble-drift mechanism
    # as in rock_allocation. Applied to the ice feeding-zone integral.
    f_trunc = outer_feed_truncation(r, r_disc)

    return base_ice * f_trunc + snow_bump


def total_pebble_bonus_budget(M_star=M_STAR_PRIMORDIAL, f_disc_override=None):
    """
    Total Pebble Flux Allocation budget = disc ice budget * capture efficiency.

    The disc-wide pebble flux (drifting solids inward via gas-drag
    aerodynamics; Birnstiel 2012, Lambrechts & Johansen 2012/2014,
    Bitsch 2015) supplies a finite mass budget that is partitioned
    across gas-eligible cores along the drift path. Function name
    retained for backward compatibility with exoplanets.js.
    """
    fd = f_disc(M_star, override=f_disc_override)
    disc_ice = fd * Z_METALLICITY * (1 - F_ROCK) * m_star_earth(M_star)
    return disc_ice * PEBBLE_CAPTURE_EFFICIENCY


def pebble_allocation_weight(r, M_star=M_STAR_PRIMORDIAL, f_disc_override=None):
    """
    Per-planet pebble capture weight, set by distance to snow line.
    Pebbles pile up at snow line (Mulders) and decay outward as drifters
    are intercepted along the inward path: weight ~ (r - r_snow)^(-1/2).
    """
    r_snow = snow_line(M_star, f_disc_override=f_disc_override)
    delta = r - r_snow
    if delta <= 0:
        return 0.0
    return delta ** (-0.5)


def hydrogen_capture(core_mass, t_form_myr, spin=SPIN_RELATIVE, r=None,
                     M_star=M_STAR_PRIMORDIAL, f_disc_override=None):
    """
    H/He envelope mass with three universal gates:
    1. Mass threshold (3 M_earth) — needs gravity to retain hydrogen
    2. Gas window — disc gas must still be present (t_form < t_disc)
    3. Wind suppression — fast-spin XUV blows hydrogen from close-in regions

    Tanigawa-Ikoma (2007) gas accretion: dM_gas/dt ∝ M_core² during the
    runaway phase. Integrating with exponentially-decaying disc gas
    density gives M_gas = A_0 · M_core² · exp(-k·t_form) · wind_supp.
    A_0 and k calibrated against Sol's Jupiter and Neptune (both
    in-situ) under the geometric cascade ρ = 1 − √(ln 2)/2 ≈ 0.584.
    k corresponds to disc-gas-dispersal e-folding time ~1.45 Myr.

    Disc dispersal time scales with disc mass (universal):
    low-mass discs disperse faster → outer planets in small-disc systems
    don't accrete envelopes even if their cores exceed threshold.
    """
    if core_mass < THRESHOLD_GAS:
        return 0.0
    A_0 = 4.45  # units of 1/M_E (so M_core² · A_0 gives M_E)
    # Disc-mass-dependent decay rate: smaller discs lose gas faster.
    # k_eff = k_sol × (Sol_disc_mass / system_disc_mass)^2  (capped at Sol value)
    sol_disc = 0.01 * m_star_earth(SOL_M_PRIMORDIAL)
    system_disc = f_disc(M_star, f_disc_override) * m_star_earth(M_star)
    k = 0.691 * max(1.0, (sol_disc / system_disc) ** 2)
    amplification = A_0 * math.exp(-k * t_form_myr)
    spin_ref = 30.0
    r_ref = 0.5
    if r is None:
        wind_term = (spin / spin_ref)
    else:
        wind_term = (spin / spin_ref) * (r_ref / max(r, 0.01)) ** 2
    wind_suppression = 1.0 / (1.0 + wind_term)
    return core_mass * core_mass * amplification * wind_suppression


# ============================================================
#   CASCADE SLOT PREDICTION (Hill-spacing chain)
# ============================================================

def cascade_slot_positions(M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE):
    """
    Cascade slot positions derived from the dam geometry, with COUNT
    determined by how many fit between R_disc and R_A.

    The Anti-Alfven Dam (R_disc) anchors slot 0. Each inner slot sits at
    the half-amplitude-at-45°-projection (1/(2√2)) of the next-outer
    slot's Gaussian accretion-zone HWHM (√(2 ln 2)):
        r_n = R_disc * (1 - sqrt(ln 2)/2)^n  ≈ R_disc * 0.5837^n

    Slot count: keep adding slots until the NEXT slot would fall inside
    R_A (the magnetospheric void). Inverted regime (R_A >= R_disc):
    fall back to 11 slots interpreted as compressed inner reservoir.
    """
    R_disc = disc_radius(M_star, spin)
    R_A = alfven_radius(M_star, spin)
    ratio = 1.0 - math.sqrt(math.log(2.0)) / 2.0
    if R_A >= R_disc:
        return [R_disc * (ratio ** n) for n in range(11)]
    n_slots = int(math.floor(math.log(R_A / R_disc) / math.log(ratio))) + 1
    return [R_disc * (ratio ** n) for n in range(max(1, n_slots))]


def _slot_predicted_mass(r, M_star, spin, f_disc_override, t_form_cascade=None):
    """Helper: predict mass at slot position using cascade t_form."""
    rock = rock_allocation(r, M_star, spin, f_disc_override)
    ice = ice_allocation(r, M_star, spin, f_disc_override)
    core = rock + ice
    if core <= THRESHOLD_GAS:
        return core
    sl = slope(M_star, f_disc_override)
    if t_form_cascade is None:
        t_form_cascade = 0.10 * r / sl
    h_he = hydrogen_capture(core, t_form_cascade, spin, r, M_star, f_disc_override)
    return core + h_he


OVERPRED_PENALTY = 0.2   # log-r-equivalent penalty applied when a slot's
                         # cascade prediction exceeds observed mass
UNDERPRED_PENALTY = 5.0  # applied when slot's cascade prediction is far
                         # BELOW observed (observed > 5x cascade_pred).
                         # Large value because under-prediction signals
                         # physical impossibility — slot can't accumulate
                         # enough material; planet must have migrated from
                         # an outer slot.
UNDERPRED_RATIO = 5.0    # observed/cascade_pred ratio threshold
GAS_OBS_THRESHOLD = 5.0  # M_Earth — observed-mass threshold for treating a
                         # planet as gas-eligible (qualifying for inner-slot
                         # migration penalty)
GAS_INNER_PENALTY = 0.15 # penalty added to a slot whose r is INNER of a
                         # gas-eligible planet's observed r — biases gas
                         # giants toward their formation (outer) slot
GAS_DECISIVE_DIST = 0.05 # log-r distance below which a slot is "decisively"
                         # the planet's location (no migration penalty)
IRON_FRACTION = 0.30     # iron core fraction of a rocky planet's mass.
                         # Hard floor for mantle stripping — once a planet
                         # has been ablated down to a naked iron core, no
                         # further mass can be lost.
T_STRIP_K = 2000.0       # Silicate vaporization threshold (Kelvin).
                         # Mantle is ablated when T-Tauri bolometric
                         # heating raises the planet's equilibrium
                         # temperature above this. Iron core remains
                         # (boiling point ~3000 K; we don't reach that
                         # at typical T-Tauri equilibrium temperatures).
L_T_TAURI_FACTOR = 10.0  # Pre-main-sequence luminosity multiplier vs.
                         # main-sequence (Hayashi-track peak factor for
                         # solar-mass stars; varies somewhat with mass).
ALBEDO = 0.1             # Typical rocky-body albedo (dark surface).

# Physical constants (SI)
SIGMA_SB = 5.670374419e-8  # W/m²/K⁴
L_SUN_W  = 3.828e26        # W
AU_M     = 1.495978707e11  # m


def equilibrium_temperature(r, M_star):
    """T-Tauri equilibrium temperature (Kelvin) at orbital distance r AU
    around a star of mass M_star (solar units), assuming main-sequence
    luminosity scaling L ∝ M^4 boosted by L_T_TAURI_FACTOR during the
    pre-main-sequence phase."""
    L_W = L_T_TAURI_FACTOR * (M_star ** 4) * L_SUN_W
    r_m = r * AU_M
    flux = L_W / (4.0 * math.pi * r_m * r_m)
    return ((flux * (1.0 - ALBEDO)) / (4.0 * SIGMA_SB)) ** 0.25
STRIP_OBS_MAX = 15.0     # M_Earth — only small rocky bodies are fully
                         # stripped. Planets above this retain gas envelope
                         # via escape velocity even inside the strip zone.
                         # 55Cnc-c (51 M_E) and 55Cnc-b (255 M_E) at sub-AU
                         # orbits keep their atmospheres; 55Cnc-e (8 M_E)
                         # at 0.015 AU does not.

def mantle_strip_fraction(r, M_star):
    """
    Fraction of rocky mantle stripped by T-Tauri bolometric heating.

        strip(T) = max(0, 1 - (T_STRIP / T_eq)^4)

    Strip = 0 when equilibrium temperature is at or below T_STRIP (2000 K,
    silicate vaporization onset). For T_eq > T_STRIP, strip rises as the
    T⁴ excess flux (Stefan-Boltzmann scaling) drives mantle ablation.
    Asymptotes to 1.0 (iron-core-only) for T_eq ≫ T_STRIP.

    No Mercury calibration. Mercury at ~1250 K T-Tauri equilibrium is
    below the threshold; its iron-rich composition is attributed to the
    slot-11 collision, not photonic stripping.
    """
    T_eq = equilibrium_temperature(r, M_star)
    if T_eq <= T_STRIP_K:
        return 0.0
    return max(0.0, min(1.0, 1.0 - (T_STRIP_K / T_eq) ** 4))


def apply_mantle_stripping(rock, ice, peb, h_he, r, M_star):
    """
    Apply the Mercury-framework stripping cascade to a primordial core:
      1. Strip envelope entirely (gas can't survive in stripping zone)
      2. Strip ice entirely (sublimated/photoevaporated)
      3. Strip mantle by photon flux, capped at the iron-core floor
         (cannot remove more than (1 - IRON_FRACTION) of the rock)
    Returns (rock_remaining, ice_remaining, peb_remaining, h_he_remaining).
    Pebble bonus is rock-like material — strips with the mantle.
    """
    strip = mantle_strip_fraction(r, M_star)
    if strip <= 0.0:
        return rock, ice, peb, h_he
    # Total rocky material (rock + pebble bonus = silicate inventory)
    rocky_total = rock + peb
    # Mantle is the non-iron portion of the rocky inventory
    mantle_max = rocky_total * (1.0 - IRON_FRACTION)
    mantle_lost = mantle_max * strip
    # Distribute the loss proportionally between rock and pebble
    if rocky_total > 0:
        rock_keep = rock - mantle_lost * (rock / rocky_total)
        peb_keep = peb - mantle_lost * (peb / rocky_total)
    else:
        rock_keep, peb_keep = rock, peb
    return rock_keep, 0.0, peb_keep, 0.0  # ice and h_he fully stripped


def is_stripped(planet, M_star):
    """True iff the planet's T-Tauri equilibrium temperature exceeds
    T_STRIP_K (2000 K, silicate vaporization). No mass cap — at vaporization
    temperatures the deposited stellar energy dominates over rocky-body
    binding regardless of size. Gas giants in cooler orbits (T_eq < 2000)
    are protected by their distance, not by an arbitrary mass threshold."""
    return equilibrium_temperature(planet["r"], M_star) > T_STRIP_K


# Late-delivery threshold: half of (Borealis impactor mass / Mars mass).
# Borealis impactor ~0.02 M⊕ (Andrews-Hanna et al. 2008) on Mars (0.107
# M⊕) gives a 18.7% relative mass-change signature. Half of that — 9.35%
# — is the minimum fractional mass gain that counts as a late-delivery
# event in HYDROS. Anything smaller is below the diagnostic floor.
LATE_DELIVERY_FRAC = 0.5 * (0.02 / 0.107)


def classify_slot(slot, primordial,
                  r_snow, migrated=False, migrants=None):
    """
    Derive interpretation from formation slot → observed deltas.

    Composition classes (used for both filled and lost slots):
      stellar companion - total mass ≥ 80 Jupiter (hydrogen burning)
      brown dwarf       - total mass ≥ 13 Jupiter (deuterium burning)
      gas giant         - envelope dominates current mass (h_he > core)
      ice giant         - icy core (ice/core ≥ 30%), envelope < core
      rock giant        - core > gas threshold, no envelope, no ice
      rocky             - sub-threshold core

    Mass-delta tags (late delivery, scattered, impact loss) compare
    observed vs the BISECTED predicted — anything left after t_form
    fitting is a real mass anomaly. Late delivery requires the planet
    to be inside r_snow and to have gained ≥ LATE_DELIVERY_FRAC.

    MISSING slots are tagged with their primordial composition class
    so we know what would have formed there (gas giant, brown dwarf,
    etc.).
    """
    ICE_GIANT_ICE_FRAC = 0.30
    M_BROWN_DWARF = 4131.0   # M_E — 13 Jupiter masses, deuterium-burning
    M_STELLAR = 25400.0       # M_E — 80 Jupiter, hydrogen-burning

    def _classify(core_v, ice_v, h_he_v, total_v):
        if total_v >= M_STELLAR:
            return "stellar companion"
        if total_v >= M_BROWN_DWARF:
            return "brown dwarf"
        if core_v > THRESHOLD_GAS and h_he_v > core_v:
            return "gas giant"
        if core_v > THRESHOLD_GAS and core_v > 0 and ice_v / core_v >= ICE_GIANT_ICE_FRAC:
            return "ice giant"
        if core_v > THRESHOLD_GAS:
            return "rock giant"
        return "rocky"

    primordial_comp = _classify(
        primordial.get("core", 0.0),
        primordial.get("ice", 0.0),
        primordial.get("h_he", 0.0),
        primordial.get("total", 0.0),
    )

    if not slot["filled"]:
        # Default: missing slot without directly attributable cause is
        # simply unobserved. Don't infer destruction from migration
        # patterns alone — that's speculative attribution.
        return f"{primordial_comp} (not observed)"

    rock_bs = slot.get("rock", 0.0)
    ice_bs  = slot.get("ice", 0.0)
    peb_bs  = slot.get("pebble", 0.0)
    h_he_bs = slot.get("h_he", 0.0)
    core_bs = rock_bs + ice_bs + peb_bs
    total_bs = core_bs + h_he_bs

    comp = _classify(core_bs, ice_bs, h_he_bs, total_bs)

    # Stellar companions and brown dwarfs didn't form from the primary's
    # disc — they're independent gravitational collapses (co-formation
    # or capture). Cascade mass-delta tags don't apply: there's no
    # "scattered" or "late delivery" mechanism for an independently-
    # formed body. Just report the class with optional migration.
    if comp in ("stellar companion", "brown dwarf"):
        if migrated:
            direction = "inward" if slot["r_used"] < slot["slot_r"] else "outward"
            return f"{comp} (migrated {direction})"
        return f"{comp} (in situ)"

    if slot.get("stripped"):
        return f"core remnant ({primordial_comp} progenitor)"

    observed_r = slot["r_used"]
    direction = "inward" if observed_r < slot["slot_r"] else "outward"

    observed_m = slot["observed"]
    predicted = slot["predicted"]
    if predicted > 0:
        mass_delta_frac = (observed_m - predicted) / predicted
    else:
        mass_delta_frac = 0.0

    tags = []
    if migrated:
        tags.append(f"migrated {direction}")
    # Late delivery is a rocky-planet phenomenon (volatile-rich impactor
    # delivers cometary material to a dry inner body). Gas/ice giants
    # don't experience "late delivery" — their envelope-mass variance
    # is from formation-timing differences, not impactor delivery.
    if (mass_delta_frac >= LATE_DELIVERY_FRAC
            and observed_r < r_snow
            and comp == "rocky"):
        tags.append("late delivery")
    elif mass_delta_frac < -0.5:
        tags.append("scattered/lost")
    elif mass_delta_frac < -LATE_DELIVERY_FRAC:
        tags.append("impact loss")

    if tags:
        return f"{comp} ({', '.join(tags)})"
    return f"{comp} (in situ)"


def effective_mass_for_assignment(planet, M_star):
    """Mass to use for slot mass-matching. Iron-core remnant: back out
    primordial rock mass from observed iron."""
    if is_stripped(planet, M_star):
        return planet["observed"] / IRON_FRACTION
    return planet["observed"]
                         # the planet's location (no migration penalty)


def assign_planets_to_slots(planets, M_star=M_STAR_PRIMORDIAL,
                            spin=SPIN_RELATIVE, f_disc_override=None):
    """
    Assign each observed planet to its cascade slot using a combined
    mass+AU score. Reported AU is the planet's CURRENT (observed) AU;
    migration is detected post-hoc as observed_r differing from slot_r.

    Score for a (planet, slot) pair:
        score = |log(planet.r / slot.r)|
              + OVERPRED_PENALTY  if slot_predicted_mass > planet.observed
              + 0                 otherwise

    The penalty biases against slots whose cascade allocation already
    exceeds the planet's mass (the planet would have to LOSE mass to fit
    there). It captures the physical asymmetry: a planet can over-shoot
    its slot's cascade prediction via earlier formation / runaway gas
    accretion (natural), but suppressing accretion below cascade is rare.

    Example: Saturn (95 M_E observed at 9.58 AU) is r-nearest to slot 3
    (8.13 AU, cascade pred 132 M_E) but slot 3 OVER-predicts — penalty
    applied. Slot 2 (12.55 AU, cascade pred 67 M_E) UNDER-predicts — no
    penalty. Saturn wins slot 2 (despite larger r-distance), correctly
    identifying it as the Saturn Grand Tour migrant from 12.55 AU.

    Conflict resolution: greedy global-minimum assignment. If two
    planets share the same best slot (e.g., both have similar mass), the
    one with smaller log-r distance to that slot wins; the other falls
    back to its next-best slot. This is how AU breaks ties when reported
    masses are degenerate.

    Unfilled slots are LOST planets (predicted to have formed but no
    longer observed).

    Returns: list of slot dicts with assignment information.
    """
    slots_r = cascade_slot_positions(M_star, spin)
    slot_pred_mass = [_slot_predicted_mass(r, M_star, spin, f_disc_override)
                      for r in slots_r]

    observed = [p for p in planets if p.get("observed", 0) > 0]

    # Rocky inventory at each slot (rock + ice; pebble is allocated
    # later so excluded from this initial matching). Used as the slot's
    # match target for stripped iron-core planets.
    slot_rocky_inventory = [
        rock_allocation(r, M_star, spin, f_disc_override)
        + ice_allocation(r, M_star, spin, f_disc_override)
        for r in slots_r
    ]

    def pair_score(p, n):
        r_dist = abs(math.log(p["r"]) - math.log(slots_r[n]))
        penalty = 0.0
        stripped = is_stripped(p, M_star)
        if stripped:
            # Match primordial rock against slot's rocky inventory.
            mass_for_match = effective_mass_for_assignment(p, M_star)
            slot_target = slot_rocky_inventory[n]
        else:
            mass_for_match = p["observed"]
            slot_target = slot_pred_mass[n]
        if slot_target > mass_for_match:
            penalty += OVERPRED_PENALTY
        if (slot_target > 0
                and mass_for_match > slot_target * UNDERPRED_RATIO):
            penalty += UNDERPRED_PENALTY
        if (mass_for_match > GAS_OBS_THRESHOLD
                and slots_r[n] < p["r"]
                and r_dist > GAS_DECISIVE_DIST):
            penalty += GAS_INNER_PENALTY
        return r_dist + penalty

    n_slots = len(slots_r)
    slot_assignments = [None] * n_slots
    unassigned = list(observed)
    while unassigned:
        best = None  # (score, planet, n)
        for p in unassigned:
            for n in range(n_slots):
                if slot_assignments[n] is not None:
                    continue
                s = pair_score(p, n)
                if best is None or not math.isfinite(s):
                    if math.isfinite(s):
                        best = (s, p, n)
                elif s < best[0]:
                    best = (s, p, n)
        if best is None:
            break
        slot_assignments[best[2]] = best[1]["name"]
        unassigned.remove(best[1])

    # Build output
    output = []
    for n in range(n_slots):
        if slot_assignments[n] is not None:
            for p in planets:
                if p["name"] == slot_assignments[n]:
                    output.append({
                        "slot_n": n,
                        "slot_r": slots_r[n],
                        "filled": True,
                        "name": p["name"],
                        "r_obs": p["r"],
                        "observed": p.get("observed", 0),
                        "slot_predicted_mass": slot_pred_mass[n],
                    })
                    break
        else:
            output.append({
                "slot_n": n,
                "slot_r": slots_r[n],
                "filled": False,
                "name": f"slot_{n}_lost",
                "r_obs": slots_r[n],
                "observed": 0,
                "slot_predicted_mass": slot_pred_mass[n],
            })
    return output


M_STELLAR_BOUNDARY = 25400.0  # 80 Jupiter masses — bodies at or above
                              # this are stellar companions (hydrogen
                              # burning); they're bound but didn't form
                              # from the primary's disc.
DISC_TRUNCATION_FACTOR = 0.15 # Stellar companion tidally truncates the
                              # primary's disc at this fraction of its
                              # semi-major axis (Holman & Wiegert 1999
                              # S-type stability radius — depends on
                              # binary mass ratio and eccentricity, but
                              # 0.10-0.20 is typical; 0.15 used as
                              # default in absence of e_binary input).


def auto_spin_from_outermost(planets, M_star=M_STAR_PRIMORDIAL, anchor_slot=0):
    """
    Compute the spin that places the disc outer edge (R_disc) at the
    outermost observed planet's orbital radius.

    The cascade structure anchors slot 0 to R_disc (Anti-Alfven Dam).
    The outermost observed planet defines R_disc, and spin is back-derived
    via R_disc = 30 * (M_star/M_star_prim) * spin^(-0.5).

    For Sol with Neptune at 30.05 AU: spin ~ 0.9967 (Neptune's r IS the
    Anti-Alfven Dam location, not 30.0 exactly).
    For compact systems with outermost planet at ~1 AU: spin ~ 900
    (severe disc compression via primordial fast rotation).

    Returns the spin value such that R_disc equals the outermost planet's r.
    """
    # Stellar companions are bound but not formed in the primary's disc.
    # If any are present, they tidally truncate the disc (Holman-Wiegert):
    # the disc's effective outer edge is ~DISC_TRUNCATION_FACTOR × the
    # closest stellar companion's semi-major axis. Disc-formed planets
    # anchor R_disc if present; otherwise the truncation cap applies.
    disc_planets = [p for p in planets
                    if p.get("observed", 0) > 0
                    and p.get("observed", 0) < M_STELLAR_BOUNDARY]
    stellar = [p for p in planets
               if p.get("observed", 0) >= M_STELLAR_BOUNDARY]
    truncation_cap = None
    if stellar:
        closest_stellar_r = min(p["r"] for p in stellar)
        truncation_cap = DISC_TRUNCATION_FACTOR * closest_stellar_r
    if disc_planets:
        max_r = max(p["r"] for p in disc_planets)
        if truncation_cap is not None and max_r > truncation_cap:
            max_r = truncation_cap
    elif truncation_cap is not None:
        max_r = truncation_cap
    else:
        return SPIN_RELATIVE
    # anchor_slot > 0: outermost observed sits at slot k, not slot 0.
    # Slots 0..k-1 are "missing" (ejected/scattered outer bodies).
    # R_disc shifts outward by ratio^-k so the outermost lands at slot k.
    ratio = 1.0 - math.sqrt(math.log(2.0)) / 2.0
    R_disc_target = max_r / (ratio ** anchor_slot)
    return (SOL_R_DISC * (M_star / SOL_M_PRIMORDIAL) / R_disc_target) ** 2


def _pick_anchor_slot(planets, disc_planets, M_star, f_disc_override):
    """
    Iterate anchor_slot k=0..K. For each, compute:
      - positional residual: sum |log(r_obs / r_nearest_slot)|
      - missing count: slots without an observed planet
      - unassigned count: observed planets without a slot
    Pick the k minimizing unassigned*BIG + positional_residual + MISSING_W * missing.
    Returns the spin corresponding to the winning k.
    """
    obs = [p for p in disc_planets if p.get("observed", 0) > 0]
    n_obs = len(obs)
    if n_obs == 0:
        return auto_spin_from_outermost(planets, M_star, anchor_slot=0)
    BIG = 1.0e6
    f_disc_eval = f_disc_override if f_disc_override is not None else F_DISC
    best_score = float("inf")
    best_spin = None
    for k in range(0, 12):
        spin_try = auto_spin_from_outermost(planets, M_star, anchor_slot=k)
        slots_r = cascade_slot_positions(M_star, spin_try)
        if not slots_r:
            continue
        # Greedy unique-slot assignment by best per-planet log-distance.
        remaining = list(range(len(slots_r)))
        assigned_slots = set()
        unassigned = 0
        pos_resid = 0.0
        for p in sorted(obs, key=lambda x: -x["r"]):
            if not remaining:
                unassigned += 1
                continue
            best_n, best_d = None, float("inf")
            for n in remaining:
                d = abs(math.log(p["r"]) - math.log(slots_r[n]))
                if d < best_d:
                    best_d = d
                    best_n = n
            pos_resid += best_d
            assigned_slots.add(best_n)
            remaining.remove(best_n)
        # Reject if any MISSING slot would predict a stellar-mass body;
        # also accumulate mass-weighted missing cost (log10 of predicted
        # mass). Missing rocky bodies are cheap; missing brown dwarfs
        # are expensive — discourages exotic ejection scenarios when a
        # smaller-k solution exists.
        stellar_missing = False
        missing_cost = 0.0
        for n in range(len(slots_r)):
            if n in assigned_slots:
                continue
            m_pred = _slot_predicted_mass(slots_r[n], M_star, spin_try,
                                            f_disc_eval)
            if m_pred >= M_STELLAR_BOUNDARY:
                stellar_missing = True
                break
            missing_cost += math.log10(1.0 + max(0.0, m_pred))
        if stellar_missing:
            continue
        # Anchor must be in-situ: run the actual mass-scored assignment
        # and verify the outermost observed planet ends up at slot k.
        # If the mass scoring moves the anchor elsewhere, k is unreliable.
        outermost = max(obs, key=lambda x: x["r"])
        real_assign = assign_planets_to_slots(obs, M_star, spin_try, f_disc_eval)
        anchor_ok = False
        for s in real_assign:
            if s["filled"] and s["name"] == outermost["name"]:
                anchor_ok = (s["slot_n"] == k)
                break
        if not anchor_ok:
            continue
        # Anchor must be roughly its predicted size. SKIP for gas-
        # eligible anchors (observed > 5 M_E) — t_form bisection in
        # findBestFit fits gas-giant mass exactly, so pre-bisection
        # prediction isn't a reliable size estimate.
        if outermost["observed"] <= GAS_OBS_THRESHOLD:
            anchor_pred = _slot_predicted_mass(slots_r[k], M_star, spin_try,
                                                f_disc_eval)
            if anchor_pred > 0 and outermost["observed"] > 0:
                ratio_mp = anchor_pred / outermost["observed"]
                if ratio_mp < 0.75 or ratio_mp > 1.333:
                    continue
        # Per-k penalty: prefer anchoring at outermost slot (k=0).
        # Escalation only when fit/missing improvement outweighs it.
        K_PENALTY = 1.5
        score = unassigned * BIG + pos_resid + missing_cost + K_PENALTY * k
        if score < best_score:
            best_score = score
            best_spin = spin_try
    return best_spin if best_spin is not None else auto_spin_from_outermost(
        planets, M_star, anchor_slot=0)


def slot_aware_fit(planets, M_star=M_STAR_PRIMORDIAL, spin=None,
                   f_disc_override=None,
                   bisect_tolerance=0.001, max_iterations=100,
                   auto_compress=True, use_observed_r=True):
    """
    Slot-aware best fit: assign planets to cascade slots first, then bisect
    t_form for gas-eligible planets to match observed masses.

    Algorithm:
    1. (auto_compress) Auto-set spin so R_disc = outermost observed planet's r.
       The outermost planet defines the Anti-Alfven Dam at slot 0.
    2. Compute the 11 cascade slot positions.
    3. Assign each known planet to its closest slot (log-radius).
    4. For each filled slot, use the planet's observed r as r_form
       (use_observed_r=True, default) or the slot r (use_observed_r=False).
    5. For gas-eligible (core > 3 M_E) bisect t_form to fit observed mass.
    6. For sub-threshold rocky planets, mass is determined by allocation
       function (no t_form fitting). Discrepancy from observed is reported
       as implied delta_M.

    The implied_dM in the output for each filled slot is the post-formation
    modification needed to match observed mass (e.g., Saturn-Grand-Tour
    scattering, Theia delivery, crack-burst ablation).

    Returns: dict with "slots", "ratio", "R_disc", "spin".
    """
    # Separate disc-forming planets from external stellar companions.
    # Stellar companions are bound to the system but didn't form from
    # the primary's protoplanetary disc — they're external gravity
    # sources, not cascade products.
    external_bodies = [p for p in planets
                       if p.get("observed", 0) >= M_STELLAR_BOUNDARY]
    disc_planets = [p for p in planets
                    if p.get("observed", 0) < M_STELLAR_BOUNDARY]

    # Auto-compression: set R_disc to outermost DISC planet (not stellar).
    # Iterate anchor_slot k=0,1,2,... and pick the k that gives the best
    # fit (lowest max mass error) with the fewest unaccounted-for
    # (MISSING) predicted slots. Tiebreak on smaller k (fewer missing).
    # k>0 implies slots 0..k-1 are ejected/scattered outer bodies.
    if auto_compress and spin is None:
        spin = _pick_anchor_slot(planets, disc_planets, M_star,
                                  f_disc_override)
    elif spin is None:
        spin = SPIN_RELATIVE

    # Slot assignment runs only on disc-forming planets.
    slot_data = assign_planets_to_slots(disc_planets, M_star, spin, f_disc_override)

    # Map filled slot -> planet record (for accessing observed r)
    planet_by_slot = {}
    for slot in slot_data:
        if slot["filled"]:
            for p in planets:
                if p["name"] == slot["name"]:
                    planet_by_slot[slot["slot_n"]] = p
                    break

    slots_r = cascade_slot_positions(M_star, spin)

    # First pass: identify migrants (filled slots whose assignment differs
    # from their r-nearest slot). Used to attribute destruction in MISSING
    # slot tags.
    migrants = []
    for slot in slot_data:
        if not slot["filled"]:
            continue
        p = planet_by_slot[slot["slot_n"]]
        log_obs = math.log(p["r"])
        nearest_n = min(range(len(slots_r)),
                        key=lambda k: abs(log_obs - math.log(slots_r[k])))
        if nearest_n != slot["slot_n"]:
            migrants.append(p["name"])

    def fit_r(slot):
        """Return r for mass computation. In-situ planets (assigned slot
        = r-nearest slot) use observed r. Migrants (mass-AU score routed
        them to a non-r-nearest slot) use the formation slot's r."""
        if not slot["filled"]:
            return slot["slot_r"]
        p = planet_by_slot[slot["slot_n"]]
        log_obs = math.log(p["r"])
        nearest_n = min(range(len(slots_r)),
                        key=lambda n: abs(log_obs - math.log(slots_r[n])))
        if nearest_n != slot["slot_n"]:
            return slot["slot_r"]   # migrant
        return p["r"]               # in-situ

    # Compute predicted masses for each slot
    sl = slope(M_star, f_disc_override)
    pebble_total = total_pebble_bonus_budget(M_star, f_disc_override)

    # First pass: compute core masses at fit_r positions
    cores = {}
    for slot in slot_data:
        r = fit_r(slot)
        rock = rock_allocation(r, M_star, spin, f_disc_override)
        ice = ice_allocation(r, M_star, spin, f_disc_override)
        cores[slot["slot_n"]] = rock + ice

    # Pebble bonus allocation
    weights = {}
    for slot in slot_data:
        n = slot["slot_n"]
        r = fit_r(slot)
        t_form_cascade = 0.10 * r / sl
        eligible = (cores[n] > THRESHOLD_GAS) and (t_form_cascade < T_DISC_DISPERSAL_MYR)
        if eligible:
            weights[n] = pebble_allocation_weight(r, M_star, f_disc_override)
        else:
            weights[n] = 0.0
    total_w = sum(weights.values())
    pebble = {n: (pebble_total * w / total_w if total_w > 0 else 0)
              for n, w in weights.items()}

    # ISU (immutable) handling — matches index.html:
    #  - If ANY planet is ISU, only ISU planets bisect t_form; non-ISU
    #    use cascade-default t_form so observed vs primordial surfaces
    #    post-formation modifications (impact loss, late delivery).
    #  - If NO planet is ISU, all gas-eligible bisect t_form (no
    #    diagnostic mode — just consensus fit to observed).
    any_isu = any(p.get("immutable") for p in planet_by_slot.values())

    # For each slot, compute total mass with bisected t_form for gas-eligible
    results = []
    for slot in slot_data:
        n = slot["slot_n"]
        r = fit_r(slot)
        rock = rock_allocation(r, M_star, spin, f_disc_override)
        ice = ice_allocation(r, M_star, spin, f_disc_override)
        peb = pebble[n]
        core = rock + ice + peb
        in_void = False  # slots inside R_A are now excluded from generation

        observed = slot["observed"] if slot["filled"] else 0
        gas_eligible = (core > THRESHOLD_GAS)
        planet_r = planet_by_slot[n]["r"] if slot["filled"] else r
        # Stripping: rocky planets receiving enough T-Tauri-burst photon
        # flux to vaporize their mantle lose ice, envelope, and mantle.
        # For filled slots, use observed mass as the escape-velocity gate.
        # For lost slots, use the primordial cascade mass — that's what
        # would have been there had the planet survived. Lost-slot
        # predictions then reflect the post-strip survival mass, not the
        # full primordial inventory.
        mass_for_strip_gate = observed if slot["filled"] else core
        stripped = is_stripped(
            {"r": planet_r, "observed": mass_for_strip_gate}, M_star)

        is_immutable = slot["filled"] and planet_by_slot[n].get("immutable",
                                                                False)
        should_bisect = (slot["filled"] and observed > 0
                         and (is_immutable or not any_isu))
        if not gas_eligible:
            # Sub-threshold rocky planet: formation r = observed r (set by
            # fit_r). Cascade allocation at that r IS the primordial mass;
            # mod = observed - primordial captures any post-formation
            # modification (Theia delivery to Earth, Mercury mantle ablation,
            # Mars scattering loss).
            t_form = 0.10 * r / sl
            h_he = 0.0
            total = core
        elif should_bisect:
            # Gas-eligible AND has observed mass. If core <= observed,
            # bisect t_form to fit the envelope contribution. If core
            # already exceeds observed, no envelope is possible — use
            # cascade-default t_form (predicted = core, mod absorbs the
            # residual). Avoids the bisection saturating at the ceiling.
            if core >= observed:
                t_form = 0.10 * r / sl
                h_he = 0.0
                total = core
            else:
                t_form_lo, t_form_hi = 0.01, 50.0
                target = observed
                t_form = (t_form_lo + t_form_hi) / 2
                for _ in range(max_iterations):
                    h_he = hydrogen_capture(core, t_form, spin, r, M_star, f_disc_override)
                    total = core + h_he
                    err = (total - target) / target
                    if abs(err) < bisect_tolerance:
                        break
                    if total > target:
                        t_form_lo = t_form
                    else:
                        t_form_hi = t_form
                    t_form = (t_form_lo + t_form_hi) / 2
        else:
            # Gas-eligible but unobserved (lost planet), or non-ISU planet
            # in a system with ISU anchors: use cascade-default t_form.
            # For non-ISU planets the observed-vs-predicted delta then
            # surfaces post-formation modification diagnostics.
            t_form = 0.10 * r / sl
            h_he = hydrogen_capture(core, t_form, spin, r, M_star, f_disc_override)
            total = core + h_he

        # Snapshot the PRIMORDIAL composition: cascade allocation with
        # the natural cascade-default t_form (NOT the bisected one), so
        # gas-eligible slots whose bisection saturates (e.g. Uranus —
        # lost envelope to tilt impact) still classify as ice/gas giants
        # by their formation potential, not their stripped-down state.
        t_form_primordial = 0.10 * r / sl
        h_he_primordial = (hydrogen_capture(core, t_form_primordial, spin, r, M_star, f_disc_override)
                           if gas_eligible else 0.0)
        primordial = {
            "rock": rock, "ice": ice, "pebble": peb, "h_he": h_he_primordial,
            "core": core, "total": core + h_he_primordial,
        }

        # Apply mantle stripping if planet sits inside the stripping zone.
        # Cascade allocation (rock, ice, peb, h_he) above represents the
        # PRIMORDIAL inventory. Stripping reduces them to the observed
        # remnant: ice and envelope fully removed, mantle ablated down to
        # the iron-core floor.
        if stripped:
            rock_strip, ice_strip, peb_strip, h_he_strip = apply_mantle_stripping(
                rock, ice, peb, h_he, planet_r, M_star)
            rock, ice, peb, h_he = rock_strip, ice_strip, peb_strip, h_he_strip
            core = rock + ice + peb
            total = core + h_he

        err_pct = ((total - observed) / observed * 100) if observed > 0 else 0
        implied_dM = (observed - total) if (slot["filled"] and observed > 0) else 0

        # Migration = assigned slot differs from r-nearest slot
        migrated_flag = False
        slot_for_class = dict(slot)
        slot_for_class["r_used"] = slot["slot_r"]
        if slot["filled"]:
            p = planet_by_slot[n]
            slot_for_class["r_used"] = p["r"]
            log_obs = math.log(p["r"])
            nearest_n = min(range(len(slots_r)),
                            key=lambda k: abs(log_obs - math.log(slots_r[k])))
            migrated_flag = (nearest_n != n)
        slot_for_class["observed"] = observed
        slot_for_class["stripped"] = stripped
        slot_for_class["in_void"] = in_void
        r_snow_now = snow_line(M_star, f_disc_override=f_disc_override)
        # Pass bisected composition on slot_for_class for classification
        slot_for_class["predicted"] = total
        slot_for_class["rock"] = rock
        slot_for_class["ice"] = ice
        slot_for_class["pebble"] = peb
        slot_for_class["h_he"] = h_he
        interpretation = classify_slot(slot_for_class,
                                       primordial,
                                       r_snow_now,
                                       migrated=migrated_flag,
                                       migrants=migrants)

        results.append({
            "slot_n": n,
            "slot_r": slot["slot_r"],  # cascade slot position
            "r_used": r,               # actual r used for mass computation
            "filled": slot["filled"],
            "name": slot["name"],
            "rock": rock,
            "ice": ice,
            "pebble": peb,
            "core": core,
            "t_form": t_form,
            "h_he": h_he,
            "predicted": total,
            "observed": observed,
            "err_pct": err_pct,
            "implied_dM": implied_dM,
            "stripped": stripped,
            "in_void": in_void,
            "primordial": primordial,
            "interpretation": interpretation,
        })

    # Impact-merger detection: for each adjacent pair (outer slot filled,
    # inner slot missing), check whether the outer's observed mass
    # matches the combined iron content (IRON_FRACTION × total primordial
    # rocky inventory) of both bodies. If yes, the inner slot was
    # absorbed by the outer in a Mercury-style giant impact: smaller
    # planet impacted the larger, ejecting both bodies' mantles,
    # leaving the larger as an iron-enriched survivor.
    IMPACT_MASS_TOLERANCE = 0.20  # 20% match window
    for i in range(len(results) - 1):
        outer = results[i]
        inner = results[i + 1]
        if not outer["filled"] or inner["filled"]:
            continue
        # Combined rocky inventory of both primordials
        rocky_combined = (outer["primordial"]["rock"]
                          + outer["primordial"]["ice"]
                          + outer["primordial"]["pebble"]
                          + inner["primordial"]["rock"]
                          + inner["primordial"]["ice"]
                          + inner["primordial"]["pebble"])
        expected_iron = IRON_FRACTION * rocky_combined
        if outer["observed"] <= 0:
            continue
        # Impact retention model: depends on Δv vs target v_esc.
        #   v_orbit(r) = 29.785 · √(M_star/r) [km/s, r in AU, M_star in M_sun]
        #   v_esc(M)   = 11.186 · M^(1/3)     [km/s, M in M_E, rocky]
        #   retention = max(0.3, 1 - 0.37 · Δv/v_esc)
        # Calibrated:
        #   Mercury–Vulcan (Sol slots 8/9, r≈0.41/0.24, combined ≈0.17 M_E):
        #     Δv≈15.4 km/s, v_esc≈6.2 → ratio≈2.48 → retention=0.30 (floor)
        #   Tau Ceti e (mild-end anchor): ratio≈0.53 → retention≈0.81
        if outer["slot_r"] > 0 and inner["slot_r"] > 0:
            v_orbit_out = 29.785 * math.sqrt(M_star / outer["slot_r"])
            v_orbit_in = 29.785 * math.sqrt(M_star / inner["slot_r"])
            dv = abs(v_orbit_in - v_orbit_out)
        else:
            dv = 0.0
        v_esc = 11.186 * (rocky_combined ** (1.0 / 3.0))
        if v_esc > 0:
            retention_model = max(0.3, 1.0 - 0.37 * dv / v_esc)
        else:
            retention_model = 0.3
        expected = retention_model * rocky_combined
        merge_err = abs(expected - outer["observed"]) / outer["observed"]
        if merge_err < IMPACT_MASS_TOLERANCE:
            retention_obs = outer["observed"] / rocky_combined
            inner["interpretation"] = f"impacted {outer['name']}"
            suffix = ", iron-enriched" if retention_obs < 0.5 else ""
            outer["interpretation"] = (
                f"merger (absorbed slot {inner['slot_n']}{suffix})")

    # Append external (stellar) bodies as informational entries — they're
    # bound to the system but not products of the primary's disc.
    for p in external_bodies:
        results.append({
            "slot_n": -1,  # not a cascade slot
            "slot_r": p["r"],
            "r_used": p["r"],
            "filled": True,
            "name": p["name"],
            "rock": 0.0, "ice": 0.0, "pebble": 0.0, "core": 0.0,
            "t_form": 0.0, "h_he": 0.0,
            "predicted": p["observed"],
            "observed": p["observed"],
            "err_pct": 0.0,
            "implied_dM": 0.0,
            "stripped": False,
            "in_void": False,
            "external": True,
            "primordial": {"rock": 0.0, "ice": 0.0, "pebble": 0.0,
                           "h_he": 0.0, "core": 0.0, "total": p["observed"]},
            "interpretation": ("stellar companion (bound, not formed in disc)"
                               if p["observed"] >= M_STELLAR_BOUNDARY
                               else "external body"),
        })

    # Gravity-purge detection: brown-dwarf/stellar-companion bodies (both
    # cascade-occupants and externally bound companions) clear inner
    # cascade slots. Re-tag MISSING inner slots accordingly.
    PURGE_CLASSES = ("stellar companion", "brown dwarf")
    purgers = [s for s in results
               if s["filled"]
               and any(cls in s["interpretation"] for cls in PURGE_CLASSES)]
    for victim in results:
        if victim["filled"]:
            continue
        # Find outermost purger that's physically outer of this slot
        for purger in purgers:
            if purger["slot_r"] <= victim["slot_r"]:
                continue  # purger must be at a larger r
            old = victim["interpretation"]
            if "(destroyed by" in old:
                base = old.split(" (destroyed by")[0]
            else:
                base = old
            victim["interpretation"] = f"{base} (purged by {purger['name']})"
            break

    return {
        "slots": results,
        "ratio": 1.0 - math.sqrt(math.log(2.0)) / 2.0,
        "R_disc": disc_radius(M_star, spin),
        "spin": spin,
    }


def predict_slots(M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE,
                  f_disc_override=None):
    """
    Predict the geometric cascade: r_n = R_disc * 0.5837^n.

    The ratio 0.5837 = 1 - sqrt(ln 2)/2 = 1 - (1/(2√2))·√(2 ln 2) is the
    half-amplitude-at-45°-projection of the Gaussian accretion-zone HWHM;
    slot 0 sits at the Anti-Alfven Dam (R_disc) and the innermost slot
    at the inner Alfven-Dam vicinity. See cascade_slot_positions().

    Returns a dict with 'inner' (r <= r_snow) and 'outer' (r > r_snow)
    slot lists in AU.
    """
    r_snow = snow_line(M_star, f_disc_override=f_disc_override)
    slots = cascade_slot_positions(M_star, spin)
    return {
        "inner": [r for r in slots if r <= r_snow * 1.05],
        "outer": [r for r in slots if r > r_snow * 1.05],
    }


# ============================================================
#   PLANET DEFINITIONS (canonical Sol preset)
# ============================================================
# Same data as exoplanets.js: NASA JPL J2000 mean orbital elements and
# IAU mass values. r is the CURRENT (observed) AU; the slot-aware fit
# derives formation positions from the cascade geometry. Venus and
# Neptune are ISU (immutable) — they anchor the disc parameters; every
# other planet's delta from cascade prediction is a post-formation
# diagnostic (Vulcan merger, Theia delivery, Jupiter-driven slot 4-5
# swarm dispersal — see README and paper).
PLANETS = [
    {"name": "Mercury", "r": 0.387099,  "observed": 0.055274},
    {"name": "Venus",   "r": 0.723336,  "observed": 0.815004, "immutable": True},
    {"name": "Earth",   "r": 1.0,       "observed": 1.0},
    {"name": "Mars",    "r": 1.52371,   "observed": 0.107447},
    {"name": "Jupiter", "r": 5.202887,  "observed": 317.828133},
    {"name": "Saturn",  "r": 9.537,     "observed": 95.161398},
    {"name": "Uranus",  "r": 19.189165, "observed": 14.535778},
    {"name": "Neptune", "r": 30.069923, "observed": 17.149004, "immutable": True},
]


# ============================================================
#   RUN
# ============================================================

def run():
    M_star = M_STAR_PRIMORDIAL
    f_disc_override = F_DISC

    fit = slot_aware_fit(PLANETS, M_star, spin=None,
                         f_disc_override=f_disc_override)
    spin = fit["spin"]

    print("=" * 100)
    print("HYDROS PARADIGM — slot-aware cascade fit (canonical Sol preset)")
    print("=" * 100)
    print(f"  M_*_primordial   = {M_star} M_sun")
    print(f"  grain_opacity    = {GRAIN_OPACITY}  (universal constant)")
    print(f"  spin_relative    = {spin:.4f}  (auto-derived: R_disc anchored to outermost observed planet)")
    print(f"  f_disc           = {f_disc_override}")
    print("")
    print("Derived system properties:")
    print(f"  R_disc          = {fit['R_disc']:.3f} AU")
    print(f"  R_A             = {alfven_radius(M_star, spin):.4f} AU")
    print(f"  Cascade ratio   = {fit['ratio']:.4f}  (1 - sqrt(ln 2)/2)")
    print(f"  Compression     = {compression(M_star, spin):.3f}  ({'INVERTED' if compression(M_star, spin) > 1 else 'normal'})")
    print(f"  Snow line       = {snow_line(M_star, f_disc_override=f_disc_override):.2f} AU")
    print(f"  sigma_AAF       = {slope(M_star, f_disc_override):.4f} M_earth/AU  (Annulus Allocation Factor)")
    print(f"  Intercept       = {intercept(M_star, spin):.3f} M_earth")
    print("=" * 100)

    print(f"{'Body':<10} {'slot':>4} {'slot_r':>8} {'r_form':>8} {'t_form':>7} "
          f"{'pred':>9} {'obs':>9} {'dm%':>7}  interpretation")
    print("-" * 100)
    total_pred = 0.0
    total_obs = 0.0
    for s in sorted(fit["slots"], key=lambda x: -x["slot_n"]):
        name = s["name"] if s["filled"] else f"(slot {s['slot_n']})"
        obs = f"{s['observed']:.3f}" if s["filled"] else "—"
        if s["filled"] and s["observed"] > 0:
            dm = 100.0 * (s["observed"] - s["predicted"]) / s["predicted"]
            dm_str = f"{dm:+.1f}%"
            total_obs += s["observed"]
        else:
            dm_str = "—"
        total_pred += s["predicted"] if s["filled"] else s["primordial"]["total"]
        print(f"{name:<10} {s['slot_n']:>4} {s['slot_r']:>8.3f} {s['r_used']:>8.3f} "
              f"{s['t_form']:>7.2f} {s['predicted']:>9.3f} {obs:>9} {dm_str:>7}  "
              f"{s['interpretation']}")
    print("-" * 100)
    print(f"{'TOTAL':<10} {'':>4} {'':>8} {'':>8} {'':>7} {total_pred:>9.2f} {total_obs:>9.2f}")
    print("=" * 100)


def run_system(name, M_star, spin, planets, modifications=None,
               use_formation_radius=False, f_disc_override=None):
    """Run the model for an arbitrary exoplanet system."""
    if modifications is None:
        modifications = {}
    r_key = "r_form" if use_formation_radius else "r"
    fd_eff = f_disc(M_star, override=f_disc_override)

    print("=" * 78)
    print(f"HYDROS — {name}")
    print("=" * 78)
    print(f"  M_*_primordial   = {M_star} M_sun")
    print(f"  grain_opacity    = {GRAIN_OPACITY}  (universal constant)")
    print(f"  spin_relative    = {spin}")
    print(f"  f_disc           = {fd_eff*100:.2f}%  {'(overridden)' if f_disc_override else '(scaled)'}")
    print("")
    print("Derived system properties:")
    print(f"  R_disc          = {disc_radius(M_star, spin):.3f} AU")
    print(f"  R_A             = {alfven_radius(M_star, spin):.4f} AU")
    print(f"  Compression     = {compression(M_star, spin):.3f}  ({'INVERTED' if compression(M_star, spin) > 1 else 'normal'})")
    print(f"  Snow line       = {snow_line(M_star, f_disc_override=f_disc_override):.3f} AU")
    print(f"  sigma_AAF       = {slope(M_star, f_disc_override):.5f} M_earth/AU  (Annulus Allocation Factor)")
    print(f"  Intercept       = {intercept(M_star, spin):.4f} M_earth")
    print("=" * 78)

    print(f"{'Planet':<8} {'r(AU)':>8} {'rock':>8} {'ice':>8} {'core':>8} {'H/He':>8} {'pred':>8} {'obs':>8} {'err%':>7}")
    print("-" * 78)

    cores = {}
    for p in planets:
        r = p[r_key]
        rock = rock_allocation(r, M_star, spin, f_disc_override)
        ice = ice_allocation(r, M_star, spin, f_disc_override)
        cores[p["name"]] = rock + ice

    weights = {p["name"]: pebble_allocation_weight(p[r_key], M_star, f_disc_override) for p in planets}
    eligible = [p["name"] for p in planets
                if cores[p["name"]] > THRESHOLD_GAS
                and p.get("t_form", 0) < T_DISC_DISPERSAL_MYR]
    pebble_total = total_pebble_bonus_budget(M_star, f_disc_override)
    eligible_w_sum = sum(weights[n] for n in eligible if weights[n] > 0) or 1
    pebble = {p["name"]: (pebble_total * weights[p["name"]] / eligible_w_sum
                         if p["name"] in eligible and weights[p["name"]] > 0
                         else 0.0)
              for p in planets}

    for p in planets:
        r = p[r_key]
        rock = rock_allocation(r, M_star, spin, f_disc_override)
        ice = ice_allocation(r, M_star, spin, f_disc_override)
        core = rock + ice + pebble[p["name"]]
        h_he = hydrogen_capture(core, p.get("t_form", 1.0), spin, p[r_key], M_star, f_disc_override)
        raw = core + h_he
        mod = modifications.get(p["name"], {"delta": 0.0})
        predicted = raw + mod["delta"]
        obs = p.get("observed", 0)
        err = 100.0 * (predicted - obs) / obs if obs > 0 else 0
        print(f"{p['name']:<8} {r:>8.4f} {rock:>8.4f} {ice:>8.4f} "
              f"{core:>8.3f} {h_he:>8.2f} "
              f"{predicted:>8.3f} {obs:>8.3f} {err:>+6.1f}%")
    print("=" * 78)


if __name__ == "__main__":
    run()
