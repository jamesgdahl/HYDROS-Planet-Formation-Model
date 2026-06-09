window.EXOPLANETS = [
  {
    "id": "sol",
    "name": "Sol",
    "ly": 0.0,
    "inputs": {"M_star": 1, "nebula_density": 1.00389, "spin": 1.00259, "f_disc": 0.010337123188551567},
    "budget": {"rock": 1169.04, "ice": 4144.778, "hydrogen": 374244.62},
    "star": 1.0,
    "planets": [
      { "name": "Mercury", "r": 0.387099, "observed": 0.055274 },
      { "name": "Venus", "r": 0.723336, "observed": 0.815004, "immutable": true },
      { "name": "Earth", "r": 1.0, "observed": 1.0 },
      { "name": "Mars", "r": 1.52371, "observed": 0.107447 },
      { "name": "Jupiter", "r": 5.202887, "observed": 317.828133 },
      { "name": "Saturn", "r": 9.537, "observed": 95.161398 },
      { "name": "Uranus", "r": 19.189165, "observed": 14.535778 },
      { "name": "Neptune", "r": 30.069923, "observed": 17.149004, "immutable": true },
      { "name": "Triton", "r": 30.07, "observed": 0.00359, "kbo": true, "captured": 0 },
      { "name": "Pluto", "r": 39.482, "observed": 0.00218, "kbo": true },
      { "name": "Orcus", "r": 39.42, "observed": 0.000106, "kbo": true },
      { "name": "Salacia", "r": 42.2, "observed": 0.000082, "kbo": true },
      { "name": "Haumea", "r": 43.116, "observed": 0.000671, "kbo": true },
      { "name": "Quaoar", "r": 43.69, "observed": 0.000201, "kbo": true },
      { "name": "Makemake", "r": 45.43, "observed": 0.000519, "kbo": true },
      { "name": "Gonggong", "r": 67.5, "observed": 0.000293, "kbo": true },
      { "name": "Eris", "r": 67.78, "observed": 0.00278, "kbo": true },
      { "name": "Sedna", "r": 506.0, "observed": 0.00017, "kbo": true }
    ]
  },
  {
    "id": "alphacen_b",
    "name": "Alpha Centauri B (predicted)",
    "ly": 4.367,
    "inputs": {"M_star": 0.7977, "nebula_density": 1, "spin": 1, "f_disc": 0.01, "stripping": {"M_pert": 1.0788, "q": 11.29}},
    "planets": []
  },
  {
    "id": "alphacen",
    "name": "Alpha Centauri A",
    "ly": 4.367,
    "inputs": {"M_star": 1.0788, "nebula_density": 4.76523, "spin": 2.22728, "f_disc": 0.2108482517142911},
    "planets": [
      { "name": "Alpha Centauri B", "r": 23.52, "observed": 302770 },
      { "name": "Proxima Centauri", "r": 12950.0, "observed": 40625 }
    ]
  },
  {
    "id": "proxima",
    "name": "Proxima Centauri",
    "ly": 4.246,
    "inputs": {"M_star": 0.122, "nebula_density": 0.00485008, "spin": 1.01895, "f_disc": 0.003392684625081895, "stripping": {"M_pert": 0.9092, "q": 21}},
    "planets": [
      { "name": "Prox-d", "r": 0.029, "observed": 0.26 },
      { "name": "Prox-b", "r": 0.0485, "observed": 1.27 },
      { "name": "Prox-c", "r": 1.549674452400662, "observed": 7.0 }
    ]
  },
  {
    "id": "jupiter",
    "name": "Jupiter (sub-cascade)",
    "ly": 0.0000819,
    "inputs": {"M_star": 0.0009546, "nebula_density": 264.3, "spin": 46.0766, "f_disc": 0.05493682533899462},
    "budget": {"rock": 4.73364, "ice": 11.28209, "hydrogen": 301.2335},
    "star": 0.0008374,
    "spin": 57.9,
    "parent": {"a": 5.98, "M": 1.0},
    "planets": [
      { "name": "Io", "r": 0.002820, "observed": 0.01496 },
      { "name": "Europa", "r": 0.004486, "observed": 0.008035 },
      { "name": "Ganymede", "r": 0.007155, "observed": 0.02481 },
      { "name": "Callisto", "r": 0.012585, "observed": 0.01802 }
    ]
  },
  {
    "id": "saturn",
    "name": "Saturn (sub-cascade)",
    "ly": 0.0,
    "inputs": {"M_star": 0.00025071, "nebula_density": 21428.4, "spin": 146.103, "f_disc": 0.0008961649890273438},
    "planets": [
      { "name": "Mimas", "r": 0.0012402, "observed": 0.0000063 },
      { "name": "Enceladus", "r": 0.0015913, "observed": 0.0000181 },
      { "name": "Tethys", "r": 0.0019699, "observed": 0.0001034 },
      { "name": "Dione", "r": 0.0025230, "observed": 0.0001834 },
      { "name": "Rhea", "r": 0.0035235, "observed": 0.0003862 },
      { "name": "Titan", "r": 0.0081678, "observed": 0.0225190, "kbo": true },
      { "name": "Iapetus", "r": 0.0238026, "observed": 0.0003024, "kbo": true }
    ]
  },
  {
    "id": "earth",
    "name": "Earth (Theia impact)",
    "ly": 0.0,
    "inputs": {"M_star": 0.0000026346, "spin": 0.0803, "f_disc": 0.00581, "kinetic": true},
    "planets": [
      { "name": "Luna", "r": 0.00016320, "observed": 0.0123 }
    ]
  },
  {
    "id": "mars",
    "name": "Mars (Borealis impact)",
    "ly": 0.0,
    "inputs": {"M_star": 0.00000028308, "spin": 0.0029474, "f_disc": 0.000001, "kinetic": true},
    "planets": [
      { "name": "Phobos", "r": 0.00009154, "observed": 0.0000000017848 },
      { "name": "Deimos", "r": 0.00015679, "observed": 0.00000000024720 }
    ]
  },
  {
    "id": "sol_progenitor",
    "name": "Hyperion (van Maanen 2 — Sol progenitor)",
    "ly": 14.1,
    "inputs": {"M_star": 2.28, "spin": 0.3008, "f_disc": 0.0687},
    "planets": [
      { "name": "Sol", "r": 125.0, "observed": 379558.4 }
    ]
  },
  {
    "id": "crab_progenitor",
    "name": "Crab Progenitor (pre-SN 1054)",
    "ly": 6500,
    "inputs": {"M_star": 10, "spin": 2.58, "f_disc": 0.25},
    "planets": [
      { "name": "hypothetical slot 0 anchor", "r": 164.0, "observed": 0 }
    ]
  },
  {
    "id": "gj667",
    "name": "GJ 667 A",
    "ly": 23.62,
    "inputs": {"M_star": 0.73, "nebula_density": 3.61626, "spin": 1.66621, "f_disc": 0.2108482517142911},
    "planets": [
      { "name": "GJ 667 B", "r": 12.6, "observed": 229748 },
      { "name": "GJ 667 C", "r": 230.0, "observed": 108881 }
    ]
  },
  {
    "id": "tauceti",
    "name": "Tau Ceti",
    "ly": 11.92,
    "inputs": {"M_star": 0.78, "nebula_density": 9627.98, "spin": 4.0298, "f_disc": 0.00482559683733491},
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
    "inputs": {"M_star": 0.37, "nebula_density": 3738.8, "spin": 2.3404, "f_disc": 0.22134662764173468},
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
    "inputs": {"M_star": 0.81, "spin": 324.07184433704856, "f_disc": 0.020081330873385563, "stripping": {"M_pert": 0.499999, "q": 15.8}},
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
    "inputs": {"M_star": 0.81, "nebula_density": 12066.7, "spin": 2.57041, "f_disc": 0.01127596581784617},
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
    "inputs": {"M_star": 0.85000001, "nebula_density": 20351.2, "spin": 0.772061, "f_disc": 0.00666760716081662},
    "planets": [
      { "name": "HD 192310 b", "r": 0.32, "observed": 16.9 },
      { "name": "HD 192310 c", "r": 1.18, "observed": 24.0 }
    ]
  },
  {
    "id": "trappist",
    "name": "TRAPPIST-1",
    "ly": 40.66,
    "inputs": {"M_star": 0.088999999, "nebula_density": 266.551, "spin": 7.75442, "f_disc": 0.015209827941852877},
    "planets": [
      { "name": "T-1b", "r": 0.0115, "observed": 1.374 },
      { "name": "T-1c", "r": 0.0158, "observed": 1.308 },
      { "name": "T-1d", "r": 0.0223, "observed": 0.388 },
      { "name": "T-1e", "r": 0.0293, "observed": 0.692 },
      { "name": "T-1f", "r": 0.0385, "observed": 1.039 },
      { "name": "T-1g", "r": 0.0468, "observed": 1.321, "kbo": true },
      { "name": "T-1h", "r": 0.0619, "observed": 0.326, "kbo": true }
    ]
  },
  {
    "id": "hd69830",
    "name": "HD 69830",
    "ly": 40.7,
    "inputs": {"M_star": 0.85999999, "nebula_density": 11395.7, "spin": 3.8378, "f_disc": 0.00666760716081662},
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
    "inputs": {"M_star": 0.95, "nebula_density": 0.0765569, "spin": 0.180297, "f_disc": 0.015811388300841896},
    "planets": [
      { "name": "55Cnc-e", "r": 0.0154, "observed": 7.99 },
      { "name": "55Cnc-c", "r": 0.24, "observed": 51.2 },
      { "name": "55Cnc-f", "r": 0.781, "observed": 47.8 },
      { "name": "55Cnc-d", "r": 5.957, "observed": 991.0 },
      { "name": "55Cnc-b", "r": 0.1134, "observed": 255.4 }
    ]
  },
  {
    "id": "upsand_b",
    "name": "Upsilon Andromedae B (predicted)",
    "ly": 43.9,
    "inputs": {"M_star": 0.1754, "nebula_density": 1, "spin": 1, "f_disc": 0.01, "stripping": {"M_pert": 1.4478, "q": 17.7}},
    "planets": []
  },
  {
    "id": "upsand",
    "name": "Upsilon Andromedae",
    "ly": 43.9,
    "inputs": {"M_star": 1.27, "nebula_density": 89.1526, "spin": 3.15812, "f_disc": 0.27624343927742734, "stripping": {"M_pert": 0.2, "q": 17.7}},
    "planets": [
      { "name": "ups And B", "r": 750.0, "observed": 66589.0 },
      { "name": "ups And b", "r": 0.0594, "observed": 218.0, "kbo": true },
      { "name": "ups And c", "r": 0.829, "observed": 629.0 },
      { "name": "ups And d", "r": 2.51, "observed": 1313.0 },
      { "name": "ups And e", "r": 5.245, "observed": 337.0 }
    ]
  },
  {
    "id": "47uma",
    "name": "47 Ursae Majoris",
    "ly": 45.91,
    "inputs": {"M_star": 1.03, "nebula_density": 58.8081, "spin": 3.50681, "f_disc": 0.015811388300841896},
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
    "inputs": {"M_star": 1.1, "nebula_density": 17429.6, "spin": 3.3934, "f_disc": 0.022224864120739197},
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
    "inputs": {"M_star": 0.79, "nebula_density": 14018.9, "spin": 1.55057, "f_disc": 0.00666760716081662},
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
    "inputs": {"M_star": 1.535088, "nebula_density": 1507.75, "spin": 2.87253, "f_disc": 0.2108482517142911},
    "planets": [
      { "name": "Beta Pic c", "r": 2.7, "observed": 2606.0 },
      { "name": "Beta Pic b", "r": 9.66, "observed": 3496.0 }
    ]
  },
  {
    "id": "hd60532",
    "name": "HD 60532",
    "ly": 83.6,
    "inputs": {"M_star": 1.44, "nebula_density": 32582.5, "spin": 1.92781, "f_disc": 0.024348376258293156},
    "planets": [
      { "name": "HD60532-b", "r": 0.76, "observed": 327.0 },
      { "name": "HD60532-c", "r": 1.58, "observed": 781.0 }
    ]
  },
  {
    "id": "hd134987",
    "name": "HD 134987",
    "ly": 84.9,
    "inputs": {"M_star": 1.07, "nebula_density": 173.149, "spin": 3.44064, "f_disc": 0.015811388300841896},
    "planets": [
      { "name": "HD134987-b", "r": 0.81, "observed": 505.0 },
      { "name": "HD134987-c", "r": 5.8, "observed": 261.0 }
    ]
  },
  {
    "id": "hd142",
    "name": "HD 142",
    "ly": 85.0,
    "inputs": {"M_star": 1.27, "nebula_density": 2151.12, "spin": 3.15812, "f_disc": 0.00666760716081662},
    "planets": [
      { "name": "HD142-b", "r": 1.04, "observed": 397.0 },
      { "name": "HD142-c", "r": 6.8, "observed": 1684.0 }
    ]
  },
  {
    "id": "hr8799",
    "name": "HR 8799",
    "ly": 133.3,
    "inputs": {"M_star": 1.324561, "nebula_density": 0.27045, "spin": 0.418207, "f_disc": 0.015811388300841896},
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
    "inputs": {"M_star": 1.13, "nebula_density": 33272, "spin": 0.66961, "f_disc": 0.009014386831175404},
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
