window.EXOPLANETS = [
  {
    "id": "sol",
    "name": "Sol",
    "ly": 0,
    "budget": {"rock":1169.04,"ice":4144.778,"hydrogen":374244.62},
    "star": 1,
    "feh": 0,
    "cto": 0.55,
    "spin": 1,
    "planets": [
      {"name":"Mercury","r":0.387099,"observed":0.055274},
      {"name":"Venus","r":0.723336,"observed":0.815004},
      {"name":"Earth","r":1,"observed":1},
      {"name":"Mars","r":1.52371,"observed":0.107447,"swept":true},
      {"name":"Jupiter","r":5.202887,"observed":317.828133},
      {"name":"Saturn","r":9.537,"observed":95.161398},
      {"name":"Uranus","r":19.189165,"observed":14.535778},
      {"name":"Neptune","r":30.069923,"observed":17.149004},
      {"name":"Triton","r":30.07,"observed":0.00359,"kbo":true,"captured":0},
      {"name":"Pluto","r":39.482,"observed":0.00218,"kbo":true},
      {"name":"Orcus","r":39.42,"observed":0.000106,"kbo":true},
      {"name":"Salacia","r":42.2,"observed":0.000082,"kbo":true},
      {"name":"Haumea","r":43.116,"observed":0.000671,"kbo":true},
      {"name":"Quaoar","r":43.69,"observed":0.000201,"kbo":true},
      {"name":"Makemake","r":45.43,"observed":0.000519,"kbo":true},
      {"name":"Gonggong","r":67.5,"observed":0.000293,"kbo":true},
      {"name":"Eris","r":67.78,"observed":0.00278,"kbo":true},
      {"name":"Sedna","r":506,"observed":0.00017,"kbo":true}
    ]
  },
  {
    "id": "alphacen",
    "name": "Alpha Centauri (A+B core)",
    "ly": 4.367,
    "comment": "Triple: A (primary) + B (close co-primary core fragment at a_bin=23.5 AU) + Proxima (WIDE stellar fragment). The core fragmented — β = E_rot/|E_grav| = BETA_SOL·λ² = 0.274 at λ=5.7, the bar-mode (Bate 2011) limit — and the excess angular momentum that tore the core in two flung the wide fragment out to the CENTRIFUGAL radius R_c = R_wind·λ² ≈ 9200 AU = Proxima's SEMI-MAJOR axis (~8700 AU; the oft-quoted 13,000 is its current near-apastron distance, e=0.5). So spin λ=5.7 is DERIVED from fragmentation, not fit (the old 1267 was a stale back-solve). Proxima FORMS in situ on the Davis Dam (slot 0, ~9200 AU = its semi-major axis ~8700) and is shown at its CURRENT location (~13,000 AU near-apastron, e=0.5) — an outward migrant: the chart connects its formation slot to its observed position. Its mass (0.122 M☉) is under-predicted ~2× (pred ~0.062) by the gas-capture disc allocation — a stellar-mass fragment needs the GI/direct-collapse channel (pending), the same gap as HR 8799's giants. (Memory: binary-two-waveform-proxima.)",
    "budget": {"rock":3224.75,"ice":15091.8,"hydrogen":734546.1},
    "star": 1.0788,
    "feh": 0.24,
    "cto": 0.47,
    "spin": 5.7,
    "planets": [
      {"name":"Alpha Centauri B","r":23.52,"observed":302770,"core":true,"e":0.5179},
      {"name":"Proxima Centauri","r":13000,"observed":40625}
    ]
  },
  {
    "id": "proxima",
    "name": "Proxima Centauri",
    "ly": 4.246,
    "budget": {"rock":171.47,"ice":607.941,"hydrogen":45526.72},
    "star": 0.122,
    "feh": 0.08,
    "comment": "Inverted M-dwarf, TRAPPIST-like (λ≈0.1: magnetosphere past the Davis dam, slow/sedate). Spin is F_UNCONSTRAINED — only 3 planets, so it floats freely (0.08–10 all give ~0% residual); the old λ=10.19 was an unphysical super-breakup artifact the degenerate fit grabbed. An inversion scan shows the planets fit the CURRENT mass (0.122 M☉), NOT a brown-dwarf past: 14–84 M_Jup masses fail at any spin (Prox-c at 1.55 AU needs today's dam reach). Per the infall-gates-planet-formation principle, planets form post-infall at the FINAL stellar mass — so current-mass dams are correct; Proxima's planets are a fast (~Myr) post-assembly event, not a fossil of the slow ~Gyr stellar accretion.",
    "cto": 0.55,
    "spin": 0.1,
    "planets": [
      {"name":"Prox-d","r":0.029,"observed":0.26},
      {"name":"Prox-b","r":0.0485,"observed":1.27},
      {"name":"Prox-c","r":1.549674452400662,"observed":7}
    ]
  },
  {
    "id": "jupiter",
    "name": "Jupiter",
    "ly": 0.0000819,
    "budget": {"rock":4.73364,"ice":11.28209,"hydrogen":301.2335},
    "star": 0.0008374,
    "spin": 1.6621,
    "parent": {"a":5.98,"M":1},
    "planets": [
      {"name":"Io","r":0.00282,"observed":0.01496},
      {"name":"Europa","r":0.004486,"observed":0.008035},
      {"name":"Ganymede","r":0.007155,"observed":0.02481},
      {"name":"Callisto","r":0.012585,"observed":0.01802}
    ]
  },
  {
    "id": "saturn",
    "name": "Saturn (sub-cascade)",
    "ly": 0,
    "comment": "Titan + Iapetus are the surviving primordial factory moons — a NORMAL CPD cascade (like Jupiter's Galileans): Titan the big inner slot (0.0225 M_E), Iapetus the small outer slot (3.0e-4 M_E, the cascade dregs), both matched at λ≈8, regime=normal. The mid-sized INNER moons (Mimas→Rhea) are NOT primordial: they are Roche-zone ring-recycling debris (Charnoz+2011), repeatedly destroyed and re-accreted, the rings the fossil — Mimas 6.3e-6 @0.00124, Enceladus 1.8e-5 @0.00159, Tethys 1.0e-4 @0.00197, Dione 1.8e-4 @0.00252, Rhea 3.9e-4 @0.00352 AU. Survival is set by the destruction zone, not the factory. Budget Z~0.21 (metal-rich); f_disc derived.",
    "budget": {"rock":6.0,"ice":14.0,"hydrogen":75.2},
    "star": 0.000252,
    "spin": 8.0,
    "parent": {"a":9.58,"M":1},
    "planets": [
      {"name":"Titan","r":0.0081678,"observed":0.022519},
      {"name":"Iapetus","r":0.0238026,"observed":0.0003024}
    ]
  },
  {
    "id": "sol_progenitor",
    "name": "Hyperion (van Maanen 2 — Sol progenitor)",
    "ly": 14.1,
    "inputs": {"M_star":2.28,"spin":0.3008,"f_disc":0.0687},
    "planets": [
      {"name":"Sol","r":125,"observed":379558.4}
    ]
  },
  {
    "id": "crab_progenitor",
    "name": "Crab Progenitor (pre-SN 1054)",
    "ly": 6500,
    "inputs": {"M_star":10,"spin":2.58,"f_disc":0.25},
    "planets": [
      {"name":"hypothetical slot 0 anchor","r":164,"observed":0}
    ]
  },
  {
    "id": "gj667",
    "name": "GJ 667 A",
    "ly": 23.62,
    "budget": {"rock":510.416,"ice":1809.66,"hydrogen":613386.6},
    "star": 0.73,
    "feh": -0.57,
    "cto": 0.55,
    "spin": 59.9146,
    "planets": [
      {"name":"GJ 667 B","r":12.6,"observed":229748},
      {"name":"GJ 667 C","r":230,"observed":108881}
    ]
  },
  {
    "id": "tauceti",
    "name": "Tau Ceti",
    "ly": 11.92,
    "budget": {"rock":295.069,"ice":1046.15,"hydrogen":294714.4},
    "star": 0.78,
    "feh": -0.49,
    "cto": 0.55,
    "spin": 0.3092,
    "planets": [
      {"name":"TauCet-g","r":0.133,"observed":1.75},
      {"name":"TauCet-h","r":0.243,"observed":1.83},
      {"name":"TauCet-e","r":0.538,"observed":3.93},
      {"name":"TauCet-f","r":1.334,"observed":3.93}
    ]
  },
  {
    "id": "gj876",
    "name": "GJ 876",
    "ly": 15.34,
    "budget": {"rock":639.781,"ice":2268.31,"hydrogen":137528.5},
    "star": 0.37,
    "feh": 0.17,
    "cto": 0.55,
    "spin": 0.2574,
    "planets": [
      {"name":"GJ876-d","r":0.0208,"observed":6.83},
      {"name":"GJ876-c","r":0.1296,"observed":226},
      {"name":"GJ876-b","r":0.208,"observed":723},
      {"name":"GJ876-e","r":0.3343,"observed":14.6}
    ]
  },
  {
    "id": "hd20794",
    "name": "HD 20794 / 82 G. Eridani",
    "ly": 19.7,
    "budget": {"rock":360.01,"ice":1276.4,"hydrogen":305805.9},
    "star": 0.81,
    "feh": -0.42,
    "cto": 0.55,
    "spin": 0.5012,
    "planets": [
      {"name":"HD 20794 b","r":0.1207,"observed":2.7},
      {"name":"HD 20794 d","r":0.3499,"observed":4.8},
      {"name":"HD 20794 f","r":1.353,"observed":5.8},
      {"name":"HD 20794 g","r":4.43,"observed":5}
    ]
  },
  {
    "id": "hd219134",
    "name": "HD 219134",
    "ly": 21.55,
    "budget": {"rock":1219.87,"ice":4325,"hydrogen":301897.5},
    "star": 0.81,
    "feh": 0.11,
    "cto": 0.55,
    "spin": 0.4292,
    "planets": [
      {"name":"HD134-b","r":0.0387,"observed":4.74},
      {"name":"HD134-c","r":0.0653,"observed":4.36},
      {"name":"HD134-f","r":0.1463,"observed":7.3},
      {"name":"HD134-d","r":0.2347,"observed":16.17},
      {"name":"HD134-g","r":0.3753,"observed":11},
      {"name":"HD134-h","r":3.06,"observed":108}
    ]
  },
  {
    "id": "hd192310",
    "name": "HD 192310",
    "ly": 28.7,
    "budget": {"rock":906.251,"ice":3213.07,"hydrogen":318505.4},
    "star": 0.85,
    "feh": -0.04,
    "cto": 0.55,
    "spin": 0.2805,
    "planets": [
      {"name":"HD 192310 b","r":0.32,"observed":16.9},
      {"name":"HD 192310 c","r":1.18,"observed":24}
    ]
  },
  {
    "id": "trappist",
    "name": "TRAPPIST-1",
    "ly": 40.66,
    "budget": {"rock":114.083,"ice":404.475,"hydrogen":33262.14},
    "star": 0.089,
    "feh": 0.04,
    "cto": 0.55,
    "spin": 0.08,
    "planets": [
      {"name":"T-1b","r":0.0115,"observed":1.374},
      {"name":"T-1c","r":0.0158,"observed":1.308},
      {"name":"T-1d","r":0.0223,"observed":0.388},
      {"name":"T-1e","r":0.0293,"observed":0.692},
      {"name":"T-1f","r":0.0385,"observed":1.039},
      {"name":"T-1g","r":0.0468,"observed":1.321},
      {"name":"T-1h","r":0.0619,"observed":0.326}
    ]
  },
  {
    "id": "hd69830",
    "name": "HD 69830",
    "ly": 40.7,
    "budget": {"rock":916.912,"ice":3250.87,"hydrogen":322252.5},
    "star": 0.86,
    "feh": -0.04,
    "cto": 0.55,
    "spin": 0.2143,
    "planets": [
      {"name":"HD69830-b","r":0.078,"observed":10.2},
      {"name":"HD69830-c","r":0.186,"observed":11.8},
      {"name":"HD69830-d","r":0.63,"observed":18.1}
    ]
  },
  {
    "id": "55cnc",
    "name": "55 Cancri",
    "ly": 41.06,
    "budget": {"rock":8603.76,"ice":2440.34,"hydrogen":349536.4},
    "star": 0.95,
    "feh": 0.34,
    "cto": 0.78,
    "spin": 0.5213,
    "planets": [
      {"name":"55Cnc-e","r":0.0154,"observed":7.99},
      {"name":"55Cnc-c","r":0.24,"observed":51.2},
      {"name":"55Cnc-f","r":0.781,"observed":47.8},
      {"name":"55Cnc-d","r":5.957,"observed":991},
      {"name":"55Cnc-b","r":0.1134,"observed":255.4}
    ]
  },
  {
    "id": "upsand",
    "name": "Upsilon Andromedae",
    "ly": 43.9,
    "budget": {"rock":1957.19,"ice":6939.13,"hydrogen":473142.9},
    "star": 1.27,
    "feh": 0.12,
    "cto": 0.55,
    "spin": 0.4234,
    "planets": [
      {"name":"ups And b","r":0.0594,"observed":218},
      {"name":"ups And c","r":0.829,"observed":629},
      {"name":"ups And d","r":2.51,"observed":1313},
      {"name":"ups And e","r":5.245,"observed":337}
    ]
  },
  {
    "id": "47uma",
    "name": "47 Ursae Majoris",
    "ly": 45.91,
    "budget": {"rock":1290.23,"ice":4574.45,"hydrogen":385080.5},
    "star": 1.03,
    "feh": 0.03,
    "cto": 0.55,
    "spin": 0.6603,
    "planets": [
      {"name":"47UMa-b","r":2.1,"observed":804},
      {"name":"47UMa-c","r":3.6,"observed":172},
      {"name":"47UMa-d","r":11.6,"observed":521}
    ]
  },
  {
    "id": "muarae",
    "name": "Mu Arae",
    "ly": 49.85,
    "budget": {"rock":2686.72,"ice":9525.64,"hydrogen":405301.9},
    "star": 1.1,
    "feh": 0.32,
    "cto": 0.55,
    "spin": 0.4569,
    "planets": [
      {"name":"muAra-d","r":0.091,"observed":10.5},
      {"name":"muAra-e","r":0.92,"observed":166},
      {"name":"muAra-b","r":1.5,"observed":531},
      {"name":"muAra-c","r":5.24,"observed":575}
    ]
  },
  {
    "id": "hd7924",
    "name": "HD 7924",
    "ly": 54.8,
    "budget": {"rock":653.817,"ice":2318.08,"hydrogen":296879.3},
    "star": 0.79,
    "feh": -0.15,
    "cto": 0.55,
    "spin": 0.1246,
    "planets": [
      {"name":"HD 7924 b","r":0.0566,"observed":8.7},
      {"name":"HD 7924 c","r":0.1135,"observed":7.9},
      {"name":"HD 7924 d","r":0.1551,"observed":6.4}
    ]
  },
  {
    "id": "betapic",
    "name": "Beta Pictoris",
    "ly": 63.4,
    "budget": {"rock":2013.55,"ice":7138.95,"hydrogen":573503.1},
    "star": 1.53509,
    "feh": 0.05,
    "cto": 0.55,
    "spin": 0.4944,
    "planets": [
      {"name":"Beta Pic c","r":2.7,"observed":2606},
      {"name":"Beta Pic b","r":9.66,"observed":3496}
    ]
  },
  {
    "id": "hd60532",
    "name": "HD 60532",
    "ly": 83.6,
    "budget": {"rock":925.107,"ice":3279.92,"hydrogen":542359.1},
    "star": 1.44,
    "feh": -0.26,
    "cto": 0.55,
    "spin": 0.2394,
    "planets": [
      {"name":"HD60532-b","r":0.76,"observed":327},
      {"name":"HD60532-c","r":1.58,"observed":781}
    ]
  },
  {
    "id": "hd134987",
    "name": "HD 134987",
    "ly": 84.9,
    "budget": {"rock":10110.9,"ice":0,"hydrogen":396016.6},
    "star": 1.07,
    "feh": 0.25,
    "cto": 0.86,
    "spin": 0.4838,
    "planets": [
      {"name":"HD134987-b","r":0.81,"observed":505},
      {"name":"HD134987-c","r":5.8,"observed":261}
    ]
  },
  {
    "id": "hd142",
    "name": "HD 142",
    "ly": 85,
    "budget": {"rock":6467.98,"ice":1834.55,"hydrogen":473736.7},
    "star": 1.27,
    "feh": 0.09,
    "cto": 0.78,
    "spin": 0.4721,
    "planets": [
      {"name":"HD142-b","r":1.04,"observed":397},
      {"name":"HD142-c","r":6.8,"observed":1684}
    ]
  },
  {
    "id": "hr8799",
    "name": "HR 8799",
    "ly": 133.3,
    "budget": {"rock":508.813,"ice":1876.13,"hydrogen":500363.4},
    "star": 1.32456,
    "feh": -0.47,
    "cto": 0.54,
    "spin": 1.2122,
    "comment": "Direct-imaged four-giant resonant chain, in-situ (non-migrated) — and it fits at 0.0003% WITHOUT any ISU pin: the forward cascade anchors it on its own. The planets ARE the first four antinodes of a Maas-dominated Alfvén-Maas cascade. λ=1.21, R_disc(Maas)=66.7 AU ≈ HR8799-b, R_A(Alfvén)=0.26 AU (258× dam ratio ⇒ wA≈0.004, essentially a pure Davis-dam standing wave). Slots 0-3 reproduce b/c/d/e at 68/38/24/14 AU to 2-6%; observed period ratios match the parameter-free cascade ratio (1/ρ)^1.5=2.242 (e→d=2.24 exact). All four run away to gas giants (h_he≈2200 M⊕). Cleanest cascade validation in the catalogue.",
    "planets": [
      {"name":"HR8799-e","r":14,"observed":2225},
      {"name":"HR8799-d","r":24,"observed":2225},
      {"name":"HR8799-c","r":38,"observed":2225},
      {"name":"HR8799-b","r":68,"observed":1590}
    ]
  },
  {
    "id": "kep90",
    "name": "Kepler-90",
    "ly": 2790,
    "budget": {"rock":1448.49,"ice":5135.46,"hydrogen":422316.95},
    "star": 1.13,
    "feh": 0.04,
    "cto": 0.55,
    "spin": 0.2258,
    "planets": [
      {"name":"Kep90-b","r":0.0747,"observed":4.3},
      {"name":"Kep90-c","r":0.0863,"observed":6.5},
      {"name":"Kep90-i","r":0.1209,"observed":4.5},
      {"name":"Kep90-d","r":0.3114,"observed":7.2},
      {"name":"Kep90-e","r":0.4154,"observed":6.6},
      {"name":"Kep90-f","r":0.5094,"observed":6.9},
      {"name":"Kep90-g","r":0.7216,"observed":15.0},
      {"name":"Kep90-h","r":0.9765,"observed":203}
    ]
  }
];
