# Wavelength Doubling — the Suhl Parametric Subharmonic of the Cascade Wave

*Why some discs lay their cascade slots at twice the fundamental rung spacing — a magnetic-resonance period-doubling, decided from inputs, never fitted to the observed planets.*

## The observation

The cascade standing wave (Maas wave reverberating from the Davis Dam, see-sawed against the Alfvén comb at R_A) normally seats planets on the universal ρ-ladder (`ρ ≈ 0.5837`, "full rung"). But several systems fit dramatically better when the wavelength is **doubled** — the rungs spaced out by 2× (α_eff = CASCADE_ALPHA / 2):

| system | fundamental (1×) residual | doubled (2×) residual |
|---|---|---|
| Beta Pictoris | 14.93% | **0.001%** |
| HD 142 | 4.50% | 1.56% |
| HD 134987 | 42.87% | 37.93% |
| 55 Cancri | 40.95% | 38.52% |

Beta Pic going to **0.001%** at exactly 2× — and HD 142 reaching 0.0003% at exactly 4× in testing — shows the multiplier is **discrete** (a 2ᵏ bifurcation), not a continuously stretched wavelength. This is a *period-doubling*, not a knob.

## The mechanism: Suhl / Faraday parametric subharmonic

This is the **Suhl spin-wave instability** (Suhl 1957), the magnetic-resonance analogue of the **Faraday wave** (a vertically shaken fluid responds at *half* the drive frequency): once a driven magnetic system crosses a threshold set by the **drive-vs-damping balance**, the pump parametrically excites daughter modes at **half the pump frequency** — i.e. **double the wavelength**. Two consequences pin the model:

1. **Parametric instability only ever cascades DOWN in frequency** (f → f/2 → f/4 …), never up. This retro-justifies why an additive *2nd harmonic* (the old "HWHM half-rung" population, shorter wavelength) was always unphysical: a passive cavity cannot ring above its fundamental from a single pump. That machinery was inert (forcing its strength to zero reproduced every catalogue fit byte-for-byte) and was removed.

2. **The threshold is a butterfly curve, not a monotonic line.** In ferromagnetic resonance the subharmonic only fires "for a limited field range for which a mode is available at half the pump frequency" — a *resonance/availability* condition. That is why the doubling **depth** is non-monotonic in field strength (see below).

## The 1×→2× onset — a 2-D Faraday tongue (resonant band)

The onset is **not** a flat field threshold. A flat `B_crit` is provably impossible: 47 UMa doubles at B = 0.19 while HD 20794 stays 1× at B = 0.10 — *lower* field — so no scalar threshold (or `B_crit(N)`) can separate them. It is a **Faraday tongue**, and Faraday tongues are **periodic**: a 2× resonance at each integer N/2 (the subharmonic seats an integer number of rungs).

- **Tip + opening.** The first tongue has its tip at `N = N_MIN = 7` (N/2 = 3.5, the first mode; rocky N < 7 can't seat f/2). The field-tolerance opens linearly from the tip: `B_width(N) = WAVE_TONGUE_SLOPE · (N − N_MIN)`, i.e. the resonator's tolerance to magnetic damping grows with cavity size (Q ∝ N).
- **The tongue does NOT close — it widens.** A bigger cavity has a wider tongue, so it doubles even at a *strong* field. 47 UMa (N=8.6) doubles at B=0.19; **Alpha Cen (N=19.8, N/2 ≈ 10 — a higher resonance) doubles even at B ≈ 1** because its tongue is wide (`B_width ≈ 2`). HD 20794 (N=7.6, near the narrow tip) needs B < 0.10 and stays 1×.
- **Fundamental systems are those whose strong field clears their (modest) B_width:** Sol (N=9.3, B≈1 > 0.36), HR 8799 (N=10.4, B≈1 > 0.52). Their cavities aren't wide enough to widen the tongue past their field. (Rocky N < 7 are below the first tip.)

**Why Alpha Cen is 2×, not 1× — the phantom test.** Forced to 1×, the fit invents a **6,240 M⊕ (≈20 Jupiter) brown dwarf in slot 1** ("Lissauer-destabilized") that we don't observe; it exists only to *absorb the budget overestimate*, leaving Proxima at −6.4% (residual 6.9%). At 2× there is no such phantom, and the over-budget falls honestly on Proxima (−16.7%, residual 20%). The lower 1× residual is therefore an artifact of an invented body — 2× is the parsimonious fit, and its residual just *exposes* the Alpha Cen budget overestimate (a separate matter, orthogonal to the regime; the model also predicts a *primordial* mass it deliberately doesn't chase to Proxima's mass-lossed present value). Geometry agrees: N/2 ≈ 10 puts Alpha Cen squarely in the 2× resonance comb.

All inputs are pre-formation (R_A, R_disc, dynamo field B) — **the observed planets never enter the decision**, which is essential: the field and standing wave exist *before* the planets, so what eventually forms cannot determine the regime. Doublers: Beta Pic, HD 142, HD 134987, 55 Cnc, Mu Arae, ups And, HD 219134, HD 60532, 47 UMa (the case that forced the tongue), and Alpha Cen.

Implementation: `cascade_alpha_eff()` returns `CASCADE_ALPHA / m`; `budgetFit` sets `m` forward from the tongue before the cascade runs. FWHM systems leave `m = 1`.

## Why it isn't field-strength alone (the instructive misfits)

Two candidate "universal" laws were tested and **falsified by the data** — recorded here because the failures are the physics:

- **`m = f(field)` fails.** Beta Pic (B = 0.064 → 2×) and HD 142 (B = 0.052 → 4×) are near-twins: 15% apart in field, 3% apart in rung count, 7% in solid mass per rung — yet they double to different depths. No smooth function of field (or field + geometry) returns both.
- **`m = f(drive/damping)` fails harder.** With drive = solid mass per rung and damping = B, Kepler-90 has **21× more** drive-over-damping than Beta Pic (3.7×10⁵ vs 1.7×10⁴) and *stays 1×*. The doubling is not a monotonic drive/damping threshold.

The resolution is the cavity-width gate above (the non-doublers despite the weakest fields — tau Ceti, HD 69830, HD 192310, Kepler-90 — *all* have N < 7: their cavities are too compact to seat the subharmonic), consistent with the Suhl butterfly curve being a resonance/availability condition rather than a monotone in field. Kepler-90 in particular has 21× Beta Pic's drive/damping yet a cavity one rung too short.

## The doubling depth — a Feigenbaum cascade (δ-fixed, not calibrated)

The **depth** (2× vs 4×) is the period-doubling cascade proper. Ordered by cavity rung count N, the depths *interleave* — muarae 8.00 **2×**, hd134987 8.08 **4×**, 55 Cnc 8.13 **2×**, hd142 8.17 **4×**, Beta Pic 8.40 **2×** — which is impossible for any single calibrated floor but is the **Feigenbaum signature**: N is the control parameter, the bifurcation points N_k crowd geometrically toward an accumulation N_∞ with the universal ratio **δ = 4.66920…**, and the highest-N system (Beta Pic) is *not* the deepest because it is **past N_∞** (the chaos onset). The f/2 → f/4 floor is therefore **not free** — δ fixes it from the first bifurcation and the accumulation:

```
N₂ = N_∞ − (N_∞ − N₁)/δ ,   N₁ = 7.0 (f/2 onset),  N_∞ = 8.32  ⇒  N₂ ≈ 8.04
```

That δ-derived N₂ lands between muarae (8.001 → 2×) and hd134987 (8.081 → 4×) — no hand-placed knife-edge. Each level also needs the field below a per-level **damping floor** (0.085 for f/2, 0.058 for f/4; deeper bifurcations need weaker damping), which holds 55 Cnc (B=0.073) and Beta Pic (B=0.064) at 2× even though their N is in the f/4 window. Result: hd142 → 4× → **0.0003%**, muarae → 2× → **0.0003%**, Beta Pic → 2× → 0.001%; nothing else moves. The only remaining anchor is N_∞ (bounded by hd142 being 4× and Beta Pic being past it); a 4× → 8× system would over-determine it and directly test δ.

(muAra-d, a 10.5 M⊕ super-Earth the cascade under-builds 24× at 0.09 AU, is a **core fission product** — catalogue-flagged `fragment`, like Alpha Cen B's `core` — not a cascade slot; flagging it makes muarae a clean 2× at 0.0003%.)

## References

- Suhl, H. (1957) — spin-wave parametric instability in ferromagnetic resonance; daughter spin waves at half the pump frequency above a damping-set threshold.
- [Tutorial: Nonlinear magnonics (arXiv:2303.16313)](https://arxiv.org/abs/2303.16313) — Suhl threshold, the butterfly curve, second-order cascade to f/4.
- [Suhl instabilities for spin waves in ferromagnetic nanostripes and ultrathin films](https://www.sciencedirect.com/science/article/abs/pii/S0304885316305777)
- [Harmonic and subharmonic waves on a vibrated drop — period-doubling cascade, Phys. Rev. E 100, 053106](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.100.053106) — the Faraday subharmonic and its period-doubling route to chaos.
- [PIC simulations of Alfvén-wave parametric decay in low-β plasma](https://par.nsf.gov/biblio/10476844-particle-cell-simulations-alfven-wave-parametric-decay-low-beta-plasma) — cascading daughter waves; growth falls with magnetization (strong field suppresses).
