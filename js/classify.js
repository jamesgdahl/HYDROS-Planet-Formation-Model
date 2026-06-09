"use strict";
// Equilibrium temperature, mantle stripping, and slot classification.
// Global-script style: depends on constants.ts.
function equilibrium_temperature(r, M_star) {
    // T_eq during T-Tauri phase; L_star = L_T_TAURI_FACTOR × M_star^4 × L_sun
    // M_star is in PRIMORDIAL-solar units (1 = 1.14 current M_sun);
    // the T Tauri luminosity law is calibrated in current solar masses.
    const L_W = L_T_TAURI_FACTOR * Math.pow(M_star * M_PRIM_TO_MSUN, 4) * L_SUN_W;
    const r_m = r * AU_M;
    const flux = L_W / (4 * Math.PI * r_m * r_m);
    return Math.pow(flux * (1 - ALBEDO) / (4 * SIGMA_SB), 0.25);
}
function mantle_strip_fraction(r, M_star) {
    // strip(T) = max(0, 1 - (T_STRIP / T_eq)^4)
    // T-Tauri bolometric heating; mantle ablates above 2000 K silicate
    // vaporization threshold. No Mercury calibration.
    const T_eq = equilibrium_temperature(r, M_star);
    if (T_eq <= T_STRIP_K)
        return 0;
    return Math.max(0, Math.min(1, 1 - Math.pow(T_STRIP_K / T_eq, 4)));
}
function apply_mantle_stripping(rock, ice, peb, h_he, r, M_star) {
    const strip = mantle_strip_fraction(r, M_star);
    if (strip <= 0)
        return [rock, ice, peb, h_he];
    const rocky_total = rock + peb;
    const mantle_max = rocky_total * (1 - IRON_FRACTION);
    const mantle_lost = mantle_max * strip;
    let rock_keep = rock, peb_keep = peb;
    if (rocky_total > 0) {
        rock_keep = rock - mantle_lost * (rock / rocky_total);
        peb_keep = peb - mantle_lost * (peb / rocky_total);
    }
    return [rock_keep, 0, peb_keep, 0];
}
function is_stripped(planet, M_star) {
    // T_eq > 2000 K. No mass cap — vaporization-temperature stellar
    // energy dominates over rocky-body binding at any size. Gas giants
    // are protected by being cooler (further out), not by mass.
    return equilibrium_temperature(planet.r, M_star) > T_STRIP_K;
}
function classify_slot(slot, primordial, r_snow, migrated, _migrants) {
    // Composition classes (used for filled & lost slots):
    //   O-class star    - ≥ 16 M_sun (blue giant)
    //   B-class star    - 2.1 - 16 M_sun (blue-white)
    //   A-class star    - 1.4 - 2.1 M_sun (white)
    //   F-class star    - 1.04 - 1.4 M_sun (yellow-white)
    //   G-class star    - 0.8 - 1.04 M_sun (yellow / Sun-like)
    //   K-class star    - 0.45 - 0.8 M_sun (orange dwarf)
    //   M-class star    - 0.08 - 0.45 M_sun (red dwarf)
    //   brown dwarf     - 13 M_J - 0.08 M_sun (deuterium burning)
    //   gas giant       - h_he > core
    //   ice giant       - ice/core ≥ 30%
    //   rock giant      - core > gas threshold, no envelope, no ice
    //   rocky           - sub-threshold core
    const ICE_GIANT_ICE_FRAC = 0.30;
    // Ignition thresholds are PHYSICAL (burning happens at birth mass):
    const M_BROWN_DWARF = 4131.0; // 13 M_J (deuterium ignition)
    const M_STELLAR = 25400.0; // 0.08 M_sun (hydrogen ignition)
    // Letter classes are PRIMORDIAL IDENTITIES: a slot of X primordial
    // units is the star the literature quotes at X M_sun after uniform
    // T Tauri loss, so class thresholds scale by 1.14 (one birth unit =
    // 379,558 M_E). Sol is born, lives, and is classified G; Alpha Cen
    // B (0.80 units) classifies K, matching its observed K1V.
    const M_K_DWARF = 170829.0; // 0.45 units
    const M_G_DWARF = 303696.0; // 0.80 units
    const M_F_DWARF = 394805.0; // 1.04 units
    const M_A_DWARF = 531468.0; // 1.40 units
    const M_B_DWARF = 797202.0; // 2.10 units
    const M_O_DWARF = 6073920.0; // 16 units
    function _classify(core_v, ice_v, h_he_v, total_v) {
        if (total_v >= M_O_DWARF)
            return "O-class star";
        if (total_v >= M_B_DWARF)
            return "B-class star";
        if (total_v >= M_A_DWARF)
            return "A-class star";
        if (total_v >= M_F_DWARF)
            return "F-class star";
        if (total_v >= M_G_DWARF)
            return "G-class star";
        if (total_v >= M_K_DWARF)
            return "K-class star";
        if (total_v >= M_STELLAR)
            return "M-class star";
        if (total_v >= M_BROWN_DWARF)
            return "brown dwarf";
        if (core_v > THRESHOLD_GAS && h_he_v > core_v)
            return "gas giant";
        if (core_v > THRESHOLD_GAS && core_v > 0 && ice_v / core_v >= ICE_GIANT_ICE_FRAC)
            return "ice giant";
        if (core_v > THRESHOLD_GAS)
            return "rock giant";
        // Sub-gas-threshold bodies: distinguish ICE-rich (e.g. inverted-regime
        // phase-2 products past the viscous snow line, or normal outer cascade
        // bodies) from rocky ones — previously every small body fell through to
        // "rocky" regardless of ice content.
        if (core_v > 0 && ice_v / core_v >= ICE_GIANT_ICE_FRAC)
            return "icy";
        return "rocky";
    }
    const primordial_comp = _classify(primordial.core || 0, primordial.ice || 0, primordial.h_he || 0, primordial.total || 0);
    if (!slot.filled) {
        // Default: missing slot without directly attributable cause of death
        // is simply unobserved. We don't infer destruction from migration
        // patterns alone — that's speculative attribution. Other detectors
        // (mutual eviction, impact merger) attach specific causes when the
        // physics actually supports the attribution.
        return `${primordial_comp} (not observed)`;
    }
    const rock_bs = slot.rock || 0, ice_bs = slot.ice || 0, peb_bs = slot.pebble || 0, h_he_bs = slot.h_he || 0;
    const core_bs = rock_bs + ice_bs + peb_bs;
    const total_bs = core_bs + h_he_bs;
    // For BD/stellar threshold checks on filled slots, use OBSERVED mass
    // (what was actually measured) rather than pre-bisection predicted.
    // Otherwise a non-immutable gas-giant over-prediction can mislabel a
    // sub-BD planet as a brown dwarf.
    const observed_total = slot.observed > 0 ? slot.observed : total_bs;
    const comp = _classify(core_bs, ice_bs, h_he_bs, observed_total);
    // Stellar-class bodies and brown dwarfs skip cascade mass-delta tags
    // (no "scattered/lost" or "late delivery" applies to these scales).
    const is_stellar_class = comp.endsWith("-class star") || comp === "brown dwarf";
    if (is_stellar_class) {
        if (migrated) {
            const dir = slot.r_used < slot.slot_r ? "inward" : "outward";
            return `${comp} (migrated ${dir})`;
        }
        return `${comp} (in situ)`;
    }
    if (slot.stripped)
        return `core remnant (${primordial_comp} progenitor)`;
    const observed_r = slot.r_used;
    const direction = (observed_r < slot.slot_r) ? "inward" : "outward";
    const observed_m = slot.observed;
    const predicted = slot.predicted;
    const mass_delta_frac = predicted > 0 ? (observed_m - predicted) / predicted : 0;
    const tags = [];
    if (migrated)
        tags.push(`migrated ${direction}`);
    // Late delivery is a rocky-planet phenomenon — gas/ice giants vary in
    // envelope mass from formation-timing, not from impactor delivery.
    if (mass_delta_frac >= LATE_DELIVERY_FRAC && observed_r < r_snow
        && comp === "rocky") {
        tags.push("late delivery");
    }
    else if (mass_delta_frac < -0.5) {
        tags.push("scattered/lost");
    }
    else if (mass_delta_frac < -LATE_DELIVERY_FRAC) {
        tags.push("impact loss");
    }
    return tags.length ? `${comp} (${tags.join(', ')})` : `${comp} (in situ)`;
}
function effective_mass_for_assignment(planet, M_star) {
    if (is_stripped(planet, M_star))
        return (planet.observed || 0) / IRON_FRACTION;
    return planet.observed || 0;
}
