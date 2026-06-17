# Accretion-Pressure Hill-Overflow Fragmentation

*A model-native mechanism for gas-giant "core fragments" (hot Jupiters / imaged giants), replacing the disc gravitational-instability (GI) channel.*

## The problem

Some catalogue systems carry gas giants the gas-capture cascade cannot build:

- **HD 134987**: b = 505 M⊕ (1.6 M_J) at **0.81 AU**, c = 261 M⊕ (0.82 M_J) at 5.8 AU. The cascade builds ~11 / ~107 M⊕ there (−98% / −59%).
- **Beta Pic**: b = 3496 M⊕ at 9.66 AU, c = 2606 M⊕ at 2.7 AU (−96% / −99%).

The textbook fix is **disc gravitational instability** (Toomre Q≲1 + fast cooling → cold outer-disc clumps of a few M_J). It is rejected here because:

1. **It contradicts observation.** HD 134987 b is **inner and warm** (0.81 AU) — the opposite of where GI clumps form (cold, >50–90 AU).
2. **It doesn't fit the model.** HYDROS is built on dams + accretion-driven spreading, not disc cooling thermodynamics; Toomre-Q/β_cool is a foreign criterion.

## The mechanism

The core accretes; iron-hot accretion **vaporizes material and builds outward thermal pressure** inside the core. This is the *same* accretion heat the model already uses to drive the spread (the >1000 K viscous/MRI distribution into f_disc — the Accretion Halo).

**Spin does two jobs at once:**
1. it **stretches** the core, and
2. it **distributes** the heated material outward into the disc (the spread → f_disc).

A piece pushed **beyond the core's Hill radius** is no longer bound to the core: it detaches into **its own Hill sphere** and self-binds → a hot Jupiter.

**Low spin is the trigger, not high spin.** The accretion pressure builds the outward push, but low spin **fails to distribute** it. So instead of feeding f_disc and spreading into a planetary cascade, the material piles up, **overflows the Hill boundary, and lumps off as a fragment**. The hot Jupiter is the mass that *should* have become the disc/star but could neither be spread nor swallowed.

### The spin window (three regimes)

| spin | outcome |
|---|---|
| **too low** (M-dwarf, λ≈0.1) | pressure never stretches past the Hill radius → nothing overflows; material mounds at the dam → **inverted regime** |
| **fragment window** (HD 134987, Beta Pic, λ≈0.3–0.7) | pressure + modest spin push past the Hill radius, spread too weak to distribute → overflow **pinches off as a hot Jupiter** |
| **efficient spread** (Sol λ≈1; HR 8799 λ≈1.2, big disc) | spread carries material into a full cascade → **planets, no overflow lump** |

Fragmentation needs spin **enough to stretch the core past its Hill radius**, but **not so much that the spread distributes the overflow** (Sol).

## Reconciliation with the literature

Pure *rotational* fragmentation stabilises at β = E_rot/|E_grav| ≈ 0.25–0.30 (the bar-mode limit the model currently uses as its gate). Yet observed fragmentation **onsets at β ≈ 0.01–0.05** — ~30× lower (Boss 1999; rotating-core collapse simulations).

This mechanism is *why*: the **accretion-heat outward pressure does part of the work** of pushing material to the Hill/Roche limit, so the core fissions at far lower spin than rotation alone would require. The literature's "low-β onset" **is** pressure-assisted fission. The model's existing accretion-heat term therefore *predicts* the discrepancy rather than importing a separate GI criterion.

(The model's current `core_fragments` gate, β ≥ 0.274, is the rotational-*stability* ceiling — the wrong threshold, ~30× too high. It only fires for near-breakup spinners like α Cen and misses every genuine gas-giant fragment.)

## Mass bookkeeping

The conserved budget partitions: core/star (closes on), f_disc (disc → planets), beyond-dam (KBOs). At Sol's spin nearly everything either spreads (f_disc) or closes onto the star. At low spin the accretion pressure can be **neither distributed nor fully swallowed**, so a chunk of the **(1−f_disc) would-be-stellar share** overflows.

- **fragment reservoir** = the overflow of the (1−f_disc) would-be-stellar share — **large at low spin**.
- **escaped planets** = the f_disc share — **small at low spin**.
- the overflow can **fission more than once** (b *and* c) if the core keeps feeding it.

So the fragments are *not* drawn from f_disc; they are the un-spread, un-swallowed stellar share. The small f_disc still escapes into minor planets.

## Test cases

- **HD 134987 — final reading: c = slot 0, b = fragment, the gap is an instability zone.**
  - **c (5.8 AU) is slot 0** — the outermost cascade product, sitting at the Davis Dam (R_disc ≈ 6.24 AU).
  - **b (0.81 AU) is the core fragment** — the accretion-pressure overflow lump (the innermost body).
  - **Every slot between b and c is in b's instability zone and cannot form.** A 1.6-M_J fragment at 0.81 AU destabilises the region out to c (secular/resonant clearing, Holman-Wiegert-style), so the inner cascade slots are swept — not "undetected planets," genuinely empty.

  This supersedes the earlier Scenario A/B framing. (Scenario A — b fragment, c = escaped cascade planet — fails anyway: with f_disc = 0.0098 the escaped cascade tops out at ~107 M⊕ and can't make a 0.82-M_J c. Scenario B — both fragments + undetected inner planets — is replaced by this: c IS a slot-0 cascade body, and the in-between is cleared by b, not populated by undetected planets.)
- **Beta Pic** — low spin (λ≈0.49), same fragment window: b, c are overflow lumps.
- **HR 8799** — high spin (λ≈1.21) + large disc → the cascade *does* build its giants in situ (pred=obs, 0%). **Not fragments** — must NOT be reclassified.
- **Kepler-90** — small planets, no overflow; an under-fed dense disc, not a fragment system. Must stay un-fragmented.

## Testable prediction

HD 134987's region **between b (0.81 AU) and c (5.8 AU) is an instability zone cleared by the massive fragment b** — it should be **empty** (no stable planets), not merely undetected. The fragment carves the gap; c is the surviving outermost slot-0 body. A massive inner fragment generally clears the slots out to the next stable body.

## Wiring plan

At low spin, route the **overflow of the (1−f_disc) stellar share** into one-or-more Hill-bounded lumps (the giants — `fragment`, predicted := observed), and let the **f_disc residual run the normal cascade** for the small escapees. Gates:

- **lower edge:** the accretion-pressure-stretched core extent reaches its Hill radius (needs a minimum spin),
- **upper edge:** f_disc exceeds a spread-efficiency threshold (Sol — the overflow is distributed instead of lumping),

with fragment mass = the un-distributed overflow, allowing multiple fissions. This replaces the bar-mode β ≥ 0.274 gate, which is the rotational-stability limit, not the fragmentation onset.

A massive fragment also carries an **instability zone**: it clears the cascade slots between it and the next stable body (Holman-Wiegert-style secular/resonant clearing). Those slots are marked *cannot form* (empty), not *lost*. In HD 134987 this is the whole 0.81→5.8 AU gap between b (fragment) and c (slot 0). This gives the fragment a dynamical weight the current `fragment` flag explicitly withholds — so the fragment channel needs to grant an instability annulus scaled to the fragment's mass.

## Open questions

1. Exact form of the overflow mass (full (1−f_disc) overflow vs the part exceeding Hill capacity).
2. The spin-window edges — a single calibrated band (Sol no-fragment vs HD 134987 fragment) vs the two physical gates above.
3. The multi-fission rule (how the overflow splits into b, c, …).

---

## Low-spin fragment CHAINS — the multi-fission rule (answers Open Q3)

The single-fragment picture above (b, c) generalises: at low spin the overflow can fission into a **chain of small cores**, decreasing in mass toward the star. This is the same accretion-push overflow, recursive.

### The mechanism is a *limit* of established disc formation, not new physics

Mainstream disc formation IS "pushed out, then spun out": accretion pressure pushes material outward, and angular momentum flings it onto a rotationally-supported disc at the centrifugal radius R_c = j²/GM. The fragment chain is **the same push evaluated where the spin term collapses** — at low spin R_c is too small to absorb the push, so the surplus overflows the Hill boundary and fissions. Energy conservation *forces* this: L_acc = GMṀ/R must go to radiation + internal energy (support) + **P dV work (outward)**; when the radiate and spread-into-disc sinks are choked (optically thick + no extended disc), the P dV release leaves *as mass* (fission). Mainstream core-collapse theory uses the same accretion heat as inward support (Larson cores) and the same rock vaporisation as an inward-collapse trigger (H₂ dissociation → second collapse); this is the **outward reading** of those identical ingredients. Outcome resembles tidal downsizing (Nayakshin), but the *mechanism* is distinct (accretion-push overflow, not Toomre/GI — where heat *stabilises* and high AM drives fragmentation, the opposite of here).

### The derived generator (calibrated on HD 69830, HD 219134, μ Arae)

- **Fragment identification:** a fragment is a body the **cascade cannot build** (large positive dm), NOT the cascade-built giants. μ Arae: only **d** (+2743%) is fission; e/b/c (giants, ~0%) are cascade products. HD 69830: b, c (+300–700%) are fragments, d (−61%) is cascade. HD 219134: b,c,f,d,g are fragments, h (+0.3%) is cascade.
- **Mass per fragment ≈ universal ~11 M⊕** — the inner-region Hill/isolation capacity. Inverting the observed chains gives Σ·r² ≈ 5 (Σ ∝ r⁻²) across all three systems / nine bodies. Every true fragment is a 4–16 M⊕ small core.
- **Spacing ≈ 20–30 mutual Hill radii** — the *standard* dynamical-stability packing (Kepler median ~20), NOT a free parameter. **Decoupled from the mass constant** (feeding-zone C sets mass; K≈25 sets spacing; using C=15 for both over-packs).
- **Count / reservoir = overflow = (budget − what the cascade captured)** — system-dependent, and it *should* be. μ Arae's cascade ate the giants (1272 M⊕) → little left → **1** fragment. HD 219134's cascade built almost nothing (small h) → much overflowed → **5** fragments. HD 69830 → 2. The single-fragment ↔ chain spectrum falls out of the leftover.
- **Confinement (limited formation AU):** a low-spin fission product carries little specific angular momentum, so it **cannot be flung far** — its formation AU is severely capped, close-in. This is why the chains are compact and do **not** reach R_c (R_c overshoots by 7× for HD 219134, 94× for μ Arae). Same close-in confinement as the hot-Jupiter parking radius.

### Solid vs open

Solid (calibrated/grounded): the mechanism (energy-conservation push-overflow), fragment-by-under-build identification, ~11 M⊕ mass scale, ~25-mutual-Hill spacing, overflow = budget − cascade.
Open (needs >3 systems + derivation, not a 3-point fit): the **a_max(λ) fling-limit law** (max fission formation AU vs spin) that sets the chain's outer extent; then wiring the chain detector (fragment = under-built body → ~11 M⊕ core, ~25-Hill-spaced, count from leftover) and a full-catalog over-flag check (must not fire on Sol / high-spin cascades).

---

## RESOLVED — placement is the corotation parking radius, gated by a spin WINDOW (wired in)

The "a_max(λ) fling-limit law" above is **resolved, and it is NOT a fling law.** Calibrating the confirmed fission products (after removing two non-fission bodies — HD 134987 b = slot-4 cascade product; Beta Pic b at 9.66 AU = impossible for fission) showed **no mass or spin dependence in the placement** (m^0.11·λ^−0.15, both ≈0 over a 54× mass range): the products sit at a near-constant **0.04–0.11 AU**. That radius is each star's **magnetospheric truncation ≈ corotation radius** — they migrate in and stall at the **2:1 resonance interior to corotation**, exactly the hot-Jupiter pile-up.

**Placement:** `a_park = 0.63 · R_co`, with `R_co = (GM/Ω²)^⅓` and Ω ∝ λ normalised to Sol's primordial T-Tauri rotation (≈6 d at λ=1). 0.63 = (½)^⅔ (the 2:1 resonance). Lands the catalogue's fission products at 0.04–0.11 AU with the literature 6-d period — not tuned.

**Fission is a spin WINDOW, not a monotonic trend** — bounded by two different physics at the two edges, expressed through R_co vs R_A (R_co decreases with spin ∝Ω^−⅔; R_A increases with spin → they CROSS, and the crossing IS the window):

| edge | condition | what happens |
|---|---|---|
| too high spin | R_co ≪ R_A | centrifugal fling LAUNCHES material to the disc → **cascade** |
| **fission window** | **R_co ≈ 1.6 R_A** | material reaches R_A but can't be launched → clumps, 2:1 parking at 0.63 R_co lands on R_A |
| too low spin | R_co ≫ R_A | parking sits above the magnetosphere → **inverted mound** (gated separately as R_A ≥ R_disc) |

**Catalogue test (R_co with 6-d Sol period vs the model's R_A):** cascade Sol 0.32, HR 8799 0.25, Alpha Cen 0.10 (all ≪1.6 ✓); fission ups And 1.59, μ Arae 1.47, HD 219134 1.67, 55 Cnc 1.22, HD 134987 1.33, Beta Pic 1.06 (all ≈1–1.7 ✓); inverted TRAPPIST 6.12 (≫1.6 ✓). **The regimes separate cleanly on the upper edge.**

**Wired in (budget.ts / fit.ts):** `corotation_radius(M,λ)`, `in_fission_window(M,λ,R_A)` (R_co/R_A ≥ FISSION_WINDOW_LO), `hot_jupiter_park_radius = 0.63·R_co`. The forward synthesis and the fragment identification are both gated by `in_fission_window` (replacing the ad-hoc λ ≤ FRAG_SPIN_MAX). Result: 55 Cnc b + ups And b flag as fragments; HD 134987 b + Beta Pic b correctly drop out; no catalogue residual changes.

**Known open:**
1. **Lower edge (fission↔inverted) is murky:** HD 69830 (λ0.21, fission) has R_co/R_A = 7.31, overlapping TRAPPIST (6.12, inverted) and Kepler-90 (5.95, under-fed). R_co/R_A alone can't split them — the discriminator is the cascade UNDER-BUILD (HD 69830's planets are under-built → fission; Kepler-90's are built → cascade).
2. **Small-core identification not yet wired:** the identification loop still has the FRAG_GIANT_MIN ≥30 floor, so the stripped/small-core fission products (μ Arae d, HD 69830/HD 219134 cores, <30 M⊕) aren't flagged. Needs the post-cascade under-build test (a body the cascade can't build, in-window, near 0.63 R_co), with a full-catalog over-flag check against Kepler-90's built super-Earths.
