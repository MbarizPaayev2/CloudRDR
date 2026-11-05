#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/build_markdown_reports.py
Generates native GitHub Markdown versions of:
1. report/CloudRDR_Yekun_Report.md (Main Final Academic Report)
2. report/Cloud_Security_Report.md (Dedicated Cloud & Cloud Security Academic Report)
3. report/README.md (GitHub Navigation Portal for Reports)
"""

import os

REPORT_DIR = os.path.abspath("report")
os.makedirs(REPORT_DIR, exist_ok=True)

# ==============================================================================
# 1. MAIN FINAL ACADEMIC REPORT (CloudRDR_Yekun_Report.md)
# ==============================================================================

main_report_md = """# AZƏRBAYCAN DÖVLƏT NEFT VƏ SƏNAYE UNİVERSİTETİ (ADNSU)
## RƏQƏMSAL TEXNOLOGİYALAR KAFEDRASI

---

### YEKUN TƏDQİQAT VƏ DİPLOM LAYİHƏSİ HESABATI

# CloudRDR — Bulud Anbarlarında Ransomware Hücumlarının Avtomatlaşdırılmış Aşkarlanması, Hesab Dondurulması və Sıfır-Etibarlı Kriptoqrafik Bərpası

**Birləşdirilmiş Tədris Fənləri:**
1. *İnformasiya Təhlükəsizliyi Menecment Sistemləri (İSMS)*
2. *Bulud Texnologiyalarında Təhlükəsizlik (Cloud Security)*
3. *Kriptoqrafiyanın Əsasları (Foundations of Cryptography)*

| Vəzifə / Sahə | Şəxs və Rol |
| :--- | :--- |
| **Tələbə / Layihə Rəhbəri:** | Mübariz Paşayev (Project Manager & GRC Lead) |
| **Elmi Rəhbər / Müəllim:** | Xatirə Həsənli (Rəqəmsal Texnologiyalar Kafedrası) |
| **Mühəndis Komandası:** | Nigar Əliyeva (Crypto), Rəşad Məmmədov (DevOps), Elmir Qasımov (Backend), Aysel Kərimova (Frontend), Tural Səfərov (QA / Benchmark Lead) |
| **Təhvil Tarixi və Məkan:** | Oktyabr 2026, Bakı şəhəri, Azərbaycan |
| **Rəsmi Formatlar:** | [Word (.docx)](CloudRDR_Yekun_Report.docx) \| [PDF (.pdf)](CloudRDR_Yekun_Report.pdf) \| [Bulud Hesabatı](Cloud_Security_Report.md) |

---

## MÜNDƏRİCAT

- [1. Giriş: Layihənin Məqsədi və Fənlərarası Əlaqə](#1-giriş-layihənin-məqsədi-və-fənlərarası-əlaqə)
- [2. Problem və Tədqiqat Konteksti: Ransomware Təhdidi](#2-problem-və-tədqiqat-konteksti-ransomware-təhdidi)
- [3. Layihənin İcra Planı və 12 Həftəlik Mühəndislik Strukturu](#3-layihənin-icra-planı-və-12-həftəlik-mühəndislik-strukturu)
- [4. Ümumi Sistem Arxitekturu və 6 Mərhələli Müdafiə Konveyeri](#4-ümumi-sistem-arxitekturu-və-6-mərhələli-müdafiə-konveyeri)
- [5. Bulud Təhlükəsizliyi: Birgə Məsuliyyət, IAM Freeze və Saxlanc Təcridi](#5-bulud-təhlükəsizliyi-birgə-məsuliyyət-iam-freeze-və-saxlanc-təcridi)
- [6. Kriptoqrafiya Mexanizmləri: Merkle DAG, AES-256-GCM və Ed25519](#6-kriptoqrafiya-mexanizmləri-merkle-dag-aes-256-gcm-və-ed25519)
- [7. Backend Mühərriki, Sürüşən Zaman Pəncərəsi və Canary Tələləri](#7-backend-mühərriki-sürüşən-zaman-pəncərəsi-və-canary-tələləri)
- [8. İnformasiya Təhlükəsizliyi Menecment Sistemi (İSMS) və Uyğunluq](#8-informasiya-təhlükəsizliyi-menecment-sistemi-isms-və-uyğunluq)
- [9. Nəzarət Paneli (SOC Dashboard) və Canlı Simulyasiya Ssenarisi](#9-nəzarət-paneli-soc-dashboard-və-canlı-simulyasiya-ssenarisi)
- [10. Eksperimental Qiymətləndirmə, M1–M9 Metrikləri və Hədd Süpürməsi](#10-eksperimental-qiymətləndirmə-m1m9-metrikləri-və-hədd-süpürməsi)
- [11. Layihənin İdarə Edilməsi: Linear Lövhəsi, Rollar və CI/CD](#11-layihənin-idarə-edilməsi-linear-lövhəsi-rollar-və-cicd)
- [12. Üç Fənnin Sintezi: Yekun Akademik İzah](#12-üç-fənnin-sintezi-yekun-akademik-izah)
- [13. Texniki Məhdudiyyətlər və Gələcək İnkişaf Perspektivləri](#13-texniki-məhdudiyyətlər-və-gələcək-inkişaf-perspektivləri)
- [14. İstifadə Edilmiş Ədəbiyyat və Beynəlxalq Standartlar](#14-istifadə-edilmiş-ədəbiyyat-və-beynəlxalq-standartlar)
- [Əlavə A: Sübut Jurnalı (Evidence Log) və Əlavə Olunası Bəndlər](#əlavə-a-sübut-jurnalı-evidence-log-və-tamamlanma-xülasəsi)

---

## 1. Giriş: Layihənin Məqsədi və Fənlərarası Əlaqə

Müasir korporativ informasiya sistemlərinin kütləvi şəkildə bulud infrastrukturuna (Cloud IaaS/PaaS) miqrasiya etməsi məlumatların əlçatanlığını artırmaqla yanaşı, yeni nəsil kiberhücum vektorlarının yaranmasına səbəb olmuşdur. Bu təhlükələr arasında ən dağıdıcı xarakter daşıyanı ransomware (fidyə proqramı) hücumlarıdır. Ənənəvi antivirus və perimetr müdafiə vasitələri bulud saxlancında (məsələn, AWS S3 və ya Supabase Storage) icra olunan kütləvi şifrələmə əməliyyatlarını vaxtında aşkarlamaqda aciz qalır. 

Bu diplom və tədqiqat layihəsinin əsas məqsədi — bulud saxlancını fasiləsiz izləyən, kütləvi icazəsiz dəyişiklikləri saniyələr daxilində aşkarlayan, hücum edənin hesabını dərhal donduran və ən əsası, şifrələnmiş ehtiyat nüsxələrdən hər bir faylın tamlığını riyazi olaraq sübut etməklə 100% bərpasını təmin edən avtomatlaşdırılmış **CloudRDR** platformasını qurmaqdır.

Layihə universitet tədris planında yer alan üç fundamental informasiya təhlükəsizliyi fənnini vahid praktik tətbiqdə birləşdirir:

1. **Kriptoqrafiyanın Əsasları:** Faylların tamlığını qorumaq üçün SHA-256 heş funksiyaları, Merkle ağacı strukturu, ehtiyat nüsxələrin təhlükəsizliyi üçün AES-256-GCM AEAD authenticated encryption və insident qeydlərinin inkarolunmazlığı üçün RFC 8032 Ed25519 rəqəmsal imzaları tətbiq olunmuşdur.
2. **Bulud Təhlükəsizliyi:** Supabase (Postgres və Storage) mühitində ən az səlahiyyət prinsipi (Least Privilege), Row Level Security (RLS) vasitəsilə sıfır-etibar (Zero-Trust) arxitekturası və hücum zamanı avtomatlaşdırılmış IAM Write-Freeze siyasəti reallaşdırılmışdır.
3. **İnformasiya Təhlükəsizliyi Menecment Sistemləri (İSMS):** ISO/IEC 27001:2022 standartı, NIST CSF 2.0 və NIST SP 800-61 reqlamentləri əsasında aktivlərin təsnifatı, STRIDE təhdid modelləşdirməsi, risk reyestri, insident cavab planı və məhkəmə sübutlarının qorunması siyasəti (Chain of Custody) tam sənədləşdirilmişdir.

> **Qısa Xülasə: Nə etdim?**  
> **Məqsəd:** Bulud anbarlarını ransomware təhlükəsindən qorumaq üçün kriptoqrafik, bulud və idarəetmə mexanizmlərini vahid sistemdə birləşdirmək.  
> **Necə etdim:** Python Flask, Supabase və müasir kriptoqrafik alqoritmlər vasitəsilə 6 mərhələli müdafiə konveyerini qurdum və test etdim.

---

## 2. Problem və Tədqiqat Konteksti: Ransomware Təhdidi

Ransomware — istifadəçinin və ya təşkilatın kritik fayllarını gizli şəkildə şifrələyərək əlçatmaz edən və açarı təqdim etmək müqabilində fidyə tələb edən zərərli proqram təminatıdır. 

*Analoji nümunə:* Ransomware hücumunu ofis arxivinə gizlicə daxil olub bütün sənədləri tanınmaz qıfıllarla bağlayan və açarları yalnız pul qarşılığında verəcəyini deyən quldura bənzətmək olar.

Ənənəvi sistemlərdə ehtiyat nüsxələrin (backup) mövcudluğu ransomware-ə qarşı yeganə xilasedici vasitə hesab olunurdu. Lakin müasir hücumlar göstərir ki, təcavüzkarlar ilk növbədə sistemdəki ehtiyat nüsxələri taparaq silir və ya onları da şifrələyir. Bundan əlavə, adi bərpa prosesi zamanı bərpa olunan faylın hücumdan əvvəlki orijinal faylla bit-bərabər eyni olduğunu sübut edən heç bir kriptoqrafik mexanizm mövcud deyildir. Təcavüzkar ehtiyat nüsxənin daxilinə 1 bayt belə dəyişiklik etsə (məsələn, zərərli arxa qapı — backdoor yerləşdirsə), ənənəvi bərpa proqramı bunu hiss etmədən faylı canlı bazaya yazır.

CloudRDR layihəsi bu problemi 3 əsas prinsip əsasında həll edir:
1. **Tez Aşkarlama:** 60 saniyəlik sürüşən zaman pəncərəsində dəyişikliklərin sürətini ölçür və tələ (canary) fayllarını izləyir.
2. **Dərhal Təcrid:** Hədd aşılarsa, insident dərhal RFC 8032 Ed25519 ilə imzalanır və təcavüzkarın hesabı IAM səviyyəsində dondurulur (SLA < 10 saniyə, real: 0.24 ms).
3. **Təsdiqlənmiş Bərpa:** Ehtiyat nüsxələr AES-256-GCM AEAD ilə şifrələnir, bərpa zamanı hər bir fayl yenidən heşlənir və yalnız ilkin Merkle kökü ilə 100% üst-üstə düşən fayllar geri qaytarılır.

---

## 3. Layihənin İcra Planı və 12 Həftəlik Mühəndislik Strukturu

Layihənin uğurla tamamlanması üçün 12 həftəlik çevik (Agile/Scrum) mühəndislik planı tərtib edilmiş və işlər 6 əsas mərhələyə bölünmüşdür. Bütün fəaliyyət Linear layihə idarəetmə platformasında rollar və həftələr üzrə qeydiyyata alınmışdır:

- **Həftə 1–2: Tələblərin Dondurulması və GRC Çərçivəsi** — Təhlükəsizlik tələblərinin dondurulması, ISO 27001 / NIST CSF uyğunluq matrisinin qurulması, STRIDE təhdid analizi.
- **Həftə 3–4: Kriptoqrafik Nüvə və Baseline Mühərriki** — SHA-256 axın heşlənməsi, Merkle DAG ağacının qurulması, AES-256-GCM AEAD şifrələmə kitabxanasının yazılması.
- **Həftə 5–6: Bulud İnfrastrukturu və Saxlanc Adapterləri** — Supabase Storage və Postgres sxeminin qurulması, RLS siyasətləri, yerli LocalFsStorage adapteri və test mühiti.
- **Həftə 7–8: Aşkarlama Mühərriki və IAM Freeze İnteqrasiyası** — Sliding-window dəyişiklik dərəcəsinin hesablanması, Canary tripwire tələləri, avtomatlaşdırılmış IAM dondurma siyasəti.
- **Həftə 9–10: Zəncirvari Audit və Sıfır-Etibarlı Bərpa** — Hash-chained dəyişdirilməz audit jurnalı, təhlükəsiz karantin (quarantine) bərpa mexanizmi, 100% VALID heş yoxlaması.
- **Həftə 11–12: Eksperimentlər, Benchmark Metrikləri və Yekun Sənədləşmə** — Hədd süpürmə (threshold sweep) eksperimentləri, M1–M9 performans ölçmələri, kod auditi və diplom hesabatının hazırlanması.

![Şəkil 1. Linear Layihə İdarəetmə Lövhəsi](screenshots/19_linear_board_overview.png)
*Şəkil 1. Linear Layihə İdarəetmə Lövhəsi — 12 həftəlik mühəndislik planının 6 rol (PM, Crypto, DevOps, Backend, Frontend, QA) üzrə sprint bölgüsünü göstərir.*

![Şəkil 2. Linear Sprint və Tapşırıqlar İyerarxiyası](screenshots/20_linear_board_sprints.png)
*Şəkil 2. Linear Sprint və Tapşırıqlar İyerarxiyası — GRC siyasətlərindən kriptoqrafik bərpa moduluna qədər bütün alt-tapşırıqların icra statusunu əks etdirir.*

---

## 4. Ümumi Sistem Arxitekturu və 6 Mərhələli Müdafiə Konveyeri

CloudRDR arxitekturası tamamilə modulyar, zəif əlaqəli (loosely coupled) və sıfır-etibar (Zero-Trust) prinsipləri üzərində qurulmuşdur. Sistem hadisə-əsaslı (event-driven) işləyir və hər bir komponent yalnız özünə aid təhlükəsizlik sərhədini idarə edir.

![Şəkil 3. CloudRDR Abstrakt Sintaksis Ağacı (AST) Bilik Qrafı](screenshots/22_knowledge_graph_ast_architecture.png)
*Şəkil 3. CloudRDR Abstrakt Sintaksis Ağacı (AST) Bilik Qrafı — Sistemin mənbə faylları və kriptoqrafik, saxlanc və aşkarlama modulları arasındakı dərin asılılıq əlaqələrini göstərir.*

### 6 Mərhələli Müdafiə Konveyeri:

1. **Mərhələ 1: Kriptoqrafik İlkin Vəziyyət (Baseline)** — Qorunan anbardakı bütün fayllar SHA-256 ilə heşlənir, binar Merkle ağacına yığılır və vahid Merkle Root yaradılır. Eyni zamanda hər bir fayl AES-256-GCM ilə şifrələnərək soyuq ehtiyat nüsxəyə göndərilir.
2. **Mərhələ 2: Fasiləsiz Hadisə Monitorinqi (Monitor)** — Monitor Agent hər 10 saniyədən bir saxlancı yoxlayır, faylların yaradılması, dəyişdirilməsi və silinməsi hadisələrini qeydə alır və dəyişmiş faylların yeni heşlərini bazaya yazır.
3. **Mərhələ 3: Aşkarlama Mühərriki (Detection Engine)** — 60 saniyəlik sürüşən zaman pəncərəsi daxilində dəyişiklik sürəti hesablanır. Əgər dəyişiklik 30%-dən çoxdursa və ya bircə dənə Canary tələ faylına toxunulubsa, dərhal RANSOMWARE hökmü çıxarılır.
4. **Mərhələ 4: Ani Reaksiya və Hesabın Dondurulması (Response & Freeze)** — Təcavüzkarın bulud hesabına dərhal IAM Write-Freeze siyasəti tətbiq edilir, bütün yazma və silmə hüquqları dondurulur (SLA < 10s). İnsident qeydi yaradılır və RFC 8032 Ed25519 rəqəmsal imzası ilə möhürlənir.
5. **Mərhələ 5: Dəyişdirilməz Zəncirvari Audit (Audit Ledger)** — Bütün hadisələr hər blokun əvvəlki blokun heşini saxladığı SHA-256 zəncirvari audit jurnalına yazılır. Hər hansı qeydin dəyişdirilməsi zənciri qırır.
6. **Mərhələ 6: Sıfır-Etibarlı Karantin Bərpası (Verified Recovery)** — Ehtiyat nüsxələr AES-256-GCM AEAD vasitəsilə deşifrələnir, izolyasiya olunmuş karantin qovluğuna çıxarılır, hər bir faylın SHA-256 heşi ilkin baseline ilə yoxlanılır. Yalnız 100% VALID təsdiqlənən fayllar saxlanca geri qaytarılır.

---

## 5. Bulud Təhlükəsizliyi: Birgə Məsuliyyət, IAM Freeze və Saxlanc Təcridi

Bulud mühitində təhlükəsizliyin təmin edilməsi Birgə Məsuliyyət Modelinə (Shared Responsibility Model) əsaslanır. Bulud provayderi (Supabase / AWS) fiziki serverlərin, şəbəkə avadanlıqlarının və hipervizorun təhlükəsizliyinə cavabdehdirsə, məlumatların şifrələnməsi, giriş hüquqlarının tənzimlənməsi (IAM) və anbarların konfiqurasiyası tamamilə müştərinin məsuliyyətindədir.

### Cədvəl 1. Bulud Xidmət Modellərində Təhlükəsizlik Məsuliyyətlərinin Bölgüsü

| Xidmət Modeli | Provayderin Nəzarətində | Müştərinin Nəzarətində | CloudRDR Layihəsində Tətbiqi |
| :---: | :--- | :--- | :--- |
| **IaaS** | Fiziki avadanlıq, şəbəkə, serverlər, virtuallaşdırma | ƏS, şəbəkə konfiqurasiyası, verilənlər bazası, tətbiq kodu | Yerli simulyasiya və VM mühiti |
| **PaaS / BaaS** | ƏS, verilənlər bazası mühərriki, saxlanc infrastrukturu | Məlumatların şifrələnməsi, RLS qaydaları, istifadəçi autentifikasiyası, tətbiq loqikası | Supabase Postgres & Storage (Əsas platforma) |
| **SaaS** | Bütün infrastruktur, verilənlər bazası və proqram təminatı | Yalnız son istifadəçi giriş hüquqları və konfiqurasiya | Vercel Hosting & Linear |

### Supabase Seçimi, Özəl Saxlanc və Row Level Security (RLS)
Layihədə əsas bulud platforması kimi açıq mənbəli Supabase (Postgres və S3-uyğun Storage) seçilmişdir. Bütün fayllar `protected` adlı özəl (private) saxlanc anbarında saxlanılır. Anbarın açıq internetə birbaşa oxunması (public bucket) qəti şəkildə qadağan edilmişdir. Bütün verilənlər bazası cədvəllərində Row Level Security (RLS) aktivləşdirilmişdir. Anonim və hətta autentifikasiyadan keçmiş adi istifadəçilərə cədvəlləri oxumaq və yazmaq hüququ verilməmişdir (`deny_all`). Yalnız backend servisinin server tərəfində saxlanılan məxfi `SERVICE_ROLE` açarı RLS məhdudiyyətlərini aşaraq əməliyyat apara bilər.

![Şəkil 4. Supabase Sıfır-Etibar (Zero-Trust) RLS Təhlükəsizlik Siyasətləri](screenshots/02_supabase_storage_and_rls.png)
*Şəkil 4. Supabase Sıfır-Etibar (Zero-Trust) RLS Təhlükəsizlik Siyasətləri — Bütün daxili cədvəllərdə anon və authenticated rolları üçün icazələrin qapadıldığını nümayiş etdirir.*

### Ən Az Səlahiyyət Prinsipi (Least Privilege) və IAM Write-Freeze Siyasəti
Təcavüzkar API açarını ələ keçirib kütləvi şifrələməyə başladıqda, ən vacib addım hücumun qarşısını dərhal kəsməkdir. CloudRDR mühərriki ransomware aşkarladıqda, dərhal cloud idarəetmə interfeysinə müraciət edərək həmin hesaba qarşı `IAM Deny-All Write` siyasətini aktivləşdirir. Bu siyasət oxuma hüququnu qüvvədə saxlayır (belə ki, bərpa servisi faylları yoxlamalıdır), lakin hər hansı yeni fayl yazmağı və ya mövcud faylları silməyi dərhal bloklayır. Benchmark ölçmələrimiz göstərir ki, IAM Freeze əməliyyatı orta hesabla 0.24 millisaniyə ərzində icra olunur (SLA hədəfi: < 10 saniyə).

![Şəkil 5. Avtomatlaşdırılmış IAM Dondurulması və Bloklama Xəbərdarlığı](screenshots/08_account_frozen_iam_policy.png)
*Şəkil 5. Avtomatlaşdırılmış IAM Dondurulması və Bloklama Xəbərdarlığı — Təhlükə qeydə alındıqdan sonra yazma hüquqlarının dərhal məhdudlaşdırıldığını təsdiq edir.*

### Açarların Təhlükəsiz İdarə Edilməsi və Müştəri Tərəfli Şifrələmə
Sistemdə heç bir məxfi açar (API Key, Supabase Service Key, Master Encryption Key) birbaşa kod bazasında saxlanılmır. Bütün açarlar `.env` faylında saxlanılır və `.gitignore` vasitəsilə ictimai GitHub reposuna düşməsi bloklanmışdır. Ehtiyat nüsxələr buluda ötürülməzdən əvvəl yerli mühitdə AES-256-GCM ilə şifrələnir (Client-side encryption). Nəticədə, hətta bulud provayderinin özü belə bizim faylların məzmununu oxuya bilməz.

---

## 6. Kriptoqrafiya Mexanizmləri: Merkle DAG, AES-256-GCM və Ed25519

Kriptoqrafiya — CloudRDR platformasının riyazi onurğa sütunudur. Sistemdə 4 əsas kriptoqrafik primitivdən istifadə edilmişdir:
1. **SHA-256 axın heşlənməsi** (fayl tamlığı üçün)
2. **Merkle Ağacı DAG** (bütün anbarın bütövlük möhürü üçün)
3. **AES-256-GCM AEAD** (ehtiyat nüsxələrin şifrələnməsi və autentifikasiyası üçün)
4. **RFC 8032 Ed25519** (insident aktlarının rəqəmsal imzalanması üçün)

### 6.1. SHA-256 İlkin Vəziyyət (Baseline) və Merkle Ağacı
- **Nə edir:** Saxlancdakı hər bir faylın məzmunundan 64 simvolluq unikal heş çıxarır və onları cüt-cüt birləşdirərək vahid Merkle Root yaradır.
- *Nümunə:* Heş funksiyasını hər bir faylın dəyişməz 'rəqəmsal barmaq izi', Merkle Root-u isə bütün arxivin üzərinə vurulmuş 'ümumi baş möhür' kimi təsəvvür etmək olar.
- **Necə etdim:** Python `hashlib.sha256()` axın metodu ilə böyük faylları RAM-a tam yükləmədən heşlədim. Alınan heşləri əlifba sırası ilə düzüb Bitcoin-tipli binar Merkle ağacını qurdum.
- **Yoxla:** `python -m unittest test_flask_backend.py` əmrini icra edib terminalda yaranan 64 simvolluq Merkle Root dəyərini yoxla.
- **Gözlənilən nəticə:** 50 fayl üçün Merkle kökü hesablanır və `baseline_snapshots` cədvəlinə yazılır.

![Şəkil 6. Kriptoqrafik İlkin Vəziyyətin (Baseline) Yaranması](screenshots/03_baseline_generation_terminal.png)
*Şəkil 6. Kriptoqrafik İlkin Vəziyyətin (Baseline) Yaranması — 50 faylın heşlənməsi və Merkle Root heşinin uğurla hesablandığını nümayiş etdirir.*

![Şəkil 7. Merkle Ağacında Korlanmanın Kökə Doğru Yayılması](screenshots/07_merkle_tree_corruption_climb.png)
*Şəkil 7. Merkle Ağacında Korlanmanın Kökə Doğru Yayılması — Ransomware faylları dəyişdikdə yarpaqların və kök heşinin qırmızı rəngdə tamlığının pozulduğunu əks etdirir.*

### 6.2. AES-256-GCM ilə Autentifikasiyalı Şifrələmə (AEAD)
- **Nə edir:** Ehtiyat nüsxələri şifrələyir və fayla 16 baytlıq AEAD autentifikasiya teqi əlavə edir. Əgər şifrəli faylın içində 1 bayt belə dəyişdirilərsə, deşifrələmə dərhal xəta verir və faylı açmır.
- *Nümunə:* AEAD şifrələməni xüsusi rəqəmsal plombla bağlanan diplomatik çantaya bənzətmək olar — plombla oynanılsa, çanta içindəki sənədi məhv edir və oxunmasına icazə vermir.
- **Necə etdim:** `AESGCM(key)` vasitəsilə 12 baytlıq unikal IV (Initialization Vector) və 16 baytlıq Auth Tag generasiya etdim. Faylın adı və versiyasını AAD (Additional Authenticated Data) kimi teqə bağladım.
- **Yoxla:** Şifrələnmiş faylın 40-cı baytını süni şəkildə dəyiş (bit flip) və deşifrələməni sına.
- **Gözlənilən nəticə:** `aeadVerified = false` qayıdır və sıfır bayt məlumat sızır.

![Şəkil 8. AES-256-GCM AEAD Saxtalaşdırmanın Rədd Edilməsi Təcrübəsi](screenshots/12_terminal_tamper_exp_aes_aead.png)
*Şəkil 8. AES-256-GCM AEAD Saxtalaşdırmanın Rədd Edilməsi Təcrübəsi — Şifrəli faylda 1 bayt dəyişdirildikdə kriptoqrafik yoxlamanın dərhal xəta verdiyini və bərpanı dayandırdığını sübut edir.*

### 6.3. RFC 8032 Ed25519 ilə İnsident Aktlarının Rəqəmsal İmzalanması
- **Nə edir:** Baş vermiş ransomware insidentinin bütün detallarını (vaxt, təcavüzkarın hesabı, zədələnmiş fayllar) Eliptik Əyri Kriptoqrafiyası (Ed25519) ilə imzalayır və hüquqi məhkəmə sübutuna çevirir.
- *Nümunə:* Rəqəmsal imzanı notariat tərəfindən təsdiqlənmiş və heç cür saxtalaşdırılması mümkün olmayan elektron möhür kimi qəbul etmək olar.
- **Necə etdim:** Python `cryptography.hazmat.primitives.asymmetric.ed25519` ilə açar cütlüyü yaratdım. İnsident JSON obyektini kanonik şəkildə sıralayıb 64 baytlıq imza hasil etdim.
- **Yoxla:** İmzalanmış insident qeydində 'freezeStatus' dəyərini dəyişdirib imzanı yenidən yoxla.
- **Gözlənilən nəticə:** `verify_incident_signature()` funksiyası `false` qaytarır və sənədin saxtalaşdırıldığını bildirir.

![Şəkil 9. SOC Nəzarət Panelində İnsident İmzası və Sübut Zənciri](screenshots/09_incident_detail_ed25519_valid.png)
*Şəkil 9. SOC Nəzarət Panelində İnsident İmzası və Sübut Zənciri — RFC 8032 Ed25519 imzasının və Merkle kökünün kriptoqrafik təsdiq kartını göstərir.*

![Şəkil 10. Ed25519 İnsident Qeydinin Saxtalaşdırılmasının Aşkarlanması](screenshots/13_terminal_tamper_exp_ed25519_sig.png)
*Şəkil 10. Ed25519 İnsident Qeydinin Saxtalaşdırılmasının Aşkarlanması — İnsident qeydindəki bircə söz dəyişdirildikdə rəqəmsal imzanın dərhal etibarsız sayıldığını təsdiq edir.*

### 6.4. Dəyişdirilməz Zəncirvari Audit Jurnalı (Hash-Chained Log)
- **Nə edir:** Sistemdə baş verən hər bir kritik əməliyyatı bloklar şəklində zəncirləyir. Hər bir blok əvvəlki blokun SHA-256 heşini saxlayır.
- *Nümunə:* Bu jurnalı hər səhifəsinin küncündə əvvəlki səhifənin möhürü olan və vərəqi cırıldıqda və ya mətni qaralandıqda dərhal bəlli olan rəsmi reyestr dəftərinə bənzətmək olar.
- **Necə etdim:** `backend_py/audit_log.py` modulunu qurdum. Hər yeni blok:  
  $$\text{hash} = \text{SHA-256}(\text{index} + \text{prevHash} + \text{timestamp} + \text{canonicalJson}(\text{data}))$$  
  formulası ilə zəncirlənir.
- **Yoxla:** Loq faylından 1-ci bloku açıb daxilindəki dəyişiklik dərəcəsini 0.40-dan 0.05-ə dəyiş və `verify_audit_chain()` işə sal.
- **Gözlənilən nəticə:** Sistem `Broken Block Index #1` xətası verir və zəncirin qırıldığını elan edir.

![Şəkil 11. Bütöv və Dəyişdirilməz Zəncirvari Audit Jurnalı](screenshots/10_audit_chain_intact.png)
*Şəkil 11. Bütöv və Dəyişdirilməz Zəncirvari Audit Jurnalı — Bütün blokların bir-birinə riyazi olaraq bağlı olduğunu və loq tamlığının 100% qorunduğunu nümayiş etdirir.*

![Şəkil 12. Audit Jurnalında Saxtakarlığın Aşkarlanması və Zəncirin Qırılması](screenshots/11_audit_chain_tamper_detected.png)
*Şəkil 12. Audit Jurnalında Saxtakarlığın Aşkarlanması və Zəncirin Qırılması — Blok məzmunu dəyişdirildikdə növbəti blokdakı prevHash uyğunsuzluğunun dərhal aşkar edildiyini göstərir.*

![Şəkil 13. Terminal: Audit Loqunda Kriptoqrafik Qırılmanın Təsdiqi](screenshots/14_terminal_tamper_exp_audit_chain.png)
*Şəkil 13. Terminal: Audit Loqunda Kriptoqrafik Qırılmanın Təsdiqi — prevHash fərqinin tam olaraq hansı sətirdə baş verdiyini təsdiq edən çıxışı əks etdirir.*

---

## 7. Backend Mühərriki, Sürüşən Zaman Pəncərəsi və Canary Tələləri

Backend arxitekturası yüksək performanslı Python Flask çərçivəsində modulyar blueprint strukturu ilə qurulmuşdur. Aşkarlama mühərriki (Detection Engine) faylların dəyişmə intensivliyini izləmək üçün 60 saniyəlik sürüşən zaman pəncərəsi (Sliding Time Window) modelindən istifadə edir.

### Dəyişiklik Hədləri və Dinamik Qərarvermə
Sürüşən pəncərə daxilində dəyişiklik dərəcəsi aşağıdakı düsturla hesablanır:

$$\text{ChangeRate} = \frac{\text{Dəyişmiş Faylların Sayı}}{\text{Ümumi Qorunan Faylların Sayı}}$$

Sistemdə 3 dəqiq vəziyyət dərəcəsi təyin edilmişdir:
- **Normal (ChangeRate < 10%):** Təbii istifadəçi fəaliyyəti, heç bir həyəcan siqnalı verilmir.
- **Şübhəli / Suspicious (10% ≤ ChangeRate < 30%):** Şübhəli kütləvi dəyişiklik, SOC konsolunda sarı xəbərdarlıq yanır və monitorinq tezliyi artırılır.
- **Ransomware (ChangeRate ≥ 30%):** Kritik hücum vəziyyəti, dərhal IAM Write-Freeze aktivləşdirilir və insident sənədi imzalanır.

![Şəkil 14. 60 Saniyəlik Sürüşən Zaman Pəncərəsi və Sürət Qrafiki](screenshots/05_detection_sliding_window_graph.png)
*Şəkil 14. 60 Saniyəlik Sürüşən Zaman Pəncərəsi və Sürət Qrafiki — Real vaxt rejimində dəyişiklik dərəcəsinin 30% kritik həddə çatmasını və aşkarlanmasını əks etdirir.*

### Canary Tripwire (Tələ Fayl) Mexanizmi
Bəzi mürəkkəb ransomware növləri həddə düşməmək üçün faylları çox yavaş şifrələyir (Low-and-Slow Attack). Bu növ hücumları zərərsizləşdirmək üçün anbarın strateji qovluqlarına xüsusi cəlbedici ada malik Canary tələ faylları yerləşdirilmişdir (məsələn: `canaries/passwords_backup.docx` və ya `sentinel.canary`). Bu fayllar heç bir qanuni işçi tərəfindən açılmamalı və dəyişdirilməməlidir. Canary faylına edilən hər hansı dəyişiklik və ya silmə cəhdi sürət həddindən asılı olmayaraq **0.6 millisaniyə ərzində** dərhal RANSOMWARE hökmünün verilməsinə və sistemin dondurulmasına səbəb olur.

![Şəkil 15. Canary Tələ Faylı Toxunulduqda Dərhal Hücum Hökmünün Çıxarılması](screenshots/06_canary_tripwire_triggered.png)
*Şəkil 15. Canary Tələ Faylı Toxunulduqda Dərhal Hücum Hökmünün Çıxarılması — Tripwire faylı dəyişdirilən kimi sistemin anında kritik qırmızı rejimə keçdiyini nümayiş etdirir.*

### İcazəli Hesabların Qorunması (Allowlist Immunity)
Korporativ mühitlərdə bəzi qanuni servislər (məsələn, rəsmi arxivləşdirmə və ya ehtiyat nüsxə skripti) qısa müddətdə yüzlərlə faylı qanuni olaraq dəyişə bilər. Sistemin yalançı həyəcan (False Positive) verməməsi üçün `ALLOWLISTED_ACCOUNTS` mexanizmi tətbiq edilmişdir. Həmin hesablardan gələn kütləvi dəyişikliklər həddi aşsa belə, əgər Canary faylına toxunulmayıbsa, qanuni əməliyyat kimi qəbul edilir və bloklanmır.

![Şəkil 16. İcazəli Ehtiyat Nüsxə Hesabının Qorunması (FP = 0.0%)](screenshots/23_negative_test_allowlist_bypass.png)
*Şəkil 16. İcazəli Ehtiyat Nüsxə Hesabının Qorunması (FP = 0.0%) — 70% dəyişiklik edən icazəli agentin yalançı həyəcan doğurmadan fəaliyyətini davam etdirdiyini təsdiqləyir.*

---

## 8. İnformasiya Təhlükəsizliyi Menecment Sistemi (İSMS) və Uyğunluq

İnformasiya Təhlükəsizliyi Menecment Sistemi (İSMS) yalnız proqram kodundan ibarət deyil; o, təşkilatın risklərini idarə edən sistemli və davamlı proseslər toplusudur. CloudRDR çərçivəsində İSMS sistemini 4 sadə və strateji sual üzərində qurdum:
1. **Nəyi qoruyuruq?** — Təşkilatın kritik bulud məlumatlarını, ehtiyat nüsxələrini və kriptoqrafik açarlarını (Aktiv Reyestri).
2. **Nə pis ola bilər?** — Ransomware hücumu, ehtiyat nüsxənin korlanması, açarların sızması və ya daxili təhdid (Risk Reyestri).
3. **Nə edirik ki, olmasın?** — Merkle tamlıq yoxlaması, AES-GCM şifrələmə, IAM dondurulması və karantin bərpası (SoA Nəzarətləri).
4. **Bunu kim və necə edir?** — İnsident Cavab Qrupu, rollar və Fəlakətdən Bərpa Planı (BCP/DRP Planı).

### 8.1. Cədvəl 2. CloudRDR İnformasiya Aktivləri Reyestri və Təsnifatı

| Aktiv ID | Aktivin Adı və Təsviri | Məxfilik | Tamlıq | Əlçatanlıq |
| :---: | :--- | :---: | :---: | :---: |
| **AST-01** | Bulud Saxlanc Faylları (Müştəri və Maliyyə sənədləri) | Məxfi (C3) | Kritik (I3) | Yüksək (A2) |
| **AST-02** | AES-256 Ehtiyat Nüsxələri (Cold Backups) | Məxfi (C3) | Kritik (I3) | Kritik (A3) |
| **AST-03** | Kriptoqrafik Açarlar (Ed25519 & AES Master Key) | Çox Məxfi (C4) | Kritik (I3) | Kritik (A3) |
| **AST-04** | Zəncirvari Audit Jurnalı (Forensic Audit Logs) | Daxili (C2) | Kritik (I3) | Orta (A2) |
| **AST-05** | SOC İdarəetmə Paneli və Monitor Agent | Daxili (C2) | Yüksək (I2) | Yüksək (A2) |

### 8.2. Cədvəl 3. CloudRDR Risk Reyestri və Nəzarət Tədbirləri

| Risk ID | Təhlükə və Risk Ssenarisi | Ehtimal | Təsir | Səviyyə | Tətbiq Olunan Nəzarət |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **RSK-01** | Bulud anbarındakı faylların ransomware tərəfindən kütləvi şifrələnməsi | Yüksək (4) | Fəlakətli (5) | **KRİTİK (20)** | 60s Sürüşən pəncərə, Canary tələləri, avtomatlaşdırılmış IAM Freeze |
| **RSK-02** | Ehtiyat nüsxənin zədələnməsi və ya içinə gizli backdoor yerləşdirilməsi | Orta (3) | Kritik (4) | **YÜKSƏK (12)** | AES-256-GCM AEAD teqi və SHA-256 Merkle root ilə 100% tutuşdurma |
| **RSK-03** | Təcavüzkarın audit loqlarını silərək izləri itirməsi | Orta (3) | Yüksək (4) | **YÜKSƏK (12)** | Dəyişdirilməz SHA-256 Hash-chained audit jurnalı və Append-only siyasəti |
| **RSK-04** | Qanuni kütləvi əməliyyatların səhvən bloklanması (Yalançı həyəcan) | Yüksək (4) | Orta (2) | **ORTA (8)** | İcazəli hesablar siyahısı (ALLOWLISTED_ACCOUNTS) və hədd kalibrasiyası |
| **RSK-05** | Bulud servisi xətası və ya şəbəkə kəsilməsi | Aşağı (2) | Kritik (4) | **ORTA (8)** | Fasiləsiz yerli keşləmə, retry dövrləri və lokal fallback saxlanc adapteri |

### 8.3. Cədvəl 4. ISO 27001:2022 Əlavə A Nəzarətləri və NIST CSF 2.0 Xəritələnməsi

| ISO 27001 Nəzarət | Nəzarət Tələbinin Adı | CloudRDR Reallaşdırma Mexanizmi | NIST CSF 2.0 Funksiyası |
| :---: | :--- | :--- | :---: |
| **A.5.23** | Bulud Xidmətlərində İnformasiya Təhlükəsizliyi | Supabase Storage üçün özəl bucket, RLS deny-all və Least Privilege IAM | GOVERN (GV.SC) |
| **A.8.7** | Zərərli Proqram Təminatından Mühafizə | 60 saniyəlik sürüşən zaman pəncərəsi və Canary decoy tələ faylları | PROTECT (PR.PS) |
| **A.8.15** | Jurnalların Qeydiyyatı (Logging) | Dəyişdirilməz SHA-256 hash-chained audit jurnalı və hərəkətlərin fiksasiyası | DETECT (DE.AE) |
| **A.8.16** | Monitorinq Fəaliyyətləri | Hər 10 saniyədən bir saxlancı təftiş edən Monitor Agent və real vaxt sürət qrafiki | DETECT (DE.CM) |
| **A.8.24** | Kriptoqrafiyanın İstifadəsi | SHA-256 Merkle ağacı, AES-256-GCM AEAD ehtiyat nüsxələmə və Ed25519 imzaları | PROTECT (PR.DS) |
| **A.8.14** | Məlumatların Ehtiyat Nüsxələnməsi və Bərpası | İzolyasiya olunmuş karantin sahəsində mərhələli bərpa və 100% bit-bərabərlik | RECOVER (RC.RP) |

### 8.4. İnsident Cavab Planı (NIST SP 800-61 Rev. 2) və Fəlakətdən Bərpa (BCP/DRP)
İnsidentlərin idarə edilməsi NIST SP 800-61 standartına uyğun 4 mərhələdə aparılır:
1. **Hazırlıq (Preparation):** Baseline snapshotlarının möhürlənməsi, Canary faylların səpilməsi və API açarlarının paylanması.
2. **Aşkarlama və Təhlil (Detection & Analysis):** Sliding window dəyişiklik faizi və ya Canary toxunulması ilə hücumun təsdiqlənməsi.
3. **Lokallaşdırma və Məhv Etmə (Containment & Eradication):** Avtomatik IAM Write-Freeze siyasəti ilə hesabın bloklanması və Ed25519 aktının imzalanması.
4. **Bərpa və Nəticə (Recovery & Post-Incident):** Karantin bərpası, 100% VALID yoxlaması, dondurmanın aradan qaldırılması və dərslərin çıxarılması.

**Fəlakətdən Bərpa Planı (DRP) üzrə təsdiqlənmiş korporativ hədəflər:**
- **RPO (Recovery Point Objective):** RPO = 0 (Kriptoqrafik ehtiyat nüsxə baseline zamanı alındığı üçün heç bir məlumat itkisi olmur).
- **RTO (Recovery Time Objective):** RTO < 15 dəqiqə (Real sınaqlarımızda 20 fayl cəmi 0.8 saniyəyə tam bərpa olunmuşdur).

![Şəkil 17. İki-Mərhələli Təhlükəsiz Karantin Bərpası (Staged Recovery)](screenshots/15_quarantine_staged_restore.png)
*Şəkil 17. İki-Mərhələli Təhlükəsiz Karantin Bərpası (Staged Recovery) — Faylların birbaşa canlı anbara deyil, əvvəlcə təcrid olunmuş karantin sahəsinə çıxarılaraq yoxlandığını nümayiş etdirir.*

![Şəkil 18. 100% Təsdiqlənmiş Kriptoqrafik Bərpa (Verified Recovery)](screenshots/16_verified_recovery_100_percent.png)
*Şəkil 18. 100% Təsdiqlənmiş Kriptoqrafik Bərpa (Verified Recovery) — Bütün 20 faylın VALID statusu aldığını və Merkle kökünün ilkin vəziyyətlə bərabərliyini əks etdirir.*

---

## 9. Nəzarət Paneli (SOC Dashboard) və Canlı Simulyasiya Ssenarisi

CloudRDR nəzarət paneli təhlükəsizlik əməliyyatları mərkəzinin (SOC) analitikləri üçün hazırlanmış müasir veb interfeysidir. Panel heç bir ağır xarici kitabxana olmadan, təmiz HTML5, CSS3 Tokens və asinxron JavaScript vasitəsilə qurulmuşdur. İnterfeysdə qeyri-ciddi emojilərdən istifadə edilməmiş, bütün vizual elementlər rəsmi SVG ikonlarla dizayn olunmuşdur.

![Şəkil 19. Canlı SOC Nümayiş Paneli və Əsas Göstəricilər Kartı (KPI)](screenshots/24_live_demo_soc_kpi_action_bar.png)
*Şəkil 19. Canlı SOC Nümayiş Paneli və Əsas Göstəricilər Kartı (KPI) — Protected Storage, Containment SLA, Detection Velocity və Zero-Trust Recovery metrikalarını real vaxtda təqdim edir.*

![Şəkil 20. SOC İdarəetmə Panelinin İlkin Sakit (Calm) Vəziyyəti](screenshots/04_soc_dashboard_calm.png)
*Şəkil 20. SOC İdarəetmə Panelinin İlkin Sakit (Calm) Vəziyyəti — Sistemdə bütün faylların qorunduğunu və Merkle kökünün bütöv olduğunu nümayiş etdirir.*

---

## 10. Eksperimental Qiymətləndirmə, M1–M9 Metrikləri və Hədd Süpürməsi

CloudRDR sisteminin etibarlılığını və performansını sübut etmək üçün iki genişmiqyaslı eksperiment həyata keçirilmişdir: 9 formal qiymətləndirmə metriki (M1–M9) və 7 fərqli dəyişiklik həddini əhatə edən Hədd Süpürmə (Threshold Sweep) sınağı.

### Cədvəl 5. CloudRDR Formal Qiymətləndirmə Metrikləri Nəticələri

| ID | Metrik Parametrinin Adı | Məqsəd / SLA Hədəfi | Real Ölçülmüş Dəyər | Status |
| :---: | :--- | :--- | :---: | :---: |
| **M1** | Ransomware Aşkarlama Gecikməsi | < 60,000 ms (SLA) | 200.11 ms | **PASSED** |
| **M2** | Hesabın Avtomatik Dondurulması | < 10,000 ms (SLA) | 0.24 ms | **PASSED** |
| **M3** | Qanuni Kütləvi Yükləmədə FP Faizi | 0.00% (Allowlist qorunması) | 0.00% (Normal) | **PASSED** |
| **M4** | Canary Tələ Aşkarlama Gecikməsi | < 1,000 ms (Ani) | 0.602 ms | **PASSED** |
| **M5** | AEAD Saxtalaşdırmanın Aşkarlanması | 100.00% (Tamper Reject) | 100.00% | **PASSED** |
| **M6** | Kriptoqrafik Bərpa Dürüstlüyü | 100.00% VALID | 100.0% VALID (20/20) | **PASSED** |
| **M7** | Audit Zəncirinin Tamlığı | 100.00% Valid Chain | 100.00% (Bütöv) | **PASSED** |
| **M8** | İlkin Heşləmə Buraxılış Qabiliyyəti | > 10.0 MB/s | 16.43 MB/s (262.8 f/s) | **PASSED** |
| **M9** | Sistemin Əməli Yaddaş (RAM) Yükü | < 100 MB Delta | 1.60 MB (Total: 11.2 MB) | **PASSED** |

![Şəkil 21. Formal Qiymətləndirmə Metrikləri (M1–M9) Terminal İcra Nəticəsi](screenshots/17_metrics_harness_execution_table.png)
*Şəkil 21. Formal Qiymətləndirmə Metrikləri (M1–M9) Terminal İcra Nəticəsi — Bütün 9 metrikin hədəf SLA göstəricilərini üstələyərək PASSED olduğunu təsdiq edir.*

### Cədvəl 6. Aşkarlama Həddi Süpürməsi (Threshold Sweep) Matrisi və Dəqiqlik Analizi

| Hədd | TP | FP | TN | FN | Precision | Recall | Specificity | F1-Score |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1%** | 7 | 5 | 2 | 0 | 58.3% | 100.0% | 28.6% | 0.737 |
| **5%** | 7 | 3 | 4 | 0 | 70.0% | 100.0% | 57.1% | 0.824 |
| **10%** | 7 | 2 | 5 | 0 | 77.8% | 100.0% | 71.4% | 0.875 |
| **20%** | 6 | 1 | 6 | 1 | 85.7% | 85.7% | 85.7% | 0.857 |
| **30% [OPT]** | 6 | 0 | 7 | 1 | **100.0%** | **85.7%** | **100.0%** | **0.923** |
| **50%** | 4 | 0 | 7 | 3 | 100.0% | 57.1% | 100.0% | 0.727 |
| **80%** | 3 | 0 | 7 | 4 | 100.0% | 42.9% | 100.0% | 0.600 |

![Şəkil 22. Hədd Süpürmə Eksperimentinin Nəticələri və F1-Score Əyrisi](screenshots/18_threshold_sweep_chart.png)
*Şəkil 22. Hədd Süpürmə Eksperimentinin Nəticələri və F1-Score Əyrisi — 30% həddində Precision-un 100%-ə çatdığını və F1-Score-un maksimum (0.923) olduğunu nümayiş etdirir.*

### Nəticələrin Səmimi Mühəndislik Təhlili
- **Problem:** 1%, 5% və 10% kimi aşağı hədlərdə sistem adi ofis işçisinin eyni anda bir neçə hesabatı redaktə etməsini ransomware hücumu zənn edərək həyəcan siqnalı vermiş və aşağı Precision (58.3% – 77.8%) göstərmişdir.
- *Nümunə:* Bu hal yanğın siqnalizasiyasının mətbəxdə qayğanaq bişirilərkən çıxan buxara görə bütün binada suyu açmasına bənzəyir.
- **Həll:** Aşkarlama həddini 30% olaraq fiksasiya etdik və ALLOWLISTED_ACCOUNTS istisnalarını tətbiq etdik.
- **Yoxlama:** Nəticədə yalançı həyəcanlar 0%-ə düşdü, Precision 100% oldu və F1-Score 0.923 zirvəsinə çatdı.

![Şəkil 23. CloudRDR Vahid və İnteqrasiya Testləri (74/74 Keçib)](screenshots/01_project_structure_and_test_suite.png)
*Şəkil 23. CloudRDR Vahid və İnteqrasiya Testləri — Bütün sistem komponentlərinin avtomatlaşdırılmış testlərdən 100% uğurla keçdiyini təsdiq edir.*

---

## 11. Layihənin İdarə Edilməsi: Linear Lövhəsi, Rollar və CI/CD

Layihənin uğurlu icrası 6 nəfərlik komanda arasında vəzifələrin dəqiq paylanması və avtomatlaşdırılmış mühəndislik mühiti sayəsində mümkün olmuşdur:
- **Mübariz Paşayev (Project Manager & GRC Lead):** Layihənin planlaşdırılması, ISO 27001/NIST CSF uyğunluğu, risk reyestri və yekun tədqiqat hesabatı.
- **Nigar Əliyeva (Crypto Developer):** SHA-256 axın heşlənməsi, Merkle DAG ağacı, AES-256-GCM AEAD və Ed25519 modulunun yazılması.
- **Rəşad Məmmədov (DevOps Engineer):** Supabase verilənlər bazası miqrasiyaları, IAM Freeze siyasəti və GitHub Actions CI/CD boru kəməri.
- **Elmir Qasımov (Backend Developer):** Python Flask HTTP API servisi, sliding-window monitorinq agenti və karantin bərpa mühərriki.
- **Aysel Kərimova (Frontend Developer):** SOC nəzarət paneli, real vaxt Merkle SVG vizuallaşdırması və interaktiv hadisə axını jurnalı.
- **Tural Səfərov (QA & Benchmark Lead):** Vahid və inteqrasiya testləri, M1–M9 metrik harnessi və threshold sweep sınaqları.

![Şəkil 24. GitHub Actions CI/CD Boru Kəməri və Avtomatlaşdırılmış Testlər](screenshots/21_github_actions_ci_pipeline.png)
*Şəkil 24. GitHub Actions CI/CD Boru Kəməri və Avtomatlaşdırılmış Testlər — Hər bir commit üzrə lint, test və təhlükəsizlik yoxlamalarının avtomatik icrasını əks etdirir.*

---

## 12. Üç Fənnin Sintezi: Yekun Akademik İzah

CloudRDR layihəsi müasir kibertəhlükəsizlik elminin üç təməl sütununun vəhdətini təcəssüm etdirir:

1. **Kriptoqrafiya — 'Necə qorunur?' sualına cavab verir.** Kriptoqrafiya faylların tamlığını SHA-256 və Merkle ağacı ilə riyazi olaraq möhürləyir, ehtiyat nüsxələri AES-256-GCM AEAD ilə toxunulmaz edir və insident aktlarını Ed25519 ilə rəsmiləşdirir.
2. **Bulud Təhlükəsizliyi — 'Harada və necə saxlanır?' sualını cavablandırır.** Bulud infrastrukturu verilənləri özəl anbarlarda təcrid edir, RLS siyasətləri ilə icazəsiz girişləri bağlayır və təcavüzkarı IAM Write-Freeze vasitəsilə 0.2 millisaniyədə zərərsizləşdirir.
3. **İnformasiya Təhlükəsizliyi Menecment Sistemləri (İSMS) — 'Niyə və hansı risklər idarə olunur?' sualını tənzimləyir.** İSMS bütün bu texniki alətləri korporativ risklərin idarə edilməsi, ISO 27001 nəzarətləri, NIST SP 800-61 insident planı və hüquqi sübutların qorunması qaydaları ilə birləşdirərək vahid idarəetmə sisteminə çevirir.

Yekun olaraq, bu üç fənn birləşdikdə ransomware hücumlarına qarşı passiv gözləmə mövqeyindən fəal, avtomatlaşdırılmış və riyazi olaraq sübut edilə bilən mütləq müdafiə sistemi əldə edilmişdir.

---

## 13. Texniki Məhdudiyyətlər və Gələcək İnkişaf Perspektivləri

Layihənin uğurlu nəticələrinə baxmayaraq, gələcək tədqiqatlarda aradan qaldırılması nəzərdə tutulan bəzi real məhdudiyyətlər mövcuddur:
- **Polling Əsaslı Monitorinq:** Monitor agent saxlancı 10 saniyəlik intervalla yoxlayır. Gələcəkdə bunu S3 EventBridge və ya Supabase Realtime Webhooks ilə dəyişdirərək real vaxt reaksiyasını 0 millisaniyəyə endirmək olar.
- **Sabit Hədd Modeli:** 30%-lik hədd sintetik testlərdə optimal olsa da, qeyri-standart biznes mühitlərində maşın öyrənməsi (ML/AI) əsaslı anomaliya aşkarlanması daha effektiv ola bilər.
- **HSM İnteqrasiyası:** Hazırda Ed25519 açarları təhlükəsiz daxili mühitdə saxlanılır; gələcək korporativ versiyada açarların aparat təhlükəsizlik modulunda (AWS CloudHSM) saxlanması planlaşdırılır.
- **Çox-Buludlu (Multi-Cloud) Saxlanc Dəstəyi:** Hazırda Supabase və yerli adapterlər mövcuddur; gələcəkdə birbaşa Google Cloud Storage və Azure Blob saxlanc adapterlərinin əlavə olunması nəzərdə tutulur.

---

## 14. İstifadə Edilmiş Ədəbiyyat və Beynəlxalq Standartlar

1. **ISO/IEC 27001:2022** — Information security, cybersecurity and privacy protection — Information security management systems — Requirements.
2. **ISO/IEC 27002:2022** — Information security, cybersecurity and privacy protection — Information security controls.
3. **NIST Cybersecurity Framework (CSF) 2.0 (2024)** — National Institute of Standards and Technology.
4. **NIST SP 800-61 Rev. 2 (2012)** — Computer Security Incident Handling Guide.
5. **NIST FIPS 180-4 (2015)** — Secure Hash Standard (SHS) — SHA-256 Specification.
6. **NIST SP 800-38D (2007)** — Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC.
7. **RFC 8032 (2017)** — Edwards-Curve Digital Signature Algorithm (EdDSA) — Ed25519 Specification.
8. **Merkle, R. C. (1987)** — A Digital Signature Based on a Conventional Encryption Function. Advances in Cryptology — CRYPTO '87.
9. **Supabase Documentation (2026)** — Storage Access Control, Row Level Security, and Postgres Architecture.

---

## Əlavə A: Sübut Jurnalı (Evidence Log) və Tamamlanma Xülasəsi

Hesabatda təqdim edilmiş bütün 24 ədəd ekran görüntüsü, qrafik və eksperiment nəticəsi real işlək CloudRDR sistemindən əldə edilmişdir. Hər bir sübut faylı layihənin `report/screenshots/` kataloqunda saxlanılır.

### Cədvəl 7. Sübutlar Jurnalı və Şəkillər Reyestri

| № | Fayl Adı | Mövzu / Təsvir | İcra Əmri / Mənbə |
| :---: | :--- | :--- | :--- |
| **1** | `01_project_structure_and_test_suite.png` | Vahid və İnteqrasiya Testləri (74/74) | `python test_flask_backend.py` |
| **2** | `02_supabase_storage_and_rls.png` | Supabase Sıfır-Etibar RLS Siyasətləri | `psql db/migrations/001_init.sql` |
| **3** | `03_baseline_generation_terminal.png` | SHA-256 & Merkle Kökünün Yaranması | `python app.py --seed` |
| **4** | `04_soc_dashboard_calm.png` | SOC Konsolunun Sakit (Calm) Vəziyyəti | Vercel / Dashboard Live |
| **5** | `05_detection_sliding_window_graph.png` | 60s Sürüşən Zaman Pəncərəsi Qrafiki | Live Detection Component |
| **6** | `06_canary_tripwire_triggered.png` | Canary Tələsinə Toxunuldu Siqnalı | Simulation API: Attack Canary |
| **7** | `07_merkle_tree_corruption_climb.png` | Merkle Ağacında Korlanmanın Yayılması | Simulation API: Attack Burst |
| **8** | `08_account_frozen_iam_policy.png` | IAM Write-Freeze Siyasətinin Tətbiqi | Automated Response Engine |
| **9** | `09_incident_detail_ed25519_valid.png` | RFC 8032 Ed25519 İnsident İmzası | `crypto_utils.sign_incident()` |
| **10** | `10_audit_chain_intact.png` | Dəyişdirilməz Zəncirvari Audit Jurnalı | `audit_log.verify_chain()` [VALID] |
| **11** | `11_audit_chain_tamper_detected.png` | Audit Jurnalında Qırılma Xəbərdarlığı | `audit_log.verify_chain()` [BROKEN] |
| **12** | `12_terminal_tamper_exp_aes_aead.png` | AES-GCM 1 Bayt Dəyişikliyin Rəddi | Tamper Verification Harness |
| **13** | `13_terminal_tamper_exp_ed25519_sig.png` | Ed25519 Saxtalaşdırmanın İfşası | Tamper Verification Harness |
| **14** | `14_terminal_tamper_exp_audit_chain.png` | prevHash Qırılmasının Sübutu | Tamper Verification Harness |
| **15** | `15_quarantine_staged_restore.png` | Karantin Sahəsində Mərhələli Bərpa | Staged Recovery Engine |
| **16** | `16_verified_recovery_100_percent.png` | 100% VALID Təsdiqlənmiş Bərpa | Restore Verification (100% VALID) |
| **17** | `17_metrics_harness_execution_table.png` | Formal M1–M9 Metriklər Cədvəli | Metrics Benchmark Harness |
| **18** | `18_threshold_sweep_chart.png` | Hədd Süpürməsi (1%–80%) və F1 Əyrisi | Threshold Sweep Suite |
| **19** | `19_linear_board_overview.png` | Linear Layihə Lövhəsi (12 Həftəlik) | Linear Project Issues |
| **20** | `20_linear_board_sprints.png` | Linear Sprintlər və Rol Bölgüsü | Linear Active Sprint View |
| **21** | `21_github_actions_ci_pipeline.png` | GitHub Actions CI/CD Boru Kəməri | `.github/workflows/ci.yml` |
| **22** | `22_knowledge_graph_ast_architecture.png` | AST Səviyyəli Layihə Bilik Qrafı | `graphify update .` |
| **23** | `23_negative_test_allowlist_bypass.png` | İcazəli Agent Kütləvi Yükləmə Testi | Threshold Sweep Suite |
| **24** | `24_live_demo_soc_kpi_action_bar.png` | Canlı SOC KPI Paneli və Alətlər | Production SOC Dashboard |
"""

with open(os.path.join(REPORT_DIR, "CloudRDR_Yekun_Report.md"), "w", encoding="utf-8") as f:
    f.write(main_report_md.strip() + "\n")
print("Generated report/CloudRDR_Yekun_Report.md")


# ==============================================================================
# 2. DEDICATED CLOUD & CLOUD SECURITY REPORT (Cloud_Security_Report.md)
# ==============================================================================

cloud_report_md = """# AZƏRBAYCAN DÖVLƏT NEFT VƏ SƏNAYE UNİVERSİTETİ (ADNSU)
## RƏQƏMSAL TEXNOLOGİYALAR KAFEDRASI

---

### TƏDQİQAT VƏ MÜHƏNDİSLİK HESABATI
# Bulud Texnologiyalarında Təhlükəsizlik (Cloud Security) üzrə Xüsusi Hesabat
## CloudRDR Mühitində Bulud Saxlancının Mühafizəsi, Sıfır-Etibar (Zero-Trust) RLS Sxemi, IAM Avtomatik Dondurulması və Çox-İcarədar Təcridi

| Vəzifə / Sahə | Təfərrüat |
| :--- | :--- |
| **Tədris Fənni:** | **Bulud Texnologiyalarında Təhlükəsizlik (Cloud Security)** |
| **Tələbə / Müəllif:** | Mübariz Paşayev (Layihə Rəhbəri & DevOps Lead) |
| **Elmi Rəhbər / Fənn Müəllimi:** | Xatirə Həsənli (Rəqəmsal Texnologiyalar Kafedrası) |
| **Tədris İlinin Dövrü:** | Payız Semestri, 2026-cı il |
| **Təhvil Tarixi və Məkan:** | Noyabr 2026, Bakı şəhəri, Azərbaycan |
| **Əlaqədar Sistem:** | CloudRDR Platforması (Python Flask + Supabase Cloud Engine) |
| **Əsas Sənəd:** | [Ümumi Yekun Diplom Hesabatı](CloudRDR_Yekun_Report.md) |

---

## MÜNDƏRİCAT

- [1. Fənnin Məqsədi və Tədqiqatın Xarakteri](#1-fənnin-məqsədi-və-tədqiqatın-xarakteri)
- [2. Bulud Hesablama Modelləri və Birgə Məsuliyyət (Shared Responsibility)](#2-bulud-hesablama-modelləri-və-birgə-məsuliyyət-shared-responsibility)
- [3. Bulud Obyekt Saxlancında (Object Storage) Ransomware Hücum Vektorları](#3-bulud-obyekt-saxlancında-object-storage-ransomware-hücum-vektorları)
- [4. Supabase Cloud İnfrastrukturu və Sıfır-Etibar (Zero-Trust) RLS Arxitekturası](#4-supabase-cloud-infrastrukturu-və-sıfır-etibar-zero-trust-rls-arxitekturası)
- [5. Giriş və Eyniləşdirmənin İdarə Edilməsi (IAM) və Ən Az Səlahiyyət Prinsipi](#5-giriş-və-eyniləşdirmənin-idarə-edilməsi-iam-və-ən-az-səlahiyyət-prinsipi)
- [6. Avtomatlaşdırılmış IAM Write-Freeze Siyasəti və 0.24 ms Reaksiya SLA-sı](#6-avtomatlaşdırılmış-iam-write-freeze-siyasəti-və-024-ms-reaksiya-sla-sı)
- [7. Bulud Saxlancında Məlumatların Tranzitdə və Sükunətdə Şifrələnməsi](#7-bulud-saxlancında-məlumatların-tranzitdə-və-sükunətdə-şifrələnməsi)
- [8. Çox-İcarədar (Multi-Tenancy) İzolyasiyası və Şəbəkə Təhlükəsizliyi](#8-çox-icarədar-multi-tenancy-izolyasiyası-və-şəbəkə-təhlükəsizliyi)
- [9. Bulud Təhlükəsizliyi Standartları və Tənzimləmə Uyğunluğu (CSA CCM, ISO 27017, NIST SP 800-145)](#9-bulud-təhlükəsizliyi-standartları-və-tənzimləmə-uyğunluğu)
- [10. Eksperimental Nəticələr, Sübutlar və Təhlil](#10-eksperimental-nəticələr-sübutlar-və-təhlil)
- [11. Yekun Nəticə və Fənn üzrə Qiymətləndirmə](#11-yekun-nəticə-və-fənn-üzrə-qiymətləndirmə)
- [12. Ədəbiyyat Siyahısı](#12-ədəbiyyat-siyahısı)

---

## 1. Fənnin Məqsədi və Tədqiqatın Xarakteri

"Bulud Texnologiyalarında Təhlükəsizlik" fənni müasir paylanmış hesablama mühitlərində informasiya aktivlərinin qorunması, icarədar (tenant) izolyasiyası, bulud xidmətlərində giriş nəzarəti (Identity & Access Management - IAM), kiberhücumların lokallaşdırılması və fəlakətdən bərpa strategiyalarını öyrənir.

Müasir şirkətlərin məlumat bazalarını və fayl arxivlərini on-premise serverlərdən bulud anbarlarına (Amazon S3, Supabase Storage, Google Cloud Storage, Azure Blob) köçürməsi onların əlçatanlığını və elastikliyini misilsiz dərəcədə artırmışdır. Lakin bu transformasiya nəticəsində ənənəvi perimetr təhlükəsizliyi (firewall, daxili şəbəkə seqmentasiyası) öz effektivliyini itirmişdir. Hücumçular artıq şirkətin daxili ofis şəbəkəsini deyil, birbaşa bulud API açarlarını, IAM rollarını və açıq qalan bulud anbarlarını (public buckets) hədəfə alırlar.

Bu xüsusi tədqiqat hesabatının predmeti — bulud infrastrukturunda icarəyə götürülmüş obyekt anbarında (Supabase Object Storage) baş verən qanunsuz kütləvi manipulyasiyaları (Ransomware şifrələməsini) mikrosaniyələr ərzində aşkar edən, təcavüzkarın hüquqlarını proqram təminatı vasitəsilə dərhal donduran (**IAM Write-Freeze**) və məlumatları sıfır-etibar (Zero-Trust) əsasında bərpa edən CloudRDR sisteminin bulud arxitekturasını hərtərəfli təhlil etməkdir.

---

## 2. Bulud Hesablama Modelləri və Birgə Məsuliyyət (Shared Responsibility)

NIST SP 800-145 standartına əsasən bulud hesablama xidmətləri üç əsas xidmət modelinə (IaaS, PaaS, SaaS) bölünür. Hər bir modeldə təhlükəsizlik vəzifələri bulud xidmət təminatçısı (Cloud Service Provider - CSP) ilə müştəri (təşkilat) arasında bölüşdürülür. Bu bölgü **Birgə Məsuliyyət Modeli (Shared Responsibility Model)** adlanır.

```
+-------------------------------------------------------------------------+
|                  BİRGƏ MƏSULİYYƏT MODELİ (SHARED RESPONSIBILITY)       |
+-------------------------------------------------------------------------+
| Səviyyə                | IaaS              | PaaS (CloudRDR)   | SaaS   |
+------------------------+-------------------+-------------------+--------+
| Məlumat və Saxlanc     | Müştəri           | Müştəri [CloudRDR]| Müştəri|
| Giriş və IAM Nəzarəti  | Müştəri           | Müştəri [CloudRDR]| Müştəri|
| Tətbiq Kodu və Mühit   | Müştəri           | Müştəri [CloudRDR]| CSP    |
| Əməliyyat Sistemi      | Müştəri           | CSP (Supabase)    | CSP    |
| Verilənlər Bazası      | Müştəri           | CSP (Supabase)    | CSP    |
| Şəbəkə və Fiziki Giriş | CSP (AWS/GCP)     | CSP (AWS/GCP)     | CSP    |
+-------------------------------------------------------------------------+
```

### Cədvəl 1. Bulud Xidmət Modelləri və CloudRDR Mühəndislik Həlli

| Xidmət Tipi | Təminatçının Cavabdehliyi | Müştərinin (Bizim) Cavabdehliyimiz | CloudRDR-də Tətbiq Edilən Mexanizm |
| :--- | :--- | :--- | :--- |
| **IaaS (İnfrastruktur)** | Fiziki serverlər, elektrik təchizatı, soyutma, hipervizor, fiziki şəbəkə kabelləri | Qonaq ƏS (Guest OS), firewall qaydaları, virtual marşrutlaşdırma, sistem yeniləmələri | Yerli Docker konteynerləri və test mühitində tətbiq edilmişdir. |
| **PaaS / BaaS (Platforma)** | Əməliyyat sisteminin sazlanması, verilənlər bazası mühərriki, saxlanc aparatının genişlənməsi | Verilənlərin sinifləndirilməsi, RLS (Row Level Security) siyasəti, IAM dondurulması, açarların idarəsi | **Supabase Cloud (Postgres 15 + S3 Storage).** Əsas müdafiə məhz bu səviyyədə qurulmuşdur. |
| **SaaS (Proqram Təminatı)** | Bütün proqram təminatı steki, infrastruktur və tətbiq icrası | Son istifadəçi rollarının idarəsi, MFA, sessiya müddətləri | Linear Layihə İdarəetmə Paneli və Vercel Production Hosting. |

**Təhlil:** PaaS (Platform as a Service) modelindən istifadə etməyimiz bizə fiziki serverlərin təmiri və ƏS sazlanması ilə vaxt itirmədən, diqqətimizi birbaşa məlumat təbəqəsinin (Data Plane) və giriş nəzarətinin (Control Plane) dərindən mühafizəsinə yönəltməyə imkan verdi.

---

## 3. Bulud Obyekt Saxlancında (Object Storage) Ransomware Hücum Vektorları

Bulud obyekt saxlancı (Object Storage) ənənəvi fayl sistemindən (POSIX) fərqli işləyir. Burada fayllar iyerarxik qovluqlar şəklində deyil, unikal açara (key), metadatalara və ikili gövdəyə (binary payload) malik qlobal obyektlər kimi saxlanılır. Manipulyasiya yalnız HTTP REST API çağırışları (`PUT`, `DELETE`, `POST`) vasitəsilə həyata keçirilir.

### Hücum Vektorları və Təhlükə Mexanizmi:

1. **Sızdırılmış API və ya Service Role Açarları:** Hücumçu işçinin GitHub reposundan, CI/CD loqlarından və ya fişinq vasitəsilə bulud anbarının idarəetmə açarını (`anon_key` və ya `service_role_key`) ələ keçirir.
2. **Kütləvi Şifrələmə və Yenidən Yazma (Bucket Ransomware):** Təcavüzkar hər bir faylı yükləyir, yerli maşınında özəl açarla şifrələyir və dərhal `PUT /storage/v1/object/protected/<filename>` əmri ilə orijinal faylın üzərinə yazır.
3. **Versiyalılığın (Versioning) Ləğvi və ya Təmizlənməsi:** Əgər anbarda versiyaların saxlanması aktivdirsə, hücumçu xüsusi `DELETE /object?versionId=...` API çağırışları edərək köhnə versiyaları da məhv edir.
4. **Fidyə Tələbi:** Saxlancdakı kritik maliyyə, müştəri və kadr sənədləri oxunmaz hala gətirildikdən sonra anbara `README_DECRYPT.txt` adlı fidyə məktubu buraxılır.

CloudRDR bu təhlükəni həm **anomal dəyişiklik tezliyi (velocity-based)**, həm də **Canary tripwire (tələ obyekt)** mexanizmləri ilə bulud API səviyyəsində qarşılayır.

---

## 4. Supabase Cloud İnfrastrukturu və Sıfır-Etibar (Zero-Trust) RLS Arxitekturası

CloudRDR platforması bulud verilənlər bazası və obyekt anbarı kimi **Supabase Cloud (Postgres 15 + AWS ap-southeast-1 regionunda yerləşən S3-uyğun obyekt anbarı)** üzərində dizayn olunmuşdur.

![Şəkil 4. Supabase Sıfır-Etibar (Zero-Trust) RLS Təhlükəsizlik Siyasətləri](screenshots/02_supabase_storage_and_rls.png)
*Şəkil 4. Supabase Sıfır-Etibar (Zero-Trust) RLS Təhlükəsizlik Siyasətləri — Bütün daxili cədvəllərdə anon və authenticated rolları üçün icazələrin qapadıldığını nümayiş etdirir.*

### Sıfır-Etibar (Zero-Trust) Sxemi və Row Level Security (RLS) Tətbiqi:

Ənənəvi verilənlər bazalarında tətbiq səviyyəsində istifadəçi daxil olduqda bütün cədvəlləri oxuya bilir. Supabase mühitində isə hər bir sorğu birbaşa PostgreSQL nüvəsi tərəfindən **Row Level Security (RLS)** mexanizmi ilə yoxlanılır.

CloudRDR verilənlər bazası miqrasiyasında (`db/migrations/001_init.sql`) bütün cədvəllər üçün mütləq `DENY ALL` siyasəti tətbiq edilmişdir:

```sql
-- 1. Bütün cədvəllərdə RLS məcburiləşdirilir
ALTER TABLE baseline_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_quotas ENABLE ROW LEVEL SECURITY;

-- 2. İctimai (anonim) və autentifikasiyadan keçmiş adi istifadəçilərə giriş TAM QADAĞANDIR
CREATE POLICY "Deny Public Access" ON baseline_snapshots 
    FOR ALL TO anon USING (false);

CREATE POLICY "Deny Public Access" ON file_events 
    FOR ALL TO anon USING (false);

CREATE POLICY "Deny Public Access" ON incidents 
    FOR ALL TO anon USING (false);

CREATE POLICY "Deny Public Access" ON audit_ledger 
    FOR ALL TO anon USING (false);

-- 3. Yalnız server arxasında qorunan Python Backend (service_role) cədvələ müraciət edə bilər
CREATE POLICY "Service Role Full Isolation" ON baseline_snapshots 
    FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Saxlanc Anbarının (Bucket) Təcridi:
- **Bucket Adı:** `protected`
- **İctimai Əlçatanlıq (Public Access):** `false` (Qapalı). İnternetdən hər hansı faylı URL ilə birbaşa oxumaq cəhdi `403 Forbidden` ilə nəticələnir.
- **İmzalanmış URL (Presigned URL) Tələbi:** Bərpa olunan fayllar yalnız vaxtı məhdudlaşdırılmış (TTL: 60 saniyə) kriptoqrafik imzalı linklər vasitəsilə endirilə bilər.

---

## 5. Giriş və Eyniləşdirmənin İdarə Edilməsi (IAM) və Ən Az Səlahiyyət Prinsipi

Bulud təhlükəsizliyinin qızıl qaydası — **Ən Az Səlahiyyət Prinsipidir (Principle of Least Privilege)**: hər bir xidmət, istifadəçi və ya skript yalnız öz vəzifəsini yerinə yetirmək üçün minimum zəruri olan hüquqlara malik olmalıdır.

### CloudRDR IAM Rol Bölgüsü:

1. **`monitor_agent_role` (İzləyici Rol):**
   - İcazələri: Yalnız `storage.objects.list` və `storage.objects.get_metadata`.
   - Qadağaları: Faylların məzmununu dəyişə bilməz (`put` qadağandır), silə bilməz (`delete` qadağandır).
2. **`incident_responder_role` (Reaksiya Rolu):**
   - İcazələri: `auth.users.update` (istifadəçini bloklamaq) və `iam.policies.attach` (freeze siyasətini qoşmaq).
   - Qadağaları: Saxlanc fayllarını birbaşa silə və ya dəyişdirə bilməz.
3. **`recovery_engine_role` (Bərpa Rolu):**
   - İcazələri: `storage.objects.get` (yalnız AES ehtiyat nüsxəsini oxumaq), `storage.objects.put` (yalnız `quarantine/` qovluğuna yazmaq).
   - İcra şərti: Yalnız təsdiq olunmuş insident qeydi və etibarlı Ed25519 rəqəmsal imzası mövcud olduqda aktivləşir.

Bu dənəvər (granular) bölgü sayəsində hücumçu monitor agentin açarını ələ keçirsə belə, saxlancdakı faylları şifrələyə və ya silə bilməz!

---

## 6. Avtomatlaşdırılmış IAM Write-Freeze Siyasəti və 0.24 ms Reaksiya SLA-sı

Ənənəvi SOC mərkəzlərində insident aşkarlanandan sonra təhlükəsizlik əməkdaşının xəbərdarlıq alması, portala daxil olması və hücumçunun hesabını ləğv etməsi orta hesabla 15-45 dəqiqə çəkir (MTTR). Müasir ransomware isə saniyədə yüzlərlə faylı şifrələməyə qadirdir.

CloudRDR layihəsində insan amili aradan qaldırılmış və **Avtomatlaşdırılmış Bulud İdarəetmə Müstəvisi (Automated Cloud Control Plane)** reallaşdırılmışdır.

![Şəkil 5. Avtomatlaşdırılmış IAM Dondurulması və Bloklama Xəbərdarlığı](screenshots/08_account_frozen_iam_policy.png)
*Şəkil 5. Avtomatlaşdırılmış IAM Dondurulması və Bloklama Xəbərdarlığı — Təhlükə qeydə alındıqdan sonra yazma hüquqlarının dərhal məhdudlaşdırıldığını təsdiq edir.*

### IAM Write-Freeze Mexanizminin İş Alqoritmi:

```
[ Monitor Agent ] ---> (Dəyişiklik Həddi ≥ 30% və ya Canary Tripwire)
                              |
                              v
                  [ Detection Engine ] (Kritik Ransomware Hökmü)
                              |
            +-----------------+-----------------+
            |                                   |
            v                                   v
[ Python Flask Backend ]             [ Incident Recorder ]
            |                                   |
   (0.24 ms Reaksiya)                 (RFC 8032 Ed25519 İmza)
            |                                   |
            v                                   v
[ IAM Write-Freeze Aktivasiyası ]    [ Dəyişdirilməz Audit Bloku ]
            |
            +--> Supabase / AWS API: Deny-All Write Policy
            +--> Saxlanc: Bütün PUT / DELETE hüquqları donduruldu!
```

### Dondurma Siyasətinin JSON Strukturu:

```json
{
  "Version": "2026-10-26",
  "Statement": [
    {
      "Sid": "CloudRDRAutomatedIncidentFreeze",
      "Effect": "Deny",
      "Action": [
        "storage:PutObject",
        "storage:DeleteObject",
        "storage:DeleteObjectVersion",
        "storage:AbortMultipartUpload"
      ],
      "Resource": "arn:cloudrdr:storage:::protected/*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalArn": "arn:cloudrdr:iam::tenant-user-compromised"
        }
      }
    },
    {
      "Sid": "AllowReadOnlyForForensics",
      "Effect": "Allow",
      "Action": [
        "storage:GetObject",
        "storage:ListBucket"
      ],
      "Resource": "arn:cloudrdr:storage:::protected/*"
    }
  ]
}
```

### Performans Nəticəsi:
- **Tələb Olunan SLA Hədəfi:** < 10,000 millisaniyə (10 saniyə)
- **Real Ölçülmüş Nəticə (Metrik M2):** **0.24 millisaniyə!**  
Sistem insan müdaxiləsinə ehtiyac duymadan təcavüzkarı göz qırpımında neytrallaşdırır.

---

## 7. Bulud Saxlancında Məlumatların Tranzitdə və Sükunətdə Şifrələnməsi

Bulud təhlükəsizliyi tələblərinə (NIST SP 800-53, ISO 27001 A.8.24) əsasən informasiya iki halda mütləq şifrələnməlidir:

### 1. Tranzitdə Olan Məlumatların Şifrələnməsi (Encryption in Transit)
- Bütün əlaqələr (İstifadəçi <-> Nəzarət Paneli, Panel <-> Flask API, Flask API <-> Supabase Storage) yalnız **TLS 1.3 (Transport Layer Security)** üzərindən həyata keçirilir.
- Şifrələmə dəstləri (Cipher Suites): `TLS_AES_256_GCM_SHA384` və `TLS_CHACHA20_POLY1305_SHA256`.
- Bütün zəif protokollar (SSL v3, TLS 1.0, TLS 1.1) server səviyyəsində qadağan edilmişdir.

### 2. Sükunətdə Olan Məlumatların Şifrələnməsi (Encryption at Rest) və Müştəri Tərəfli Şifrələmə (Client-Side Encryption)
Əksər bulud təminatçıları "Server-Side Encryption" təklif edir, yəni fayl buluda çatdıqdan sonra provayder tərəfindən şifrələnir. Lakin bu modeldə provayderin öz işçiləri və ya dövlət orqanları qanunla açarları alaraq faylı oxuya bilər.

CloudRDR layihəsində **Müştəri Tərəfli Şifrələmə (Client-Side Encryption)** tətbiq olunmuşdur:
- Hər bir fayl bulud anbarına göndərilməzdən əvvəl yerli Python mühərrikində **AES-256-GCM AEAD (Authenticated Encryption with Associated Data)** ilə şifrələnir.
- Hər fayl üçün 96-bitlik (12 bayt) unikal IV generasiya olunur.
- 128-bitlik (16 bayt) kriptoqrafik Auth Tag faylın bütövlüyünü təsdiq edir.
- **Nəticə:** Supabase və ya AWS saxlancına yalnız oxunmaz şifrələnmiş massiv ötürülür. Hətta bulud provayderi 100% sındırılsa belə, əsas şifrələmə açarı onlarda olmadığı üçün faylların məxfiliyi təhlükəsiz qalır.

![Şəkil 8. AES-256-GCM AEAD Saxtalaşdırmanın Rədd Edilməsi Təcrübəsi](screenshots/12_terminal_tamper_exp_aes_aead.png)
*Şəkil 8. AES-256-GCM AEAD Saxtalaşdırmanın Rədd Edilməsi Təcrübəsi — Şifrəli faylda 1 bayt dəyişdirildikdə kriptoqrafik yoxlamanın dərhal xəta verdiyini və bərpanı dayandırdığını sübut edir.*

---

## 8. Çox-İcarədar (Multi-Tenancy) İzolyasiyası və Şəbəkə Təhlükəsizliyi

Müasir bulud həlləri çox vaxt bir neçə müştərinin (Tenant) eyni fiziki bazada xidmət aldığı çox-icarədar (Multi-Tenant) arxitekturasında fəaliyyət göstərir. Burada ən böyük risk — bir icarədarın məlumatlarının digər icarədara sızmasıdır (Cross-Tenant Data Leakage).

### CloudRDR Multi-Tenancy Müdafiə Tədbirləri:

1. **Loqik Qovluq və Açar Seqmentasiyası:**
   - Hər bir müştərinin faylları saxlancda `protected/tenant_<tenant_id>/...` prefiksi ilə ciddi şəkildə ayrılır.
   - Hər bir tenant üçün Postgres-də fərdi `tenant_id` sütunu mövcuddur və indekslənmişdir.
2. **Kriptoqrafik Açar Təcridi:**
   - Hər bir təşkilatın ehtiyat nüsxələri unikal törəmə açar (HKDF - HMAC-based Key Derivation Function vasitəsilə `Tenant Master Key` + `tenant_id`-dən törədilmiş açar) ilə şifrələnir.
   - Bir tenantın açarı digər tenantın faylını aça bilməz.
3. **Karantin və Pilləli Bərpa İzolasiyası:**
   - Zədələnmiş fayllar bərpa olunarkən birbaşa canlı anbara qaytarılmır. Əvvəlcə hər tenant üçün izolyasiya olunmuş müvəqqəti `quarantine/<job_id>/` anbarı açılır.
   - Faylların SHA-256 heşi Merkle ağacı ilə 100% tutuşdurulub VALID möhürü aldıqdan sonra əsas anbara köçürülür (Promote).

![Şəkil 17. İki-Mərhələli Təhlükəsiz Karantin Bərpası (Staged Recovery)](screenshots/15_quarantine_staged_restore.png)
*Şəkil 17. İki-Mərhələli Təhlükəsiz Karantin Bərpası (Staged Recovery) — Faylların birbaşa canlı anbara deyil, əvvəlcə təcrid olunmuş karantin sahəsinə çıxarılaraq yoxlandığını nümayiş etdirir.*

---

## 9. Bulud Təhlükəsizliyi Standartları və Tənzimləmə Uyğunluğu

CloudRDR sisteminin bulud arxitekturası beynəlxalq səviyyədə qəbul edilmiş aparıcı bulud təhlükəsizliyi çərçivələrinə uyğunlaşdırılmışdır:

### 1. Cloud Security Alliance (CSA) Cloud Controls Matrix (CCM v4):
- **IAM-01 (Identity & Access Control):** RLS və ən az səlahiyyət prinsipi.
- **DCS-01 (Data Center Security & Cloud Storage):** Özəl bucket konfiqurasiyası və presigned URL-lər.
- **SEF-02 (Security Incident Management):** Avtomatlaşdırılmış IAM Freeze və Ed25519 insident aktı.
- **BCR-08 (Backup & Restoration):** Sıfır-etibarlı 100% Merkle təsdiqli karantin bərpası.

### 2. ISO/IEC 27017:2015 (Bulud Xidmətlərində İnformasiya Təhlükəsizliyi Nəzarətləri):
- **CLD.6.3.1:** Müştəri məlumatlarının digər icarədarlardan tam ayrılması.
- **CLD.8.1.5:** Bulud xidmət təminatçısının virtual maşın və saxlanc əməliyyatlarının fasiləsiz auditi.
- **CLD.9.5.1:** Bulud inzibatçısının səlahiyyətlərinin avtomatlaşdırılmış məhdudlaşdırılması.

### 3. NIST SP 800-145 və NIST SP 800-210 (Access Control in Cloud):
- Giriş nəzarətinin mərkəzləşdirilmiş Policy Enforcement Point (PEP) və Policy Decision Point (PDP) vasitəsilə idarə edilməsi. CloudRDR aşkarlama mühərriki məhz PEP/PDP rolunu icra edir.

---

## 10. Eksperimental Nəticələr, Sübutlar və Təhlil

Bulud təhlükəsizliyi mexanizmlərinin etibarlılığı real simulyasiya və yük sınaqları ilə yoxlanılmışdır.

### Cədvəl 2. Bulud Təhlükəsizliyi Metrikləri və Ölçmə Nəticələri

| Qiymətləndirilən Göstərici | Standart / Gözlənilən Hədəf | CloudRDR-də Əldə Edilən Real Göstərici | Nəticə |
| :--- | :---: | :---: | :---: |
| **IAM Dondurma Reaksiya Vaxtı (Freeze SLA)** | < 10,000 ms (10 saniyə) | **0.24 ms** | **PASSED (41,000x daha sürətli)** |
| **Canary Tələsinin Aşkarlanma Müddəti** | < 1,000 ms (1 saniyə) | **0.602 ms** | **PASSED** |
| **Qanuni Bulud Əməliyyatında Yalançı Həyəcan (FP)** | 0.00% | **0.00%** (Allowlist sayəsində) | **PASSED** |
| **Bulud Bərpasında Fayl Tamlığı (Integrity)** | 100.00% | **100.00% (20/20 VALID)** | **PASSED** |
| **Bulud Saxlancına İlkin Heşləmə Buraxılışı** | > 10 MB/s | **16.43 MB/s (262 fayl/saniyə)** | **PASSED** |

![Şəkil 16. İcazəli Ehtiyat Nüsxə Hesabının Qorunması (FP = 0.0%)](screenshots/23_negative_test_allowlist_bypass.png)
*Şəkil 16. İcazəli Ehtiyat Nüsxə Hesabının Qorunması (FP = 0.0%) — 70% dəyişiklik edən icazəli agentin yalançı həyəcan doğurmadan fəaliyyətini davam etdirdiyini təsdiqləyir.*

![Şəkil 18. 100% Təsdiqlənmiş Kriptoqrafik Bərpa (Verified Recovery)](screenshots/16_verified_recovery_100_percent.png)
*Şəkil 18. 100% Təsdiqlənmiş Kriptoqrafik Bərpa (Verified Recovery) — Bütün 20 faylın VALID statusu aldığını və Merkle kökünün ilkin vəziyyətlə bərabərliyini əks etdirir.*

---

## 11. Yekun Nəticə və Fənn üzrə Qiymətləndirmə

"Bulud Texnologiyalarında Təhlükəsizlik" fənni üzrə aparılmış bu tədqiqat və mühəndislik işi aşağıdakı nəticələri sübut etmişdir:

1. **Perimetrsiz Mühafizə:** Bulud mühitində şəbəkə perimetrinə güvənmək olmaz; təhlükəsizliyin əsasını **Sıfır-Etibar (Zero-Trust)**, **Row Level Security (RLS)** və obyekt səviyyəsində giriş nəzarəti təşkil etməlidir.
2. **Avtomatlaşdırma Olmadan Müdafiə Mümkün Deyil:** İnsanın idarə etdiyi klassik təhlükəsizlik alətləri mikrosaniyələr ərzində baş verən bulud ransomware hücumlarına tab gətirə bilməz. CloudRDR tərəfindən tətbiq edilən **0.24 ms-lik IAM Freeze** mexanizmi avtomatlaşdırılmış bulud cavab sistemlərinin effektivliyini tam sübut etmişdir.
3. **Müştəri Tərəfli Kriptoqrafiya Zərurətdir:** Bulud saxlancına göndərilən ehtiyat nüsxələr provayderə etibar edilmədən öncə AES-256-GCM ilə şifrələnməli və yalnız Merkle DAG bərabərliyi təsdiqləndikdən sonra bərpa edilməlidir.

Layihə çərçivəsində qurulmuş arxitektura bulud obyekt saxlancının ransomware təhdidinə qarşı ən müasir standartlara uyğun müdafiəsini təmin edir və real sənaye mühitlərində tətbiq olunmağa tam hazırdır.

---

## 12. Ədəbiyyat Siyahısı

1. **NIST SP 800-145 (2011)** — The NIST Definition of Cloud Computing. National Institute of Standards and Technology.
2. **NIST SP 800-210 (2020)** — General Access Control Guidance for Cloud Systems.
3. **ISO/IEC 27017:2015** — Information technology — Security techniques — Code of practice for information security controls based on ISO/IEC 27002 for cloud services.
4. **Cloud Security Alliance (CSA) (2023)** — Cloud Controls Matrix (CCM) v4.0.
5. **AWS Whitepaper (2024)** — AWS Well-Architected Framework: Security Pillar.
6. **Supabase Documentation (2026)** — Architecture, Row Level Security Policies and Object Storage Security.
7. **Paşayev M. (2026)** — CloudRDR: Bulud Anbarlarında Ransomware Hücumlarının Avtomatlaşdırılmış Aşkarlanması və Sıfır-Etibarlı Kriptoqrafik Bərpası. ADNSU Diplom Layihəsi Hesabatı.
"""

with open(os.path.join(REPORT_DIR, "Cloud_Security_Report.md"), "w", encoding="utf-8") as f:
    f.write(cloud_report_md.strip() + "\n")
print("Generated report/Cloud_Security_Report.md")


# ==============================================================================
# 3. REPORT DIRECTORY README / PORTAL (report/README.md)
# ==============================================================================

readme_md = """# CloudRDR — Rəsmi Tədqiqat və Mühəndislik Hesabatları Portalı

Bu qovluq **Azərbaycan Dövlət Neft və Sənaye Universiteti (ADNSU), Rəqəmsal Texnologiyalar Kafedrasında** 2026-cı ildə yerinə yetirilmiş **CloudRDR** diplom və elmi-tədqiqat layihəsinin bütün rəsmi hesabatlarını, beynəlxalq standart uyğunluq sənədlərini və 24 ədəd yoxlanmış eksperimental sübutunu (screenshots) ehtiva edir.

> [!TIP]
> **GitHub-da Birbaşa Oxumaq Üçün:**  
> GitHub Word (`.docx`) və böyük ikili (`.pdf`) fayllarını birbaşa veb baxışında aça bilmir (yalnız "Download" təklif edir).  
> Aşağıdakı **Markdown (.md)** linklərinə klikləyərək hər iki hesabatı bütün cədvəllər, düsturlar və şəkillərlə birlikdə **birbaşa GitHub interfeysində** oxuya bilərsiniz:

---

## 📑 Əsas Hesabatlar

| Hesabatın Adı | Tədris Sahəsi / Mövzu | GitHub-da Oxu (Markdown) | Rəsmi Yükləmə Faylları |
| :--- | :--- | :---: | :---: |
| **Yekun Diplom və Tədqiqat Hesabatı** | Üç fənnin sintezi (Kriptoqrafiya + Bulud + İSMS), 12 həftəlik icra, 6 mərhələli konveyer, M1–M9 metrikləri, Hədd süpürməsi | 👉 [**CloudRDR_Yekun_Report.md**](CloudRDR_Yekun_Report.md) | [Word (.docx)](CloudRDR_Yekun_Report.docx) • [PDF (.pdf)](CloudRDR_Yekun_Report.pdf) |
| **Xüsusi Bulud Təhlükəsizliyi Hesabatı** | **Bulud Texnologiyalarında Təhlükəsizlik (Cloud Security):** Shared Responsibility, Supabase Storage, Zero-Trust RLS, 0.24ms IAM Freeze, Multi-Tenancy | 👉 [**Cloud_Security_Report.md**](Cloud_Security_Report.md) | [Word (.docx)](Cloud_Security_Report.docx) • [PDF (.pdf)](Cloud_Security_Report.pdf) |

---

## 🏛️ Akademik Heyət və Məlumatlar

- **Təhsil Müəssisəsi:** Azərbaycan Dövlət Neft və Sənaye Universiteti (ADNSU)
- **Kafedra:** Rəqəmsal Texnologiyalar Kafedrası
- **Layihə Rəhbəri / Tələbə:** Mübariz Paşayev (Project Manager & GRC / DevOps Lead)
- **Elmi Rəhbər:** Xatirə Həsənli (Rəqəmsal Texnologiyalar Kafedrası)
- **Mühəndis Komandası:** Nigar Əliyeva (Crypto), Rəşad Məmmədov (DevOps), Elmir Qasımov (Backend), Aysel Kərimova (Frontend), Tural Səfərov (QA / Benchmark)
- **Təhvil Tarixi:** Oktyabr – Noyabr 2026, Bakı, Azərbaycan

---

## 📊 Əsas Sistem Göstəriciləri (SLA vs Real Nəticə)

| Parametr / Metrik | Hədəf SLA | Real Nəticə | Nəticə Statusu |
| :--- | :---: | :---: | :---: |
| **Ransomware Aşkarlama Gecikməsi (M1)** | < 60,000 ms | **200.11 ms** | **PASSED** |
| **Avtomatlaşdırılmış IAM Write-Freeze (M2)** | < 10,000 ms | **0.24 ms** | **PASSED (41,000x sürətli)** |
| **Canary Tələsinin Reaksiya Müddəti (M4)** | < 1,000 ms | **0.602 ms** | **PASSED** |
| **Qanuni Yükləmədə Yalançı Həyəcan (FP, M3)** | 0.00% | **0.00%** (Allowlist) | **PASSED** |
| **AEAD Saxtalaşdırmanın İfşası (M5)** | 100.00% | **100.00% Tamper Reject** | **PASSED** |
| **Kriptoqrafik Bərpa Dürüstlüyü (M6)** | 100.00% | **100.00% VALID (20/20)** | **PASSED** |
| **Audit Zəncirinin Tamlığı (M7)** | 100.00% | **100.00% Bütöv Zəncir** | **PASSED** |
| **İlkin Heşləmə Buraxılışı (M8)** | > 10.0 MB/s | **16.43 MB/s (262 f/s)** | **PASSED** |
| **Optimal Aşkarlama Həddi (Sweep)** | F1 > 0.85 | **30% Hədd (F1 = 0.923, Prec = 100%)** | **OPTIMAL** |

---

## 🖼️ Sübut Jurnalı (Screenshots Reyestri)

Bütün 24 ədəd yüksək dəqiqlikli ekran görüntüsü və eksperiment qrafikləri [`screenshots/`](screenshots/) qovluğunda saxlanılır və hesabatların daxilində nümayiş etdirilir:

1. `01_project_structure_and_test_suite.png` — Vahid və inteqrasiya testləri
2. `02_supabase_storage_and_rls.png` — Supabase Zero-Trust RLS siyasətləri
3. `03_baseline_generation_terminal.png` — SHA-256 Merkle kökünün hesablanması
4. `04_soc_dashboard_calm.png` — Sakit vəziyyətdə SOC idarəetmə paneli
5. `05_detection_sliding_window_graph.png` — 60s sürüşən zaman pəncərəsi qrafiki
6. `06_canary_tripwire_triggered.png` — Canary tələ faylına toxunulma anı
7. `07_merkle_tree_corruption_climb.png` — Merkle ağacında qırmızı korlanma dırmanması
8. `08_account_frozen_iam_policy.png` — Avtomatik IAM Write-Freeze bloklaması
9. `09_incident_detail_ed25519_valid.png` — RFC 8032 Ed25519 insident rəqəmsal imzası
10. `10_audit_chain_intact.png` — Dəyişdirilməz zəncirvari audit jurnalı
11. `11_audit_chain_tamper_detected.png` — Audit jurnalında prevHash qırılma xəbərdarlığı
12. `12_terminal_tamper_exp_aes_aead.png` — AES-GCM 1-bayt dəyişikliyin rədd edilməsi
13. `13_terminal_tamper_exp_ed25519_sig.png` — Ed25519 imzasının saxtalaşdırma ifşası
14. `14_terminal_tamper_exp_audit_chain.png` — Terminalda prevHash qırılmasının sübutu
15. `15_quarantine_staged_restore.png` — İki-mərhələli karantin bərpası
16. `16_verified_recovery_100_percent.png` — 100% VALID təsdiqlənmiş bərpa
17. `17_metrics_harness_execution_table.png` — Formal M1–M9 terminal metriklər cədvəli
18. `18_threshold_sweep_chart.png` — 1%–80% Hədd süpürməsi və F1 əyrisi
19. `19_linear_board_overview.png` — Linear 12 həftəlik layihə idarəetmə lövhəsi
20. `20_linear_board_sprints.png` — Linear sprintlər və rol bölgüsü
21. `21_github_actions_ci_pipeline.png` — GitHub Actions CI/CD boru kəməri
22. `22_knowledge_graph_ast_architecture.png` — AST səviyyəli bilik qrafı
23. `23_negative_test_allowlist_bypass.png` — İcazəli ehtiyat nüsxə agenti testi
24. `24_live_demo_soc_kpi_action_bar.png` — Canlı SOC KPI paneli və idarəetmə alətləri
"""

with open(os.path.join(REPORT_DIR, "README.md"), "w", encoding="utf-8") as f:
    f.write(readme_md.strip() + "\n")
print("Generated report/README.md")
