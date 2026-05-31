# HYDROS Planet Formation Model

A local-capacity rule for primordial planetary mass allocation. Predicts planet masses from four system properties — stellar mass, grain size, primordial spin, and disc-to-star mass ratio — using a universal set of physical rules, plus per-planet orbital radius and formation timing.

**[Open the interactive tool →](./hydros.html)**

## What it is

HYDROS treats planet mass at orbital radius *r* as a **local accretion capacity**:

> Each AU position in a protoplanetary disc has a finite mass capacity determined by local physics — surface density, snow line, magnetic truncation, compression, pebble drift. The planet that forms at *r* captures roughly that capacity. Material between planet positions drains to the star, is scattered, or feeds neighbors.

The model is **not** a strict mass-conservation calculation — it's a function `M(r)` that empirically matches observed planet masses at observed positions across many stellar types.

## The four fundamental system inputs

| Input | Symbol | Sol value | Range |
|---|---|---|---|
| Primordial stellar mass | M<sub>★</sub> | 1.14 M<sub>☉</sub> | 0.08–2 M<sub>☉</sub> |
| Grain largeness | g | 0.82 | 0–1 |
| Primordial spin | Ω | 1.0 | 0.1–1000+ |
| Disc/star mass ratio | f<sub>disc</sub> | 1% | 0.1%–30% |

Every derived disc property (R<sub>disc</sub>, R<sub>A</sub>, snow line, slope, intercept, ice retention, pebble allocation, gas dispersal time) is computed from these inputs plus solar composition (Lodders 2003 abundances) and universal physics constants.

## Derived disc properties

| Property | Formula |
|---|---|
| Disc outer edge | R<sub>disc</sub> = 30 · (M<sub>★</sub>/1.14) · Ω<sup>−1/2</sup> AU |
| Magnetospheric void (inner edge) | R<sub>A</sub> = 0.20 · (M<sub>★</sub>/1.14) · Ω<sup>4/7</sup> AU |
| Snow line | r<sub>snow</sub> = grain_term · (M<sub>★</sub>/1.14)<sup>2</sup> · √(f<sub>disc</sub>/0.01) AU |
| Rocky slope | M<sub>★</sub> · Z · f<sub>rock</sub> · f<sub>disc</sub> · η<sub>rock</sub> / R<sub>disc</sub> |
| Backstop base mass | 0.596 · (M<sub>★</sub>/1.14) · Ω<sup>2/7</sup> M<sub>⊕</sub> |
| Disc compression | C = R<sub>A</sub>/R<sub>disc</sub> (normal if < 1, inverted if > 1) |
| Gas dispersal time | t<sub>disc</sub> = 5 · √(M<sub>disc</sub>/M<sub>Sol_disc</sub>) Myr |

**Boundary conditions:** rock and ice allocation are **zero** outside `[R_A, R_disc]` — the inner void (truncated by stellar magnetosphere) and outer void (past the disc edge) both starve planets of material.

## The mass-allocation function

For each planet at radius *r*, total mass = **rock + ice + pebble bonus + H/He envelope − post-formation modifications**.

**Rock** (M<sub>⊕</sub> per AU position):
- Inside 2·R<sub>A</sub>: slope · (r + 0.078 − R<sub>A</sub>) → smooth ramp from inner edge
- Past 2·R<sub>A</sub>: intercept + slope · r → linear growth
- Plus snow-line pile-up Gaussian centered at r<sub>snow</sub> (σ = 0.15 · r<sub>snow</sub>)
- Plus outer-edge Gaussian at R<sub>disc</sub> (σ = 0.3 · R<sub>disc</sub>)
- Zero past R<sub>disc</sub> (outer void)

**Ice** (past snow line):
- slope · (r − r<sub>snow</sub>) · 3.5 · η<sub>ice</sub>(r) where η<sub>ice</sub> = exp(−(r − r<sub>snow</sub>) / (0.8 R<sub>disc</sub>))
- Plus snow-line pile-up tail (same Gaussian as rock, contributes outward)
- Zero past R<sub>disc</sub>

**Pebble bonus** (shared across eligible planets):
- Total: f<sub>disc</sub> · Z · (1 − f<sub>rock</sub>) · M<sub>★</sub> · 0.40 (capture efficiency)
- Per planet: weight ∝ 1/√(r − r<sub>snow</sub>) — closer to snow = more pebble
- Eligible: core (rock+ice) ≥ 3 M<sub>⊕</sub> AND t<sub>form</sub> < 5 Myr (gas window)

**H/He envelope** (only if eligible):
- core × 58 · exp(−k · t<sub>form</sub>) · wind_suppression
- k = 0.684 (or higher for low-disc-mass systems)
- wind_suppression = 1 / (1 + (Ω/30)·(0.5/r)<sup>2</sup>)

**Post-formation modifications** (per-planet δM<sub>⊕</sub>):
- Mercury (Sol): −0.026 (mantle ablation)
- Earth (Sol): +0.100 (Theia delivery)
- Mars (Sol): −0.959 (Grand Tack depletion)
- Theia (Sol): −1.727 (absorbed into Earth)

## Compactness back-dating

When the best-fit algorithm runs, it auto-adjusts spin to keep the disc consistent with observed planet positions:

```
R_disc_target = max(0.05, 3 × max_observed_au)
```

If the current R<sub>disc</sub> exceeds this, spin is bumped up (compressing the disc) so the formation cascade can fit within plausible Type-I migration distances. Sol's planets at 0.4–30 AU need a wide disc; Kepler-90's planets at 0.07–1.0 AU need a tightly-compressed disc with high primordial spin.

## Formation-time cascade (rocky-material-driven)

`t_form` is derived from rocky-material pebble drift physics, not arbitrarily set:

```
t_form = 0.10 · r / slope   (Myr)
```

The constant 0.10 is calibrated to Sol's Jupiter (r=4.98, slope=0.304) landing at ~1.6 Myr — matching Kruijer et al. 2017's <1 Myr Jupiter core constraint.

For rocky planets (target < 3 M⊕) this formula directly sets t_form (mass is tf-independent for sub-threshold cores).

For gas-eligible planets the formula seeds the initial t_form, then a bisection refines it to match observed mass — without cross-planet cascade constraints, since real systems show that mass, not radius, determines formation order. The natural Sol-like cascade (Jupiter → Neptune) emerges where mass and radius correlate; compact migrated systems (55 Cancri) show mass-driven inverted cascades where the heaviest planets form first regardless of their formation radius.

## Solar System fit (calibration)

All 9 planets including Theia at ±0.0%:

| Planet | Formation r | Current r | t_form | Predicted | Observed |
|---|---|---|---|---|---|
| Mercury | 0.387 | 0.387 | 0.13 Myr | 0.055 | 0.055 |
| Venus | 0.720 | 0.723 | 0.24 | 0.815 | 0.815 |
| Earth | 0.999 | 1.000 | 0.33 | 1.000 | 1.000 |
| Mars | 1.524 | 1.524 | 0.50 | 0.107 | 0.107 |
| Theia | 2.699 | → Earth | 0.89 | 0.100 | 0.100 |
| Jupiter | 5.553 | 5.20 | 1.64 | 317.83 | 317.83 |
| Saturn | 13.68 | 9.58 | 3.78 | 95.16 | 95.16 |
| Uranus | 14.98 | 19.2 | 9.05 | 14.54 | 14.54 |
| Neptune | 19.34 | 30.05 | 9.07 | 17.15 | 17.15 |

**Notable predictions of the model fit:**
- **Theia** sits at the snow-line pile-up (2.7 AU) as a Mars-mass "would-be gas giant" that didn't make it past the 3 M⊕ threshold before Jupiter disrupted it
- **Jupiter is the anchor** — formed at ~5.5 AU, barely moved
- **Saturn is the migrator** — formed at ~13.7 AU and slid inward to 9.58 AU
- **Uranus & Neptune** migrated outward via Nice Model dynamics

This is a *different* dynamical history than the Grand Tack: Jupiter never went on an excursion, Saturn alone migrated inward. Jupiter's near-zero migration matches the isotopic evidence (Kruijer+ 2017) that Jupiter cleaved the NC/CC meteorite reservoirs by ~1 Myr and didn't shift much afterward.

## Other systems

The model includes calibrated fits for 14 exoplanet systems (in `exoplanets.js`):

- **G class**: Sol, 55 Cancri, Kepler-90, Tau Ceti, HD 134987, 47 UMa, μ Arae
- **F class**: HD 142, HD 60532
- **K class**: HD 219134, HD 69830
- **M class**: Proxima Cen, GJ 876, TRAPPIST-1
- **A class**: HR 8799

Each system's fit reveals its dynamical history: in-situ vs migrated, rocky vs gas-giant, compact-resonant vs spread-stable.

## Interactive tool

The HTML page has:

- **Preset selector** — pick a system to load its inputs and planets
- **Planet table** — edit per-planet r, t_form, observed mass, and modifications
- **Derived properties** panel — shows R_disc, R_A, snow line, slope, intercept, and cascade-predicted slot count
- **Calculate** button — recompute all predictions
- **+ Add planet** — manually add a row
- **+ Fill predicted slots** — auto-add predicted-planet entries at empty Hill-cascade slot positions (capped by cascade-budget, emptiest slots filled first)
- **Find best fit** — auto-solve r and t_form for known planets via bisection with compactness back-dating
- **Save as user preset** — store the current state in localStorage under the User optgroup (built-in presets are never modified)
- **Delete user preset** — remove user-saved entries

## Files

- `hydros.html` — interactive tool (standalone, works offline)
- `exoplanets.json` — preset system data (canonical)
- `exoplanets.js` — same data wrapped for browser loading (no fetch required)
- `hydros_model.py` — Python reference implementation (Sol baseline)
- `README.md` — this file

## License

MIT
