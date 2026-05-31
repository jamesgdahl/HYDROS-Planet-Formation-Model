# HYDROS Planet Formation Model

A simple AU-based capacity model for primordial planetary mass allocation. Predicts planet masses from four system properties — stellar mass, grain size, primordial spin, and disc-to-star mass ratio — using a universal set of physical rules.

**[Open the interactive tool →](./hydros.html)**

## What it is

HYDROS treats planet mass at orbital radius *r* as a **local accretion capacity**:

> Each AU position in a protoplanetary disc has a finite mass capacity determined by local physics — surface density, snow line, magnetic truncation, compression, pebble drift. The planet that forms at *r* captures roughly that capacity. Material between planet positions drains to the star, is scattered, or feeds neighbors.

The model is **not** a strict mass-conservation calculation — it's a function `M(r)` that empirically matches observed planet masses at observed positions across multiple stellar types.

## The four fundamental inputs

| Input | Symbol | Sol value | Range |
|---|---|---|---|
| Primordial stellar mass | M<sub>★</sub> | 1.14 M<sub>☉</sub> | 0.08–2 M<sub>☉</sub> |
| Grain largeness | g | 0.82 | 0–1 |
| Primordial spin | Ω | 1.0 | 0.1–1000+ |
| Disc/star mass ratio | f<sub>disc</sub> | 1% | 0.1%–30% |

Everything else (R<sub>disc</sub>, R<sub>A</sub>, snow line, slope, intercept, ice retention, pebble allocation, gas dispersal time) is derived universally from these.

## Solar System fit

| Planet | Predicted | Observed | Error |
|---|---|---|---|
| Mercury | 0.056 | 0.055 | +1.5% |
| Venus | 0.816 | 0.815 | +0.1% |
| Earth | 1.000 | 1.000 | 0.0% |
| Mars | 0.110 | 0.107 | +2.5% |
| Jupiter | 322.4 | 317.8 | +1.4% |
| Saturn | 94.3 | 95.2 | −0.9% |
| Uranus | 14.5 | 14.5 | −0.3% |
| Neptune | 17.1 | 17.2 | −0.3% |

All 8 planets within ±2.5% of observation.

## Why Mars and Mercury look "so big" in the model

The model predicts **primordial allocations** — what material was originally distributed to each orbital position — not what survives today. Two of Sol's inner planets have lost most of their primordial mass to subsequent events:

### Mars: stolen by Jupiter (Grand Tack depletion)

- **HYDROS allocation at 1.524 AU**: ~1.06 M<sub>⊕</sub> rock
- **Observed Mars mass**: 0.107 M<sub>⊕</sub>
- **Mass missing**: ~0.95 M<sub>⊕</sub> (90% of original)

The Mars zone originally contained roughly Earth-mass worth of rocky material. During the Grand Tack scenario (Walsh et al. 2011), Jupiter migrated inward to ~1.5 AU during its formation, then back outward. As it swept through the Mars zone, it scattered most of the planetesimals there — some eaten by Jupiter itself, some thrown into the asteroid belt or out of the system.

Mars is the **stunted remnant** of what should have been an Earth-mass planet. The model's overprediction here is correct: it shows what Mars *would have been* without Jupiter's migration disrupting its zone.

The `Mod` field in the tool encodes this: `Mars: −0.950 M⊕` for "Jupiter Grand Tack depletion."

### Mercury: void-truncated + mantle ablated

- **HYDROS allocation at 0.387 AU**: ~0.08 M<sub>⊕</sub> (already small)
- **Then post-formation**: lost ~30% to mantle ablation
- **Observed Mercury mass**: 0.055 M<sub>⊕</sub>

Mercury sits right at the edge of the **magnetospheric void** (R<sub>A</sub> ≈ 0.31 AU in current Sol; was 0.20 AU during Mercury's formation). Material inside R<sub>A</sub> can't accumulate — the stellar magnetosphere truncates the inner disc. So Mercury formed from a thin annulus between R<sub>A</sub> and Venus's feeding zone, getting a smaller initial allocation than the slope rule would suggest at that radius.

Then it was subsequently **mantle-stripped** by one or more giant impacts (Benz et al. mantle stripping scenario). Mercury today is ~70% iron core / ~30% mantle, anomalously dense — its rocky mantle was largely ablated, leaving a core-heavy remnant.

The model's combination of void truncation (allocation) + mantle ablation (post-formation modification) explains why Mercury is so much lighter than its orbital radius would imply.

The `Mod` field encodes this: `Mercury: −0.025 M⊕` for "mantle ablation."

### Earth and Venus: undisturbed in-place formation

Earth and Venus are within 1–2% of observed without significant modification:
- **Venus**: clean direct test of the rule (no significant post-formation events)
- **Earth**: +0.1 M⊕ for "Theia delivery" — the Mars-sized impactor that formed the Moon also delivered ~10% extra mass

## Why the outer planets are at different positions

The model uses **primordial formation positions**, not current observed orbits. Sol's gas and ice giants migrated outward during the first ~Gyr of the solar system (Nice Model dynamics; Tsiganis et al. 2005).

| Planet | Primordial r (HYDROS) | Current r | Migration |
|---|---|---|---|
| Jupiter | 5.40 AU | 5.20 AU | inward (~0.20 AU) |
| Saturn | 8.90 AU | 9.58 AU | outward (~0.68 AU) |
| Uranus | 15.0 AU | 19.2 AU | outward (~4.2 AU) |
| Neptune | 21.0 AU | 30.05 AU | outward (~9.05 AU) |

**Why migrate outward?** During the Nice Model instability event (~600 Myr after formation), interactions between the giant planets and a residual planetesimal disc transferred angular momentum: Jupiter slightly inward, the other three outward. The dance ended with Neptune flinging Kuiper Belt objects inward and getting boosted out to ~30 AU.

**Why does the model use primordial positions?** The allocation rule applies at formation time, before migration. If we used current positions:
- Neptune at 30 AU would get even more rock+ice from the rule (its current slope×r), overshooting observed
- Uranus at 19.2 AU similar overshooting

Using primordial positions (15 and 21 AU), the model lands within ±0.5% of observed — a sharp consistency check. **This independently constrains the Nice Model migration history.**

**The Grand Tack vs HYDROS prediction:** The model actually *rules out* Jupiter forming at 3.5 AU (the canonical Grand Tack initial position). At 3.5 AU, the rule gives Jupiter only ~2.5 M⊕ — below the 3 M⊕ threshold for gas-giant runaway. The model says Jupiter must have formed at ≥5 AU to have enough rocky/icy core to nucleate gas accretion.

## Model features

| Feature | Description |
|---|---|
| **Compression regimes** | Normal (C < 1) vs Inverted (C > 1) based on R<sub>A</sub>/R<sub>disc</sub> ratio |
| **Snow line position** | Set by stellar luminosity (M<sub>★</sub><sup>2</sup>) × disc viscous heating (√f<sub>disc</sub>) × grain opacity |
| **R<sub>A</sub> scaling** | ∝ M<sub>★</sub><sup>2</sup> × Ω<sup>4/7</sup> — M-dwarfs have tiny R<sub>A</sub> |
| **R<sub>disc</sub> scaling** | ∝ M<sub>★</sub> × Ω<sup>−1/2</sup> — faster spin compresses disc |
| **Slope** | M<sub>★</sub> × Z × f<sub>rock</sub> × f<sub>disc</sub> × η<sub>rock</sub> / R<sub>disc</sub> |
| **Snow-line pile-up** | Universal Mulders pebble trap, mild Gaussian centered at r<sub>snow</sub> |
| **Outer pile-up** | Universal Gaussian at R<sub>disc</sub>, compression-scaled (negligible for Sol-like) |
| **Wind suppression** | XUV-driven H stripping, scales with spin × 1/r² |
| **Gas dispersal** | k<sub>eff</sub> ∝ (Sol_disc / system_disc)² — fast dispersal in low-mass discs |
| **Threshold** | 3 M<sub>⊕</sub> core needed to retain H/He (universal gravity constraint) |

## Other systems

The model works across stellar classes with the same universal rules:

- **HR 8799** (A5V): disc-instability regime, 4 super-Jupiters fit to ±21% with f<sub>disc</sub> = 5%
- **HD 134987** (G5V): outer planet within −1.7% with default settings
- **Upsilon Andromedae** (F8V): outer planet within M sin i uncertainty
- **TRAPPIST-1, Proxima**: inverted/compressed M-dwarf systems with predicted "undetected outer planets" sharing pebble budget

## Files

- `hydros.html` — Standalone interactive tool (open in any browser)
- `hydros_model.py` — Python reference implementation
- `README.md` — This file

## License

MIT
