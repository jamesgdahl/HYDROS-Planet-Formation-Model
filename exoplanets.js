window.EXOPLANETS = [
  {
    "id": "sol",
    "name": "Sol",
    "ly": 0.0,
    "inputs": {"M_star": 1.14, "grain": 0.82, "spin": 0.9953547135862669, "f_disc": 0.009994274059367552},
    "notes": "Sol's 8 observed planets at NASA JPL J2000 mean orbital elements and IAU mass values (6+ significant figures). R_disc anchored to Neptune via auto-spin. The 11-slot cascade predicts 3 additional bodies that aren't observed (slots 3, 5, 6) \u2014 the simulator's MISSING rows tell that story directly.",
    "planets": [
      { "name": "Mercury", "r": 0.387099, "observed": 0.055274 },
      { "name": "Venus", "r": 0.723336, "observed": 0.815004, "immutable": true },
      { "name": "Earth", "r": 1.0, "observed": 1.0 },
      { "name": "Mars", "r": 1.52371, "observed": 0.107447 },
      { "name": "Jupiter", "r": 5.202887, "observed": 317.828133 },
      { "name": "Saturn", "r": 9.537, "observed": 95.161398 },
      { "name": "Uranus", "r": 19.189165, "observed": 14.535778 },
      { "name": "Neptune", "r": 30.069923, "observed": 17.149004, "immutable": true }
    ]
  },
  {
    "id": "proxima",
    "name": "Proxima Centauri",
    "ly": 4.246,
    "inputs": {"M_star": 0.122, "grain": 0.82, "spin": 1.0, "f_disc": 0.03},
    "notes": "Inner planets evaluated at FORMATION positions (Type-I migrated inward). d formed ~0.09 AU, migrated to 0.029. b formed ~0.365 AU, migrated to 0.0485.",
    "planets": [
      { "name": "Prox-d", "r": 0.029, "observed": 0.26 },
      { "name": "Prox-b", "r": 0.0485, "observed": 1.27 },
      { "name": "Prox-c", "r": 1.549674452400662, "observed": 7.0 }
    ]
  },
  {
    "id": "tauceti",
    "name": "Tau Ceti",
    "ly": 11.92,
    "inputs": {"M_star": 0.78, "grain": 0.82, "spin": 236.7611021452524, "f_disc": 0.02891858477875853},
    "notes": "4 confirmed small planets (g, h, e, f) \u2014 all sub-Neptune mass. Older candidates b, c, d are now considered stellar activity artifacts.",
    "planets": [
      { "name": "TauCet-g", "r": 0.133, "observed": 1.75 },
      { "name": "TauCet-h", "r": 0.243, "observed": 1.83 },
      { "name": "TauCet-e", "r": 0.538, "observed": 3.93 },
      { "name": "TauCet-f", "r": 1.334, "observed": 3.93 }
    ]
  },
  {
    "id": "gj876",
    "name": "GJ 876",
    "ly": 15.34,
    "inputs": {"M_star": 0.37, "grain": 0.82, "spin": 1.0, "f_disc": 0.05},
    "notes": "4 planets in Laplace 1:2:4 resonance (c, b, e) with inner super-Earth d. b and c are gas giants around an M dwarf \u2014 unusual and informative. All inside snow line; all migrated.",
    "planets": [
      { "name": "GJ876-d", "r": 0.0208, "observed": 6.83 },
      { "name": "GJ876-c", "r": 0.1296, "observed": 226.0 },
      { "name": "GJ876-b", "r": 0.208, "observed": 723.0 },
      { "name": "GJ876-e", "r": 0.3343, "observed": 14.6 }
    ]
  },
  {
    "id": "hd20794",
    "name": "HD 20794 / 82 G. Eridani",
    "ly": 19.7,
    "inputs": {"M_star": 0.81, "grain": 0.82, "spin": 1.0, "f_disc": 0.01},
    "notes": "G6V nearby Sun-like star. Three confirmed inner super-Earths plus recent 2024 ESPRESSO detection of HD 20794 g (~5 M_E at 4.43 AU, near habitable zone). Excellent rocky-planet host candidate.",
    "planets": [
      { "name": "HD 20794 b", "r": 0.1207, "observed": 2.7 },
      { "name": "HD 20794 d", "r": 0.3499, "observed": 4.8 },
      { "name": "HD 20794 f", "r": 1.353, "observed": 5.8 },
      { "name": "HD 20794 g", "r": 4.43, "observed": 5.0 }
    ]
  },
  {
    "id": "hd219134",
    "name": "HD 219134",
    "ly": 21.55,
    "inputs": {"M_star": 0.81, "grain": 0.82, "spin": 564.5000281342225, "f_disc": 0.0448339210884144},
    "planets": [
      { "name": "HD134-b", "r": 0.0387, "observed": 4.74 },
      { "name": "HD134-c", "r": 0.0653, "observed": 4.36 },
      { "name": "HD134-f", "r": 0.1463, "observed": 7.3 },
      { "name": "HD134-d", "r": 0.2347, "observed": 16.17 },
      { "name": "HD134-g", "r": 0.3753, "observed": 11.0 },
      { "name": "HD134-h", "r": 3.06, "observed": 108.0 }
    ]
  },
  {
    "id": "hd192310",
    "name": "HD 192310",
    "ly": 28.7,
    "inputs": {"M_star": 0.85, "grain": 0.82, "spin": 62.6, "f_disc": 0.08891397050194613},
    "notes": "K2V. Two Neptune-mass planets discovered by HARPS RV.",
    "planets": [
      { "name": "HD 192310 b", "r": 0.32, "observed": 16.9 },
      { "name": "HD 192310 c", "r": 1.18, "observed": 24.0 }
    ]
  },
  {
    "id": "trappist",
    "name": "TRAPPIST-1",
    "ly": 40.66,
    "inputs": {"M_star": 0.089, "grain": 0.82, "spin": 1.0, "f_disc": 0.1},
    "notes": "Planets formed past snow line (~0.05 AU), convoy-migrated inward to current resonance chain. r values are FORMATION positions.",
    "planets": [
      { "name": "T-1b", "r": 0.0115, "observed": 1.374 },
      { "name": "T-1c", "r": 0.0158, "observed": 1.308 },
      { "name": "T-1d", "r": 0.0223, "observed": 0.388 },
      { "name": "T-1e", "r": 0.0293, "observed": 0.692 },
      { "name": "T-1f", "r": 0.0385, "observed": 1.039 },
      { "name": "T-1g", "r": 0.0468, "observed": 1.321 },
      { "name": "T-1h", "r": 0.0619, "observed": 0.326 }
    ]
  },
  {
    "id": "hd69830",
    "name": "HD 69830",
    "ly": 40.7,
    "inputs": {"M_star": 0.86, "grain": 0.82, "spin": 1290.4720726907776, "f_disc": 0.03749471046662279},
    "notes": "3 Neptune-mass planets, all migrated inward from past snow line. Low f_disc keeps H/He envelopes thin (sub-Neptune characteristics).",
    "planets": [
      { "name": "HD69830-b", "r": 0.078, "observed": 10.2 },
      { "name": "HD69830-c", "r": 0.186, "observed": 11.8 },
      { "name": "HD69830-d", "r": 0.63, "observed": 18.1 }
    ]
  },
  {
    "id": "55cnc",
    "name": "55 Cancri",
    "ly": 41.06,
    "inputs": {"M_star": 0.95, "grain": 0.82, "spin": 17.612654554213993, "f_disc": 0.32469081578810566},
    "notes": "5 planets all migrated inward from past snow line (~2.30 AU). e is a post-disc-dispersal core (t_form=7.4 Myr) with no pebble bonus or H/He envelope \u2192 8 M\u2295 super-Earth at 0.015 AU today. b formed near snow as hot Jupiter, c and f as sub-Neptunes (late formation, modest pebble share). d is the outer Jupiter analog formed at ~20 AU and migrated heavily inward to 5.96 AU.",
    "planets": [
      { "name": "55Cnc-e", "r": 0.0154, "observed": 7.99 },
      { "name": "55Cnc-c", "r": 0.24, "observed": 51.2 },
      { "name": "55Cnc-f", "r": 0.781, "observed": 47.8 },
      { "name": "55Cnc-d", "r": 5.957, "observed": 991.0 },
      { "name": "55Cnc-b", "r": 0.1134, "observed": 255.4 }
    ]
  },
  {
    "id": "upsand",
    "name": "Upsilon Andromedae",
    "ly": 43.9,
    "inputs": {"M_star": 1.27, "grain": 0.82, "spin": 7.10505617287286, "f_disc": 0.5},
    "notes": "F8V. One of the first multi-planet systems discovered (1999). Inner hot Jupiter + two outer giants in eccentric orbits suggest dynamical instability history. e planet added later (2010s).",
    "planets": [
      { "name": "ups And b", "r": 0.0594, "observed": 218.0 },
      { "name": "ups And c", "r": 0.829, "observed": 629.0 },
      { "name": "ups And d", "r": 2.51, "observed": 1313.0 },
      { "name": "ups And e", "r": 5.245, "observed": 337.0 }
    ]
  },
  {
    "id": "47uma",
    "name": "47 Ursae Majoris",
    "ly": 45.91,
    "inputs": {"M_star": 1.03, "grain": 0.82, "spin": 5.459982839318712, "f_disc": 0.2108482517142911},
    "notes": "3 gas giants. b and c are an inwardly-migrating pair (heavier b migrated more, ended up inside lighter c). d is the outer giant, pushed outward by Nice-Model-style instability.",
    "planets": [
      { "name": "47UMa-b", "r": 2.1, "observed": 804.0 },
      { "name": "47UMa-c", "r": 3.6, "observed": 172.0 },
      { "name": "47UMa-d", "r": 11.6, "observed": 521.0 }
    ]
  },
  {
    "id": "muarae",
    "name": "Mu Arae",
    "ly": 49.85,
    "inputs": {"M_star": 1.1, "grain": 0.82, "spin": 5.340400837304461, "f_disc": 0.012741483739896732},
    "notes": "4 planets all migrated inward from past snow (~2.5 AU) to current orbits. c outer (1.81 M_jup) formed earliest at 10 AU, modest migration \u2192 5.24. b (1.67 M_jup) formed at 8 AU \u2192 1.50 AU. e (0.52 M_jup) formed later/smaller \u2192 0.92 AU. d (10.5 M\u2295, hot Neptune) formed late (5.5 Myr, post gas dispersal) so no pebble bonus and decayed H/He \u2192 small core that migrated to 0.09 AU.",
    "planets": [
      { "name": "muAra-d", "r": 0.091, "observed": 10.5 },
      { "name": "muAra-e", "r": 0.92, "observed": 166.0 },
      { "name": "muAra-b", "r": 1.5, "observed": 531.0 },
      { "name": "muAra-c", "r": 5.24, "observed": 575.0 }
    ]
  },
  {
    "id": "hd7924",
    "name": "HD 7924",
    "ly": 54.8,
    "inputs": {"M_star": 0.79, "grain": 0.82, "spin": 1.0, "f_disc": 0.01},
    "notes": "K0V. Three close-in super-Earths (b, c, d) in a tight chain, all interior to 0.2 AU.",
    "planets": [
      { "name": "HD 7924 b", "r": 0.0566, "observed": 8.7 },
      { "name": "HD 7924 c", "r": 0.1135, "observed": 7.9 },
      { "name": "HD 7924 d", "r": 0.1551, "observed": 6.4 }
    ]
  },
  {
    "id": "betapic",
    "name": "Beta Pictoris",
    "ly": 63.4,
    "inputs": {"M_star": 1.75, "grain": 0.82, "spin": 22.727656204817425, "f_disc": 0.40292109388074093},
    "notes": "A6V, young (~20 Myr). Two directly-imaged giant planets b (9.66 AU) and c (2.7 AU). The 4-slot cascade predicts a 6300 M\u2295 brown dwarf at slot 1 (6.25 AU) and a 3900 M\u2295 gas giant at slot 2 (4.04 AU) \u2014 both missing, consistent with debris-disc-clearing dynamics. Famous edge-on debris disc resolved at all wavelengths confirms post-formation dynamical instability.",
    "planets": [
      { "name": "Beta Pic c", "r": 2.7, "observed": 2606.0 },
      { "name": "Beta Pic b", "r": 9.66, "observed": 3496.0 }
    ]
  },
  {
    "id": "hd60532",
    "name": "HD 60532",
    "ly": 83.6,
    "inputs": {"M_star": 1.44, "grain": 0.82, "spin": 575.2327673179018, "f_disc": 0.2108482517142911},
    "notes": "F6V. HD 60532 b (slot 2, 0.76 AU) and c (slot 0, 1.58 AU) \u2014 both gas giants, both in situ at cascade slot centers. The cascade predicts a 997 M\u2295 gas giant at slot 1 (1.02 AU) between them; that body's absence is consistent with the observed 3:1 mean-motion resonance lock between b and c (a stable third giant in slot 1 would have destabilized the chain). Inner cascade slots 3-10 are predicted gas/rock giants, all missing \u2014 likely ejected during the resonance-locking phase. f_disc=0.21 (massive primordial disc) auto-bisected to fit observed total.",
    "planets": [
      { "name": "HD60532-b", "r": 0.76, "observed": 327.0 },
      { "name": "HD60532-c", "r": 1.58, "observed": 781.0 }
    ]
  },
  {
    "id": "hd134987",
    "name": "HD 134987",
    "ly": 84.9,
    "inputs": {"M_star": 1.07, "grain": 0.82, "spin": 3.3398762222707066, "f_disc": 0.015811388300841896},
    "notes": "b is a hot Jupiter migrated from past snow line. Adding 2 predicted outer planets brings observed pair into agreement.",
    "planets": [
      { "name": "HD134987-b", "r": 0.81, "observed": 505.0 },
      { "name": "HD134987-c", "r": 15.4076, "observed": 261.0 }
    ]
  },
  {
    "id": "hd142",
    "name": "HD 142",
    "ly": 85.0,
    "inputs": {"M_star": 1.27, "grain": 0.82, "spin": 24.1558555147658, "f_disc": 0.32469081578810566},
    "notes": "b is a migrated warm Jupiter; c is a massive (5 M_jup) wide-orbit giant. High f_disc reflects this system's significant primordial disc mass.",
    "planets": [
      { "name": "HD142-b", "r": 1.04, "observed": 397.0 },
      { "name": "HD142-c", "r": 6.8, "observed": 1684.0 }
    ]
  },
  {
    "id": "hr8799",
    "name": "HR 8799",
    "ly": 133.3,
    "inputs": {"M_star": 1.51, "grain": 0.82, "spin": 0.34148283315281475, "f_disc": 0.08891397050194613},
    "notes": "(BEYOND 100 LY \u2014 distance 133.3 ly).",
    "planets": [
      { "name": "HR8799-e", "r": 14.0, "observed": 2225 },
      { "name": "HR8799-d", "r": 24.0, "observed": 2225 },
      { "name": "HR8799-c", "r": 38.0, "observed": 2225 },
      { "name": "HR8799-b", "r": 68.0, "observed": 1590 }
    ]
  },
  {
    "id": "kep90",
    "name": "Kepler-90",
    "ly": 2790.0,
    "inputs": {"M_star": 1.13, "grain": 0.82, "spin": 362.62360597981484, "f_disc": 0.05563610564117626},
    "notes": "(BEYOND 100 LY \u2014 distance 2790.0 ly). 8 planets \u2014 Sol's planet count twin, but inverted regime (R_disc=1.01 AU anchored to outer Kep90-h; R_A=9.46 AU sits well outside the disc, compression 9.37 \u2014 cascade packs 11 slots between 1.01 and 0.013 AU). All planets formed IN SITU at their observed AUs (no migration). Inner 6 are rocky/sub-Neptune; the cascade allocates ~14 M\u2295 to each inner slot but observed masses are 5-10 M\u2295 \u2014 a uniform +40 to +190% over-prediction that decreases monotonically with r is the signature of XUV-driven envelope/mantle stripping over Kep90's ~3 Gyr lifetime (closer planets lose more). Outer two (g, h) crossed gas threshold and accreted H/He; ~5% over-allocation absorbed naturally.",
    "planets": [
      { "name": "Kep90-c", "r": 0.0478, "observed": 5.0 },
      { "name": "Kep90-b", "r": 0.0739, "observed": 7.0 },
      { "name": "Kep90-i", "r": 0.1143, "observed": 7.0 },
      { "name": "Kep90-f", "r": 0.1767, "observed": 10.0 },
      { "name": "Kep90-d", "r": 0.2733, "observed": 10.0 },
      { "name": "Kep90-e", "r": 0.4225, "observed": 10.0 },
      { "name": "Kep90-g", "r": 0.6532, "observed": 88.0 },
      { "name": "Kep90-h", "r": 1.01, "observed": 203.0 }
    ]
  }
];
