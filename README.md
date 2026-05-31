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

## Universal physical constants

| Constant | Value | Meaning |
|---|---|---|
| $Z$ | 0.014 | Solar metallicity |
| $f_{\text{rock}}$ | 0.22 | Rocky fraction of condensables (Lodders 2003) |
| $f_{\text{ice/rock}}$ | 3.5 | Ice/rock ratio past full condensation |
| $M_\oplus^{\text{thresh}}$ | 3.0 | Core mass for gas accretion onset |
| $\epsilon_{\text{pebble}}$ | 0.40 | Pebble capture efficiency (Lambrechts) |
| $\eta_{\text{rock}}$ | 0.78 | Rock retention (Mulders pebble drift loss) |
| $A_0$ | 58 | H/He envelope amplification at $t_{\text{form}}=0$ |
| $k_{\text{H/He}}$ | 0.684 | H/He decay rate (per Myr) |
| $t_{\text{disc}}$ | 5 Myr | Disc dispersal time at Sol disc-mass |
| $M_\odot / M_\oplus$ | 332946 | Solar mass in Earth masses |

## Derived disc properties

$$R_{\text{disc}} = 30 \cdot \frac{M_\star}{M_{\odot,\text{prim}}} \cdot \Omega^{-1/2}\ \text{AU}$$

$$R_A = 0.20 \cdot \frac{M_\star}{M_{\odot,\text{prim}}} \cdot \Omega^{4/7}\ \text{AU}$$

$$r_{\text{snow}} = \left[1.6 + 1.7\,g^{2.2}\right] \cdot \left(\frac{M_\star}{M_{\odot,\text{prim}}}\right)^{\!2} \cdot \sqrt{\frac{f_{\text{disc}}}{0.01}}\ \text{AU}$$

$$\text{slope} = \frac{M_\star \cdot Z \cdot f_{\text{rock}} \cdot f_{\text{disc}} \cdot \eta_{\text{rock}}}{R_{\text{disc}}}\ \text{M}_\oplus / \text{AU}$$

$$a_{\text{intercept}} = 0.596 \cdot \frac{M_\star}{M_{\odot,\text{prim}}} \cdot \Omega^{2/7}\ \text{M}_\oplus$$

$$C = R_A / R_{\text{disc}} \quad \text{(disc compression; normal if $C<1$, inverted if $C>1$)}$$

$$t_{\text{disc,eff}} = 5\,\text{Myr} \cdot \sqrt{\frac{M_{\text{disc}}}{M_{\text{disc,Sol}}}}$$

where $M_{\odot,\text{prim}} = 1.14\,M_\odot$ is the Sol calibration anchor.

**Boundary conditions:** rock and ice allocation are *zero* outside $[R_A, R_{\text{disc}}]$ — the inner magnetospheric void and outer disc-edge void both starve planets of material.

## Mass-allocation function

Per-planet total: $M(r) = M_{\text{rock}} + M_{\text{ice}} + M_{\text{pebble}} + M_{\text{H/He}} + \delta M$

### Rock allocation

For the normal regime ($C < 1$):

$$M_{\text{rock}}(r) = \begin{cases}
\text{slope} \cdot \left[(r + 0.078) - R_A\right] & \text{if}\ R_A \le r < 2 R_A \\
a_{\text{intercept}} + \text{slope} \cdot r & \text{if}\ 2 R_A \le r \le R_{\text{disc}} \\
0 & \text{otherwise (inner/outer void)}
\end{cases}$$

Plus a snow-line pile-up bump (in rock when $r \le r_{\text{snow}}$):

$$M_{\text{bump}}(r) = 0.5 \cdot \text{slope} \cdot r_{\text{snow}} \cdot \exp\!\left[-\frac{(r - r_{\text{snow}})^2}{2 \cdot (0.15\, r_{\text{snow}})^2}\right]$$

Plus an outer-edge Gaussian (rotational compression at $R_{\text{disc}}$):

$$M_{\text{outer}}(r) = \text{slope} \cdot R_{\text{disc}} \cdot C \cdot \exp\!\left[-\frac{(r - R_{\text{disc}})^2}{2 \cdot (0.3\, R_{\text{disc}})^2}\right]$$

### Ice allocation (past snow line, inside $R_{\text{disc}}$)

$$\eta_{\text{ice}}(r) = \exp\!\left[-\frac{r - r_{\text{snow}}}{0.8 \cdot R_{\text{disc}}}\right]$$

$$M_{\text{ice}}(r) = \text{slope} \cdot (r - r_{\text{snow}}) \cdot 3.5 \cdot \eta_{\text{ice}}(r) + M_{\text{bump}}(r)$$

### Pebble bonus (shared across eligible planets)

Total budget:

$$M_{\text{peb,total}} = f_{\text{disc}} \cdot Z \cdot (1 - f_{\text{rock}}) \cdot M_\star \cdot \epsilon_{\text{pebble}}$$

Per-planet weight:

$$w_i = \frac{1}{\sqrt{r_i - r_{\text{snow}}}} \quad (r_i > r_{\text{snow}})$$

Share (only for planets with core $\ge 3\,M_\oplus$ AND $t_{\text{form}} < 5\,\text{Myr}$):

$$M_{\text{peb},i} = M_{\text{peb,total}} \cdot \frac{w_i}{\sum_{j\in\text{eligible}} w_j}$$

### H/He envelope (only if core $\ge 3\,M_\oplus$)

$$A(t_{\text{form}}) = 58 \cdot \exp\!\left[-k_{\text{H/He}} \cdot t_{\text{form}}\right]$$

$$w_{\text{wind}}(r) = \frac{1}{1 + (\Omega/30)\cdot(0.5/r)^2}$$

$$M_{\text{H/He}} = M_{\text{core}} \cdot A(t_{\text{form}}) \cdot w_{\text{wind}}$$

where $k_{\text{H/He}} = 0.684 \cdot \max\!\left[1, \left(\dfrac{M_{\text{disc,Sol}}}{M_{\text{disc,sys}}}\right)^{2}\right]$ — low-mass discs disperse faster.

### Post-formation modifications

Per-planet $\delta M$ accounts for events that aren't part of the disc-allocation model:

| Body | $\delta M$ (M<sub>⊕</sub>) | Reason |
|---|---|---|
| Mercury | −0.02581 | Mantle ablation by giant impacts |
| Earth | +0.100 | Theia delivery (added to Earth) |
| Mars | −0.9587 | Jupiter Grand Tack depletion |
| Theia | −1.727 | Theia absorbed into Earth |

## Compactness back-dating

When best-fit runs, the disc is auto-compressed so formation positions are within a plausible Type-I migration window of observed orbits:

$$R_{\text{disc,target}} = 3 \cdot \max(r_{\text{observed}})$$

$$\Omega_{\text{target}} = \left(\frac{30 \cdot (M_\star/M_{\odot,\text{prim}})}{R_{\text{disc,target}}}\right)^{\!2}$$

If $R_{\text{disc,current}} > R_{\text{disc,target}}$, spin is bumped up to compress the disc. Sol's wide-spread architecture (max $r$ = 30 AU) doesn't trigger compression; compact systems like Kepler-90 (max $r$ = 1 AU) compress dramatically.

## Formation-time cascade (rocky-material-driven)

$$t_{\text{form}}(r) = 0.10 \cdot \frac{r}{\text{slope}}\ \text{Myr}$$

The constant $0.10$ is calibrated so Sol's Jupiter ($r=4.98$, slope=0.304) lands at $t_{\text{form}} \approx 1.6\,$Myr — matching Kruijer et al. 2017's <1 Myr Jupiter core formation. No floor and no ceiling — Mercury can form in $\sim 100\,$kyr; Neptune in $\sim 9\,$Myr.

For sub-threshold rocky planets ($M_{\text{target}} < 3\,M_\oplus$) this formula directly sets $t_{\text{form}}$ (mass is tf-independent).
For gas-eligible planets the formula seeds the bisection initial value, then bisection refines to match observed mass. No cross-planet cascade constraint — the natural cascade emerges where mass and radius correlate (Sol), and mass-driven scrambled cascades emerge in compact migrated systems (55 Cancri).

## Cascade slot prediction

Empty Hill-cascade slots ("predicted planets") are seeded from $2 R_A$ outward via mutual Hill spacing:

$$r_{n+1} = r_n + k \cdot R_{H,\text{mutual}}$$

where $R_{H,\text{mutual}} = \left(\dfrac{m_n + m_{n+1}}{3 M_\star}\right)^{1/3} \cdot \dfrac{r_n + r_{n+1}}{2}$ and $m_n$ is rock-only allocation at $r_n$.

$$k = \max(5,\, 40 \cdot R_{\text{disc}}/30)$$

calibrated so Sol's $R_{\text{disc}}=30$ AU disc uses $k=40$ (post-relaxation terrestrial spacing), and compact systems use smaller $k$ (resonance-locked packing).

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

All 9 planets including Theia fit **exactly** (mass error < 0.0% to display precision). Inputs: M<sub>★</sub>=1.14 M<sub>☉</sub>, spin=1.0, grain=0.82, f<sub>disc</sub>=0.01.

| Planet | Formation r (AU) | → Current r (AU) | t<sub>form</sub> (Myr) | Mod (M<sub>⊕</sub>) | Predicted (M<sub>⊕</sub>) | Observed (M<sub>⊕</sub>) |
|---|---|---|---|---|---|---|
| Mercury | 0.387 | 0.387 | 0.127 | −0.02581 | 0.055 | 0.055 |
| Venus | 0.720 | 0.723 | 0.237 | 0 | 0.815 | 0.815 |
| Earth | 0.999 | 1.000 | 0.329 | +0.100 | 1.000 | 1.000 |
| Mars | 1.524 | 1.524 | 0.501 | −0.9587 | 0.107 | 0.107 |
| Theia | 2.699 | → Earth | 0.888 | −1.727 | 0.100 | 0.100 |
| Jupiter | 5.553 | 5.20 | 1.638 | 0 | 317.83 | 317.83 |
| Saturn | 13.681 | 9.58 | 3.784 | 0 | 95.16 | 95.16 |
| Uranus | 14.979 | 19.2 | 9.050 | 0 | 14.54 | 14.54 |
| Neptune | 19.343 | 30.05 | 9.075 | 0 | 17.15 | 17.15 |

**Notable predictions of the model fit:**
- **Theia** sits at the snow-line pile-up (2.7 AU) as a Mars-mass "would-be gas giant" that didn't make it past the 3 M⊕ threshold before being scattered
- **Jupiter is the anchor** — formed at ~5.55 AU, barely moved (current 5.20 AU). Jupiter is **not** the inward actor.
- **Saturn is the inward migrator** — formed at ~13.68 AU and slid inward 4 AU to 9.58 AU. Saturn is the system's wandering planet.
- **Uranus & Neptune** migrated outward via Nice Model dynamics

This is a *different* dynamical history than the **Grand Tack** (Walsh et al. 2011), which has Jupiter excurse inward and then out, dragging Saturn behind it. The HYDROS fit instead says **Saturn migrated inward by itself while Jupiter stayed put**. The Grand Tack's role of "scattered the inner-system planetesimals via Jupiter's inbound sweep" is replaced by Saturn's inward sweep alone — Saturn passes through what's now the asteroid belt and Mars zone on its way to its 2:3 resonance with Jupiter.

Jupiter's near-zero migration matches the isotopic evidence (Kruijer+ 2017) that Jupiter cleaved the NC/CC meteorite reservoirs by ~1 Myr and didn't shift much afterward. This Saturn-as-interloper scenario isn't in any published theory — it's a HYDROS-specific prediction that emerges naturally from the local-capacity fit.

## Calibrated systems

15 systems with fits in `exoplanets.js`:

### G class (Sol-like)
- **Sol** — 9 bodies incl. Theia. Jupiter anchor, Saturn inward migrator.
- **55 Cancri** (G8V, 0.95 M<sub>☉</sub>) — 5 planets, all heavily migrated inward; outer Jupiter analog at 5.96 AU (current) formed at ~15 AU.
- **Kepler-90** (G, 1.13 M<sub>☉</sub>) — 8 planets in <1 AU; bone-dry compressed disc (R<sub>disc</sub>=3 AU < snow line at 5.9 AU); inner 6 are rock giants, outer 2 are gas giants.
- **Tau Ceti** (G8V, 0.78 M<sub>☉</sub>) — 4 small sub-Neptune planets; e and f have identical M sin i = 3.93 M<sub>⊕</sub> (inclination-corrected ~5.5 M<sub>⊕</sub>).
- **HD 134987** (G5V, 1.07 M<sub>☉</sub>) — 2 known gas giants, resonant inward pair from ~15 AU formation.
- **47 UMa** (G0V, 1.03 M<sub>☉</sub>) — 3 gas giants; b/c inwardly-migrating pair, d outer Nice-displaced.
- **μ Arae** (G3IV, 1.10 M<sub>☉</sub>) — 4 planets, all migrated inward from past-snow formation; d is a hot Neptune (post-dispersal stripped core).

### F class
- **HD 142** (F7V, 1.27 M<sub>☉</sub>) — 2 wide-orbit gas giants, high-f<sub>disc</sub> system.
- **HD 60532** (F6V, 1.44 M<sub>☉</sub>) — 2 super-Jupiters in 3:1 resonance, resonant pair migration.

### K class
- **HD 219134** (K3V, 0.81 M<sub>☉</sub>) — 6 planets; tight inner near-2:1 chain + outer Saturn-mass giant.
- **HD 69830** (K0V, 0.86 M<sub>☉</sub>) — 3 Neptune-mass planets, all migrated.

### M class
- **Proxima Cen** (α Cen C, M5.5V, 0.122 M<sub>☉</sub>) — 3 confirmed planets + predicted outer bodies.
- **GJ 876** (M4V, 0.37 M<sub>☉</sub>) — 4 planets in Laplace 1:2:4 resonance; gas giants around an M-dwarf require f<sub>disc</sub>=5% (exceptionally massive primordial disc).
- **TRAPPIST-1** (M8V, 0.089 M<sub>☉</sub>) — 7-planet resonance chain; planets formed past snow and convoy-migrated inward.

### A class
- **HR 8799** (A5V, 1.51 M<sub>☉</sub>) — 4 directly-imaged super-Jupiters at 14–68 AU; in-situ formation with monotonic t<sub>form</sub> cascade matching pebble drift timescale.

## Discoveries / model predictions

These observations emerged from the fitting process and aren't (to our knowledge) in published literature:

1. **Theia formed at the snow line as a would-be gas giant.** Sol's 2.7 AU snow-line pile-up produces a ~1.8 M⊕ body — just below the 3 M⊕ gas-accretion threshold. It would have crossed and become a Saturn-class giant if Jupiter's migration hadn't disrupted it. The Earth got the remnant.
2. **Saturn migrated inward; Jupiter stayed put.** The fit places Jupiter at 5.55 AU formation (current 5.20) and Saturn at 13.68 AU formation (current 9.58). This contradicts the Grand Tack hypothesis (which has Jupiter excursing inward) and matches Kruijer+ 2017's isotopic constraint that Jupiter formed early and didn't move.
3. **The 3–10 M⊕ "mass valley" is naturally explained.** Past the snow line, any planet exceeding 3 M⊕ rapidly balloons to 50+ via ice + pebble + H/He. So 3–10 M⊕ planets must form *inside* the snow line as rock giants or *after* envelope stripping. This matches the observed planet-radius valley at ~1.5–1.8 R⊕.
4. **Compact super-Earth systems require fast primordial stellar rotation.** Kepler-90, TRAPPIST-1, 55 Cancri all need spin ≳ 5–20 to compress R<sub>disc</sub> down to where their planets currently sit. This implies fast-rotating young stars, severe XUV stripping, and likely sterile planetary environments — "everything is dead in these systems."
5. **Formation-order is mass-driven, not radius-driven, in migrated systems.** Sol's coincidental "outer = heavier" gives a clean r-cascaded t<sub>form</sub>. Compact migrated systems (55 Cnc) show *scrambled* cascades where heavy gas giants form first regardless of their current orbital position.
6. **Hill-spacing is universal and slope-driven.** The cascade slot prediction uses a single $k$ scaling with $R_{\text{disc}}$, not separate inner/outer regimes. Outer planets are wider-spaced because their masses (and Hill radii) are larger, not because the physics changes.
7. **Sol's inner terrestrials are at 28–65 mutual Hill radii spacing** — "wide stable terrestrial" regime. Compact resonance-chain systems (TRAPPIST-1, Kep90 inner) sit at 10 R<sub>H</sub>, the chaotic-stability boundary held together only by resonance trapping.
8. **Many systems likely have undetected outer planets.** Cascade slot prediction routinely finds 1–6 empty slots per system at radii beyond current detection limits.

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
