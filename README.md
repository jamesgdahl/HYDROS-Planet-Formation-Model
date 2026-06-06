# HYDROS Planet Formation Model

A geometric-cascade rule for primordial planetary mass allocation. Predicts planet masses, formation positions, and migration/impact histories from three system properties — stellar mass, primordial spin, and disc-to-star mass ratio — using a universal set of physical rules anchored to discrete cascade slots set by the disc geometry.

**[Open the interactive tool →](./index.html)**

## What it is

HYDROS treats the protoplanetary disc as a discrete **cascade of formation slots** in geometric ratio:

$$r_n = R_{\text{disc}} \cdot \rho^n, \quad \rho = 1 - \frac{\sqrt{\ln 2}}{2} \approx 0.5837$$

The ratio ρ emerges from a clean geometric principle: each slot sits at the **half-amplitude-at-45°-projection** (`1/(2√2)`) of the previous slot's Gaussian accretion-zone HWHM (`√(2 ln 2)`). Equivalently, `ρ = 1 - 1/(2√2)·√(2 ln 2)`. The factor `1/(2√2) = √2/4` is the universal half-diagonal-projection constant appearing in 45° polarization, Butterworth filter damping, and inscribed-circle-to-diagonal geometry. Slots extend from the outer **Davis Dam** (R_disc — named for Leverett Davis Jr., who in 1955 identified the heliopause as a pressure-confinement surface against the interstellar medium) inward until they would fall below the inner **Alfvén Dam** (R_A, magnetospheric truncation). The two dams are a *vice* with distinct owners: the inner jaw is stellar (spin/field via disc-locking), the outer jaw environmental (interstellar pressure differential); the single spin parameter reads both because they correlate through birth-site density:

$$N_{\text{slots}} = \left\lfloor \frac{\ln(R_A / R_{\text{disc}})}{\ln \rho} \right\rfloor + 1$$

In the **inverted regime** (R_A ≥ R_disc, found in compact compressed systems), the cascade defaults to 11 slots representing a compressed inner reservoir.

Each slot has a finite primordial mass capacity determined by local physics (rock/ice/pebble allocation, gas accretion, wind suppression). The planet observed near that slot represents the formation outcome at that location, possibly modified by post-formation events (migration, impact, atmospheric loss, late delivery).

## The three fundamental system inputs

**Units are primordial-solar throughout**: stellar mass, spin, and nebula density are all 1.0 for Sol (1 mass unit ≡ 1.14 current M☉), so Sol is the exact baseline (1, 1, 1) and every formula loses its 1.14 divisor.

| Input | Symbol | Sol value | Range |
|---|---|---|---|
| Primordial stellar mass | M<sub>★</sub> | **1.0** (≡ 1.14 current M<sub>☉</sub>) | 0.07–1.8 |
| Nebula density (outer jaw) | D | 1.0 (≈10⁶ H₂ cm⁻³) | 0.03–10⁵+ (effective) |
| Primordial spin (inner jaw record) | Ω = D^(2/3) | 0.995 | 0.1–2000+ |
| Disc/star mass ratio | f<sub>disc</sub> | 0.01 | 0.001–0.5 |

D and Ω are **two readings of one dial under the jaw-lock** (the vice's jaws correlated through birth-site density): D is the physical variable — the formation cloud's confinement establishes the Davis Dam at R_disc = 30.07·M★·D^(−1/3) AU, so Sol's D = 1 puts the dam at **30.07 AU, Neptune's exact slot** — while Ω is its angular-momentum record. The anchor scan that solves R_disc from the outermost planet is the D bisection expressed through the lock. Sol's D = 1 inverts to n(H₂) ≈ 10⁶ cm⁻³ (β = 0.02): a clustered prestellar core, independently consistent with the meteoritic birth-cluster evidence. Inverted-regime D_eff values (TRAPPIST ~5×10⁴) exceed any static cloud — the decoupled-jaw signature.

Every derived disc property is computed from these inputs plus solar composition (Lodders 2003 abundances) and universal physics constants. The grain-opacity parameter g (0 = fully grain-grown, 1 = ISM-like opacity-rich dust) is **a constant, 0.82**: calibrated on Sol and identical across every calibrated system — uniform at least across the local galactic neighbourhood the catalog samples, so no longer an input.

## Universal physical constants

| Constant | Value | Meaning |
|---|---|---|
| ρ | 0.5837 | Cascade ratio: 1 − √(ln 2)/2 = 1 − (1/(2√2))·√(2 ln 2). Half-diagonal-projection of Gaussian HWHM. |
| g | 0.82 | Grain opacity (0 = grain-grown, 1 = ISM-like). Sol-calibrated; uniform across the calibrated catalog |
| Z | 0.014 | Solar metallicity |
| f_rock | 0.22 | Rocky fraction of condensables |
| f_ice/rock | 3.5 | Ice/rock ratio past full condensation |
| M_thresh | 3.0 M⊕ | Core mass for gas accretion onset |
| ε_pebble | 0.40 | Pebble capture efficiency |
| η_rock | 0.78 | Rock retention (pebble drift loss) |
| **A_0** | **4.45** | H/He amplification coefficient (1/M⊕). Formula: M_gas = A_0 · M_core² · exp(-k·t_form) · wind_supp. Tanigawa-Ikoma 2007 scaling; calibrated against Sol's Jupiter and Neptune |
| **k_H/He** | **0.691** | H/He decay rate (per Myr); corresponds to gas-disc e-folding dispersal time ~1.45 Myr |
| T_STRIP | 2000 K | Silicate vaporization temperature (mantle stripping threshold) |
| IRON_FRAC | 0.30 | Iron-core retained mass fraction post-stripping |
| BD_threshold | 4131 M⊕ | Brown-dwarf lower bound (13 M_J) |
| Stellar_threshold | 25,400 M⊕ | Stellar lower bound (80 M_J) |

## Derived disc properties

$R_{\text{disc}} = 30.07 \cdot M_\star \cdot \Omega^{-1/2}\ \text{AU} \quad (30.07 = \text{Neptune's } a)$

$$R_A = 0.20 \cdot M_\star \cdot \Omega^{4/7}\ \text{AU}$$

$r_{\text{snow}} = \left[1.6 + 1.7\,g^{2.2}\right] \cdot M_\star^{2} \cdot \sqrt{\frac{f_{\text{disc}}}{0.01}}\ \text{AU} \;=\; 2.70 \cdot M_\star^{2} \cdot \sqrt{\frac{f_{\text{disc}}}{0.01}}\ \text{AU at } g = 0.82$

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
- **Migration t_form cap** of 2 Myr (giant-pair destabilization window): once orbit is destabilized, outward migration is fast (~10⁵ yr), so the gas giant must have completed accretion BEFORE destabilization

Stage 2 score includes a STAGE2_PENALTY = 2 (invoking a migration story is itself a cost) and K1_PENALTY = (k1−1) for each vacated outer slot beyond the migrant.

**In-situ is the default; migration is the exception that emerges only when the cascade structure forces it.**

## Mass allocation

### Rock allocation (per slot)

Inside `[R_A, R_disc]`:
$$M_{\text{rock}}(r) = \begin{cases}
\sigma_{\text{AAF}} \cdot [(r + \tfrac{5}{6}R_A) - R_A] \cdot f_{\text{trunc}}(r) & R_A \le r < 2 R_A \\
[a_{\text{intercept}} + \sigma_{\text{AAF}} \cdot r] \cdot f_{\text{trunc}}(r) & 2 R_A \le r \le R_{\text{disc}}
\end{cases}$$

Plus snow-line pile-up bump (when r ≤ r_snow):
$$M_{\text{bump}}(r) = 0.5 \sigma_{\text{AAF}} \cdot r_{\text{snow}} \cdot \exp\!\left[-\frac{(r - r_{\text{snow}})^2}{2(0.15 r_{\text{snow}})^2}\right]$$

Plus outer-edge Gaussian (rotational compression at R_disc — the dam pile-up itself, NOT feeding-zone-truncated):
$$M_{\text{outer}}(r) = \sigma_{\text{AAF}} \cdot R_{\text{disc}} \cdot C \cdot \exp\!\left[-\frac{(r - R_{\text{disc}})^2}{2(0.3 R_{\text{disc}})^2}\right]$$

### Hexagonal-packing edge truncation (the geometric 1/6)

In a 2D hexagonal close-packed pebble distribution each interior point has 6 nearest-neighbour feeding zones. A planet sitting at a disc edge loses 1 of 6 to the void → retention 5/6, loss 1/6 — **geometric, not calibrated**. At the outer Davis Dam this is applied as a smooth truncation with S = 0.025·R_disc (outward range) and L = 5S (inward range):

$$f_{\text{trunc}}(r) = \max\!\left[0,\ 1 - \frac{(r + S) - R_{\text{disc}}}{L + S}\right]$$

equal to 1 well inside the disc, exactly 5/6 at r = R_disc, fading to 0 at 1.125·R_disc. Neptune's 1/6 (~17%) allocation deficit at the dam edge is this truncation. The **same 1/6** appears at the inner Alfvén Dam via the ramp offset α = ⅚·R_A (the lost neighbour is inside R_A). The inner dam is additionally an *active* dam — magnetic-reconnection crack-bursts ablate silicate mantles — whereas the outer dam is passive (MRI-revival trap, geometric loss only).

### Ice allocation (past snow line)

$$\eta_{\text{ice}}(r) = \exp\!\left[-\frac{r - r_{\text{snow}}}{0.8 R_{\text{disc}}}\right]$$

$$M_{\text{ice}}(r) = \sigma_{\text{AAF}} (r - r_{\text{snow}}) \cdot 3.5 \cdot \eta_{\text{ice}}(r) \cdot f_{\text{trunc}}(r) + M_{\text{bump}}(r)$$

### Pebble flux allocation

Pebbles drift inward from the snow line; gas-eligible cores capture shares weighted by inverse-sqrt distance from snow line:
$$M_{\text{peb},i} = M_{\text{peb,total}} \cdot \frac{w_i}{\sum_j w_j}, \quad w_i = \frac{1}{\sqrt{r_i - r_{\text{snow}}}}$$

### H/He envelope (core ≥ 3.0 M⊕)

Tanigawa-Ikoma 2007 gas accretion: `dM_gas/dt ∝ M_core²` during runaway phase. Integrating with exponentially-decaying disc gas:

$$M_{\text{H/He}} = A_0 \cdot M_{\text{core}}^2 \cdot \exp(-k \cdot t_{\text{form}}) \cdot w_{\text{wind}}$$

with

$$k = 0.691 \cdot \max\!\left(1, (M_{\text{disc,Sol}}/M_{\text{disc,sys}})^2\right)$$

$$w_{\text{wind}}(r) = \frac{1}{1 + (\Omega/30)(0.5/r)^2}$$

**A_0 = 4.45 (units 1/M⊕) and k = 0.691 are calibrated against Sol's Jupiter (slot 3) and Neptune (slot 0, ISU)** — both fit observed mass exactly at the cascade-default `t_form = 0.10·r/σ_AAF`. With this calibration, Saturn's −28% deficit and Uranus's −49% deficit emerge as visible diagnostics of dynamical envelope-stripping events.

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
- **Mercury–Vulcan merger (Sol slots 8/9)**: Δv=15.4 km/s, v_esc=6.2 km/s, Δv/v_esc=2.48 → retention=0.30 floor (iron-core-only remnant: 0.30 × 0.170 M⊕ combined = 0.051 vs observed 0.055). Explains Mercury's ~70% Fe composition from merger energetics rather than post-formation stripping
- **Tau Ceti e (mild-end anchor)**: Δv/v_esc≈0.53 → retention≈0.81 (partial merger, ~20% ejecta)

When the predicted retained mass matches observed within 20%, the merger is flagged: `merger (absorbed slot N)` with `, iron-enriched` suffix when retention < 0.5.

## Mutual eviction detection

Two adjacent MISSING slots both predicting brown-dwarf-or-larger mass (>4131 M⊕) cannot coexist — their Sep/R_H,mutual is well below the catastrophic stability threshold (~3.5). The framework checks:

$$R_{H,\text{mutual}} = a_{\text{avg}} \cdot \left(\frac{m_1 + m_2}{3 M_\star}\right)^{1/3}$$

If `Sep / R_H,mutual < 3.5`, both slots are labeled `<class> (mutually evicted with slot N)` — one likely ejected outward, the other consumed by the host star or absorbed by a remaining gas giant.

## Embryo-swarm scattering detection

Any cascade slot whose predicted mass is ≥10× below a perturber's mass within 10 R_H of that perturber has its pre-consolidation embryo swarm dispersed by asymmetric Jupiter-style scattering. The detector makes quantitative survivor predictions:

- **Settled-survivor position**: r_survivor ≈ r_perturber − 11·R_H,perturber (inner stability edge of the chaotic zone). For Sol: Jupiter at 5.20 AU with R_H ≈ 0.34 AU predicts a survivor at ~1.46 AU — Mars observed at 1.524 AU (within 5%)
- **Survivor mass**: 5–10% of the slot's primordial allocation (standard N-body scattering statistics; most swarm mass scatters outward or is lost). Mars: 0.107/1.32 = 8.1% of slot 5
- Within a perturber's scatter group, the **furthest-from-perturber** slot hosts the settled survivor; closer slots are fully dispersed (`swarm scattered by X`)
- Slots reached by **2+ simultaneous perturbers** are totally obliterated — no stable settling region exists (`totally obliterated by simultaneous scattering: …`); e.g. HR 8799's inner slots under its four super-Jupiters

For Sol this is the framework's **single dynamical event**: Jupiter at slot 3 disperses the slot 4–5 swarm at the snow-line pile-up zone (2–3.5 AU). The asymmetric ~5%/95% inner/outer split delivers Theia (Earth impact / Moon formation), the Mars survivor, and cumulative outer impacts on Saturn (−28% envelope, 26.7° tilt) and Uranus (−49% envelope, 98° tilt).

## Lissauer-instability detection

An unfilled slot adjacent to a filled, larger neighbour with `Sep / R_H,mutual < 7` (Lissauer stability limit) was destabilized by mutual Hill instability. The fate depends on encounter kinematics (Δv_cumulative ≈ 2.5 × v_orbit·√(m_small/m_large) vs system v_esc): at gas-giant masses (≥100 M⊕) the body can be `ejected to interstellar`; below that it stays bound, `scattered within system`.

## Martian-remnant binding (Alfvén-void orphans)

A small body (≤30 M⊕ — above that it kept an envelope) observed in the deep Alfvén void (r < 0.5·R_A, where no slot exists) cannot have formed there. If an **unfilled** slot's predicted mass puts the orphan inside the Mars survivor band (5–10% of the parent), it binds to that slot as a `Martian-type scatter remnant`: the −90 to −95% mass delta and the delivered position are both scatter **output**, treated as a satisfied fit — excluded from the f_disc bisection target and the position score, exactly as Mars' −92% counts as diagnostic rather than error in Sol. Scoring: a bound remnant costs 2.0 (an explained body) vs 5.0 for an unexplained void relegation, so geometries that can name the parent beat geometries that cannot — but vacancies can't be invented: extending the ladder outward to make room opens stellar-mass empty slots and is rejected.

- **HD 20794 b**: 2.7 M⊕ at 0.12 AU binds at ~9% of its 32 M⊕ slot-0 parent
- **Mu Arae d**: 10.5 M⊕ at 0.091 AU — every candidate geometry's slots are occupied, so it stays an unbound remnant of a 105–210 M⊕ parent (`parent slot indeterminate`); suggestively, that range brackets slot 1's own 166 M⊕ prediction (= e's mass)
- Void bodies **above** 30 M⊕ (e.g. Upsilon Andromedae's giants) keep the softer label — an intact giant flung under the dam is delivery, not wreckage

## The Luger lattice — half-step occupancy in the inverted regime

In the inverted regime (C = R_A/R_disc ≥ 1) the disc lives inside the magnetosphere: magnetic stiffening reduces Keplerian shear and the compressed gas density crushes solid random velocities, so **low-mass bodies' feeding zones become drag-limited — narrower than the geometric width that lets rung bodies eat their midpoints in the normal regime**. Surviving midpoint material consolidates at interstitial sites r_n·√ρ (half-integer slot numbers), gated by Hill stability: a body may take a half-step site only if gap/R_H,mutual ≥ 7 for its own mass. Giants are Hill-limited (reach spans the midpoint regardless of damping) and are excluded automatically. Empty interstitials are optional sites — no rows, no score cost. **The half-step occupancy state is named the Luger lattice**, after Luger et al. 2017, whose TRAPPIST-1 resonant chain exhibited its complete form (and predicted member h from the occupied rungs before detection).

The two occupancy harmonics are the two observed resonant-chain families:
- **Full ladder**: period ratio ρ^(−3/2) = 2.24 → relaxes into **2:1 chains** (GJ 876 Laplace 4:2:1, HR 8799 8:4:2:1)
- **Luger lattice**: period ratio ρ^(−3/4) = 1.497 = **3:2 to 0.2%** → compact chains locked essentially at birth (TRAPPIST-1: all seven planets on seven consecutive lattice sites 0–3, h anchored exactly on the dam)
- **Mixed**: Kepler-90 — giants on full rungs, six small planets on the lattice, selected by the gate with no per-system tuning

Prediction: hidden sub-Earth lattice occupants in HD 7924 between its known planets, below current RV sensitivity. (An earlier prediction of a vacant TRAPPIST-1 rung at 0.106 AU was an artifact of a superseded anchor and is retracted — the final fit anchors h on the dam with no vacant outer rung.)

**Protostellar consumption**: the inverted ladder projects inward without limit, but the formation-era star is Hayashi-track bloated — R_HT ≈ 2.3 R☉·(M/M☉)^(2/3)·(t/Myr)^(−1/3) (clock floored at 0.5 Myr). Rungs inside that photosphere are labeled `consumed by the protostar` with **predicted planet mass zero** (the allocation is real; its destination is the star) and carry no missing-planet score cost — predicting absence where nothing is observed is a success. TRAPPIST-1 slots 6–10 and 55 Cnc slots 9–10 are consumed; 55 Cnc e sits at the first rung *outside* its formation-era photosphere — the basement floor is the stellar surface.

## Gravitational stripping (close-encounter editing)

Systems flagged with `inputs.stripping = { M_pert, q }` (UI checkbox) are fitted with an encounter transform. The stripping factor is the Breslau truncation radius **r_t = 0.28·q·(M_pert/M★)^(−0.32)**, defining three zones applied to the baseline predictions before the dynamical detectors run:

- **destroyed** (r > r_t): slot inventory removed — predicted planet mass zero; feeds the debris budget
- **stirred** (0.5·r_t → r_t): graduated loss up to 60% at r_t
- **enriched** (r < 0.5·r_t): freed inventory rains inward; filled bodies sweep it up outermost-first (capture 0.8 per body), total captured = 15% of freed mass

When `q` is null it is **bisected** (golden-section on the mean per-planet |log(pred/obs)| — the quantity consensus closure can't see), with a fixed-point second pass pinning the winning q across all anchor families so the result is idempotent. CLI flag: `STRIPPED:q=…,rt=…` (informational); `--write` preserves and refreshes the flag.

Flagged systems and their fitted encounters:
- **Proxima Centauri** — perturber Alpha Cen B (0.9092 M☉), fitted q = 6.4 AU (manual forensics independently said ~10): b and c close at 0.0%, the previously *unfittable* system rejoins the catalog (RESID ~1% keeps it out of clean statistics, honestly)
- **HD 20794** — anonymous cluster flyby (0.5 M☉ default), fitted q = 15.8 AU, r_t = 5.17: original disc extended to 22 AU, three outer slots beheaded, g in the impact-loss band, b a slot resident (formerly a void orphan). The packing index (P = 14–22, no giants) forbids internal demolition — the editing had to be external.

## Primordial packing diagnostic (`PACKED:x.x`)

The CLI computes min sep/R_H_mutual over **all adjacent slot pairs** at their slot radii — lost slots carried at their **predicted** masses, since stability acts on the at-birth configuration (HD 134987's perpetrator is a lost slot). Below the Lissauer limit of 7 the chain was born dynamically hot, and the catalog splits cleanly on it:

- **Quiet (> 7 everywhere)**: Sol's terrestrials (41–56), TRAPPIST-1 (16–21), Galilean moons (15–18), Tau Ceti, HD 219134, HD 7924, Kepler-90 — no chain events. Sol's one marginal pair is Jupiter–Saturn at 7.2, the pair implicated in the framework's single dynamical event.
- **Packed (< 7)**: every system the fitter independently tags with scatter/migration/remnant/void events. Fates: **resonance-lock and survive** (GJ 876 at 3.8 — known Laplace chain; HR 8799's giants at 3.7), **shred outside-in** (Beta Pic 3.5, HR 8799 — packed outer giants destroy the inner cascade), **wreck inside-out** (HD 134987 3.7 — a lost 8 M_J slot-1 giant launches b 4.4 AU inward through the inner cascade and is itself ejected, leaving a lone warm Jupiter over a swept interior: the hot-Jupiter-loneliness configuration; Proxima Centauri 3.8 — a lost Saturn-mass slot-1 perpetrator, survivors tagged impact-loss/late-delivery), or **rearrange** (Mu Arae 6.0 — e displaced, d's parent shredded; HD 142 4.5 — c pushed outward; Ups And 4.8 — two giants flung under the dam).
- **Stellar pairs included** (Hill formalism only indicative at stellar mass ratios): Alpha Cen B–Proxima packs at **0.8** — overlapping Hill spheres at birth — predicting Proxima's ejection onto its observed ~10⁴ AU bound orbit; GJ 667 B–C packs at 0.7, with C observed displaced to 230 AU.

**Mass-ordered kick rule**: in every packed chain the *lightest* member absorbs the relaxation — Mu Arae e (planet, 2.1 AU), GJ 667 C (0.33 M☉, → 230 AU), Proxima (0.12 M☉, → ~10⁴ AU).

## Missing-slot labeling

Empty cascade slots get labels reflecting:
- The PRIMORDIAL composition class they would have hosted (`rocky`, `rock giant`, `ice giant`, `gas giant`, `brown dwarf`, or a stellar spectral class — see below)
- **No automatic "destroyed by [migrant]" attribution** — that's speculative inference from co-occurrence. Default suffix is `(not observed)` indicating uncertainty.
- Specific attributions only attached when supported by detection logic:
  - `(mutually evicted with slot N)` from the eviction detector
  - `(impacted X)` from the adjacent-merger detector
  - `(swarm scattered by X; survivor predicted … M⊕ at ~… AU)` from the embryo-swarm detector
  - `(Lissauer-destabilized by X, ejected to interstellar / scattered within system)`
  - `(totally obliterated by simultaneous scattering: …)` for multi-perturber targets
  - `(purged by X)` from the gravity-purge detector
- Sol's slot 4 reads `rocky (swarm scattered by Jupiter)` — the Theia swarm — and slot 9 reads `impacted Mercury` (Vulcan)

## Stellar-mass cascade members

Bodies above the hydrogen-burning threshold (25,400 M⊕ = 0.08 M☉) are **not** excluded from the cascade: outer slots in high-f_disc discs naturally allocate stellar-mass bodies, and observed stellar companions participate in cascade fitting as ordinary slot occupants. Filled and missing slots are classified by total mass into spectral classes — `M/K/G/F/A/B/O-class star` (boundaries at 0.08, 0.45, 0.80, 1.04, 1.40, 2.1, 16 M☉) — with `brown dwarf` covering 13 M_J–0.08 M☉.

**Alpha Centauri** demonstrates the pattern: Cen B (G-class, 302,770 M⊕) fits slot 1 (formed at 14.6 AU, migrated outward to 23.5 AU) and Proxima (M-class, 40,625 M⊕) sits in situ at slot 0 (25 AU) at f_disc = 0.25 — triple-star formation as a cascade outcome rather than independent collapse. Holman-Wiegert disc truncation (0.15 × companion separation) is retained only as a fallback when no observed body anchors R_disc.

Brown dwarfs and stellar-class bodies act as **gravity purgers**: unfilled slots interior to them are labeled `(purged by X)`.

## ISU (In-Situ Unchanged) flag

Each planet has an `immutable: true` flag (preset data) and corresponding UI checkbox labeled **ISU**. The flag declares: this planet's observed mass and position are absolute source-of-truth. The bisection algorithm respects it asymmetrically:

**When any ISU planet exists in the system:**
- **f_disc bisection target = sum over ISU planets only** — they pin disc mass
- **ISU rocky** (e.g., Sol's Venus): predicted core = observed exactly (drives f_disc)
- **ISU gas-eligible** (e.g., Sol's Neptune): t_form bisection still fits observed
- **Non-ISU gas planets use cascade-default t_form** = 0.10·r/σ_AAF — predicted vs observed delta surfaces post-formation modifications (impact loss, late delivery, atmospheric stripping). Uranus's −49% mass deficit becomes visible diagnostic of its tilt-impactor event.
- **Non-ISU rocky planets** show cascade-natural mass; deltas indicate impacts/late-delivery

**When no ISU planets exist:**
- f_disc bisects across ALL observed planets (consensus inference)
- All gas-eligible planets bisect t_form per-slot (each matches observed)
- Treats observations as fittable rather than fixed
- Wild variance in per-planet implied f_disc, or suspiciously round masses (5.000, 7.000 M⊕), flag measurement-quality issues

**Bisection convergence tolerance** scales with the smallest target observed mass: `tol_abs = max(1e-6, 0.001 × min(target observed))`. Without this, a large gas-giant ISU (e.g., Neptune at 17 M⊕) inflates the totalTarget and a small rocky ISU (Venus at 0.815 M⊕) ends up with ~0.7% residual error. Tightening to per-target precision makes Venus's exact match work.

The asymmetric design encodes the philosophy: rare well-characterized planets anchor the disc mass; the rest of the system's deviations from cascade prediction become formation-history diagnostics.

## Migration scenarios

**Inward migrant**: assigned slot's r > observed r. Mass match via the assignment's mass+AU scoring; gas giants pick their formation slot by mass when observed r is ambiguous between two slots. Δr is negative; classifier tags `migrated inward`.

**Outward migrant**: observed r > R_disc (planet is OUTSIDE the cascade entirely). Detected in Stage 2 fits with the threshold `r > 1.2·R_disc`. Forms at slot 0, migrates outward via Saturn-Lua-style destabilization. Classifier tags `migrated outward`.

## Solar System fit (calibration anchor)

Inputs: M★=1.14 M☉, spin=0.9954 (auto-derived: R_disc anchored to Neptune), f_disc=0.01. **Venus and Neptune are ISU** (immutable, anchor disc parameters). The cascade spans 10 slots from R_disc = 30.07 AU down to R_A ≈ 0.20 AU.

| Body | Slot | r_slot (AU) | r_obs (AU) | t_form (Myr) | Predicted (M⊕) | Observed (M⊕) | Δm% | Interpretation |
|---|---|---|---|---|---|---|---|---|
| (Vulcan) | 9 | 0.237 | — | 0.08 | 0.062 | — | — | impacted Mercury |
| Mercury | 8 | 0.405 | 0.387 | 0.13 | 0.108 | 0.055 | −49% | merger (absorbed slot 9, iron-enriched) |
| Venus | 7 | 0.694 | 0.723 | 0.24 | 0.815 | 0.815 | 0.0% | **ISU** rocky (in situ) |
| Earth | 6 | 1.190 | 1.000 | 0.33 | 0.900 | 1.000 | +11% | rocky (late delivery — Theia) |
| Mars | 5 | 2.038 | 1.524 | 0.67 | 1.323 | 0.107 | −92% | inner-scattered survivor (~8% of slot, scattered by Jupiter; predicted at ~1.46 AU) |
| (slot 4) | 4 | 3.491 | — | 1.15 | 2.53 | — | — | rocky (swarm scattered by Jupiter — the Theia swarm) |
| Jupiter | 3 | 5.981 | 5.203 | 1.71 | 318.9 | 317.83 | −0.3% | gas giant (in situ, anchor) |
| Saturn | 2 | 10.246 | 9.537 | 3.13 | 133.7 | 95.16 | −29% | gas giant (impact loss — outer-scattered swarm) |
| Uranus | 1 | 17.552 | 19.189 | 6.31 | 28.7 | 14.54 | −49% | ice giant (impact loss — swarm impactor, 98° tilt) |
| Neptune | 0 | 30.070 | 30.070 | 9.94 | 17.15 | 17.15 | 0.0% | **ISU** ice giant (in situ) |

The fit requires only **one dynamical event** beyond cascade formation, plus the Mercury–Vulcan adjacent-slot merger:

1. **In-situ cascade forms**: Jupiter (slot 3) and Saturn (slot 2) sit within ~0.8 AU of their geometric slot centres — no Grand Tack, no Nice Model, no migration sequence
2. **Jupiter disperses the slot 4–5 embryo swarm** at the snow-line pile-up zone (2–3.5 AU). Standard N-body scattering gives an asymmetric ~5%/95% inner/outer split
3. **Inner ~5%**: one embryo impacts Earth (Theia — Moon formation, the +11% late delivery); 1–2 embryos settle as Mars at the chaotic-zone boundary (predicted ~1.46 AU and 5–10% of slot mass; observed 1.524 AU and 8.1%)
4. **Outer ~95%**: cumulative multi-pass impacts strip Saturn's envelope (−28%, 26.7° axial tilt) and deliver Uranus's single high-energy impact (−49% envelope, 98° axial tilt)
5. **Mercury–Vulcan merger**: slots 8/9 packed at ~4 mutual Hill radii are guaranteed to encounter; Δv/v_esc = 2.48 puts the encounter in the catastrophic-stripping regime → iron-core-only retention (0.30), explaining Mercury's ~70% Fe composition from merger energetics
6. **Venus and Neptune survive untouched** — the ISU anchors that pin the primordial disc mass and plane

## Calibrated systems (24 in the preset catalog)

### G class
- **Sol** — 8 planets, Vulcan merger remnant at Mercury, slot-4 Theia swarm; everything in-situ, one dynamical event
- **Tau Ceti** (G8V, 0.78 M☉) — 4 small planets in a compressed inverted-regime cascade (R_disc ≈ 0.92 AU); outermost f migrated outward from slot 0, e shows late delivery, g/h impact loss
- **HD 7924, 47 UMa, μ Arae, 55 Cancri, HD 20794 (82 G Eri), Kepler-90, HD 134987** — various architectures

### F class
- **HD 142, HD 60532** — high-f_disc giants; HD 60532's missing slot-1 giant is consistent with the observed 3:1 resonance lock

### K class
- **HD 219134** (K3V) — **Stage 2 outward-migration scenario**: outermost 108 M⊕ giant formed at slot 0 (R_disc ≈ 1.10 AU) and migrated outward to 3.06 AU after destabilization; the 5 inner rock giants are the surviving compressed cascade
- **HD 69830, HD 192310, GJ 667 A** (hierarchical triple)

### M class
- **Proxima Cen**, **GJ 876**, **TRAPPIST-1**

### A class & beyond
- **HR 8799** — 4 super-Jupiters in situ at slots 0–3; all inner slots totally obliterated by simultaneous four-giant scattering
- **Beta Pictoris** — b and c formed at slots 1 and 0 (R_disc = 28.35 AU) and migrated inward; the shredded inner cascade (slots 2–7, ~700 M⊕) supplies the archetypal debris disc, and the resolved planetesimal belts at ~6/16/30 AU (Okamoto et al. 2004) sit on slots 3/1/0 to within 3–6% — an out-of-sample validation, since the fit used only the two planet positions
- **Upsilon Andromedae** — clean 2-slot outer cascade (d, e); b and c sit interior to R_A and are not cascade members

### Multi-star and scale-invariance tests
- **Alpha Centauri** (f_disc = 0.25) — Cen B at slot 1, Proxima in situ at slot 0: triple-star formation as a cascade outcome
- **Jupiter sub-cascade** (f_disc = 0.0003) — the Galilean moons follow the same ρ = 0.5837 cascade at circumplanetary scale, with Laplace-resonance orbital swaps
- **Sol progenitor** and **Crab progenitor** — thought-experiment reconstructions at A-class and B-class scales (see paper)

## Discoveries / model predictions

These emerged from the framework and aren't (to our knowledge) in published literature:

1. **In-situ is the default; migration is rare.** Once the geometric cascade is anchored to the outermost observed planet's r, most systems fit without invoking migration. In the Sol preset *nothing* migrates: Jupiter and Saturn sit within ~0.8 AU of their slot centres. The framework inverts the classical assumption that migration is the standard explanation for planetary architectures.
2. **One dynamical event suffices for the Solar System.** Jupiter's scattering of the slot 4–5 embryo swarm (the Theia swarm) at the snow-line pile-up explains the Mars deficit and position, the Moon-forming impactor, Saturn's −28% envelope deficit and 26.7° tilt, and Uranus's −49% deficit and 98° tilt — eliminating Grand Tack, the Nice Model, and Type-I/II migration as required Sol mechanisms.
3. **Mercury is a merger remnant, not a stripped chondrite.** The slot-9 body (Vulcan) and slot-8 Mercury were packed below the Hill stability threshold; their high-Δv merger retains only the combined iron cores (retention floor 0.30), producing Mercury's ~70% Fe composition from encounter energetics alone.
4. **The cascade ratio is a pure geometric constant.** ρ = 1 − √(ln 2)/2 ≈ 0.5837 — the half-amplitude-at-45° projection (1/(2√2)) of the Gaussian accretion-zone HWHM — with no empirical fit parameter. Not Hill spacing, not resonance.
5. **Quantitative scattering-survivor prediction.** The settled survivor of a dispersed swarm lands at r_perturber − 11·R_H with 5–10% of the slot's allocation: for Sol that predicts 1.46 AU and 0.07–0.13 M⊕ — Mars observed at 1.524 AU, 0.107 M⊕.
6. **HD 219134's outward-migrant story.** Its outermost 108 M⊕ giant at 3.06 AU formed at slot 0 of a compressed cascade (R_disc ≈ 1.10 AU), then migrated outward via giant-pair destabilization. The 5 inner rock giants are the surviving cascade.
7. **Wind suppression dominates inner-slot gas accretion.** Hot Jupiters in compressed inverted-regime systems can't form at the innermost slot because primordial stellar wind blows gas away before runaway accretion. This forces outward-migrant interpretations for them.
8. **Stellar multiplicity from slot-0 allocation.** When slot 0's allocation crosses the hydrogen-burning threshold the cascade fragments into a multi-star system (Alpha Centauri at f_disc = 0.25: Cen B at slot 1, Proxima at slot 0). Brown-dwarf and stellar companions also gravity-purge their inner slots.
9. **Two-flavor merger continuum.** Iron-enriched (Mercury–Vulcan style, 0.30 retention at high Δv/v_esc) and clean merger (~0.8+ retention at low Δv/v_esc) are the same physical process at different impact-energy ratios; the framework's retention formula = max(0.3, 1 − 0.37·Δv/v_esc) captures both.
10. **Habitability is a hard filter.** Stacking the constraints — outer giant shield + slow-rotator host + outer reservoir intact + Goldilocks-architecture cascade survivor + late-delivery event + Theia-like impactor + oxygen-producing photosynthesis emerging + Boring-Billion breakthrough — gives ~600-1,200 complex-life worlds in the entire Milky Way GHZ. Nearest Earth-twin: ~1,500-2,500 ly. Within 100 ly: probably only Earth.

## Algorithm pipeline

```
1. auto_spin_with_anchor_search(planets, M_star, f_disc)
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
     classify (in situ / migrated / scattered / merger / impact loss / late delivery
               / spectral class for stellar-mass slots)
   Run detectors: adjacent-slot merger, mutual eviction, Lissauer instability,
                  embryo-swarm scattering (survivor position + mass prediction),
                  gravity purge
   Return results table

3. findBestFit
   Bisect f_disc (or fix to immutable-anchored value) until sum of (predicted - observed) → 0 across non-immutable slots, OR until immutable slots match exactly
```

## Files

- `index.html` — interactive tool (static page, works offline from file://; UI only)
- `src/*.ts` — the model, in TypeScript: `constants`, `disc`, `allocation`, `cascade`, `classify`, `fit` (includes the shared `bestFit()` used by both the UI and the CLI)
- `js/*.js` — compiled model files loaded by the page via plain `<script>` tags (committed; no bundler, no runtime dependencies). Rebuild after editing `src/` with `npm run build` (tsc only)
- `tools/fit.js` — command-line catalog fitter: `node tools/fit.js [--system <id>] [--write]`. Runs the identical `bestFit()` as the UI's Find-Best-Fit button
- `exoplanets.js` — preset system data (browser-loadable, no fetch required)
- `hydros_model.py` — Python reference implementation (Sol baseline)
- `README.md` — this file

## License

MIT
