# HYDROS Planet Formation Model

A geometric-cascade rule for primordial planetary mass allocation. Predicts planet masses, formation positions, and migration/impact histories from four system properties — stellar mass, grain size, primordial spin, and disc-to-star mass ratio — using a universal set of physical rules anchored to discrete cascade slots set by the disc geometry.

**[Open the interactive tool →](./index.html)**

## What it is

HYDROS treats the protoplanetary disc as a discrete **cascade of formation slots** in geometric ratio:

$$r_n = R_{\text{disc}} \cdot \rho^n, \quad \rho = 1 - 0.3\sqrt{2 \ln 2} \approx 0.647$$

The ratio ρ is the **Gaussian shoulder half-width** at FWHM. Each slot sits at the shoulder of the next outer slot's accretion zone — the disc's natural self-spacing under gravitational + viscous dynamics. Slots extend from the outer **Anti-Alfvén Dam** (R_disc) inward until they would fall below the inner **Alfvén Dam** (R_A, magnetospheric truncation):

$$N_{\text{slots}} = \left\lfloor \frac{\ln(R_A / R_{\text{disc}})}{\ln \rho} \right\rfloor + 1$$

In the **inverted regime** (R_A ≥ R_disc, found in compact compressed systems), the cascade defaults to 11 slots representing a compressed inner reservoir.

Each slot has a finite primordial mass capacity determined by local physics (rock/ice/pebble allocation, gas accretion, wind suppression). The planet observed near that slot represents the formation outcome at that location, possibly modified by post-formation events (migration, impact, atmospheric loss, late delivery).

## The four fundamental system inputs

| Input | Symbol | Sol value | Range |
|---|---|---|---|
| Primordial stellar mass | M<sub>★</sub> | 1.14 M<sub>☉</sub> | 0.08–2 M<sub>☉</sub> |
| Grain largeness | g | 0.82 | 0–1 |
| Primordial spin | Ω | 0.995 | 0.1–2000+ |
| Disc/star mass ratio | f<sub>disc</sub> | 0.01 | 0.001–0.5 |

Every derived disc property is computed from these inputs plus solar composition (Lodders 2003 abundances) and universal physics constants.

## Universal physical constants

| Constant | Value | Meaning |
|---|---|---|
| ρ | 0.6468 | Cascade ratio (1 − 0.3√(2ln2), Gaussian shoulder FWHM) |
| Z | 0.014 | Solar metallicity |
| f_rock | 0.22 | Rocky fraction of condensables |
| f_ice/rock | 3.5 | Ice/rock ratio past full condensation |
| M_thresh | 3.5 M⊕ | Core mass for gas accretion onset |
| ε_pebble | 0.40 | Pebble capture efficiency |
| η_rock | 0.78 | Rock retention (pebble drift loss) |
| **A_0** | **96.3** | H/He amplification at t_form=0 (recalibrated against Sol's Jupiter at f_disc=0.01 Venus-anchored value) |
| **k_H/He** | **0.783** | H/He decay rate (per Myr) |
| T_STRIP | 2000 K | Silicate vaporization temperature (mantle stripping threshold) |
| IRON_FRAC | 0.30 | Iron-core retained mass fraction post-stripping |
| BD_threshold | 4131 M⊕ | Brown-dwarf lower bound (13 M_J) |
| Stellar_threshold | 25,400 M⊕ | Stellar lower bound (80 M_J) |

## Derived disc properties

$$R_{\text{disc}} = 30 \cdot \frac{M_\star}{1.14} \cdot \Omega^{-1/2}\ \text{AU}$$

$$R_A = 0.151 \cdot \frac{M_\star}{1.14} \cdot \Omega^{4/7}\ \text{AU}$$

$$r_{\text{snow}} = \left[1.6 + 1.7\,g^{2.2}\right] \cdot \left(\frac{M_\star}{1.14}\right)^{\!2} \cdot \sqrt{\frac{f_{\text{disc}}}{0.01}}\ \text{AU}$$

$$\sigma_{\text{AAF}} = \frac{M_\star \cdot Z \cdot f_{\text{rock}} \cdot f_{\text{disc}} \cdot \eta_{\text{rock}}}{R_{\text{disc}}}\ \text{M}_\oplus / \text{AU}$$

$$C = R_A / R_{\text{disc}} \quad \text{(disc compression; normal if C<1, inverted if C>1)}$$

$$t_{\text{disc,eff}} = 5\,\text{Myr} \cdot \sqrt{\frac{M_{\text{disc}}}{M_{\text{disc,Sol}}}}$$

## Anchor algorithm

**The outermost observed planet anchors the cascade.** Its position determines R_disc; spin is back-derived to make this true. Stage 1 then iterates the slot index k where the outermost planet sits (k=0..11), picking the lowest k that satisfies physical constraints:

- **In-situ check**: actual mass+AU-scored assignment must place the outermost at slot k (not migrated off it)
- **Mass match (rocky anchors only)**: predicted/observed ratio in [0.75, 1.333] (±25% loss tolerance)
- **Stellar rejection**: any MISSING slot predicting ≥ stellar mass (25,400 M⊕) is rejected — we can't invoke an undetected star
- **Score**: `unassigned·1e6 + pos_resid + missing_mass_cost + K_PENALTY·k`
  - K_PENALTY = 1.5: prefers low-k anchors (outermost-at-R_disc is the default in-situ scenario)
  - missing_mass_cost = Σ log₁₀(1 + m_pred) over empty slots — discourages invoking outer brown-dwarf-mass bodies

**Stage 2 — outward migration** activates if Stage 1's pos_resid > 1.5 (planets need significant cross-cascade migration to fit). In Stage 2:
- The outermost planet is forced to slot 0 as an **outward migrant** (its current observed position is OUTSIDE R_disc; it formed at R_disc and migrated outward)
- The cascade is rooted by the **second-outermost** planet at slot k1 (iterated from 1 to 5)
- R_disc = r_{second-outermost} / ρ^{k1}, putting the second planet exactly on slot k1
- Inner planets fit at remaining cascade slots
- **Wind-suppression feasibility check** on outermost: at slot 0's R_disc, wind suppression must be > 0.1 — gas-giant migrant formation is implausible at high primordial-spin inner radii
- **Migration t_form cap** of 2 Myr (Saturn-Lua destabilization window): once orbit is destabilized, outward migration is fast (~10⁵ yr), so the gas giant must have completed accretion BEFORE destabilization

Stage 2 score includes a STAGE2_PENALTY = 2 (invoking a migration story is itself a cost) and K1_PENALTY = (k1−1) for each vacated outer slot beyond the migrant.

**In-situ is the default; migration is the exception that emerges only when the cascade structure forces it.**

## Mass allocation

### Rock allocation (per slot)

Inside `[R_A, R_disc]`:
$$M_{\text{rock}}(r) = \begin{cases}
\sigma_{\text{AAF}} \cdot [(r + 0.078) - R_A] & R_A \le r < 2 R_A \\
a_{\text{intercept}} + \sigma_{\text{AAF}} \cdot r & 2 R_A \le r \le R_{\text{disc}}
\end{cases}$$

Plus snow-line pile-up bump (when r ≤ r_snow):
$$M_{\text{bump}}(r) = 0.5 \sigma_{\text{AAF}} \cdot r_{\text{snow}} \cdot \exp\!\left[-\frac{(r - r_{\text{snow}})^2}{2(0.15 r_{\text{snow}})^2}\right]$$

Plus outer-edge Gaussian (rotational compression at R_disc):
$$M_{\text{outer}}(r) = \sigma_{\text{AAF}} \cdot R_{\text{disc}} \cdot C \cdot \exp\!\left[-\frac{(r - R_{\text{disc}})^2}{2(0.3 R_{\text{disc}})^2}\right]$$

### Ice allocation (past snow line)

$$\eta_{\text{ice}}(r) = \exp\!\left[-\frac{r - r_{\text{snow}}}{0.8 R_{\text{disc}}}\right]$$

$$M_{\text{ice}}(r) = \sigma_{\text{AAF}} (r - r_{\text{snow}}) \cdot 3.5 \cdot \eta_{\text{ice}}(r) + M_{\text{bump}}(r)$$

### Pebble flux allocation

Pebbles drift inward from the snow line; gas-eligible cores capture shares weighted by inverse-sqrt distance from snow line:
$$M_{\text{peb},i} = M_{\text{peb,total}} \cdot \frac{w_i}{\sum_j w_j}, \quad w_i = \frac{1}{\sqrt{r_i - r_{\text{snow}}}}$$

### H/He envelope (core ≥ 3.5 M⊕)

$$A(t_{\text{form}}) = 90.3 \cdot \exp\!\left[-0.783 \cdot \max\!\left(1, (M_{\text{disc,Sol}}/M_{\text{disc,sys}})^2\right) \cdot t_{\text{form}}\right]$$

$$w_{\text{wind}}(r) = \frac{1}{1 + (\Omega/30)(0.5/r)^2}$$

$$M_{\text{H/He}} = M_{\text{core}} \cdot A(t_{\text{form}}) \cdot w_{\text{wind}}$$

**A_0 = 90.3 and k = 0.783 are calibrated against Sol's Jupiter (slot 4) and Neptune (slot 0, immutable)** — both fit observed mass exactly at the cascade-default `t_form = 0.10·r/σ_AAF`. With this calibration, Saturn's +19 M⊕ excess and Uranus's −12 M⊕ deficit emerge as visible diagnostics of post-formation modifications (Lua-ejection stripped envelope capture, Uranus tilt-impactor loss).

## T_eq stripping (silicate vaporization)

Planets in zones with stellar bolometric heating that brings equilibrium temperature above 2000 K lose their silicate mantle, leaving only their iron core:

$$T_{\text{eq}}(r) = \left[\frac{L_\star (1-\alpha)}{4 \pi r^2 \sigma_{\text{SB}}}\right]^{1/4}$$

where the primordial stellar luminosity is $L_\star = 10 \cdot M_\star^4 \cdot L_\odot$ (T-Tauri pre-MS boost). When T_eq > T_STRIP=2000 K:

$$\text{retained fraction} = \max\!\left[0, 1 - (T_{\text{STRIP}} / T_{\text{eq}})^4\right]$$

Stripped planets are matched against their slot's iron-only inventory (rocky × 0.30) for assignment purposes, then tagged "core remnant" with the appropriate progenitor composition class.

## Impact-merger detection (continuum)

Adjacent slot pairs where the outer is filled and inner is empty are checked for merger:

$$\Delta v = |v_{\text{orbit}}(r_{\text{inner}}) - v_{\text{orbit}}(r_{\text{outer}})|, \quad v_{\text{orbit}}(r) = 29.785 \sqrt{M_\star / r}\ \text{km/s}$$

$$v_{\text{esc}}(M) = 11.186 \cdot M^{1/3}\ \text{km/s (rocky)}$$

$$\text{retention} = \max\!\left[0.3,\ 1 - 0.37 \cdot \Delta v / v_{\text{esc}}\right]$$

Calibration anchors:
- **Mercury–slot 11 merger**: Δv=11.9 km/s, v_esc=6.3 km/s, retention=0.30 (iron-enriched remnant)
- **Tau Ceti e + slot 3**: Δv=7.9 km/s, v_esc=15.0 km/s, retention=0.81 (partial merger, ~20% ejecta)

When the predicted retained mass matches observed within 20%, the merger is flagged: `merger (absorbed slot N)` with `, iron-enriched` suffix when retention < 0.5.

## Mutual eviction detection

Two adjacent MISSING slots both predicting brown-dwarf-or-larger mass (>4131 M⊕) cannot coexist — their Sep/R_H,mutual is well below the catastrophic stability threshold (~3.5). The framework checks:

$$R_{H,\text{mutual}} = a_{\text{avg}} \cdot \left(\frac{m_1 + m_2}{3 M_\star}\right)^{1/3}$$

If `Sep / R_H,mutual < 3.5`, both slots are labeled `<class> (mutually evicted with slot N)` — one likely ejected outward, the other consumed by the host star or absorbed by a remaining gas giant. Used in Beta Pictoris (slots 1+2 both predict ~5000-8000 M⊕ brown dwarfs that mutually evicted).

## Missing-slot labeling

Empty cascade slots get labels reflecting:
- The PRIMORDIAL composition class they would have hosted (`rocky`, `gas giant`, `ice giant`, `brown dwarf`)
- **No automatic "destroyed by [migrant]" attribution** — that's speculative inference from co-occurrence. Default suffix is `(not observed)` indicating uncertainty.
- Specific attributions only attached when supported by detection logic:
  - `(mutually evicted with slot N)` from the eviction detector above
  - `(impacted X)` from the adjacent-merger detector
  - `(in inverted void)` for slots inside R_A
- Sol's slot 3 reads `gas giant (not observed)` — the Lua hypothesis is left to interpretation in the notes, not asserted as fact

## External bodies and disc truncation

Bodies above the stellar threshold (25,400 M⊕ = 80 M_J) are flagged as **stellar companions** and excluded from cascade fitting. They don't anchor R_disc, don't get cascade slots, but trigger:

**Holman-Wiegert disc truncation**: the disc's effective outer radius is capped at 0.15 × the closest stellar companion's semi-major axis. In binary systems the truncated R_disc takes precedence over the outermost observed disc-formed planet.

Bodies between brown dwarf (4131 M⊕) and stellar (25,400) thresholds are flagged **brown dwarf** — they participate in gravity-purge dynamics (sweep inner slots) but aren't cascade products.

## ISU (In-Situ Unchanged) flag

Each planet has an `immutable: true` flag (preset data) and corresponding UI checkbox labeled **ISU**. The flag declares: this planet's observed mass and position are absolute source-of-truth. The bisection algorithm respects it asymmetrically:

**When any ISU planet exists in the system:**
- **f_disc bisection target = sum over ISU planets only** — they pin disc mass
- **ISU rocky** (e.g., Sol's Venus): predicted core = observed exactly (drives f_disc)
- **ISU gas-eligible** (e.g., Sol's Neptune): t_form bisection still fits observed
- **Non-ISU gas planets use cascade-default t_form** = 0.10·r/σ_AAF — predicted vs observed delta surfaces post-formation modifications (impact loss, late delivery, atmospheric stripping). Uranus's -42% mass deficit becomes visible diagnostic of its tilt-impactor event.
- **Non-ISU rocky planets** show cascade-natural mass; deltas indicate impacts/late-delivery

**When no ISU planets exist:**
- f_disc bisects across ALL observed planets (consensus inference)
- All gas-eligible planets bisect t_form per-slot (each matches observed)
- Treats observations as fittable rather than fixed
- Wild variance in per-planet implied f_disc, or suspiciously round masses (5.000, 7.000 M⊕), flag measurement-quality issues

**Bisection convergence tolerance** scales with the smallest target observed mass: `tol_abs = max(1e-6, 0.001 × min(target observed))`. Without this, a large gas-giant ISU (e.g., Neptune at 17 M⊕) inflates the totalTarget and a small rocky ISU (Venus at 0.815 M⊕) ends up with ~0.7% residual error. Tightening to per-target precision makes Venus's exact match work.

The asymmetric design encodes the philosophy: rare well-characterized planets anchor the disc mass; the rest of the system's deviations from cascade prediction become formation-history diagnostics.

## Migration scenarios

**Inward migrant**: assigned slot's r > observed r. Mass match via the assignment's mass+AU scoring; gas giants like Saturn pick their formation slot by mass even when observed r is closer to another slot. Δr is negative; classifier tags `migrated inward`.

**Outward migrant**: observed r > R_disc (planet is OUTSIDE the cascade entirely). Detected in Stage 2 fits with the threshold `r > 1.2·R_disc`. Forms at slot 0, migrates outward via Saturn-Lua-style destabilization. Classifier tags `migrated outward`.

## Solar System fit (calibration anchor)

Inputs: M★=1.14 M☉, spin=0.9954, grain=0.82, f_disc=0.01. **Venus and Neptune are ISU** (immutable, anchor disc parameters).

| Planet | Slot | r_form (AU) | t_form (Myr) | Predicted (M⊕) | Observed (M⊕) | Δm% | Interpretation |
|---|---|---|---|---|---|---|---|
| Mercury | 10 | 0.387 | 0.13 | 0.108 | 0.055 | −49% | merger (absorbed slot 11, iron-enriched) |
| Venus | 9 | 0.723 | 0.24 | 0.815 | 0.815 | 0.0% | **ISU** rocky (in situ) |
| Earth | 8 | 1.000 | 0.33 | 0.899 | 1.000 | +11% | rocky (late delivery — Theia) |
| Mars | 7 | 1.524 | 0.50 | 1.065 | 0.107 | −90% | rocky (scattered/lost — Borealis impact) |
| (slot 6) | 6 | 2.201 | — | 1.46 | — | — | rocky (not observed) |
| (slot 5) | 5 | 3.403 | — | 2.45 | — | — | rocky (not observed) |
| Jupiter | 4 | 5.203 | 1.71 | 318.15 | 317.83 | −0.1% | gas giant (in situ, anchor) |
| (slot 3 / Lua?) | 3 | 8.14 | — | 164.3 | — | — | gas giant (not observed) — Lua candidate |
| Saturn | 2 | 12.58 | 4.14 | 72.26 | 95.16 | +32% | gas giant (migrated inward, captured Lua-stripped gas) |
| Uranus | 1 | 19.19 | 6.32 | 25.70 | 14.54 | −43% | ice giant (impact loss) |
| Neptune | 0 | 30.07 | 9.12 | 17.15 | 17.15 | 0.0% | **ISU** ice giant (in situ) |

The fit tells a coherent formation story:
1. **In-situ cascade forms** with Jupiter (slot 4) and Saturn (slot 2) as anchors of the gas giant zone
2. **Lua** forms at slot 3 (between Jupiter and Saturn), reaches ~Jupiter-mass by 1-2 Myr
3. **Saturn-Lua resonance crossing** at ~1-2 Myr destabilizes the pair; Lua ejected, Saturn recoils inward
4. Saturn captures ~19 M⊕ of Lua's tidally-stripped envelope while migrating
5. Mars and slots 5, 6 scattered/destroyed during Saturn's migration (Borealis impactor delivered to inner system)
6. **Mercury merger** with slot 11 inner body → iron-enriched remnant (~30% retention)
7. **Earth-Theia event** delivers ~10% of Earth's mass + water (the "late delivery" needed for habitability)
8. **Uranus impact** strips ~50% of envelope (consistent with axial tilt anomaly)
9. **Neptune** survives untouched — anchors outer cascade

## Calibrated systems (~20 in the preset catalog)

### G class
- **Sol** — 8 planets + 3 destroyed slots + ejected Lua; Saturn migrated inward, Jupiter stayed put
- **Tau Ceti** (G8V, 0.78 M☉) — 4 rocky survivors of inverted-regime cascade with impact cascade
- **HD 7924, 47 UMa, μ Arae, 55 Cancri** — various migration histories

### F class
- **HD 142, HD 60532** — heavy migration scenarios

### K class
- **Alpha Centauri** (binary, Holman-Wiegert truncation applied)
- **HD 219134** (K3V) — **Stage 2 outward-migration scenario**: outermost gas giant migrated from slot 0 at 0.897 AU outward to 3.06 AU after Saturn-Lua-type destabilization; inner 5 rocky planets in compressed inverted cascade
- **HD 20794 (82 G Eri), HD 69830, HD 192310, HD 134987**

### M class
- **Proxima Cen**, **GJ 876**, **TRAPPIST-1**

### A class & beyond
- **HR 8799** — 4 super-Jupiters with brown dwarf gravity-purge; no inner cascade
- **Beta Pictoris** — 4-slot cascade with debris disc signature
- **Upsilon Andromedae** — fast-rotator with hot-Jupiter migration

## Discoveries / model predictions

These emerged from the framework and aren't (to our knowledge) in published literature:

1. **In-situ is the default; migration is rare.** Once the geometric cascade is anchored to the outermost observed planet's r, most systems fit without invoking migration. Within the Sol preset, only Saturn is a confirmed migrant. The framework inverts the classical assumption that migration is the standard explanation for short-period giants.
2. **The Saturn-Lua mechanism.** A slot-3 gas giant ("Lua") at ~1.5 Jupiter mass formed between Jupiter and Saturn, was destabilized at 1-2 Myr, ejected from the system with ~20% of its envelope stripped (some captured by Saturn). Saturn recoiled to 9.58 AU. This is mechanistically different from Grand Tack — Saturn moves, Jupiter doesn't.
3. **HD 219134's outward-migrant story.** Its outermost 108 M⊕ Saturn-mass planet at 3.06 AU formed at slot 0 of a compressed inverted cascade (R_disc ≈ 0.9 AU), then migrated outward via Saturn-Lua-type destabilization. The 5 inner rocky planets are the surviving cascade.
4. **The cascade ratio is the Gaussian shoulder FWHM.** ρ ≈ 0.647 falls out of disc dynamics — not Hill spacing, not resonance, but the natural FWHM-shoulder geometry of self-organizing viscous discs.
5. **Wind suppression dominates inner-slot gas accretion.** Hot Jupiters in compressed inverted-regime systems can't be formed at the innermost slot because primordial stellar wind blows gas away before runaway accretion. This forces outward-migrant interpretations for them.
6. **Brown dwarf gravity purge.** Massive companions (13-80 M_J) sweep inner cascade slots clean via gravitational perturbation. HR 8799 and a few other directly-imaged systems show this pattern.
7. **Two-flavor merger continuum.** Iron-enriched (Mercury-Borealis style, ~30% retention at high Δv/v_esc) and clean merger (~95% retention at low Δv/v_esc) are the same physical process at different impact-energy ratios; the framework's retention formula = max(0.3, 1 − 0.37·Δv/v_esc) captures both.
8. **Habitability is a hard filter.** Stacking the constraints — outer giant shield + slow-rotator host + outer reservoir intact + Goldilocks-architecture cascade survivor + late-delivery event + Theia-like impactor + oxygen-producing photosynthesis emerging + Boring-Billion breakthrough — gives ~600-1,200 complex-life worlds in the entire Milky Way GHZ. Nearest Earth-twin: ~1,500-2,500 ly. Within 100 ly: probably only Earth.

## Algorithm pipeline

```
1. auto_spin_with_anchor_search(planets, M_star, grain, f_disc)
   Stage 1: outermost planet at varying k=0..11
     for each k:
       compute spin → cascade slots
       greedy mass+AU assignment
       check: stellar-mass-missing? in-situ anchor? mass-match (rocky)?
       score = unassigned·BIG + pos_resid + missing_cost + K_PENALTY·k
   Stage 2 (if stage 1 pos_resid > 1.5):
     for k1=1..5:
       R_disc = second_outermost.r / ρ^k1
       wind-suppression feasibility at slot 0
       outermost → slot 0 (outward migrant)
       inner planets greedy assignment
       score = pos_resid + missing_cost + STAGE2_PENALTY + K1_PENALTY·(k1−1)
   Return winning (spin, anchor_slot)

2. slot_aware_fit with chosen spin
   For each filled slot:
     determine fit_r (slot_r for migrants, observed for in-situ)
     compute rock, ice, pebble allocations
     check t_form bisection eligibility:
       - immutable + gas-eligible: bisect t_form (capped at 2 Myr for outward migrants)
       - non-immutable: use default t_form = 0.10·r/σ_AAF
     compute H/He capture
     compute T_eq, apply stripping if T_eq > 2000 K
     classify (in situ / migrated / scattered / merger / impact loss / late delivery)
   Run adjacent-slot merger detection
   Return results table

3. findBestFit
   Bisect f_disc (or fix to immutable-anchored value) until sum of (predicted - observed) → 0 across non-immutable slots, OR until immutable slots match exactly
```

## Files

- `index.html` — interactive tool (standalone, works offline)
- `exoplanets.js` — preset system data (browser-loadable, no fetch required)
- `hydros_model.py` — Python reference implementation (Sol baseline)
- `README.md` — this file

## License

MIT
