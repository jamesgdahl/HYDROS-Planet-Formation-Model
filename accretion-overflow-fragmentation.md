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
