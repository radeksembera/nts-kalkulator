// Sazby distribučních společností převzaté z listu "Ceník" excelového kalkulátoru
// kalkulator-vvn-vn-2026-lds260522.xlsx (verze k 22. 5. 2026).
//
// Struktura cen:
//  old (dosavadní struktura):
//    rocniKap   – měsíční cena za roční rezervovanou kapacitu   [Kč/MW/měsíc]
//    mesicniKap – měsíční cena za měsíční rezervovanou kapacitu [Kč/MW/měsíc]
//    sit        – cena za použití sítí                          [Kč/MWh]
//    jednoslozkova – jednosložková cena za službu sítí          [Kč/MWh]
//  new (nová struktura):
//    rpT1, rpT2 – cena za rezervovaný příkon, tarif T1 / T2     [Kč/MW/měsíc]
//    nmT1, nmT2 – cena za max. odebraný výkon, tarif T1 / T2    [Kč/MW/měsíc]
//    sit        – cena za použití sítí                          [Kč/MWh]
//    jednoslozkova – jednosložková cena za službu sítí          [Kč/MWh]

const PRICE_TABLE = {
  "ČEZ Distribuce, a. s.": {
    "VVN": {
      old: { rocniKap: 117432, mesicniKap: 131036, sit: 69.76, jednoslozkova: 2418.40 },
      new: { rpT1: 96862, rpT2: 11586, nmT1: 9686, nmT2: 115862, sit: 70.26, jednoslozkova: 2845.96 }
    },
    "VN": {
      old: { rocniKap: 252565, mesicniKap: 281823, sit: 106.22, jednoslozkova: 5157.52 },
      new: { rpT1: 190133, rpT2: 22743, nmT1: 19013, nmT2: 227429, sit: 106.66, jednoslozkova: 5555.18 }
    }
  },
  "EG.D, s.r.o.": {
    "VVN": {
      old: { rocniKap: 110826, mesicniKap: 122223, sit: 65.62, jednoslozkova: 2282.14 },
      new: { rpT1: 87770, rpT2: 10499, nmT1: 8777, nmT2: 104987, sit: 64.80, jednoslozkova: 2579.98 }
    },
    "VN": {
      old: { rocniKap: 230551, mesicniKap: 254260, sit: 98.61, jednoslozkova: 4709.63 },
      new: { rpT1: 181386, rpT2: 21697, nmT1: 18139, nmT2: 216967, sit: 97.96, jednoslozkova: 5295.85 }
    }
  },
  "PREdistribuce, a.s.": {
    "VVN": {
      old: { rocniKap: 129580, mesicniKap: 143087, sit: 64.52, jednoslozkova: 2656.12 },
      new: { rpT1: 109073, rpT2: 13047, nmT1: 10907, nmT2: 130470, sit: 63.54, jednoslozkova: 3189.21 }
    },
    "VN": {
      old: { rocniKap: 271093, mesicniKap: 299351, sit: 85.59, jednoslozkova: 5507.45 },
      new: { rpT1: 196298, rpT2: 23480, nmT1: 19630, nmT2: 234804, sit: 84.62, jednoslozkova: 5709.80 }
    }
  },
  "UCED Chomutov s.r.o.": {
    "VN": {
      old: { rocniKap: 266227, mesicniKap: 295680, sit: 79.63, jednoslozkova: 5404.17 },
      new: { rpT1: 255864, rpT2: 30605, nmT1: 25586, nmT2: 306054, sit: 98.04472162418728, jednoslozkova: 7430.16 }
    }
  },
  "SV servisní, s.r.o.": {
    "VN": {
      old: { rocniKap: 217605, mesicniKap: 235013, sit: 124.39, jednoslozkova: 4476.49 },
      new: { rpT1: 178312, rpT2: 21329, nmT1: 17831, nmT2: 213290, sit: 123.73, jednoslozkova: 5233.52 }
    }
  }
};

const MONTH_NAMES = ["leden","únor","březen","duben","květen","červen",
                     "červenec","srpen","září","říjen","listopad","prosinec"];
