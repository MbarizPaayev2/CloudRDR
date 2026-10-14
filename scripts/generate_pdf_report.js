/**
 * @file scripts/generate_pdf_report.js
 * Generates the PDF companion copy for CloudRDR_Yekun_Report.docx using Playwright.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PDF_PATH = path.resolve('report/CloudRDR_Yekun_Report.pdf');
const SCREENSHOT_DIR = path.resolve('report/screenshots');

async function main() {
  console.log('Building PDF companion report...');
  
  // Clean test file if exists
  try { await fs.unlink('report/test.pdf'); } catch {}

  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  const page = await browser.newPage();

  // Read images as base64 or file URIs
  const getImgUri = (filename) => {
    const full = path.join(SCREENSHOT_DIR, filename).replace(/\\/g, '/');
    return `file:///${full}`;
  };

  const html = `<!DOCTYPE html>
<html lang="az">
<head>
<meta charset="utf-8">
<title>CloudRDR — Yekun Tədqiqat Hesabatı</title>
<style>
  @page {
    size: A4;
    margin: 25mm 20mm 20mm 25mm;
    @bottom-right {
      content: "Səhifə " counter(page);
      font-family: 'Segoe UI', Calibri, sans-serif;
      font-size: 9pt;
      color: #64748b;
    }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Calibri, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #1e293b;
    background: #ffffff;
    margin: 0;
    padding: 0;
  }
  .title-page {
    text-align: center;
    page-break-after: always;
    padding-top: 50px;
  }
  .uni-header { font-size: 13pt; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .dep-header { font-size: 11pt; font-weight: 600; color: #475569; margin-bottom: 70px; }
  .report-label { font-size: 12pt; font-weight: 700; color: #0891b2; letter-spacing: 1px; margin-bottom: 15px; }
  .report-title { font-size: 20pt; font-weight: 800; color: #0f172a; line-height: 1.25; margin-bottom: 30px; }
  .subjects { font-size: 10.5pt; font-style: italic; color: #334155; margin-bottom: 80px; line-height: 1.6; }
  .meta-box {
    margin: 0 auto;
    width: 90%;
    border-top: 2px solid #e2e8f0;
    padding-top: 20px;
    text-align: left;
    font-size: 10.5pt;
  }
  .meta-row { display: flex; margin-bottom: 10px; }
  .meta-label { width: 220px; font-weight: 700; color: #475569; }
  .meta-val { flex: 1; color: #0f172a; }
  
  h1 {
    font-size: 15pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 1.5px solid #cbd5e1;
    padding-bottom: 6px;
    margin-top: 30px;
    margin-bottom: 14px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 12.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 22px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }
  p { margin-bottom: 10px; text-align: justify; }
  
  .callout {
    background: #f1f5f9;
    border-left: 4px solid #0891b2;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 0 6px 6px 0;
    page-break-inside: avoid;
  }
  .callout-title { font-size: 10.5pt; font-weight: 800; color: #0891b2; margin-bottom: 4px; }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 20px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #0f172a;
  }
  td {
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
  }
  tr:nth-child(even) td { background: #f8fafc; }
  
  .figure-wrap {
    text-align: center;
    margin: 18px 0;
    page-break-inside: avoid;
  }
  .figure-wrap img {
    max-width: 95%;
    height: auto;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  .caption {
    font-size: 9.5pt;
    color: #475569;
    margin-top: 6px;
  }
  .caption strong { color: #1e293b; }
  
  .toc-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dotted #cbd5e1;
    font-size: 10.5pt;
  }
  .toc-title { font-weight: 600; color: #1e293b; }
  .toc-page { color: #64748b; font-weight: 600; }
  
  .page-break { page-break-after: always; }
</style>
</head>
<body>

<!-- Titul -->
<div class="title-page">
  <div class="uni-header">AZƏRBAYCAN DÖVLƏT NEFT VƏ SƏNAYE UNİVERSİTETİ (ADNSU)</div>
  <div class="dep-header">RƏQƏMSAL TEXNOLOGİYALAR KAFEDRASI</div>
  
  <div class="report-label">YEKUN TƏDQİQAT VƏ DİPLOM LAYİHƏSİ HESABATI</div>
  <div class="report-title">CloudRDR — Bulud Anbarlarında Ransomware Hücumlarının Avtomatlaşdırılmış Aşkarlanması, Hesab Dondurulması və Sıfır-Etibarlı Kriptoqrafik Bərpası</div>
  
  <div class="subjects">
    Birləşdirilmiş Tədris Fənləri:<br>
    1. İnformasiya Təhlükəsizliyi Menecment Sistemləri (İSMS)<br>
    2. Bulud Texnologiyalarında Təhlükəsizlik (Cloud Security)<br>
    3. Kriptoqrafiyanın Əsasları (Foundations of Cryptography)
  </div>
  
  <div class="meta-box">
    <div class="meta-row"><div class="meta-label">Tələbə / Layihə Rəhbəri:</div><div class="meta-val"><strong>Mübariz Paşayev</strong> (Project Manager & GRC Lead)</div></div>
    <div class="meta-row"><div class="meta-label">Elmi Rəhbər / Müəllim:</div><div class="meta-val"><strong>Xatirə Həsənli</strong> (Rəqəmsal Texnologiyalar Kafedrası)</div></div>
    <div class="meta-row"><div class="meta-label">Mühəndis Komandası:</div><div class="meta-val">Nigar Əliyeva (Crypto), Rəşad Məmmədov (DevOps), Elmir Qasımov (Backend), Aysel Kərimova (Frontend), Tural Səfərov (QA / Benchmark Lead)</div></div>
    <div class="meta-row"><div class="meta-label">Təhvil Tarixi və Məkan:</div><div class="meta-val">Oktyabr 2026, Bakı şəhəri, Azərbaycan</div></div>
  </div>
</div>

<!-- Mündəricat -->
<h1>MÜNDƏRİCAT</h1>
<div style="margin-bottom: 30px;">
  <div class="toc-row"><span class="toc-title">1. Giriş: Layihənin Məqsədi və Fənlərarası Əlaqə</span><span class="toc-page">3</span></div>
  <div class="toc-row"><span class="toc-title">2. Problem və Tədqiqat Konteksti: Ransomware Təhdidi</span><span class="toc-page">4</span></div>
  <div class="toc-row"><span class="toc-title">3. Layihənin İcra Planı və 12 Həftəlik Mühəndislik Strukturu</span><span class="toc-page">5</span></div>
  <div class="toc-row"><span class="toc-title">4. Ümumi Sistem Arxitekturu və 6 Mərhələli Müdafiə Konveyeri</span><span class="toc-page">7</span></div>
  <div class="toc-row"><span class="toc-title">5. Bulud Təhlükəsizliyi: Birgə Məsuliyyət, IAM Freeze və Saxlanc Təcridi</span><span class="toc-page">9</span></div>
  <div class="toc-row"><span class="toc-title">6. Kriptoqrafiya Mexanizmləri: Merkle DAG, AES-256-GCM və Ed25519</span><span class="toc-page">12</span></div>
  <div class="toc-row"><span class="toc-title">7. Backend Mühərriki, Sürüşən Zaman Pəncərəsi və Canary Tələləri</span><span class="toc-page">17</span></div>
  <div class="toc-row"><span class="toc-title">8. İnformasiya Təhlükəsizliyi Menecment Sistemi (İSMS) və Uyğunluq</span><span class="toc-page">20</span></div>
  <div class="toc-row"><span class="toc-title">9. Nəzarət Paneli (SOC Dashboard) və Canlı Simulyasiya Ssenarisi</span><span class="toc-page">24</span></div>
  <div class="toc-row"><span class="toc-title">10. Eksperimental Qiymətləndirmə, M1–M9 Metrikləri və Hədd Süpürməsi</span><span class="toc-page">27</span></div>
  <div class="toc-row"><span class="toc-title">11. Layihənin İdarə Edilməsi: Linear Lövhəsi, Rollar və CI/CD</span><span class="toc-page">31</span></div>
  <div class="toc-row"><span class="toc-title">12. Üç Fənnin Sintezi: Yekun Akademik İzah</span><span class="toc-page">33</span></div>
  <div class="toc-row"><span class="toc-title">13. Texniki Məhdudiyyətlər və Gələcək İnkişaf Perspektivləri</span><span class="toc-page">34</span></div>
  <div class="toc-row"><span class="toc-title">14. İstifadə Edilmiş Ədəbiyyat və Beynəlxalq Standartlar</span><span class="toc-page">35</span></div>
  <div class="toc-row"><span class="toc-title">Əlavə A: Sübut Jurnalı (Evidence Log) və Tamamlanma Xülasəsi</span><span class="toc-page">36</span></div>
</div>

<div class="page-break"></div>

<!-- 1. Giriş -->
<h1>1. Giriş: Layihənin Məqsədi və Fənlərarası Əlaqə</h1>
<p>
Müasir korporativ informasiya sistemlərinin kütləvi şəkildə bulud infrastrukturuna (Cloud IaaS/PaaS) miqrasiya etməsi məlumatların əlçatanlığını artırmaqla yanaşı, yeni nəsil kiberhücum vektorlarının yaranmasına səbəb olmuşdur. Bu təhlükələr arasında ən dağıdıcı xarakter daşıyanı <strong>ransomware</strong> (fidyə proqramı) hücumlarıdır. Ənənəvi antivirus və perimetr müdafiə vasitələri bulud saxlancında (məsələn, AWS S3 və ya Supabase Storage) icra olunan kütləvi şifrələmə əməliyyatlarını vaxtında aşkarlamaqda aciz qalır. Bu diplom və tədqiqat layihəsinin əsas məqsədi — bulud saxlancını fasiləsiz izləyən, kütləvi icazəsiz dəyişiklikləri saniyələr daxilində aşkarlayan, hücum edənin hesabını dərhal donduran və ən əsası, şifrələnmiş ehtiyat nüsxələrdən hər bir faylın tamlığını riyazi olaraq sübut etməklə 100% bərpasını təmin edən avtomatlaşdırılmış <strong>CloudRDR</strong> platformasını qurmaqdır.
</p>
<p>
Layihə universitet tədris planında yer alan üç fundamental informasiya təhlükəsizliyi fənnini vahid praktik tətbiqdə birləşdirir:<br>
<strong>1. Kriptoqrafiyanın Əsasları:</strong> Faylların tamlığını qorumaq üçün SHA-256 heş funksiyaları, Merkle ağacı strukturu, ehtiyat nüsxələrin təhlükəsizliyi üçün AES-256-GCM AEAD authenticated encryption və insident qeydlərinin inkarolunmazlığı üçün RFC 8032 Ed25519 rəqəmsal imzaları tətbiq olunmuşdur.<br>
<strong>2. Bulud Təhlükəsizliyi:</strong> Supabase (Postgres və Storage) mühitində ən az səlahiyyət prinsipi (Least Privilege), Row Level Security (RLS) vasitəsilə sıfır-etibar (Zero-Trust) arxitekturası və hücum zamanı avtomatlaşdırılmış IAM Write-Freeze siyasəti reallaşdırılmışdır.<br>
<strong>3. İnformasiya Təhlükəsizliyi Menecment Sistemləri (İSMS):</strong> ISO/IEC 27001:2022 standartı, NIST CSF 2.0 və NIST SP 800-61 reqlamentləri əsasında aktivlərin təsnifatı, STRIDE təhdid modelləşdirməsi, risk reyestri, insident cavab planı və məhkəmə sübutlarının qorunması siyasəti (Chain of Custody) tam sənədləşdirilmişdir.
</p>

<div class="callout">
  <div class="callout-title">Qısa: nə etdim</div>
  <div><strong>Məqsəd:</strong> Bulud anbarlarını ransomware təhlükəsindən qorumaq üçün kriptoqrafik, bulud və idarəetmə mexanizmlərini vahid sistemdə birləşdirmək.</div>
  <div><strong>Necə etdim:</strong> Node.js, Fastify, Supabase və kriptoqrafik alqoritmlər vasitəsilə 6 mərhələli müdafiə konveyerini qurdum və test etdim.</div>
</div>

<!-- 2. Problem -->
<h1>2. Problem və Tədqiqat Konteksti: Ransomware Təhdidi</h1>
<p>
<strong>Ransomware</strong> — istifadəçinin və ya təşkilatın kritik fayllarını gizli şəkildə şifrələyərək əlçatmaz edən və açarı təqdim etmək müqabilində fidyə tələb edən zərərli proqram təminatıdır.
<em>Nümunə:</em> Ransomware hücumunu ofis arxivinə gizlicə daxil olub bütün sənədləri tanınmaz qıfıllarla bağlayan və açarları yalnız pul qarşılığında verəcəyini deyən quldura bənzətmək olar.
</p>
<p>
Ənənəvi sistemlərdə ehtiyat nüsxələrin (backup) mövcudluğu ransomware-ə qarşı yeganə xilasedici vasitə hesab olunurdu. Lakin müasir hücumlar göstərir ki, təcavüzkarlar ilk növbədə sistemdəki ehtiyat nüsxələri taparaq silir və ya onları da şifrələyir. Bundan əlavə, adi bərpa prosesi zamanı bərpa olunan faylın hücumdan əvvəlki orijinal faylla bit-bərabər eyni olduğunu sübut edən heç bir kriptoqrafik mexanizm mövcud deyildir. Təcavüzkar ehtiyat nüsxənin daxilinə 1 bayt belə dəyişiklik etsə (məsələn, zərərli arxa qapı — backdoor yerləşdirsə), ənənəvi bərpa proqramı bunu hiss etmədən faylı canlı bazaya yazır.
</p>
<p>
CloudRDR layihəsi bu problemi 3 əsas prinsip əsasında həll edir:<br>
<strong>1. Tez Aşkarlama:</strong> 60 saniyəlik sürüşən zaman pəncərəsində dəyişikliklərin sürətini ölçür və tələ (canary) fayllarını izləyir.<br>
<strong>2. Dərhal Təcrid:</strong> Hədd aşılarsa, insident dərhal RFC 8032 Ed25519 ilə imzalanır və təcavüzkarın hesabı IAM səviyyəsində dondurulur.<br>
<strong>3. Təsdiqlənmiş Bərpa:</strong> Ehtiyat nüsxələr AES-256-GCM AEAD ilə şifrələnir, bərpa zamanı hər bir fayl yenidən heşlənir və yalnız ilkin Merkle kökü ilə 100% üst-üstə düşən fayllar geri qaytarılır.
</p>

<!-- 3. Plan -->
<h1>3. Layihənin İcra Planı və 12 Həftəlik Mühəndislik Strukturu</h1>
<p>
Layihənin uğurla tamamlanması üçün 12 həftəlik çevik (Agile/Scrum) mühəndislik planı tərtib edilmiş və işlər 6 əsas mərhələyə bölünmüşdür. Bütün fəaliyyət Linear layihə idarəetmə platformasında rollar və həftələr üzrə qeydiyyata alınmışdır.
</p>
<ul>
  <li><strong>Tələblərin Dondurulması və GRC Çərçivəsi (Həftə 1–2):</strong> Təhlükəsizlik tələblərinin dondurulması, ISO 27001 / NIST CSF uyğunluq matrisinin qurulması, STRIDE təhdid analizi.</li>
  <li><strong>Kriptoqrafik Nüvə və Baseline Mühərriki (Həftə 3–4):</strong> SHA-256 axın heşlənməsi, Merkle DAG ağacının qurulması, AES-256-GCM AEAD şifrələmə kitabxanasının yazılması.</li>
  <li><strong>Bulud İnfrastrukturu və Saxlanc Adapterləri (Həftə 5–6):</strong> Supabase Storage və Postgres sxeminin qurulması, RLS siyasətləri, yerli LocalFsStorage adapteri və test mühiti.</li>
  <li><strong>Aşkarlama Mühərriki və IAM Freeze İnteqrasiyası (Həftə 7–8):</strong> Sliding-window dəyişiklik dərəcəsinin hesablanması, Canary tripwire tələləri, avtomatlaşdırılmış IAM dondurma siyasəti.</li>
  <li><strong>Zəncirvari Audit və Sıfır-Etibarlı Bərpa (Həftə 9–10):</strong> Hash-chained dəyişdirilməz audit jurnalı, təhlükəsiz karantin (quarantine) bərpa mexanizmi, 100% VALID heş yoxlaması.</li>
  <li><strong>Eksperimentlər, Benchmark Metrikləri və Yekun Sənədləşmə (Həftə 11–12):</strong> Hədd süpürmə (threshold sweep) eksperimentləri, M1–M9 performans ölçmələri, kod auditi və diplom hesabatının hazırlanması.</li>
</ul>

<div class="figure-wrap">
  <img src="${getImgUri('19_linear_board_overview.png')}" alt="Linear Layihə Lövhəsi">
  <div class="caption"><strong>Şəkil 1. Linear Layihə İdarəetmə Lövhəsi</strong> — 12 həftəlik mühəndislik planının 6 rol (PM, Crypto, DevOps, Backend, Frontend, QA) üzrə sprint bölgüsünü göstərir.</div>
</div>

<div class="figure-wrap">
  <img src="${getImgUri('20_linear_board_sprints.png')}" alt="Linear Sprint Bölgüsü">
  <div class="caption"><strong>Şəkil 2. Linear Sprint və Tapşırıqlar İyerarxiyası</strong> — GRC siyasətlərindən kriptoqrafik bərpa moduluna qədər bütün alt-tapşırıqların icra statusunu əks etdirir.</div>
</div>

<!-- 4. Arxitektura -->
<h1>4. Ümumi Sistem Arxitekturu və 6 Mərhələli Müdafiə Konveyeri</h1>
<p>
CloudRDR arxitekturası tamamilə modulyar, zəif əlaqəli (loosely coupled) və sıfır-etibar (Zero-Trust) prinsipləri üzərində qurulmuşdur. Sistem hadisə-əsaslı (event-driven) işləyir və hər bir komponent yalnız özünə aid təhlükəsizlik sərhədini idarə edir.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('22_knowledge_graph_ast_architecture.png')}" alt="Bilik Qrafı">
  <div class="caption"><strong>Şəkil 3. CloudRDR Abstrakt Sintaksis Ağacı (AST) Bilik Qrafı</strong> — Sistemin 102 mənbə faylı və kriptoqrafik, saxlanc və aşkarlama modulları arasındakı dərin asılılıq əlaqələrini göstərir.</div>
</div>

<p>Sistemin iş axını 6 ardıcıl və avtomatlaşdırılmış mərhələdən ibarətdir:</p>
<ul>
  <li><strong>Mərhələ 1: Kriptoqrafik İlkin Vəziyyət (Baseline):</strong> Qorunan anbardakı bütün fayllar SHA-256 ilə heşlənir, binar Merkle ağacına yığılır və vahid Merkle Root yaradılır. Eyni zamanda hər bir fayl AES-256-GCM ilə şifrələnərək soyuq ehtiyat nüsxəyə göndərilir.</li>
  <li><strong>Mərhələ 2: Fasiləsiz Hadisə Monitorinqi (Monitor):</strong> Monitor Agent hər 10 saniyədən bir saxlancı yoxlayır, faylların yaradılması, dəyişdirilməsi və silinməsi hadisələrini qeydə alır və dəyişmiş faylların yeni heşlərini bazaya yazır.</li>
  <li><strong>Mərhələ 3: Aşkarlama Mühərriki (Detection Engine):</strong> 60 saniyəlik sürüşən zaman pəncərəsi daxilində dəyişiklik sürəti hesablanır. Əgər dəyişiklik 30%-dən çoxdursa və ya bircə dənə Canary tələ faylına toxunulubsa, dərhal RANSOMWARE hökmü çıxarılır.</li>
  <li><strong>Mərhələ 4: Ani Reaksiya və Hesabın Dondurulması (Response & Freeze):</strong> Təcavüzkarın bulud hesabına dərhal IAM Write-Freeze siyasəti tətbiq edilir, bütün yazma və silmə hüquqları dondurulur (SLA &lt; 10s). İnsident qeydi yaradılır və RFC 8032 Ed25519 rəqəmsal imzası ilə möhürlənir.</li>
  <li><strong>Mərhələ 5: Dəyişdirilməz Zəncirvari Audit (Audit Ledger):</strong> Bütün hadisələr hər blokun əvvəlki blokun heşini saxladığı SHA-256 zəncirvari audit jurnalına yazılır. Hər hansı qeydin dəyişdirilməsi zənciri qırır.</li>
  <li><strong>Mərhələ 6: Sıfır-Etibarlı Karantin Bərpası (Verified Recovery):</strong> Ehtiyat nüsxələr AES-256-GCM AEAD vasitəsilə deşifrələnir, izolyasiya olunmuş karantin qovluğuna çıxarılır, hər bir faylın SHA-256 heşi ilkin baseline ilə yoxlanılır. Yalnız 100% VALID təsdiqlənən fayllar saxlanca geri qaytarılır.</li>
</ul>

<!-- 5. Bulud Təhlükəsizliyi -->
<h1>5. Bulud Təhlükəsizliyi: Birgə Məsuliyyət, IAM Freeze və Saxlanc Təcridi</h1>
<p>
Bulud mühitində təhlükəsizliyin təmin edilməsi Birgə Məsuliyyət Modelinə (Shared Responsibility Model) əsaslanır. Bulud provayderi (Supabase / AWS) fiziki serverlərin, şəbəkə avadanlıqlarının və hipervizorun təhlükəsizliyinə cavabdehdirsə, məlumatların şifrələnməsi, giriş hüquqlarının tənzimlənməsi (IAM) və anbarların konfiqurasiyası tamamilə müştərinin (yəni bizim) məsuliyyətimizdədir.
</p>

<h2>Bulud Xidmət Modellərinin Müqayisəsi</h2>
<p><strong>Cədvəl 1. Bulud Xidmət Modellərində Təhlükəsizlik Məsuliyyətlərinin Bölgüsü</strong></p>
<table>
  <tr><th>Xidmət Modeli</th><th>Provayderin Nəzarətində</th><th>Müştərinin Nəzarətində</th><th>CloudRDR Layihəsində Tətbiqi</th></tr>
  <tr><td><strong>IaaS (İnfrastruktur)</strong></td><td>Fiziki avadanlıq, şəbəkə, serverlər, virtuallaşdırma</td><td>Əməliyyat sistemi, şəbəkə konfiqurasiyası, verilənlər bazası, tətbiq kodu</td><td>Yerli simulyasiya və VM mühiti</td></tr>
  <tr><td><strong>PaaS / BaaS (Platforma)</strong></td><td>ƏS, verilənlər bazası mühərriki, saxlanc infrastrukturu</td><td>Məlumatların şifrələnməsi, RLS qaydaları, istifadəçi autentifikasiyası, tətbiq loqikası</td><td>Supabase Postgres & Storage (Əsas platforma)</td></tr>
  <tr><td><strong>SaaS (Proqram təminatı)</strong></td><td>Bütün infrastruktur, verilənlər bazası və proqram təminatı</td><td>Yalnız son istifadəçi giriş hüquqları və konfiqurasiya</td><td>Vercel Production Hosting & Linear</td></tr>
</table>

<h2>Supabase Seçimi, Özəl Saxlanc və Row Level Security (RLS)</h2>
<p>
Layihədə əsas bulud platforması kimi açıq mənbəli Supabase (Postgres və S3-uyğun Storage) seçilmişdir. Bütün fayllar <code>protected</code> adlı özəl (private) saxlanc anbarında saxlanılır. Anbarın açıq internetə birbaşa oxunması (public bucket) qəti şəkildə qadağan edilmişdir. Bütün verilənlər bazası cədvəllərində Row Level Security (RLS) aktivləşdirilmişdir. Anonim və hətta autentifikasiyadan keçmiş adi istifadəçilərə cədvəlləri oxumaq və yazmaq hüququ verilməmişdir (<code>deny_all</code>). Yalnız backend servisinin server tərəfində saxlanılan məxfi <code>SERVICE_ROLE</code> açarı RLS məhdudiyyətlərini aşaraq əməliyyat apara bilər.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('02_supabase_storage_and_rls.png')}" alt="Supabase RLS Siyasətləri">
  <div class="caption"><strong>Şəkil 4. Supabase Sıfır-Etibar (Zero-Trust) RLS Təhlükəsizlik Siyasətləri</strong> — Bütün daxili cədvəllərdə anon və authenticated rolları üçün icazələrin qapadıldığını nümayiş etdirir.</div>
</div>

<h2>Ən Az Səlahiyyət Prinsipi (Least Privilege) və IAM Write-Freeze Siyasəti</h2>
<p>
Təcavüzkar API açarını ələ keçirib kütləvi şifrələməyə başladıqda, ən vacib addım hücumun qarşısını dərhal kəsməkdir. CloudRDR mühərriki ransomware aşkarladıqda, dərhal cloud idarəetmə interfeysinə müraciət edərək həmin hesaba qarşı <code>IAM Deny-All Write</code> siyasətini aktivləşdirir. Bu siyasət oxuma hüququnu qüvvədə saxlayır (belə ki, bərpa servisi faylları yoxlamalıdır), lakin hər hansı yeni fayl yazmağı və ya mövcud faylları silməyi dərhal bloklayır. Benchmark ölçmələrimiz göstərir ki, IAM Freeze əməliyyatı orta hesabla 0.24 millisaniyə ərzində icra olunur (SLA hədəfi: &lt; 10 saniyə).
</p>

<div class="figure-wrap">
  <img src="${getImgUri('08_account_frozen_iam_policy.png')}" alt="IAM Hesabın Dondurulması">
  <div class="caption"><strong>Şəkil 5. Avtomatlaşdırılmış IAM Dondurulması və Bloklama Xəbərdarlığı</strong> — Təhlükə qeydə alındıqdan sonra yazma hüquqlarının dərhal məhdudlaşdırıldığını təsdiq edir.</div>
</div>

<div class="callout">
  <div class="callout-title">Qısa: nə etdim</div>
  <div><strong>Məqsəd:</strong> Bulud anbarında kütləvi hücum baş verərsə, təcavüzkarın yazma imkanlarını saniyələr içində dondurmaq və məlumatları təcrid etmək.</div>
  <div><strong>Necə etdim:</strong> Supabase RLS qaydalarını deny_all etdim, özəl bucket qurdum və dərhal işə düşən IAM Write-Freeze adapterini tətbiq etdim.</div>
</div>

<!-- 6. Kriptoqrafiya -->
<h1>6. Kriptoqrafiya Mexanizmləri: Merkle DAG, AES-256-GCM və Ed25519</h1>
<p>
Kriptoqrafiya — CloudRDR platformasının riyazi onurğa sütunudur. Sistemdə 4 əsas kriptoqrafik primitivdən istifadə edilmişdir: 1. SHA-256 axın heşlənməsi (fayl tamlığı üçün), 2. Merkle Ağacı DAG (bütün anbarın bütövlük möhürü üçün), 3. AES-256-GCM AEAD (ehtiyat nüsxələrin şifrələnməsi və autentifikasiyası üçün), 4. RFC 8032 Ed25519 (insident aktlarının rəqəmsal imzalanması üçün).
</p>

<h2>6.1. SHA-256 İlkin Vəziyyət (Baseline) və Merkle Ağacı</h2>
<p>
<strong>Nə edir:</strong> Saxlancdakı hər bir faylın məzmunundan 64 simvolluq unikal heş çıxarır və onları cüt-cüt birləşdirərək vahid Merkle Root yaradır.<br>
<em>Nümunə:</em> Heş funksiyasını hər bir faylın dəyişməz 'rəqəmsal barmaq izi', Merkle Root-u isə bütün arxivin üzərinə vurulmuş 'ümumi baş möhür' kimi təsəvvür etmək olar.<br>
<strong>Necə etdim:</strong> <code>crypto.createHash('sha256')</code> axın metodu ilə böyük faylları RAM-a tam yükləmədən heşlədim. Alınan heşləri əlifba sırası ilə düzüb Bitcoin-tipli binar Merkle ağacını qurdum.<br>
<strong>Yoxla:</strong> <code>npm run seed</code> əmrini icra edib terminalda yaranan 64 simvolluq Merkle Root dəyərini yoxla.<br>
<strong>Gözlənilən nəticə:</strong> 50 fayl üçün Merkle kökü hesablanır və <code>baseline_snapshots</code> cədvəlinə yazılır.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('03_baseline_generation_terminal.png')}" alt="Baseline Yaranması">
  <div class="caption"><strong>Şəkil 6. Kriptoqrafik İlkin Vəziyyətin (Baseline) Yaranması</strong> — 50 faylın heşlənməsi və Merkle Root heşinin uğurla hesablandığını nümayiş etdirir.</div>
</div>

<div class="figure-wrap">
  <img src="${getImgUri('07_merkle_tree_corruption_climb.png')}" alt="Merkle Korlanması">
  <div class="caption"><strong>Şəkil 7. Merkle Ağacında Korlanmanın Kökə Doğru Yayılması</strong> — Ransomware faylları dəyişdikdə yarpaqların və kök heşinin qırmızı rəngdə tamlığının pozulduğunu əks etdirir.</div>
</div>

<h2>6.2. AES-256-GCM ilə Autentifikasiyalı Şifrələmə (AEAD)</h2>
<p>
<strong>Nə edir:</strong> Ehtiyat nüsxələri şifrələyir və fayla 16 baytlıq AEAD autentifikasiya teqi əlavə edir. Əgər şifrəli faylın içində 1 bayt belə dəyişdirilərsə, deşifrələmə dərhal xəta verir və faylı açmır.<br>
<em>Nümunə:</em> AEAD şifrələməni xüsusi rəqəmsal plombla bağlanan diplomatik çantaya bənzətmək olar — plombla oynanılsa, çanta içindəki sənədi məhv edir və oxunmasına icazə vermir.<br>
<strong>Necə etdim:</strong> <code>aes-256-gcm</code> alqoritmi ilə 12 baytlıq unikal IV və 16 baytlıq Auth Tag generasiya etdim. Faylın adı və versiyasını AAD kimi teqə bağladım.<br>
<strong>Yoxla:</strong> Şifrələnmiş faylın 40-cı baytını süni şəkildə dəyiş (bit flip) və deşifrələməni sına.<br>
<strong>Gözlənilən nəticə:</strong> <code>aeadVerified = false</code> qayıdır və sıfır bayt məlumat sızır.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('12_terminal_tamper_exp_aes_aead.png')}" alt="AES-GCM Saxtalaşdırma Təcrübəsi">
  <div class="caption"><strong>Şəkil 8. AES-256-GCM AEAD Saxtalaşdırmanın Rədd Edilməsi Təcrübəsi</strong> — Şifrəli faylda 1 bayt dəyişdirildikdə kriptoqrafik yoxlamanın dərhal xəta verdiyini və bərpanı dayandırdığını sübut edir.</div>
</div>

<h2>6.3. RFC 8032 Ed25519 ilə İnsident Aktlarının Rəqəmsal İmzalanması</h2>
<p>
<strong>Nə edir:</strong> Baş vermiş ransomware insidentinin bütün detallarını Eliptik Əyri Kriptoqrafiyası (Ed25519) ilə imzalayır və hüquqi məhkəmə sübutuna çevirir.<br>
<em>Nümunə:</em> Rəqəmsal imzanı notariat tərəfindən təsdiqlənmiş və heç cür saxtalaşdırılması mümkün olmayan elektron möhür kimi qəbul etmək olar.<br>
<strong>Necə etdim:</strong> Node.js <code>crypto.generateKeyPairSync('ed25519')</code> ilə açar cütlüyü yaratdım. İnsident JSON obyektini kanonik şəkildə sıralayıb 64 baytlıq imza hasil etdim.<br>
<strong>Yoxla:</strong> İmzalanmış insident qeydində 'freezeStatus' dəyərini dəyişdirib imzanı yenidən yoxla.<br>
<strong>Gözlənilən nəticə:</strong> <code>verifyRecord()</code> funksiyası <code>false</code> qaytarır və sənədin saxtalaşdırıldığını bildirir.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('09_incident_detail_ed25519_valid.png')}" alt="İnsident İmzası">
  <div class="caption"><strong>Şəkil 9. SOC Nəzarət Panelində İnsident İmzası və Sübut Zənciri</strong> — RFC 8032 Ed25519 imzasının və Merkle kökünün kriptoqrafik təsdiq kartını göstərir.</div>
</div>

<div class="figure-wrap">
  <img src="${getImgUri('13_terminal_tamper_exp_ed25519_sig.png')}" alt="Ed25519 Saxtalaşdırma Testi">
  <div class="caption"><strong>Şəkil 10. Ed25519 İnsident Qeydinin Saxtalaşdırılmasının Aşkarlanması</strong> — İnsident qeydindəki bircə söz dəyişdirildikdə rəqəmsal imzanın dərhal etibarsız sayıldığını təsdiq edir.</div>
</div>

<h2>6.4. Dəyişdirilməz Zəncirvari Audit Jurnalı (Hash-Chained Log)</h2>
<p>
<strong>Nə edir:</strong> Sistemdə baş verən hər bir kritik əməliyyatı bloklar şəklində zəncirləyir. Hər bir blok əvvəlki blokun SHA-256 heşini saxlayır.<br>
<em>Nümunə:</em> Bu jurnalı hər səhifəsinin küncündə əvvəlki səhifənin möhürü olan və vərəqi cırıldıqda və ya mətni qaralandıqda dərhal bəlli olan rəsmi reyestr dəftərinə bənzətmək olar.<br>
<strong>Necə etdim:</strong> <code>AuditLog</code> sinfini qurdum. Hər yeni blok: <code>hash = SHA-256(index + prevHash + timestamp + canonicalJson(data))</code> formulası ilə zəncirlənir.<br>
<strong>Yoxla:</strong> Loq faylından 1-ci bloku açıb daxilindəki dəyişiklik dərəcəsini 0.40-dan 0.05-ə dəyiş və <code>verifyAuditChain()</code> işə sal.<br>
<strong>Gözlənilən nəticə:</strong> Sistem 'Broken Block Index #1' xətası verir və zəncirin qırıldığını elan edir.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('10_audit_chain_intact.png')}" alt="Audit Zənciri Bütöv">
  <div class="caption"><strong>Şəkil 11. Bütöv və Dəyişdirilməz Zəncirvari Audit Jurnalı</strong> — Bütün blokların bir-birinə riyazi olaraq bağlı olduğunu və loq tamlığının 100% qorunduğunu nümayiş etdirir.</div>
</div>

<div class="figure-wrap">
  <img src="${getImgUri('11_audit_chain_tamper_detected.png')}" alt="Audit Zəncirinin Qırılması">
  <div class="caption"><strong>Şəkil 12. Audit Jurnalında Saxtakarlığın Aşkarlanması və Zəncirin Qırılması</strong> — Blok məzmunu dəyişdirildikdə növbəti blokdakı prevHash uyğunsuzluğunun dərhal aşkar edildiyini göstərir.</div>
</div>

<div class="figure-wrap">
  <img src="${getImgUri('14_terminal_tamper_exp_audit_chain.png')}" alt="Terminal Audit Qırılması">
  <div class="caption"><strong>Şəkil 13. Terminal: Audit Loqunda Kriptoqrafik Qırılmanın Təsdiqi</strong> — Eksperiment 3 zamanı prevHash fərqinin tam olaraq hansı sətirdə baş verdiyini təsdiq edən çıxışı əks etdirir.</div>
</div>

<div class="callout">
  <div class="callout-title">Qısa: nə etdim</div>
  <div><strong>Məqsəd:</strong> Faylların tamlığını, ehtiyat nüsxələrin toxunulmazlığını və insident qeydlərinin inkarolunmazlığını riyazi olaraq təmin etmək.</div>
  <div><strong>Necə etdim:</strong> SHA-256, Merkle Tree, AES-256-GCM və Ed25519 alqoritmlərini reallaşdırdım və 3 saxtalaşdırma eksperimenti ilə təsdiqlədim.</div>
</div>

<!-- 7. Backend və Aşkarlama -->
<h1>7. Backend Mühərriki, Sürüşən Zaman Pəncərəsi və Canary Tələləri</h1>
<p>
Backend arxitekturası yüksək performanslı Fastify HTTP çərçivəsində qurulmuşdur. Aşkarlama mühərriki (Detection Engine) faylların dəyişmə intensivliyini izləmək üçün 60 saniyəlik sürüşən zaman pəncərəsi (Sliding Time Window) modelindən istifadə edir.
</p>

<h2>Dəyişiklik Hədləri və Dinamik Qərarvermə</h2>
<p>
Sürüşən pəncərə daxilində dəyişiklik dərəcəsi aşağıdakı düsturla hesablanır:<br>
<code>ChangeRate = (Dəyişmiş Faylların Sayı) / (Ümumi Qorunan Faylların Sayı)</code><br><br>
Sistemdə 3 dəqiq vəziyyət dərəcəsi təyin edilmişdir:<br>
• <strong>Normal (ChangeRate &lt; 10%):</strong> Təbii istifadəçi fəaliyyəti, heç bir həyəcan siqnalı verilmir.<br>
• <strong>Şübhəli / Suspicious (10% ≤ ChangeRate &lt; 30%):</strong> Şübhəli kütləvi dəyişiklik, SOC konsolunda sarı xəbərdarlıq yanır və monitorinq tezliyi artırılır.<br>
• <strong>Ransomware (ChangeRate ≥ 30%):</strong> Kritik hücum vəziyyəti, dərhal IAM Write-Freeze aktivləşdirilir və insident sənədi imzalanır.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('05_detection_sliding_window_graph.png')}" alt="Sliding Window Qrafiki">
  <div class="caption"><strong>Şəkil 14. 60 Saniyəlik Sürüşən Zaman Pəncərəsi və Sürət Qrafiki</strong> — Real vaxt rejimində dəyişiklik dərəcəsinin 30% kritik həddə çatmasını və aşkarlanmasını əks etdirir.</div>
</div>

<h2>Canary Tripwire (Tələ Fayl) Mexanizmi</h2>
<p>
Bəzi mürəkkəb ransomware növləri həddə düşməmək üçün faylları çox yavaş şifrələyir (Low-and-Slow Attack). Bu növ hücumları zərərsizləşdirmək üçün anbarın strateji qovluqlarına xüsusi cəlbedici ada malik Canary tələ faylları yerləşdirilmişdir (məsələn: <code>canaries/passwords_backup.docx</code> və ya <code>sentinel.canary</code>). Bu fayllar heç bir qanuni işçi tərəfindən açılmamalı və dəyişdirilməməlidir. Canary faylına edilən hər hansı dəyişiklik və ya silmə cəhdi sürət həddindən asılı olmayaraq 0.6 millisaniyə ərzində dərhal RANSOMWARE hökmünün verilməsinə və sistemin dondurulmasına səbəb olur.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('06_canary_tripwire_triggered.png')}" alt="Canary Tələsi">
  <div class="caption"><strong>Şəkil 15. Canary Tələ Faylı Toxunulduqda Dərhal Hücum Hökmünün Çıxarılması</strong> — Tripwire faylı dəyişdirilən kimi sistemin anında kritik qırmızı rejimə keçdiyini nümayiş etdirir.</div>
</div>

<h2>İcazəli Hesabların Qorunması (Allowlist Immunity)</h2>
<p>
Korporativ mühitlərdə bəzi qanuni servislər (məsələn, rəsmi arxivləşdirmə və ya ehtiyat nüsxə skripti) qısa müddətdə yüzlərlə faylı qanuni olaraq dəyişə bilər. Sistemin yalançı həyəcan (False Positive) verməməsi üçün <code>ALLOWLISTED_ACCOUNTS</code> mexanizmi tətbiq edilmişdir. Həmin hesablardan gələn kütləvi dəyişikliklər həddi aşsa belə, əgər Canary faylına toxunulmayıbsa, qanuni əməliyyat kimi qəbul edilir və bloklanmır.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('23_negative_test_allowlist_bypass.png')}" alt="Allowlist Testi">
  <div class="caption"><strong>Şəkil 16. İcazəli Ehtiyat Nüsxə Hesabının Qorunması (FP = 0.0%)</strong> — 70% dəyişiklik edən icazəli agentin yalançı həyəcan doğurmadan fəaliyyətini davam etdirdiyini təsdiq edir.</div>
</div>

<!-- 8. ISMS -->
<h1>8. İnformasiya Təhlükəsizliyi Menecment Sistemi (İSMS) və Uyğunluq</h1>
<p>
İnformasiya Təhlükəsizliyi Menecment Sistemi (İSMS) yalnız proqram kodundan ibarət deyil; o, təşkilatın risklərini idarə edən sistemli və davamlı proseslər toplusudur. CloudRDR çərçivəsində İSMS sistemini 4 sadə və strateji sual üzərində qurdum:<br>
<strong>1. Nəyi qoruyuruq?</strong> — Təşkilatın kritik bulud məlumatlarını, ehtiyat nüsxələrini və kriptoqrafik açarlarını (Aktiv Reyestri).<br>
<strong>2. Nə pis ola bilər?</strong> — Ransomware hücumu, ehtiyat nüsxənin korlanması, açarların sızması və ya daxili təhdid (Risk Reyestri).<br>
<strong>3. Nə edirik ki, olmasın?</strong> — Merkle tamlıq yoxlaması, AES-GCM şifrələmə, IAM dondurulması və karantin bərpası (SoA Nəzarətləri).<br>
<strong>4. Bunu kim və necə edir?</strong> — İnsident Cavab Qrupu, rollar və Fəlakətdən Bərpa Planı (BCP/DRP Planı).
</p>

<h2>8.1. İnformasiya Aktivlərinin Təsnifatı Reyestri</h2>
<p><strong>Cədvəl 2. CloudRDR İnformasiya Aktivləri Reyestri və Təsnifatı</strong></p>
<table>
  <tr><th>Aktiv ID</th><th>Aktivin Adı və Təsviri</th><th>Məxfilik</th><th>Tamlıq</th><th>Əlçatanlıq</th></tr>
  <tr><td>AST-01</td><td>Bulud Saxlanc Faylları (Müştəri və Maliyyə sənədləri)</td><td>Məxfi (C3)</td><td>Kritik (I3)</td><td>Yüksək (A2)</td></tr>
  <tr><td>AST-02</td><td>AES-256 Ehtiyat Nüsxələri (Cold Backups)</td><td>Məxfi (C3)</td><td>Kritik (I3)</td><td>Kritik (A3)</td></tr>
  <tr><td>AST-03</td><td>Kriptoqrafik Açarlar (Ed25519 &amp; AES Master Key)</td><td>Çox Məxfi (C4)</td><td>Kritik (I3)</td><td>Kritik (A3)</td></tr>
  <tr><td>AST-04</td><td>Zəncirvari Audit Jurnalı (Forensic Audit Logs)</td><td>Daxili (C2)</td><td>Kritik (I3)</td><td>Orta (A2)</td></tr>
  <tr><td>AST-05</td><td>SOC İdarəetmə Paneli və Monitor Agent</td><td>Daxili (C2)</td><td>Yüksək (I2)</td><td>Yüksək (A2)</td></tr>
</table>

<h2>8.2. Risk Reyestri və Təsir Analizi</h2>
<p><strong>Cədvəl 3. CloudRDR Risk Reyestri və Nəzarət Tədbirləri</strong></p>
<table>
  <tr><th>Risk ID</th><th>Təhlükə və Risk Ssenarisi</th><th>Ehtimal</th><th>Təsir</th><th>Səviyyə</th><th>Tətbiq Olunan Nəzarət</th></tr>
  <tr><td>RSK-01</td><td>Bulud anbarındakı faylların ransomware tərəfindən kütləvi şifrələnməsi</td><td>Yüksək (4)</td><td>Fəlakətli (5)</td><td>KRİTİK (20)</td><td>60s Sürüşən pəncərə, Canary tələləri, avtomatlaşdırılmış IAM Freeze</td></tr>
  <tr><td>RSK-02</td><td>Ehtiyat nüsxənin zədələnməsi və ya içinə gizli backdoor yerləşdirilməsi</td><td>Orta (3)</td><td>Kritik (4)</td><td>YÜKSƏK (12)</td><td>AES-256-GCM AEAD teqi və SHA-256 Merkle root ilə 100% tutuşdurma</td></tr>
  <tr><td>RSK-03</td><td>Təcavüzkarın audit loqlarını silərək izləri itirməsi</td><td>Orta (3)</td><td>Yüksək (4)</td><td>YÜKSƏK (12)</td><td>Dəyişdirilməz SHA-256 Hash-chained audit jurnalı və Append-only siyasəti</td></tr>
  <tr><td>RSK-04</td><td>Qanuni kütləvi əməliyyatların səhvən bloklanması (Yalançı həyəcan)</td><td>Yüksək (4)</td><td>Orta (2)</td><td>ORTA (8)</td><td>İcazəli hesablar siyahısı (ALLOWLISTED_ACCOUNTS) və hədd kalibrasiyası</td></tr>
  <tr><td>RSK-05</td><td>Bulud servisi xətası və ya şəbəkə kəsilməsi</td><td>Aşağı (2)</td><td>Kritik (4)</td><td>ORTA (8)</td><td>Fasiləsiz yerli keşləmə, retry dövrləri və lokal fallback saxlanc adapteri</td></tr>
</table>

<h2>8.3. Tətbiq Edilə Bilənlik Bəyannaməsi (SoA — ISO 27001:2022 &amp; NIST CSF 2.0)</h2>
<p><strong>Cədvəl 4. ISO 27001:2022 Əlavə A Nəzarətləri və NIST CSF 2.0 Xəritələnməsi</strong></p>
<table>
  <tr><th>ISO 27001 Nəzarət</th><th>Nəzarət Tələbinin Adı</th><th>CloudRDR Reallaşdırma Mexanizmi</th><th>NIST CSF 2.0 Funksiyası</th></tr>
  <tr><td>A.5.23</td><td>Bulud Xidmətlərində İnformasiya Təhlükəsizliyi</td><td>Supabase Storage üçün özəl bucket, RLS deny-all və Least Privilege IAM konfiqurasiyası</td><td>GOVERN (GV.SC)</td></tr>
  <tr><td>A.8.7</td><td>Zərərli Proqram Təminatından Mühafizə</td><td>60 saniyəlik sürüşən zaman pəncərəsi və Canary decoy tələ faylları ilə ransomware aşkarlanması</td><td>PROTECT (PR.PS)</td></tr>
  <tr><td>A.8.15</td><td>Jurnalların Qeydiyyatı (Logging)</td><td>Dəyişdirilməz SHA-256 hash-chained audit jurnalı və hərəkətlərin xronoloji fiksasiyası</td><td>DETECT (DE.AE)</td></tr>
  <tr><td>A.8.16</td><td>Monitorinq Fəaliyyətləri</td><td>Hər 10 saniyədən bir saxlancı təftiş edən Monitor Agent və real vaxt sürət qrafiki</td><td>DETECT (DE.CM)</td></tr>
  <tr><td>A.8.24</td><td>Kriptoqrafiyanın İstifadəsi</td><td>SHA-256 Merkle ağacı, AES-256-GCM AEAD ehtiyat nüsxələmə və Ed25519 rəqəmsal imzaları</td><td>PROTECT (PR.DS)</td></tr>
  <tr><td>A.8.14</td><td>Məlumatların Ehtiyat Nüsxələnməsi və Bərpası</td><td>İzolyasiya olunmuş karantin sahəsində mərhələli bərpa və 100% bit-bərabərlik təsdiqi</td><td>RECOVER (RC.RP)</td></tr>
</table>

<h2>8.4. İnsident Cavab Planı (NIST SP 800-61 Rev. 2) və Fəlakətdən Bərpa (BCP/DRP)</h2>
<p>
İnsidentlərin idarə edilməsi NIST SP 800-61 standartına uyğun 4 mərhələdə aparılır:<br>
<strong>1. Hazırlıq (Preparation):</strong> Baseline snapshotlarının möhürlənməsi, Canary faylların səpilməsi və API açarlarının paylanması.<br>
<strong>2. Aşkarlama və Təhlil (Detection &amp; Analysis):</strong> Sliding window dəyişiklik faizi və ya Canary toxunulması ilə hücumun təsdiqlənməsi.<br>
<strong>3. Lokallaşdırma və Məhv Etmə (Containment &amp; Eradication):</strong> Avtomatik IAM Write-Freeze siyasəti ilə hesabın bloklanması və Ed25519 aktının imzalanması.<br>
<strong>4. Bərpa və Nəticə (Recovery &amp; Post-Incident):</strong> Karantin bərpası, 100% VALID yoxlaması, dondurmanın aradan qaldırılması və dərslərin çıxarılması.<br><br>
Fəlakətdən Bərpa Planı (DRP) üzrə təsdiqlənmiş korporativ hədəflər:<br>
• <strong>RPO (Recovery Point Objective): RPO = 0</strong> (Kriptoqrafik ehtiyat nüsxə baseline zamanı alındığı üçün heç bir məlumat itkisi olmur).<br>
• <strong>RTO (Recovery Time Objective): RTO &lt; 15 dəqiqə</strong> (Real sınaqlarımızda 20 fayl cəmi 0.8 saniyəyə tam bərpa olunmuşdur).
</p>

<div class="figure-wrap">
  <img src="${getImgUri('15_quarantine_staged_restore.png')}" alt="Karantin Bərpası">
  <div class="caption"><strong>Şəkil 17. İki-Mərhələli Təhlükəsiz Karantin Bərpası (Staged Recovery)</strong> — Faylların birbaşa canlı anbara deyil, əvvəlcə təcrid olunmuş karantin sahəsinə çıxarılaraq yoxlandığını nümayiş etdirir.</div>
</div>

<div class="figure-wrap">
  <img src="${getImgUri('16_verified_recovery_100_percent.png')}" alt="100% Bərpa">
  <div class="caption"><strong>Şəkil 18. 100% Təsdiqlənmiş Kriptoqrafik Bərpa (Verified Recovery)</strong> — Bütün 20 faylın VALID statusu aldığını və Merkle kökünün ilkin vəziyyətlə bərabərliyini əks etdirir.</div>
</div>

<!-- 9. Demo -->
<h1>9. Nəzarət Paneli (SOC Dashboard) və Canlı Simulyasiya Ssenarisi</h1>
<p>
CloudRDR nəzarət paneli təhlükəsizlik əməliyyatları mərkəzinin (SOC) analitikləri üçün hazırlanmış müasir veb interfeysidir. Panel heç bir ağır xarici kitabxana olmadan, təmiz HTML5, CSS3 Tokens və asinxron JavaScript vasitəsilə qurulmuşdur. İnterfeysdə qeyri-ciddi emojilərdən istifadə edilməmiş, bütün vizual elementlər rəsmi SVG ikonlarla dizayn olunmuşdur.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('24_live_demo_soc_kpi_action_bar.png')}" alt="Canlı Demo KPI">
  <div class="caption"><strong>Şəkil 19. Canlı SOC Nümayiş Paneli və Əsas Göstəricilər Kartı (KPI)</strong> — Protected Storage, Containment SLA, Detection Velocity və Zero-Trust Recovery metrikalarını real vaxtda təqdim edir.</div>
</div>

<div class="figure-wrap">
  <img src="${getImgUri('04_soc_dashboard_calm.png')}" alt="Dashboard Calm">
  <div class="caption"><strong>Şəkil 20. SOC İdarəetmə Panelinin İlkin Sakit (Calm) Vəziyyəti</strong> — Sistemdə bütün faylların qorunduğunu və Merkle kökünün bütöv olduğunu nümayiş etdirir.</div>
</div>

<!-- 10. Testlər -->
<h1>10. Eksperimental Qiymətləndirmə, M1–M9 Metrikləri və Hədd Süpürməsi</h1>
<p>
CloudRDR sisteminin etibarlılığını və performansını sübut etmək üçün QA mühəndisi Tural Səfərovun rəhbərliyi ilə iki genişmiqyaslı eksperiment həyata keçirilmişdir: 9 formal qiymətləndirmə metriki (M1–M9) və 7 fərqli dəyişiklik həddini əhatə edən Hədd Süpürmə (Threshold Sweep) sınağı.
</p>

<h2>10.1. Rəsmi Qiymətləndirmə Metrikləri (M1–M9)</h2>
<p><strong>Cədvəl 5. CloudRDR Formal Qiymətləndirmə Metrikləri Nəticələri</strong></p>
<table>
  <tr><th>ID</th><th>Metrik Parametrinin Adı</th><th>Məqsəd / SLA Hədəfi</th><th>Real Ölçülmüş Dəyər</th><th>Status</th></tr>
  <tr><td>M8</td><td>Baseline Hashing Throughput</td><td>High speed (&gt; 10 MB/s)</td><td>16.43 MB/s (262.8 files/s)</td><td><strong>PASSED</strong></td></tr>
  <tr><td>M4</td><td>Canary Detection Latency</td><td>&lt; 1,000 ms (Instantaneous)</td><td>0.602 ms</td><td><strong>PASSED</strong></td></tr>
  <tr><td>M2</td><td>Automated Account Freeze Latency</td><td>&lt; 10,000 ms (SLA)</td><td>0.24 ms</td><td><strong>PASSED</strong></td></tr>
  <tr><td>M3</td><td>Benign Bulk Workload FP Rate</td><td>0.00% (Allowlist protected)</td><td>0.00% (Verdict: normal)</td><td><strong>PASSED</strong></td></tr>
  <tr><td>M1</td><td>Ransomware Detection Latency</td><td>&lt; 60,000 ms (SLA)</td><td>200.11 ms</td><td><strong>PASSED</strong></td></tr>
  <tr><td>M5</td><td>AES-256-GCM AEAD Tamper Detection</td><td>100.00%</td><td>100.00% (Tamper Rejected)</td><td><strong>PASSED</strong></td></tr>
  <tr><td>M6</td><td>Verified Recovery Integrity</td><td>100.00% VALID</td><td>100.0% VALID (20/20 files)</td><td><strong>PASSED</strong></td></tr>
  <tr><td>M7</td><td>Hash-Chained Audit Log Integrity</td><td>100.00% Valid Chain</td><td>100.00% (3 entries verified)</td><td><strong>PASSED</strong></td></tr>
  <tr><td>M9</td><td>Memory Footprint (Heap Delta)</td><td>&lt; 100 MB</td><td>1.60 MB (Total: 11.25 MB)</td><td><strong>PASSED</strong></td></tr>
</table>

<div class="figure-wrap">
  <img src="${getImgUri('17_metrics_harness_execution_table.png')}" alt="Metrics Harness">
  <div class="caption"><strong>Şəkil 21. Formal Qiymətləndirmə Metrikləri (M1–M9) Terminal İcra Nəticəsi</strong> — Bütün 9 metrikin hədəf SLA göstəricilərini üstələyərək PASSED olduğunu təsdiq edir.</div>
</div>

<h2>10.2. Hədd Süpürmə (Threshold Sweep) Eksperimenti</h2>
<p>
Optimal aşkarlama həddini elmi şəkildə müəyyən etmək üçün 14 fərqli sintetik ssenari (7 qanuni ofis fəaliyyəti və 7 ransomware hücum modeli) üzərində 1%-dən 80%-ə qədər hədd süpürməsi aparılmışdır.
</p>
<p><strong>Cədvəl 6. Aşkarlama Həddi Süpürməsi (Threshold Sweep) Matrisi və Dəqiqlik Analizi</strong></p>
<table>
  <tr><th>Hədd</th><th>TP</th><th>FP</th><th>TN</th><th>FN</th><th>Precision</th><th>Recall</th><th>Specificity</th><th>F1-Score</th></tr>
  <tr><td>1%</td><td>7</td><td>5</td><td>2</td><td>0</td><td>58.3%</td><td>100.0%</td><td>28.6%</td><td>0.737</td></tr>
  <tr><td>5%</td><td>7</td><td>3</td><td>4</td><td>0</td><td>70.0%</td><td>100.0%</td><td>57.1%</td><td>0.824</td></tr>
  <tr><td>10%</td><td>7</td><td>2</td><td>5</td><td>0</td><td>77.8%</td><td>100.0%</td><td>71.4%</td><td>0.875</td></tr>
  <tr><td>20%</td><td>6</td><td>1</td><td>6</td><td>1</td><td>85.7%</td><td>85.7%</td><td>85.7%</td><td>0.857</td></tr>
  <tr><td><strong>30% [OPT]</strong></td><td>6</td><td>0</td><td>7</td><td>1</td><td><strong>100.0%</strong></td><td>85.7%</td><td><strong>100.0%</strong></td><td><strong>0.923</strong></td></tr>
  <tr><td>50%</td><td>4</td><td>0</td><td>7</td><td>3</td><td>100.0%</td><td>57.1%</td><td>100.0%</td><td>0.727</td></tr>
  <tr><td>80%</td><td>3</td><td>0</td><td>7</td><td>4</td><td>100.0%</td><td>42.9%</td><td>100.0%</td><td>0.600</td></tr>
</table>

<div class="figure-wrap">
  <img src="${getImgUri('18_threshold_sweep_chart.png')}" alt="Threshold Sweep Qrafiki">
  <div class="caption"><strong>Şəkil 22. Hədd Süpürmə Eksperimentinin Nəticələri və F1-Score Əyrisi</strong> — 30% həddində Precision-un 100%-ə çatdığını və F1-Score-un maksimum (0.923) olduğunu nümayiş etdirir.</div>
</div>

<h2>Nəticələrin Səmimi Mühəndislik Təhlili</h2>
<p>
<strong>Problem:</strong> 1%, 5% və 10% kimi aşağı hədlərdə sistem adi ofis işçisinin eyni anda bir neçə hesabatı redaktə etməsini ransomware hücumu zənn edərək həyəcan siqnalı vermiş və aşağı Precision (58.3% – 77.8%) göstərmişdir.<br>
<em>Nümunə:</em> Bu hal yanğın siqnalizasiyasının mətbəxdə qayğanaq bişirilərkən çıxan buxara görə bütün binada suyu açmasına bənzəyir.<br>
<strong>Həll:</strong> Aşkarlama həddini 30% olaraq fiksasiya etdik və ALLOWLISTED_ACCOUNTS istisnalarını tətbiq etdik.<br>
<strong>Yoxlama:</strong> Nəticədə yalançı həyəcanlar 0%-ə düşdü, Precision 100% oldu və F1-Score 0.923 zirvəsinə çatdı.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('01_project_structure_and_test_suite.png')}" alt="npm test 74/74">
  <div class="caption"><strong>Şəkil 23. CloudRDR Vahid və İnteqrasiya Testləri (74/74 Keçib)</strong> — Bütün sistem komponentlərinin avtomatlaşdırılmış testlərdən 100% uğurla keçdiyini təsdiq edir.</div>
</div>

<!-- 11. Layihə İdarəetməsi -->
<h1>11. Layihənin İdarə Edilməsi: Linear Lövhəsi, Rollar və CI/CD</h1>
<p>
Layihənin uğurlu icrası 6 nəfərlik komanda arasında vəzifələrin dəqiq paylanması və avtomatlaşdırılmış mühəndislik mühiti sayəsində mümkün olmuşdur:<br>
• <strong>Mübariz Paşayev (Project Manager &amp; GRC Lead):</strong> Layihənin planlaşdırılması, ISO 27001/NIST CSF uyğunluğu, risk reyestri və yekun tədqiqat hesabatı.<br>
• <strong>Nigar Əliyeva (Crypto Developer):</strong> SHA-256 axın heşlənməsi, Merkle DAG ağacı, AES-256-GCM AEAD və Ed25519 modulunun yazılması.<br>
• <strong>Rəşad Məmmədov (DevOps Engineer):</strong> Supabase verilənlər bazası miqrasiyaları, IAM Freeze siyasəti və GitHub Actions CI/CD boru kəməri.<br>
• <strong>Elmir Qasımov (Backend Developer):</strong> Fastify HTTP API servisi, sliding-window monitorinq agenti və karantin bərpa mühərriki.<br>
• <strong>Aysel Kərimova (Frontend Developer):</strong> SOC nəzarət paneli, real vaxt Merkle SVG vizuallaşdırması və interaktiv hadisə axını jurnalı.<br>
• <strong>Tural Səfərov (QA &amp; Benchmark Lead):</strong> Vahid və inteqrasiya testləri (74 test), M1–M9 metrik harnessi və threshold sweep sınaqları.
</p>

<div class="figure-wrap">
  <img src="${getImgUri('21_github_actions_ci_pipeline.png')}" alt="CI/CD Pipeline">
  <div class="caption"><strong>Şəkil 24. GitHub Actions CI/CD Boru Kəməri və Avtomatlaşdırılmış Testlər</strong> — Hər bir commit üzrə lint, test və təhlükəsizlik yoxlamalarının avtomatik icrasını əks etdirir.</div>
</div>

<!-- 12. Üç Fənnin Sintezi -->
<h1>12. Üç Fənnin Sintezi: Yekun Akademik İzah</h1>
<p>
CloudRDR layihəsi müasir kibertəhlükəsizlik elminin üç təməl sütununun vəhdətini təcəssüm etdirir:<br>
<strong>1. Kriptoqrafiya — 'Necə qorunur?'</strong> sualına cavab verir. Kriptoqrafiya faylların tamlığını SHA-256 və Merkle ağacı ilə riyazi olaraq möhürləyir, ehtiyat nüsxələri AES-256-GCM AEAD ilə toxunulmaz edir və insident aktlarını Ed25519 ilə rəsmiləşdirir.<br>
<strong>2. Bulud Təhlükəsizliyi — 'Harada və necə saxlanır?'</strong> sualını cavablandırır. Bulud infrastrukturu verilənləri özəl anbarlarda təcrid edir, RLS siyasətləri ilə icazəsiz girişləri bağlayır və təcavüzkarı IAM Write-Freeze vasitəsilə 0.2 millisaniyədə zərərsizləşdirir.<br>
<strong>3. İnformasiya Təhlükəsizliyi Menecment Sistemləri (İSMS) — 'Niyə və hansı risklər idarə olunur?'</strong> sualını tənzimləyir. İSMS bütün bu texniki alətləri korporativ risklərin idarə edilməsi, ISO 27001 nəzarətləri, NIST SP 800-61 insident planı və hüquqi sübutların qorunması qaydaları ilə birləşdirərək vahid idarəetmə sisteminə çevirir.
</p>
<p>
Yekun olaraq, bu üç fənn birləşdikdə ransomware hücumlarına qarşı passiv gözləmə mövqeyindən fəal, avtomatlaşdırılmış və riyazi olaraq sübut edilə bilən mütləq müdafiə sistemi əldə edilmişdir.
</p>

<!-- 13. Məhdudiyyətlər -->
<h1>13. Texniki Məhdudiyyətlər və Gələcək İnkişaf Perspektivləri</h1>
<ul>
  <li><strong>Polling Əsaslı Monitorinq:</strong> Monitor agent saxlancı 10 saniyəlik intervalla yoxlayır. Gələcəkdə bunu S3 EventBridge və ya Supabase Realtime Webhooks ilə dəyişdirərək real vaxt reaksiyasını 0 millisaniyəyə endirmək olar.</li>
  <li><strong>Sabit Hədd Modeli:</strong> 30%-lik hədd sintetik testlərdə optimal olsa da, qeyri-standart biznes mühitlərində maşın öyrənməsi (ML/AI) əsaslı anomaliya aşkarlanması daha effektiv ola bilər.</li>
  <li><strong>HSM İnteqrasiyası:</strong> Hazırda Ed25519 açarları təhlükəsiz daxili mühitdə saxlanılır; gələcək korporativ versiyada açarların aparat təhlükəsizlik modulunda (AWS CloudHSM) saxlanması planlaşdırılır.</li>
  <li><strong>Çox-Buludlu (Multi-Cloud) Saxlanc Dəstəyi:</strong> Hazırda Supabase və yerli adapterlər mövcuddur; gələcəkdə birbaşa Google Cloud Storage və Azure Blob saxlanc adapterlərinin əlavə olunması nəzərdə tutulur.</li>
</ul>

<!-- 14. İstinadlar -->
<h1>14. İstifadə Edilmiş Ədəbiyyat və Beynəlxalq Standartlar</h1>
<ol>
  <li>ISO/IEC 27001:2022 — Information security, cybersecurity and privacy protection — Information security management systems — Requirements.</li>
  <li>ISO/IEC 27002:2022 — Information security, cybersecurity and privacy protection — Information security controls.</li>
  <li>NIST Cybersecurity Framework (CSF) 2.0 (2024) — National Institute of Standards and Technology.</li>
  <li>NIST SP 800-61 Rev. 2 (2012) — Computer Security Incident Handling Guide.</li>
  <li>NIST FIPS 180-4 (2015) — Secure Hash Standard (SHS) — SHA-256 Specification.</li>
  <li>NIST SP 800-38D (2007) — Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC.</li>
  <li>RFC 8032 (2017) — Edwards-Curve Digital Signature Algorithm (EdDSA) — Ed25519 Specification.</li>
  <li>Merkle, R. C. (1987) — A Digital Signature Based on a Conventional Encryption Function. Advances in Cryptology — CRYPTO '87.</li>
  <li>Supabase Documentation (2026) — Storage Access Control, Row Level Security, and Postgres Architecture.</li>
</ol>

<!-- Əlavə A -->
<div class="page-break"></div>
<h1>Əlavə A: Sübut Jurnalı (Evidence Log) və Tamamlanma Xülasəsi</h1>
<p>
Hesabatda təqdim edilmiş bütün 24 ədəd ekran görüntüsü, qrafik və eksperiment nəticəsi real işlək CloudRDR sistemindən əldə edilmişdir. Hər bir sübut faylı layihənin <code>report/screenshots/</code> kataloqunda saxlanılır.
</p>

<table>
  <tr><th>№</th><th>Fayl Adı</th><th>Mövzu / Təsvir</th><th>İcra Əmri / Mənbə</th></tr>
  <tr><td>1</td><td>01_project_structure_and_test_suite.png</td><td>Vahid və İnteqrasiya Testləri (74/74)</td><td>npm test</td></tr>
  <tr><td>2</td><td>02_supabase_storage_and_rls.png</td><td>Supabase Sıfır-Etibar RLS Siyasətləri</td><td>psql db/migrations/001_init.sql</td></tr>
  <tr><td>3</td><td>03_baseline_generation_terminal.png</td><td>SHA-256 &amp; Merkle Kökünün Yaranması</td><td>npm run seed</td></tr>
  <tr><td>4</td><td>04_soc_dashboard_calm.png</td><td>SOC Konsolunun Sakit (Calm) Vəziyyəti</td><td>Vercel Production Demo</td></tr>
  <tr><td>5</td><td>05_detection_sliding_window_graph.png</td><td>60s Sürüşən Zaman Pəncərəsi Qrafiki</td><td>Live Detection Chart Component</td></tr>
  <tr><td>6</td><td>06_canary_tripwire_triggered.png</td><td>Canary Tələsinə Toxunuldu Siqnalı</td><td>btnDrillCanary.click()</td></tr>
  <tr><td>7</td><td>07_merkle_tree_corruption_climb.png</td><td>Merkle Ağacında Korlanmanın Yayılması</td><td>btnDrillBurst.click()</td></tr>
  <tr><td>8</td><td>08_account_frozen_iam_policy.png</td><td>IAM Write-Freeze Siyasətinin Tətbiqi</td><td>btnDrillFreeze.click()</td></tr>
  <tr><td>9</td><td>09_incident_detail_ed25519_valid.png</td><td>RFC 8032 Ed25519 İnsident İmzası</td><td>signRecord() / verifyRecord()</td></tr>
  <tr><td>10</td><td>10_audit_chain_intact.png</td><td>Dəyişdirilməz Zəncirvari Audit Jurnalı</td><td>verifyAuditChain() [VALID]</td></tr>
  <tr><td>11</td><td>11_audit_chain_tamper_detected.png</td><td>Audit Jurnalında Qırılma Xəbərdarlığı</td><td>verifyAuditChain() [BROKEN]</td></tr>
  <tr><td>12</td><td>12_terminal_tamper_exp_aes_aead.png</td><td>AES-GCM 1 Bayt Dəyişikliyin Rəddi</td><td>demo-tampering-experiments.js</td></tr>
  <tr><td>13</td><td>13_terminal_tamper_exp_ed25519_sig.png</td><td>Ed25519 Saxtalaşdırmanın İfşası</td><td>demo-tampering-experiments.js</td></tr>
  <tr><td>14</td><td>14_terminal_tamper_exp_audit_chain.png</td><td>prevHash Qırılmasının Sübutu</td><td>demo-tampering-experiments.js</td></tr>
  <tr><td>15</td><td>15_quarantine_staged_restore.png</td><td>Karantin Sahəsində Mərhələli Bərpa</td><td>btnDrillRestore.click()</td></tr>
  <tr><td>16</td><td>16_verified_recovery_100_percent.png</td><td>100% VALID Təsdiqlənmiş Bərpa</td><td>startRestore() [100% VALID]</td></tr>
  <tr><td>17</td><td>17_metrics_harness_execution_table.png</td><td>Formal M1–M9 Metriklər Cədvəli</td><td>run-metrics-harness.js</td></tr>
  <tr><td>18</td><td>18_threshold_sweep_chart.png</td><td>Hədd Süpürməsi (1%–80%) və F1 Əyrisi</td><td>run-threshold-sweep.js</td></tr>
  <tr><td>19</td><td>19_linear_board_overview.png</td><td>Linear Layihə Lövhəsi (12 Həftəlik)</td><td>Linear Project Issues</td></tr>
  <tr><td>20</td><td>20_linear_board_sprints.png</td><td>Linear Sprintlər və Rol Bölgüsü</td><td>Linear Active Sprint View</td></tr>
  <tr><td>21</td><td>21_github_actions_ci_pipeline.png</td><td>GitHub Actions CI/CD Boru Kəməri</td><td>.github/workflows/ci.yml</td></tr>
  <tr><td>22</td><td>22_knowledge_graph_ast_architecture.png</td><td>AST Səviyyəli Layihə Bilik Qrafı</td><td>graphify update .</td></tr>
  <tr><td>23</td><td>23_negative_test_allowlist_bypass.png</td><td>İcazəli Agent Kütləvi Yükləmə Testi</td><td>run-threshold-sweep.js</td></tr>
  <tr><td>24</td><td>24_live_demo_soc_kpi_action_bar.png</td><td>Canlı SOC KPI Paneli və Alətlər</td><td>Vercel Production Demo</td></tr>
</table>

<h2>Məlumat Çatışmazlığı (Placeholder) Reyestri</h2>
<p>
Hesabat hazırlanarkən bütün zəruri məlumatlar layihənin kod bazasından, test nəticələrindən və rəsmi təsdiqlərdən əldə edilmişdir. Elmi rəhbər (Xatirə Həsənli), kafedra (Rəqəmsal Texnologiyalar) və təhsil müəssisəsi (ADNSU) məlumatları titul səhifəsində tam dəqiqliklə əks olunmuşdur. Sənəddə heç bir açıq qalan <code>[ƏLAVƏ EDİLMƏLİDİR]</code> bəndi qalmamışdır.
</p>

</body>
</html>`;

  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  console.log(`Writing PDF to ${PDF_PATH}...`);
  await page.pdf({
    path: PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '25mm',
      right: '20mm',
    },
  });

  await browser.close();
  console.log('PDF companion report generated successfully!');
}

main().catch(console.error);
