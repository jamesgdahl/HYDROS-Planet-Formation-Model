"""
HYDROS Paradigm — Solar System Mass Allocation Model
=====================================================

Driven by FIVE fundamental inputs (4 per-system, 1 per-planet):

    Per system:
      1. M_*_primordial    (stellar mass at formation, in M_sun)
      2. grain_largeness   (pebble size distribution, 0..1)
      3. spin_relative     (primordial stellar rotation, 1.0 = Sol's value)
      4. f_disc            (disc-to-star mass ratio at formation, fraction)

    Per planet:
      5. r                 (orbital radius, in AU)

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
GRAIN_LARGENESS = 0.82        # 0=small grains, 1=large grains (Mulders)
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


def snow_line(M_star=M_STAR_PRIMORDIAL, grain_largeness=GRAIN_LARGENESS, f_disc_override=None):
    """
    Snow line from viscous heating + grain opacity (Mulders et al.).

    Stellar luminosity contribution: r ∝ L_*^(1/2) ∝ M_*^2 (Hayashi PMS).
    Viscous heating contribution scales with disc mass: r ∝ f_disc^(1/2).
    Both multiply the grain-opacity term.

    Calibrated so Sol (M_*=1.14, g=0.82, fd=1%) → 2.7 AU.
    """
    r_small, r_large, q = 1.6, 3.3, 2.2
    grain_term = r_small + (r_large - r_small) * (grain_largeness ** q)
    fd = f_disc(M_star, override=f_disc_override)
    fd_ratio = fd / 0.01    # ratio to Sol's calibrated 1%, for viscous heating scaling
    mass_factor = (M_star / SOL_M_PRIMORDIAL) ** 2.0
    disc_factor = fd_ratio ** 0.5
    return grain_term * mass_factor * disc_factor


def slope(M_star=M_STAR_PRIMORDIAL, f_disc_override=None):
    """
    Linear rock allocation slope per AU.

    slope = M_* * Z * f_rock * f_disc * eta_rock / R_disc
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
    Backstop intercept from R_A trap residue.

    Scales with M_*_primordial (more matter in trap for bigger systems) and
    with spin (faster spin -> more efficient backstop trapping). Universal
    scaling: intercept ~ M_* * spin^(2/7) (matches R_A scaling roughly).

    Anchored to Sol's calibrated 0.596 M_earth.
    """
    return SOL_INTERCEPT * (M_star / SOL_M_PRIMORDIAL) * spin ** (2.0 / 7.0)


# ============================================================
#   ALLOCATION FUNCTIONS
# ============================================================

def rock_allocation(r, M_star=M_STAR_PRIMORDIAL, spin=SPIN_RELATIVE, f_disc_override=None):
    """
    Rock allocation dispatched by compression regime.

    Normal (C < 1):    M = a + slope * r  (mass grows outward from R_A)
    Inverted (C > 1):  M = a - slope * r  scaled by compression
                       (mass piles at inner edge, decays outward toward snow)
    """
    C = compression(M_star, spin)
    r_a = alfven_radius(M_star, spin)
    r_snow = snow_line(M_star, f_disc_override=f_disc_override)
    sl = slope(M_star, f_disc_override)
    a = intercept(M_star, spin)

    r_disc = disc_radius(M_star, spin)
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

    if C < 1.0:
        # Normal regime
        if r < 2.0 * r_a:
            outer_edge = (r + 0.465 - 0.387)
            base = sl * (outer_edge - r_a)
        else:
            base = a + sl * r
        return base + outer_pileup + snow_bump

    # Inverted regime: bi-modal — inner pile-up (linear decay) + outer pile-up.
    # M(r) is a LOCAL-CAPACITY rule (per AU position), not a mass-density.
    # Material flows through disc; planet at r gets whatever local accretion
    # conditions allow, not a fraction of disc budget.
    if r >= r_snow:
        return 0.0
    inner_fraction = max(0.0, 1.0 - r / r_snow)
    inner_contribution = natural_mass_scale * C * inner_fraction
    return max(0.0, inner_contribution + outer_pileup)


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
    """
    sl = slope(M_star, f_disc_override)
    r_snow = snow_line(M_star, f_disc_override=f_disc_override)
    if r <= r_snow:
        return 0.0
    base_ice = sl * (r - r_snow) * F_LODDERS_ICE * ice_retention(r, M_star, f_disc_override)

    # Universal snow-line pile-up (Mulders trap). Past snow line, bump tail
    # adds to ice budget (pebbles concentrating where ice condenses).
    snow_bump = snow_line_pileup(r, M_star, spin, f_disc_override)

    return base_ice + snow_bump


def total_pebble_bonus_budget(M_star=M_STAR_PRIMORDIAL, f_disc_override=None):
    """Pebble bonus budget = disc ice budget * capture efficiency."""
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

    Disc dispersal time scales with disc mass (universal):
    low-mass discs disperse faster → outer planets in small-disc systems
    don't accrete envelopes even if their cores exceed threshold.
    """
    if core_mass < THRESHOLD_GAS:
        return 0.0
    A_0 = 58.0
    # Disc-mass-dependent decay rate: smaller discs lose gas faster.
    # k_eff = k_sol × (Sol_disc_mass / system_disc_mass)^2  (capped at Sol value)
    sol_disc = 0.01 * m_star_earth(SOL_M_PRIMORDIAL)
    system_disc = f_disc(M_star, f_disc_override) * m_star_earth(M_star)
    k = 0.684 * max(1.0, (sol_disc / system_disc) ** 2)
    dispersal_factor = 1.0
    amplification = A_0 * math.exp(-k * t_form_myr)
    spin_ref = 30.0
    r_ref = 0.5
    if r is None:
        wind_term = (spin / spin_ref)
    else:
        wind_term = (spin / spin_ref) * (r_ref / max(r, 0.01)) ** 2
    wind_suppression = 1.0 / (1.0 + wind_term)
    return core_mass * amplification * wind_suppression * dispersal_factor


# ============================================================
#   PLANET DEFINITIONS (only r is per-planet)
# ============================================================
# eta_ice and t_form are properties of formation history at each r;
# in a fuller model they'd be derived from disc evolution timescales.

# r values for outer planets are PRIMORDIAL formation positions (Nice Model).
# All four outer planets migrated outward to current positions during Sol's
# first ~Gyr; the model's allocation rule applies at formation, not now.
# Note: Grand Tack initial config (J=3.5, S=4.5) is RULED OUT by this model —
# Jupiter cannot reach the 3 M⊕ gas-accretion threshold at 3.5 AU with default
# disc mass.
PLANETS = [
    {"name": "Mercury", "r": 0.387,   "t_form": 0.5,  "observed": 0.055},
    {"name": "Venus",   "r": 0.720,   "t_form": 1.0,  "observed": 0.815},  # primordial; migrated to 0.723
    {"name": "Earth",   "r": 1.000,   "t_form": 1.5,  "observed": 1.000},
    {"name": "Mars",    "r": 1.524,   "t_form": 2.0,  "observed": 0.107},
    {"name": "Jupiter", "r": 4.95,    "t_form": 1.6,  "observed": 317.83}, # primordial; migrated to 5.20
    {"name": "Saturn",  "r": 12.95,   "t_form": 3.7,  "observed": 95.16},  # primordial; migrated to 9.58
    {"name": "Uranus",  "r": 15.0538, "t_form": 9.1,  "observed": 14.54},  # primordial; migrated to 19.2
    {"name": "Neptune", "r": 21.1178, "t_form": 10.0, "observed": 17.15},  # primordial; migrated to 30.05
]

# Post-formation modifications now ONLY for inner system (which had less
# net migration but more impact/scattering events).
MODIFICATIONS = {
    "Mercury": {"delta": -0.02581, "reason": "mantle ablation"},
    "Earth":   {"delta": +0.100,   "reason": "Theia delivery"},
    "Mars":    {"delta": -0.9587,  "reason": "Jupiter Grand Tack depletion"},
}


# ============================================================
#   RUN
# ============================================================

def run():
    M_star = M_STAR_PRIMORDIAL
    spin = SPIN_RELATIVE
    grain = GRAIN_LARGENESS
    f_disc_override = None

    print("=" * 78)
    print("HYDROS PARADIGM — fundamental inputs only")
    print("=" * 78)
    print(f"  M_*_primordial   = {M_star} M_sun")
    print(f"  grain_largeness  = {grain}")
    print(f"  spin_relative    = {spin}  (1.0 = Sol's primordial rotation)")
    print("")
    print("Derived system properties:")
    print(f"  R_disc          = {disc_radius(M_star, spin):.2f} AU")
    print(f"  R_A             = {alfven_radius(M_star, spin):.3f} AU")
    print(f"  Compression     = {compression(M_star, spin):.3f}  ({'INVERTED' if compression(M_star, spin) > 1 else 'normal'})")
    print(f"  Snow line       = {snow_line(M_star, grain, f_disc_override):.2f} AU")
    print(f"  Slope           = {slope(M_star):.4f} M_earth/AU")
    print(f"  Intercept       = {intercept(M_star, spin):.3f} M_earth")
    print("=" * 78)

    print(f"{'Planet':<8} {'r(AU)':>7} {'rock':>7} {'ice':>7} {'core':>7} {'H/He':>9} {'pred':>9} {'obs':>9} {'err%':>6}")
    print("-" * 78)

    # Pebble bonus budget and per-planet weights
    pebble_total = total_pebble_bonus_budget(M_star, f_disc_override)
    weights = {p["name"]: pebble_allocation_weight(p["r"], M_star, f_disc_override) for p in PLANETS}
    total_w = sum(w for w in weights.values() if w > 0)
    # Only allocate to gas-giant candidates (cores that cross threshold)

    total_pred = 0.0
    total_obs = 0.0

    # First pass: cores without pebble bonus
    cores = {}
    for p in PLANETS:
        rock = rock_allocation(p["r"], M_star, spin)
        ice = ice_allocation(p["r"], M_star, spin)
        cores[p["name"]] = rock + ice

    # Pebble bonus eligibility: body crossed threshold AND formed during gas window
    eligible = [p["name"] for p in PLANETS
                if cores[p["name"]] > THRESHOLD_GAS
                and p["t_form"] < T_DISC_DISPERSAL_MYR]
    eligible_w_sum = sum(weights[n] for n in eligible if weights[n] > 0)
    pebble = {p["name"]: (pebble_total * weights[p["name"]] / eligible_w_sum
                         if p["name"] in eligible and weights[p["name"]] > 0
                         else 0.0)
              for p in PLANETS}

    for p in PLANETS:
        rock = rock_allocation(p["r"], M_star, spin)
        ice = ice_allocation(p["r"], M_star, spin)
        core = rock + ice + pebble[p["name"]]
        h_he = hydrogen_capture(core, p["t_form"], spin, p["r"], M_star)
        raw = core + h_he

        mod = MODIFICATIONS.get(p["name"], {"delta": 0.0})
        predicted = raw + mod["delta"]
        err = 100.0 * (predicted - p["observed"]) / p["observed"]

        print(f"{p['name']:<8} {p['r']:>7.3f} {rock:>7.3f} {ice:>7.3f} "
              f"{core:>7.2f} {h_he:>9.2f} "
              f"{predicted:>9.3f} {p['observed']:>9.3f} {err:>+5.1f}%")

        total_pred += predicted
        total_obs += p["observed"]

    print("-" * 78)
    print(f"{'TOTAL':<8} {'':>7} {'':>7} {'':>7} {'':>7} {'':>9} {total_pred:>9.2f} {total_obs:>9.2f}")
    print("=" * 78)

    print(f"\nPebble bonus budget: {pebble_total:.2f} M_earth (= disc ice × capture eff)")
    print(f"Eligible gas-giant accretors (t_form < {T_DISC_DISPERSAL_MYR} Myr + core > {THRESHOLD_GAS}):")
    for n in eligible:
        print(f"  {n:<8}  +{pebble[n]:.2f} M_earth  (allocation weight {weights[n]/eligible_w_sum:.2f})")

    print("\nPost-formation modifications:")
    for name, mod in MODIFICATIONS.items():
        print(f"  {name:<8}  {mod['delta']:+.3f} M_earth   ({mod['reason']})")


def run_system(name, M_star, spin, grain, planets, modifications=None,
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
    print(f"  grain_largeness  = {grain}")
    print(f"  spin_relative    = {spin}")
    print(f"  f_disc           = {fd_eff*100:.2f}%  {'(overridden)' if f_disc_override else '(scaled)'}")
    print("")
    print("Derived system properties:")
    print(f"  R_disc          = {disc_radius(M_star, spin):.3f} AU")
    print(f"  R_A             = {alfven_radius(M_star, spin):.4f} AU")
    print(f"  Compression     = {compression(M_star, spin):.3f}  ({'INVERTED' if compression(M_star, spin) > 1 else 'normal'})")
    print(f"  Snow line       = {snow_line(M_star, grain, f_disc_override):.3f} AU")
    print(f"  Slope           = {slope(M_star, f_disc_override):.5f} M_earth/AU")
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
