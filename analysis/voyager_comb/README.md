# Voyager live-lattice comb search (first cut)

Tests the live-lattice prediction: Sol's zonal-flow ladder re-anchored on the
present vice jaws (heliopause 121.75 AU, Alfven surface 0.041 AU), comb period
log10(1/rho) = 0.23385 dex, crests/troughs phase-locked to the dam.

Data: NASA SPDF merged daily averages (public),
https://spdf.gsfc.nasa.gov/pub/data/voyager/voyager{1,2}/merged/
Columns: 4 = R (AU), 7 = |B| (nT), 12 = V (km/s), 15 = n (cm^-3), 16 = T (K).
Caveat: V1 PLS failed 1980 (~9 AU); V2 plasma is whole-mission.

## Method
1. Median log-baseline in 0.10-dex radial bins; residuals in 0.01-dex bins.
2. Matched filter at the comb frequency (4.277 cycles/dex), phase anchored at
   the dam (a priori: zero free parameters). Background from off-comb
   frequencies 2-8 cycles/dex.

## First-cut result (daily averages, no cycle normalization, no MIR excision)
- V1 |B|: A = 0.0277 dex, phase 232.9 deg (bg p90 = 0.0312)
- V2 |B|: A = 0.0285 dex, phase 226.5 deg (bg p90 = 0.0267) -- above p90
- V2 ram pressure: A = 0.0370 dex, phase 52.2 deg (bg p90 = 0.0505)
- Cross-craft field phase agreement: 6.4 deg (different epochs/cycle phases)
- Field vs ram: anti-phase to 181 deg -- the pressure-trading signature of
  alternating zonal bands.

NOT a detection (~p90 amplitudes; multiple quantities examined). The a priori
frequency + a priori phase anchor + predicted anti-phase structure justify the
full pipeline:
1. hourly data; 2. solar-cycle normalization by transit-lagged 1-AU OMNI;
3. MIR identification/excision; 4. Pioneer 10/11 as epochs 3-4;
5. per-rung bootstrap significance.

## Helios inner-comb run (slots 9-11, 0.28-0.99 AU)
Data: https://spdf.gsfc.nasa.gov/pub/data/helios/helios{1,2}/merged/he{1,2}_YYYY.asc
(hourly; cols: 5 R, 15 |B|, 16 V, 19 n, 20 T). ~88k records, every radius
crossed at many epochs -- solar cycle self-averages per bin.

Result: NULL. A(comb) = 0.002-0.006 dex across H1/H2 field, thermal, ram;
phases incoherent, no H1/H2 replication. Standing inner-band contrast <~1%.
Consistent with the tracer hierarchy (inner receipts are integrated dust:
apex-particle peak at slot 10, Mercury ring at slot 11) and not in conflict
with the outer Voyager candidate (10x lower noise floor there). Open
question registered: why would band contrast grow with radius?

## Amplitude attenuation law (resolves the radial-contrast question)
The generative construction orders band amplitudes: first band at the dam
(strongest; = the hydrogen wall), each daughter at its parent's
half-amplitude shoulder -> A_n ~ A_0 * eta^n, eta ~ 1/2. Predicts slots 1-5
at few-to-tens of percent (Voyager candidate range) and slots 9-11 below
0.1% (an order of magnitude under the Helios null -- the null is required,
not merely tolerated). Sharpened falsifier for the full pipeline: contrast
must DECREASE monotonically slot 1 -> slot 5; flat or inverted amplitudes
falsify the shoulder construction even if the comb is present.

## Middle rungs 6-8 (4.82, 2.81, 1.64 AU): negative control
Attenuation law predicts 1-3% contrast here -- below the daily-average noise
floor at these dwell times (4-25 days/bin). Observed: +/-20-75% swings with
near-simultaneous V1/V2 crossings DISAGREEING (slot 6: V1 -75% vs V2 +15%
weeks apart) -- propagating streams, not standing structure. Control value:
the method does NOT manufacture cross-craft coherence where no signal is
predicted; outer-rung phase agreement is therefore not a method artifact.
Caveat both ways: outer bins also have 10-40x more samples (mechanical SNR
gain); the non-trivial outer residue is coherence at the comb frequency with
dam-locked phase specifically.

## REGISTERED PREDICTION (June 2026): New Horizons crosses slot 1
- Trough 54.3 AU, -25% detrended (crossed ~2022).
- Plateau 54->71 AU: smooth r^-2 decline (-42%) cancelled to ~+3% absolute.
- Crest 71.1 +/- 2 AU at +25-35% detrended, arrival LATE 2027
  (gauge: 2x V2 slot-2 contrast = +33%; V2's 2003 crossing of this rung: +25%).
- Peak-to-trough x1.6-1.8; coincident SDC dust-rate maximum (Doner 2024
  excess = flank entry). NH has no magnetometer; SWAP pressure is the
  native observable anyway.
Falsifiers: smooth r^-2 through 71 AU (kills the rung); peak displaced >few
AU (kills the dam anchor); right peak, wrong amplitude (breaks eta = 1/2).

## Cassini and Ulysses roles
Cassini cruise (1997-2004): crossed slots 9->5 (MAG at
spdf:/pub/data/cassini/mag_1min/ CDF + helio1hr position file; CDA dust
profile across slots 6-8 = integrating tracer). Unique asset: 13 years in
Saturn orbit riding 9.0->10.1 AU -- a slow scan of slot 5's outer flank;
decade-averaged upstream solar-wind pressure is the only way to resolve a
middle rung's ~2% predicted contrast. Also confirms/demotes the +/-20%
Voyager structures near 8.3 AU (gauge says stream noise).
Ulysses (COHOWeb merged, 1990-2009): out-of-ecliptic passes = AXISYMMETRY
CONTROL. Bands are disc-plane structures: polar arcs at the same r should
show NO comb where in-ecliptic segments show it. A-priori sign.

## Saturn sub-cascade overlay (the full-amplitude live lattice)
Ladder anchored on the fitted dam 903,100 km (Rhea = slot 1, 0.01%).
Crests hold: B-ring CENTER = slot 4 (-0.0%); arc nursery (G ring, Aegaeon,
Mimas +3.3%, Methone, Anthe) = slot 3; Tethys = slot 2 (-4.3%).
Troughs empty: main-ring TERMINUS = trough 3-4 (A-ring outer edge -0.3%,
Atlas +0.3%, F ring +2.1%); faint C ring = trough 4-5 (+4%). Alternating
brightness in comb phase, as predicted for high/low pressure bands.
Wrong-phase (flagged): Enceladus at trough 2-3 (+1.2%), Dione near trough
1-2 - both fitted migrants. CONTROL: trans-dam clean - Titan 21% off-comb,
zero unexplained arcs beyond the dam. Embedded arc moonlets (Methone,
Anthe, Aegaeon: km-scale, smooth, young) = candidate current mintings.
Formal test: comb-bin Cassini CDA + ISS faint-ring census.
