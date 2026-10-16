# CloudRDR Frontend Architecture

Bu qovluq CloudRDR platformasının bütün frontend komponentlərini, veb səhifələrini, dizayn sistemini və statik resurslarını birləşdirir.

## Qovluq Quruluşu

```
frontend/
├── dashboard/               # Əsas SOC İdarəetmə Paneli (Admin Console)
│   ├── index.html           # Real-vaxt təhlükəsizlik monitorinqi və insident idarəetməsi
│   ├── login.html           # SOC autentifikasiya portalı
│   ├── register.html        # Analitik və operator qeydiyyatı
│   ├── landing.html         # Panel icmalı və nümayiş səhifəsi
│   ├── assets/              # Vektor loqolar, ikonkalar və favikonlar
│   ├── css/                 # Dizayn tokenləri, animasiyalar və üslub faylları
│   │   ├── tokens.css       # Rənglər, tipoqrafiya və ölçülər
│   │   ├── animations.css   # Mikro-qarşılıqlı əlaqələr və keçidlər
│   │   └── styles.css       # Əsas panel üslubları
│   └── js/                  # Reaktiv vəziyyət, API müştərisi və komponentlər
│       ├── api.js           # Backend API ilə əlaqə modulu
│       ├── state.js         # Abunəlik əsaslı in-memory reaktiv vəziyyət
│       ├── config.js        # Mühit konfiqurasiyası
│       ├── main.js          # DOM hadisələri və kontroller məntiqi
│       └── components/      # UI komponentləri (Merkle Tree, Canary, Audit, və s.)
│
└── site/                    # İctimai Tanıtım və Sənədləşmə Saytı (Public Web & Docs)
    ├── index.html           # Məhsulun əsas tanışlıq səhifəsi
    ├── how-it-works.html    # 6 mərhələli texniki arxitektura və lüğət
    ├── team.html            # Mühəndislik və idarəetmə komandası
    ├── docs.html            # ISMS və təhlükəsizlik standartları (BCP/DRP)
    ├── assets/              # Brend qrafikləri
    ├── css/                 # Sayt dizayn sistemi
    ├── js/                  # Skroll animasiyaları və naviqasiya
    └── demo/                # Təhlükəsizlik konsolu nümayiş interfeysləri
```

## İşə Salma Qaydaları

1. **Backend üzərindən:**
   Root qovluqda `npm start` əmri ilə Fastify serverini başladın. Bütün frontend marşrutları (`/`, `/dashboard`, `/demo`, `/docs` və s.) avtomatik xidmət olunur.

2. **Müstəqil statik rejim:**
   `npx serve frontend/dashboard` və ya `npx serve frontend/site` əmri ilə lokal olaraq işə salına bilər.
