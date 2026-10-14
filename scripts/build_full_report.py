#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/build_full_report.py
Generates the complete 5000+ word final academic report in Azerbaijani for CloudRDR.
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

DOC_PATH = os.path.abspath("report/CloudRDR_Yekun_Report.docx")
IMG_DIR = os.path.abspath("report/screenshots")

doc = docx.Document()

# ── 1. Page Setup: A4, Margins ────────────────────────────────────────────────
for section in doc.sections:
    section.page_width = Inches(8.27)   # 210 mm
    section.page_height = Inches(11.69) # 297 mm
    section.left_margin = Inches(1.18)  # 3.0 cm
    section.right_margin = Inches(0.79) # 2.0 cm
    section.top_margin = Inches(0.79)   # 2.0 cm
    section.bottom_margin = Inches(0.79)# 2.0 cm
    
    footer = section.footer
    f_p = footer.paragraphs[0]
    f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    f_run = f_p.add_run("CloudRDR — Yekun Hesabat | ADNSU Rəqəmsal Texnologiyalar | 2026")
    f_run.font.name = "Calibri"
    f_run.font.size = Pt(8.5)
    f_run.font.color.rgb = RGBColor(140, 140, 140)

# ── Helper Formatting Functions ───────────────────────────────────────────────
def set_cell_background(cell, hex_color):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_heading_1(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(20)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)
    return p

def add_heading_2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_heading_3(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(11.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_p(text, bold_prefix="", space_after=5):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(space_after)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(11)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    r = p.add_run(text)
    r.font.name = "Calibri"
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_callout(purpose_text, how_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.3)
    set_cell_background(cell, "F1F5F9")
    set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
    
    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(2)
    
    r_title = p.add_run("Qısa: nə etdim\n")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(10.5)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(14, 116, 144) # cyan-700
    
    r_m = p.add_run("Məqsəd: ")
    r_m.font.bold = True
    p.add_run(purpose_text + "\n")
    
    r_n = p.add_run("Necə etdim: ")
    r_n.font.bold = True
    p.add_run(how_text)
    
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(3)

def add_figure(img_filename, caption_text, notice_text, max_width=5.8):
    img_path = os.path.join(IMG_DIR, img_filename)
    if not os.path.exists(img_path):
        print(f"Warning: Image {img_path} not found.")
        return
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(8)
    p_img.paragraph_format.space_after = Pt(2)
    p_img.paragraph_format.keep_with_next = True
    
    run_img = p_img.add_run()
    run_img.add_picture(img_path, width=Inches(max_width))
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_after = Pt(8)
    
    r_cap = p_cap.add_run(caption_text + " — ")
    r_cap.font.name = "Calibri"
    r_cap.font.size = Pt(9.5)
    r_cap.font.bold = True
    r_cap.font.color.rgb = RGBColor(51, 65, 85)
    
    r_not = p_cap.add_run(notice_text)
    r_not.font.name = "Calibri"
    r_not.font.size = Pt(9.5)
    r_not.font.italic = True
    r_not.font.color.rgb = RGBColor(100, 116, 139)

def format_table(tbl, col_widths, headers, data, alignments=None):
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "0F172A")
        set_cell_margins(hdr_cells[i], top=90, bottom=90, left=100, right=100)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if (alignments and alignments[i] == "C") else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(title)
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
    
    for row_idx, row_data in enumerate(data):
        row_cells = tbl.rows[row_idx + 1].cells
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, cell_value in enumerate(row_data):
            row_cells[col_idx].width = col_widths[col_idx]
            set_cell_background(row_cells[col_idx], bg_color)
            set_cell_margins(row_cells[col_idx], top=70, bottom=70, left=100, right=100)
            p = row_cells[col_idx].paragraphs[0]
            if alignments and alignments[col_idx] == "C":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif alignments and alignments[col_idx] == "R":
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(str(cell_value))
            r.font.name = "Calibri"
            r.font.size = Pt(9.0)
            r.font.color.rgb = RGBColor(30, 41, 59)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(4)

print("Writing Title Page...")

# ── TITUL SƏHİFƏSİ ────────────────────────────────────────────────────────────
p_uni = doc.add_paragraph()
p_uni.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_uni.paragraph_format.space_before = Pt(30)
p_uni.paragraph_format.space_after = Pt(2)
r = p_uni.add_run("AZƏRBAYCAN DÖVLƏT NEFT VƏ SƏNAYE UNİVERSİTETİ (ADNSU)\n")
r.font.name = "Calibri"
r.font.size = Pt(14)
r.font.bold = True
r.font.color.rgb = RGBColor(15, 23, 42)

r2 = p_uni.add_run("RƏQƏMSAL TEXNOLOGİYALAR KAFEDRASI")
r2.font.name = "Calibri"
r2.font.size = Pt(12)
r2.font.bold = True
r2.font.color.rgb = RGBColor(71, 85, 105)

p_div = doc.add_paragraph()
p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_div.paragraph_format.space_before = Pt(60)
p_div.paragraph_format.space_after = Pt(10)
r_proj = p_div.add_run("YEKUN TƏDQİQAT VƏ DİPLOM LAYİHƏSİ HESABATI\n")
r_proj.font.name = "Calibri"
r_proj.font.size = Pt(13)
r_proj.font.bold = True
r_proj.font.color.rgb = RGBColor(14, 116, 144)

r_main = p_div.add_run("CloudRDR — Bulud Anbarlarında Ransomware Hücumlarının Avtomatlaşdırılmış Aşkarlanması, Hesab Dondurulması və Sıfır-Etibarlı Kriptoqrafik Bərpası")
r_main.font.name = "Calibri"
r_main.font.size = Pt(20)
r_main.font.bold = True
r_main.font.color.rgb = RGBColor(15, 23, 42)

p_subj = doc.add_paragraph()
p_subj.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_subj.paragraph_format.space_before = Pt(15)
p_subj.paragraph_format.space_after = Pt(50)
r_sub = p_subj.add_run("Birləşdirilmiş Tədris Fənləri:\n1. İnformasiya Təhlükəsizliyi Menecment Sistemləri (İSMS)\n2. Bulud Texnologiyalarında Təhlükəsizlik (Cloud Security)\n3. Kriptoqrafiyanın Əsasları (Foundations of Cryptography)")
r_sub.font.name = "Calibri"
r_sub.font.size = Pt(11)
r_sub.font.italic = True
r_sub.font.color.rgb = RGBColor(51, 65, 85)

# Authors and Supervisor block
tbl_meta = doc.add_table(rows=4, cols=2)
tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
meta_widths = [Inches(3.1), Inches(3.2)]
meta_data = [
    ["Tələbə / Layihə Rəhbəri:", "Mübariz Paşayev (Project Manager & GRC Lead)"],
    ["Elmi Rəhbər / Müəllim:", "Xatirə Həsənli (Rəqəmsal Texnologiyalar Kafedrası)"],
    ["Mühəndis Komandası:", "Nigar Əliyeva (Crypto), Rəşad Məmmədov (DevOps),\nElmir Qasımov (Backend), Aysel Kərimova (Frontend),\nTural Səfərov (QA / Benchmark Lead)"],
    ["Təhvil Tarixi və Məkan:", "Oktyabr 2026, Bakı şəhəri, Azərbaycan"]
]
for idx, row in enumerate(meta_data):
    for c_idx in range(2):
        cell = tbl_meta.cell(idx, c_idx)
        cell.width = meta_widths[c_idx]
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        p = cell.paragraphs[0]
        r = p.add_run(row[c_idx])
        r.font.name = "Calibri"
        r.font.size = Pt(10.5)
        if c_idx == 0:
            r.font.bold = True
            r.font.color.rgb = RGBColor(71, 85, 105)
        else:
            r.font.color.rgb = RGBColor(15, 23, 42)

doc.add_page_break()

# ── MÜNDƏRİCAT (TABLE OF CONTENTS) ───────────────────────────────────────────
p_toc = doc.add_paragraph()
p_toc.paragraph_format.space_before = Pt(10)
p_toc.paragraph_format.space_after = Pt(15)
r_t = p_toc.add_run("MÜNDƏRİCAT")
r_t.font.name = "Calibri"
r_t.font.size = Pt(16)
r_t.font.bold = True
r_t.font.color.rgb = RGBColor(15, 23, 42)

toc_entries = [
    ("1. Giriş: Layihənin Məqsədi və Fənlərarası Əlaqə", "3"),
    ("2. Problem və Tədqiqat Konteksti: Ransomware Təhdidi", "4"),
    ("3. Layihənin İcra Planı və 12 Həftəlik Mühəndislik Strukturu", "5"),
    ("4. Ümumi Sistem Arxitekturu və 6 Mərhələli Müdafiə Konveyeri", "7"),
    ("5. Bulud Təhlükəsizliyi: Birgə Məsuliyyət, IAM Freeze və Saxlanc Təcridi", "9"),
    ("6. Kriptoqrafiya Mexanizmləri: Merkle DAG, AES-256-GCM və Ed25519", "12"),
    ("7. Backend Mühərriki, Sürüşən Zaman Pəncərəsi və Canary Tələləri", "17"),
    ("8. İnformasiya Təhlükəsizliyi Menecment Sistemi (İSMS) və Uyğunluq", "20"),
    ("9. Nəzarət Paneli (SOC Dashboard) və Canlı Simulyasiya Ssenarisi", "24"),
    ("10. Eksperimental Qiymətləndirmə, M1–M9 Metrikləri və Hədd Süpürməsi", "27"),
    ("11. Layihənin İdarə Edilməsi: Linear Lövhəsi, Rollar və CI/CD", "31"),
    ("12. Üç Fənnin Sintezi: Yekun Akademik İzah", "33"),
    ("13. Texniki Məhdudiyyətlər və Gələcək İnkişaf Perspektivləri", "34"),
    ("14. İstifadə Edilmiş Ədəbiyyat və Beynəlxalq Standartlar", "35"),
    ("Əlavə A: Sübut Jurnalı (Evidence Log) və Əlavə Olunası Bəndlər", "36"),
]

tbl_toc = doc.add_table(rows=len(toc_entries), cols=2)
tbl_toc.alignment = WD_TABLE_ALIGNMENT.CENTER
for idx, (title, page_num) in enumerate(toc_entries):
    c1, c2 = tbl_toc.cell(idx, 0), tbl_toc.cell(idx, 1)
    c1.width = Inches(5.6)
    c2.width = Inches(0.7)
    set_cell_margins(c1, top=40, bottom=40, left=50, right=50)
    set_cell_margins(c2, top=40, bottom=40, left=50, right=50)
    
    p1 = c1.paragraphs[0]
    r1 = p1.add_run(title)
    r1.font.name = "Calibri"
    r1.font.size = Pt(10)
    if title.startswith("1.") or title.startswith("4.") or title.startswith("8.") or title.startswith("10."):
        r1.font.bold = True
    
    p2 = c2.paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r2 = p2.add_run(page_num)
    r2.font.name = "Calibri"
    r2.font.size = Pt(10)

doc.add_page_break()

# ── 1. GİRİŞ: LAYİHƏNİN MƏQSƏDİ ───────────────────────────────────────────────
add_heading_1("1. Giriş: Layihənin Məqsədi və Fənlərarası Əlaqə")

add_p(
    "Müasir korporativ informasiya sistemlərinin kütləvi şəkildə bulud infrastrukturuna (Cloud IaaS/PaaS) miqrasiya etməsi "
    "məlumatların əlçatanlığını artırmaqla yanaşı, yeni nəsil kiberhücum vektorlarının yaranmasına səbəb olmuşdur. "
    "Bu təhlükələr arasında ən dağıdıcı xarakter daşıyanı ransomware (fidyə proqramı) hücumlarıdır. "
    "Ənənəvi antivirus və perimetr müdafiə vasitələri bulud saxlancında (məsələn, AWS S3 və ya Supabase Storage) icra olunan "
    "kütləvi şifrələmə əməliyyatlarını vaxtında aşkarlamaqda aciz qalır. "
    "Bu diplom və tədqiqat layihəsinin əsas məqsədi — bulud saxlancını fasiləsiz izləyən, kütləvi icazəsiz dəyişiklikləri "
    "saniyələr daxilində aşkarlayan, hücum edənin hesabını dərhal donduran və ən əsası, şifrələnmiş ehtiyat nüsxələrdən "
    "hər bir faylın tamlığını riyazi olaraq sübut etməklə 100% bərpasını təmin edən avtomatlaşdırılmış CloudRDR platformasını qurmaqdır."
)

add_p(
    "Layihə universitet tədris planında yer alan üç fundamental informasiya təhlükəsizliyi fənnini vahid praktik tətbiqdə birləşdirir:\n"
    "1. Kriptoqrafiyanın Əsasları: Faylların tamlığını qorumaq üçün SHA-256 heş funksiyaları, Merkle ağacı strukturu, "
    "ehtiyat nüsxələrin təhlükəsizliyi üçün AES-256-GCM AEAD authenticated encryption və insident qeydlərinin inkarolunmazlığı "
    "üçün RFC 8032 Ed25519 rəqəmsal imzaları tətbiq olunmuşdur.\n"
    "2. Bulud Təhlükəsizliyi: Supabase (Postgres və Storage) mühitində ən az səlahiyyət prinsipi (Least Privilege), "
    "Row Level Security (RLS) vasitəsilə sıfır-etibar (Zero-Trust) arxitekturası və hücum zamanı avtomatlaşdırılmış "
    "IAM Write-Freeze siyasəti reallaşdırılmışdır.\n"
    "3. İnformasiya Təhlükəsizliyi Menecment Sistemləri (İSMS): ISO/IEC 27001:2022 standartı, NIST CSF 2.0 və NIST SP 800-61 "
    "reqlamentləri əsasında aktivlərin təsnifatı, STRIDE təhdid modelləşdirməsi, risk reyestri, insident cavab planı "
    "və məhkəmə sübutlarının qorunması siyasəti (Chain of Custody) tam sənədləşdirilmişdir."
)

add_callout(
    "Bulud anbarlarını ransomware təhlükəsindən qorumaq üçün kriptoqrafik, bulud və idarəetmə mexanizmlərini vahid sistemdə birləşdirmək.",
    "Node.js, Fastify, Supabase və kriptoqrafik alqoritmlər vasitəsilə 6 mərhələli müdafiə konveyerini qurdum və test etdim."
)

# ── 2. PROBLEM VƏ TƏDQİQAT KONTEKSTİ ──────────────────────────────────────────
add_heading_1("2. Problem və Tədqiqat Konteksti: Ransomware Təhdidi")

add_p(
    "Ransomware — istifadəçinin və ya təşkilatın kritik fayllarını gizli şəkildə şifrələyərək əlçatmaz edən və açarı "
    "təqdim etmək müqabilində fidyə tələb edən zərərli proqram təminatıdır. "
    "Nümunə: Ransomware hücumunu ofis arxivinə gizlicə daxil olub bütün sənədləri tanınmaz qıfıllarla bağlayan "
    "və açarları yalnız pul qarşılığında verəcəyini deyən quldura bənzətmək olar."
)

add_p(
    "Ənənəvi sistemlərdə ehtiyat nüsxələrin (backup) mövcudluğu ransomware-ə qarşı yeganə xilasedici vasitə hesab olunurdu. "
    "Lakin müasir hücumlar göstərir ki, təcavüzkarlar ilk növbədə sistemdəki ehtiyat nüsxələri taparaq silir və ya onları da şifrələyir. "
    "Bundan əlavə, adi bərpa prosesi zamanı bərpa olunan faylın hücumdan əvvəlki orijinal faylla bit-bərabər eyni olduğunu "
    "sübut edən heç bir kriptoqrafik mexanizm mövcud deyildir. "
    "Təcavüzkar ehtiyat nüsxənin daxilinə 1 bayt belə dəyişiklik etsə (məsələn, zərərli arxa qapı — backdoor yerləşdirsə), "
    "ənənəvi bərpa proqramı bunu hiss etmədən faylı canlı bazaya yazır."
)

add_p(
    "CloudRDR layihəsi bu problemi 3 əsas prinsip əsasında həll edir:\n"
    "1. Tez Aşkarlama: 60 saniyəlik sürüşən zaman pəncərəsində dəyişikliklərin sürətini ölçür və tələ (canary) fayllarını izləyir.\n"
    "2. Dərhal Təcrid: Hədd aşılarsa, insident dərhal RFC 8032 Ed25519 ilə imzalanır və təcavüzkarın hesabı IAM səviyyəsində dondurulur.\n"
    "3. Təsdiqlənmiş Bərpa: Ehtiyat nüsxələr AES-256-GCM AEAD ilə şifrələnir, bərpa zamanı hər bir fayl yenidən heşlənir və yalnız ilkin Merkle kökü ilə 100% üst-üstə düşən fayllar geri qaytarılır."
)

# ── 3. LAYİHƏNİN İCRA PLANI VƏ STRUKTURU ──────────────────────────────────────
add_heading_1("3. Layihənin İcra Planı və 12 Həftəlik Mühəndislik Strukturu")

add_p(
    "Layihənin uğurla tamamlanması üçün 12 həftəlik çevik (Agile/Scrum) mühəndislik planı tərtib edilmiş və işlər 6 əsas mərhələyə bölünmüşdür. "
    "Bütün fəaliyyət Linear layihə idarəetmə platformasında rollar və həftələr üzrə qeydiyyata alınmışdır."
)

stages_data = [
    ("Həftə 1–2", "Tələblərin Dondurulması və GRC Çərçivəsi", "Təhlükəsizlik tələblərinin dondurulması, ISO 27001 / NIST CSF uyğunluq matrisinin qurulması, STRIDE təhdid analizi."),
    ("Həftə 3–4", "Kriptoqrafik Nüvə və Baseline Mühərriki", "SHA-256 axın heşlənməsi, Merkle DAG ağacının qurulması, AES-256-GCM AEAD şifrələmə kitabxanasının yazılması."),
    ("Həftə 5–6", "Bulud İnfrastrukturu və Saxlanc Adapterləri", "Supabase Storage və Postgres sxeminin qurulması, RLS siyasətləri, yerli LocalFsStorage adapteri və test mühiti."),
    ("Həftə 7–8", "Aşkarlama Mühərriki və IAM Freeze İnteqrasiyası", "Sliding-window dəyişiklik dərəcəsinin hesablanması, Canary tripwire tələləri, avtomatlaşdırılmış IAM dondurma siyasəti."),
    ("Həftə 9–10", "Zəncirvari Audit və Sıfır-Etibarlı Bərpa", "Hash-chained dəyişdirilməz audit jurnalı, təhlükəsiz karantin (quarantine) bərpa mexanizmi, 100% VALID heş yoxlaması."),
    ("Həftə 11–12", "Eksperimentlər, Benchmark Metrikləri və Yekun Sənədləşmə", "Hədd süpürmə (threshold sweep) eksperimentləri, M1–M9 performans ölçmələri, kod auditi və diplom hesabatının hazırlanması.")
]

for w, title, desc in stages_data:
    add_p(f"{title} ({w}): {desc}", bold_prefix="• ")

add_figure(
    "19_linear_board_overview.png",
    "Şəkil 1. Linear Layihə İdarəetmə Lövhəsi",
    "12 həftəlik mühəndislik planının 6 rol (PM, Crypto, DevOps, Backend, Frontend, QA) üzrə sprint bölgüsünü göstərir."
)

add_figure(
    "20_linear_board_sprints.png",
    "Şəkil 2. Linear Sprint və Tapşırıqlar İyerarxiyası",
    "GRC siyasətlərindən kriptoqrafik bərpa moduluna qədər bütün alt-tapşırıqların icra statusunu əks etdirir."
)

# ── 4. SİSTEM ARXİTEKTURU ─────────────────────────────────────────────────────
add_heading_1("4. Ümumi Sistem Arxitekturu və 6 Mərhələli Müdafiə Konveyeri")

add_p(
    "CloudRDR arxitekturası tamamilə modulyar, zəif əlaqəli (loosely coupled) və sıfır-etibar (Zero-Trust) prinsipləri üzərində qurulmuşdur. "
    "Sistem hadisə-əsaslı (event-driven) işləyir və hər bir komponent yalnız özünə aid təhlükəsizlik sərhədini idarə edir."
)

add_figure(
    "22_knowledge_graph_ast_architecture.png",
    "Şəkil 3. CloudRDR Abstrakt Sintaksis Ağacı (AST) Bilik Qrafı",
    "Sistemin 102 mənbə faylı və kriptoqrafik, saxlanc və aşkarlama modulları arasındakı dərin asılılıq əlaqələrini göstərir."
)

add_p("Sistemin iş axını 6 ardıcıl və avtomatlaşdırılmış mərhələdən ibarətdir:")
flow_steps = [
    ("Mərhələ 1: Kriptoqrafik İlkin Vəziyyət (Baseline)", "Qorunan anbardakı bütün fayllar SHA-256 ilə heşlənir, binar Merkle ağacına yığılır və vahid Merkle Root yaradılır. Eyni zamanda hər bir fayl AES-256-GCM ilə şifrələnərək soyuq ehtiyat nüsxəyə göndərilir."),
    ("Mərhələ 2: Fasiləsiz Hadisə Monitorinqi (Monitor)", "Monitor Agent hər 10 saniyədən bir saxlancı yoxlayır, faylların yaradılması, dəyişdirilməsi və silinməsi hadisələrini qeydə alır və dəyişmiş faylların yeni heşlərini bazaya yazır."),
    ("Mərhələ 3: Aşkarlama Mühərriki (Detection Engine)", "60 saniyəlik sürüşən zaman pəncərəsi daxilində dəyişiklik sürəti hesablanır. Əgər dəyişiklik 30%-dən çoxdursa və ya bircə dənə Canary tələ faylına toxunulubsa, dərhal RANSOMWARE hökmü çıxarılır."),
    ("Mərhələ 4: Ani Reaksiya və Hesabın Dondurulması (Response & Freeze)", "Təcavüzkarın bulud hesabına dərhal IAM Write-Freeze siyasəti tətbiq edilir, bütün yazma və silmə hüquqları dondurulur (SLA < 10s). İnsident qeydi yaradılır və RFC 8032 Ed25519 rəqəmsal imzası ilə möhürlənir."),
    ("Mərhələ 5: Dəyişdirilməz Zəncirvari Audit (Audit Ledger)", "Bütün hadisələr hər blokun əvvəlki blokun heşini saxladığı SHA-256 zəncirvari audit jurnalına yazılır. Hər hansı qeydin dəyişdirilməsi zənciri qırır."),
    ("Mərhələ 6: Sıfır-Etibarlı Karantin Bərpası (Verified Recovery)", "Ehtiyat nüsxələr AES-256-GCM AEAD vasitəsilə deşifrələnir, izolyasiya olunmuş karantin qovluğuna çıxarılır, hər bir faylın SHA-256 heşi ilkin baseline ilə yoxlanılır. Yalnız 100% VALID təsdiqlənən fayllar saxlanca geri qaytarılır.")
]

for title, desc in flow_steps:
    add_p(f"{title}: {desc}", bold_prefix="• ")

# ── 5. BULUD TƏHLÜKƏSİZLİYİ ───────────────────────────────────────────────────
add_heading_1("5. Bulud Təhlükəsizliyi: Birgə Məsuliyyət, IAM Freeze və Saxlanc Təcridi")

add_p(
    "Bulud mühitində təhlükəsizliyin təmin edilməsi Birgə Məsuliyyət Modelinə (Shared Responsibility Model) əsaslanır. "
    "Bulud provayderi (Supabase / AWS) fiziki serverlərin, şəbəkə avadanlıqlarının və hipervizorun təhlükəsizliyinə cavabdehdirsə, "
    "məlumatların şifrələnməsi, giriş hüquqlarının tənzimlənməsi (IAM) və anbarların konfiqurasiyası tamamilə müştərinin (yəni bizim) məsuliyyətimizdədir."
)

# Table 1: Cloud Service Comparison
add_heading_2("Bulud Xidmət Modellərinin Müqayisəsi")
add_p("Cədvəl 1. Bulud Xidmət Modellərində Təhlükəsizlik Məsuliyyətlərinin Bölgüsü", bold_prefix="")
tbl_cloud = doc.add_table(rows=4, cols=4)
cloud_headers = ["Xidmət Modeli", "Provayderin Nəzarətində", "Müştərinin Nəzarətində", "CloudRDR Layihəsində Tətbiqi"]
cloud_widths = [Inches(1.2), Inches(1.8), Inches(1.8), Inches(1.5)]
cloud_data = [
    ["IaaS (İnfrastruktur)", "Fiziki avadanlıq, şəbəkə, serverlər, virtuallaşdırma", "Əməliyyat sistemi, şəbəkə konfiqurasiyası, verilənlər bazası, tətbiq kodu", "Yerli simulyasiya və VM mühiti"],
    ["PaaS / BaaS (Platforma)", "ƏS, verilənlər bazası mühərriki, saxlanc infrastrukturu", "Məlumatların şifrələnməsi, RLS qaydaları, istifadəçi autentifikasiyası, tətbiq loqikası", "Supabase Postgres & Storage (Əsas platforma)"],
    ["SaaS (Proqram təminatı)", "Bütün infrastruktur, verilənlər bazası və proqram təminatı", "Yalnız son istifadəçi giriş hüquqları və konfiqurasiya", "Vercel Production Hosting & Linear"]
]
format_table(tbl_cloud, cloud_widths, cloud_headers, cloud_data, alignments=["C", "L", "L", "L"])

add_heading_2("Supabase Seçimi, Özəl Saxlanc və Row Level Security (RLS)")
add_p(
    "Layihədə əsas bulud platforması kimi açıq mənbəli Supabase (Postgres və S3-uyğun Storage) seçilmişdir. "
    "Bütün fayllar `protected` adlı özəl (private) saxlanc anbarında saxlanılır. "
    "Anbarın açıq internetə birbaşa oxunması (public bucket) qəti şəkildə qadağan edilmişdir. "
    "Bütün verilənlər bazası cədvəllərində Row Level Security (RLS) aktivləşdirilmişdir. "
    "Anonim və hətta autentifikasiyadan keçmiş adi istifadəçilərə cədvəlləri oxumaq və yazmaq hüququ verilməmişdir (`deny_all`). "
    "Yalnız backend servisinin server tərəfində saxlanılan məxfi `SERVICE_ROLE` açarı RLS məhdudiyyətlərini aşaraq əməliyyat apara bilər."
)

add_figure(
    "02_supabase_storage_and_rls.png",
    "Şəkil 4. Supabase Sıfır-Etibar (Zero-Trust) RLS Təhlükəsizlik Siyasətləri",
    "Bütün daxili cədvəllərdə anon və authenticated rolları üçün icazələrin qapadıldığını nümayiş etdirir."
)

add_heading_2("Ən Az Səlahiyyət Prinsipi (Least Privilege) və IAM Write-Freeze Siyasəti")
add_p(
    "Təcavüzkar API açarını ələ keçirib kütləvi şifrələməyə başladıqda, ən vacib addım hücumun qarşısını dərhal kəsməkdir. "
    "CloudRDR mühərriki ransomware aşkarladıqda, dərhal cloud idarəetmə interfeysinə müraciət edərək həmin hesaba qarşı `IAM Deny-All Write` siyasətini aktivləşdirir. "
    "Bu siyasət oxuma hüququnu qüvvədə saxlayır (belə ki, bərpa servisi faylları yoxlamalıdır), lakin hər hansı yeni fayl yazmağı və ya mövcud faylları silməyi dərhal bloklayır. "
    "Benchmark ölçmələrimiz göstərir ki, IAM Freeze əməliyyatı orta hesabla 0.24 millisaniyə ərzində icra olunur (SLA hədəfi: < 10 saniyə)."
)

add_figure(
    "08_account_frozen_iam_policy.png",
    "Şəkil 5. Avtomatlaşdırılmış IAM Dondurulması və Bloklama Xəbərdarlığı",
    "Təhlükə qeydə alındıqdan sonra yazma hüquqlarının dərhal məhdudlaşdırıldığını təsdiq edir."
)

add_heading_2("Açarların Təhlükəsiz İdarə Edilməsi və Müştəri Tərəfli Şifrələmə")
add_p(
    "Sistemdə heç bir məxfi açar (API Key, Supabase Service Key, Master Encryption Key) birbaşa kod bazasında saxlanılmır. "
    "Bütün açarlar `.env` faylında saxlanılır və `.gitignore` vasitəsilə ictimai GitHub reposuna düşməsi bloklanmışdır. "
    "Bundan əlavə, ehtiyat nüsxələr buluda ötürülməzdən əvvəl yerli maşında AES-256-GCM ilə şifrələnir (Client-side encryption). "
    "Nəticədə, hətta bulud provayderinin özü belə bizim faylların məzmununu oxuya bilməz."
)

add_callout(
    "Bulud anbarında kütləvi hücum baş verərsə, təcavüzkarın yazma imkanlarını saniyələr içində dondurmaq və məlumatları təcrid etmək.",
    "Supabase RLS qaydalarını deny_all etdim, özəl bucket qurdum və dərhal işə düşən IAM Write-Freeze adapterini tətbiq etdim."
)

# ── 6. KRİPTOQRAFİYA HİSSƏSİ ──────────────────────────────────────────────────
add_heading_1("6. Kriptoqrafiya Mexanizmləri: Merkle DAG, AES-256-GCM və Ed25519")

add_p(
    "Kriptoqrafiya — CloudRDR platformasının riyazi onurğa sütunudur. "
    "Sistemdə 4 əsas kriptoqrafik primitivdən istifadə edilmişdir: "
    "1. SHA-256 axın heşlənməsi (fayl tamlığı üçün), "
    "2. Merkle Ağacı DAG (bütün anbarın bütövlük möhürü üçün), "
    "3. AES-256-GCM AEAD (ehtiyat nüsxələrin şifrələnməsi və autentifikasiyası üçün), "
    "4. RFC 8032 Ed25519 (insident aktlarının rəqəmsal imzalanması üçün)."
)

add_heading_2("6.1. SHA-256 İlkin Vəziyyət (Baseline) və Merkle Ağacı")
add_p(
    "**Nə edir:** Saxlancdakı hər bir faylın məzmunundan 64 simvolluq unikal heş çıxarır və onları cüt-cüt birləşdirərək vahid Merkle Root yaradır.\n"
    "Nümunə: Heş funksiyasını hər bir faylın dəyişməz 'rəqəmsal barmaq izi', Merkle Root-u isə bütün arxivin üzərinə vurulmuş 'ümumi baş möhür' kimi təsəvvür etmək olar.\n"
    "**Necə etdim:** `crypto.createHash('sha256')` axın metodu ilə böyük faylları RAM-a tam yükləmədən heşlədim. Alınan heşləri əlifba sırası ilə düzüb Bitcoin-tipli binar Merkle ağacını qurdum.\n"
    "**Yoxla:** `npm run seed` əmrini icra edib terminalda yaranan 64 simvolluq Merkle Root dəyərini yoxla.\n"
    "**Gözlənilən nəticə:** 50 fayl üçün Merkle kökü hesablanır və `baseline_snapshots` cədvəlinə yazılır."
)

add_figure(
    "03_baseline_generation_terminal.png",
    "Şəkil 6. Kriptoqrafik İlkin Vəziyyətin (Baseline) Yaranması",
    "50 faylın heşlənməsi və Merkle Root heşinin uğurla hesablandığını nümayiş etdirir."
)

add_figure(
    "07_merkle_tree_corruption_climb.png",
    "Şəkil 7. Merkle Ağacında Korlanmanın Kökə Doğru Yayılması",
    "Ransomware faylları dəyişdikdə yarpaqların və kök heşinin qırmızı rəngdə tamlığının pozulduğunu əks etdirir."
)

add_heading_2("6.2. AES-256-GCM ilə Autentifikasiyalı Şifrələmə (AEAD)")
add_p(
    "**Nə edir:** Ehtiyat nüsxələri şifrələyir və fayla 16 baytlıq AEAD autentifikasiya teqi əlavə edir. "
    "Əgər şifrəli faylın içində 1 bayt belə dəyişdirilərsə, deşifrələmə dərhal xəta verir və faylı açmır.\n"
    "Nümunə: AEAD şifrələməni xüsusi rəqəmsal plombla bağlanan diplomatik çantaya bənzətmək olar — plombla oynanılsa, çanta içindəki sənədi məhv edir və oxunmasına icazə vermir.\n"
    "**Necə etdim:** `aes-256-gcm` alqoritmi ilə 12 baytlıq unikal IV (Initialization Vector) və 16 baytlıq Auth Tag generasiya etdim. "
    "Faylın adı və versiyasını AAD (Additional Authenticated Data) kimi teqə bağladım.\n"
    "**Yoxla:** Şifrələnmiş faylın 40-cı baytını süni şəkildə dəyiş (bit flip) və deşifrələməni sına.\n"
    "**Gözlənilən nəticə:** `aeadVerified = false` qayıdır və sıfır bayt məlumat sızır."
)

add_figure(
    "12_terminal_tamper_exp_aes_aead.png",
    "Şəkil 8. AES-256-GCM AEAD Saxtalaşdırmanın Rədd Edilməsi Təcrübəsi",
    "Şifrəli faylda 1 bayt dəyişdirildikdə kriptoqrafik yoxlamanın dərhal xəta verdiyini və bərpanı dayandırdığını sübut edir."
)

add_heading_2("6.3. RFC 8032 Ed25519 ilə İnsident Aktlarının Rəqəmsal İmzalanması")
add_p(
    "**Nə edir:** Baş vermiş ransomware insidentinin bütün detallarını (vaxt, təcavüzkarın hesabı, zədələnmiş fayllar) "
    "Eliptik Əyri Kriptoqrafiyası (Ed25519) ilə imzalayır və hüquqi məhkəmə sübutuna çevirir.\n"
    "Nümunə: Rəqəmsal imzanı notariat tərəfindən təsdiqlənmiş və heç cür saxtalaşdırılması mümkün olmayan elektron möhür kimi qəbul etmək olar.\n"
    "**Necə etdim:** Node.js `crypto.generateKeyPairSync('ed25519')` ilə açar cütlüyü yaratdım. "
    "İnsident JSON obyektini kanonik şəkildə sıralayıb 64 baytlıq imza hasil etdim.\n"
    "**Yoxla:** İmzalanmış insident qeydində 'freezeStatus' dəyərini dəyişdirib imzanı yenidən yoxla.\n"
    "**Gözlənilən nəticə:** `verifyRecord()` funksiyası `false` qaytarır və sənədin saxtalaşdırıldığını bildirir."
)

add_figure(
    "09_incident_detail_ed25519_valid.png",
    "Şəkil 9. SOC Nəzarət Panelində İnsident İmzası və Sübut Zənciri",
    "RFC 8032 Ed25519 imzasının və Merkle kökünün kriptoqrafik təsdiq kartını göstərir."
)

add_figure(
    "13_terminal_tamper_exp_ed25519_sig.png",
    "Şəkil 10. Ed25519 İnsident Qeydinin Saxtalaşdırılmasının Aşkarlanması",
    "İnsident qeydindəki bircə söz dəyişdirildikdə rəqəmsal imzanın dərhal etibarsız sayıldığını təsdiq edir."
)

add_heading_2("6.4. Dəyişdirilməz Zəncirvari Audit Jurnalı (Hash-Chained Log)")
add_p(
    "**Nə edir:** Sistemdə baş verən hər bir kritik əməliyyatı bloklar şəklində zəncirləyir. "
    "Hər bir blok əvvəlki blokun SHA-256 heşini saxlayır.\n"
    "Nümunə: Bu jurnalı hər səhifəsinin küncündə əvvəlki səhifənin möhürü olan və vərəqi cırıldıqda və ya mətni qaralandıqda dərhal bəlli olan rəsmi reyestr dəftərinə bənzətmək olar.\n"
    "**Necə etdim:** `AuditLog` sinfini qurdum. Hər yeni blok: `hash = SHA-256(index + prevHash + timestamp + canonicalJson(data))` formulası ilə zəncirlənir.\n"
    "**Yoxla:** Loq faylından 1-ci bloku açıb daxilindəki dəyişiklik dərəcəsini 0.40-dan 0.05-ə dəyiş və `verifyAuditChain()` işə sal.\n"
    "**Gözlənilən nəticə:** Sistem 'Broken Block Index #1' xətası verir və zəncirin qırıldığını elan edir."
)

add_figure(
    "10_audit_chain_intact.png",
    "Şəkil 11. Bütöv və Dəyişdirilməz Zəncirvari Audit Jurnalı",
    "Bütün blokların bir-birinə riyazi olaraq bağlı olduğunu və loq tamlığının 100% qorunduğunu nümayiş etdirir."
)

add_figure(
    "11_audit_chain_tamper_detected.png",
    "Şəkil 12. Audit Jurnalında Saxtakarlığın Aşkarlanması və Zəncirin Qırılması",
    "Blok məzmunu dəyişdirildikdə növbəti blokdakı prevHash uyğunsuzluğunun dərhal aşkar edildiyini göstərir."
)

add_figure(
    "14_terminal_tamper_exp_audit_chain.png",
    "Şəkil 13. Terminal: Audit Loqunda Kriptoqrafik Qırılmanın Təsdiqi",
    "Eksperiment 3 zamanı prevHash fərqinin tam olaraq hansı sətirdə baş verdiyini təsdiq edən çıxışı əks etdirir."
)

add_callout(
    "Faylların tamlığını, ehtiyat nüsxələrin toxunulmazlığını və insident qeydlərinin inkarolunmazlığını riyazi olaraq təmin etmək.",
    "SHA-256, Merkle Tree, AES-256-GCM və Ed25519 alqoritmlərini reallaşdırdım və 3 saxtalaşdırma eksperimenti ilə təsdiqlədim."
)

# ── 7. BACKEND VƏ AŞKARLAMA ───────────────────────────────────────────────────
add_heading_1("7. Backend Mühərriki, Sürüşən Zaman Pəncərəsi və Canary Tələləri")

add_p(
    "Backend arxitekturası yüksək performanslı Fastify HTTP çərçivəsində qurulmuşdur. "
    "Aşkarlama mühərriki (Detection Engine) faylların dəyişmə intensivliyini izləmək üçün "
    "60 saniyəlik sürüşən zaman pəncərəsi (Sliding Time Window) modelindən istifadə edir."
)

add_heading_2("Dəyişiklik Hədləri və Dinamik Qərarvermə")
add_p(
    "Sürüşən pəncərə daxilində dəyişiklik dərəcəsi aşağıdakı düsturla hesablanır:\n"
    "ChangeRate = (Dəyişmiş Faylların Sayı) / (Ümumi Qorunan Faylların Sayı)\n\n"
    "Sistemdə 3 dəqiq vəziyyət dərəcəsi təyin edilmişdir:\n"
    "• Normal (ChangeRate < 10%): Təbii istifadəçi fəaliyyəti, heç bir həyəcan siqnalı verilmir.\n"
    "• Şübhəli / Suspicious (10% ≤ ChangeRate < 30%): Şübhəli kütləvi dəyişiklik, SOC konsolunda sarı xəbərdarlıq yanır və monitorinq tezliyi artırılır.\n"
    "• Ransomware (ChangeRate ≥ 30%): Kritik hücum vəziyyəti, dərhal IAM Write-Freeze aktivləşdirilir və insident sənədi imzalanır."
)

add_figure(
    "05_detection_sliding_window_graph.png",
    "Şəkil 14. 60 Saniyəlik Sürüşən Zaman Pəncərəsi və Sürət Qrafiki",
    "Real vaxt rejimində dəyişiklik dərəcəsinin 30% kritik həddə çatmasını və aşkarlanmasını əks etdirir."
)

add_heading_2("Canary Tripwire (Tələ Fayl) Mexanizmi")
add_p(
    "Bəzi mürəkkəb ransomware növləri həddə düşməmək üçün faylları çox yavaş şifrələyir (Low-and-Slow Attack). "
    "Bu növ hücumları zərərsizləşdirmək üçün anbarın strateji qovluqlarına xüsusi cəlbedici ada malik "
    "Canary tələ faylları yerləşdirilmişdir (məsələn: `canaries/passwords_backup.docx` və ya `sentinel.canary`). "
    "Bu fayllar heç bir qanuni işçi tərəfindən açılmamalı və dəyişdirilməməlidir. "
    "Canary faylına edilən hər hansı dəyişiklik və ya silmə cəhdi sürət həddindən asılı olmayaraq "
    "0.6 millisaniyə ərzində dərhal RANSOMWARE hökmünün verilməsinə və sistemin dondurulmasına səbəb olur."
)

add_figure(
    "06_canary_tripwire_triggered.png",
    "Şəkil 15. Canary Tələ Faylı Toxunulduqda Dərhal Hücum Hökmünün Çıxarılması",
    "Tripwire faylı dəyişdirilən kimi sistemin anında kritik qırmızı rejimə keçdiyini nümayiş etdirir."
)

add_heading_2("İcazəli Hesabların Qorunması (Allowlist Immunity)")
add_p(
    "Korporativ mühitlərdə bəzi qanuni servislər (məsələn, rəsmi arxivləşdirmə və ya ehtiyat nüsxə skripti) qısa müddətdə "
    "yüzlərlə faylı qanuni olaraq dəyişə bilər. Sistemin yalançı həyəcan (False Positive) verməməsi üçün "
    "`ALLOWLISTED_ACCOUNTS` mexanizmi tətbiq edilmişdir. Həmin hesablardan gələn kütləvi dəyişikliklər "
    "həddi aşsa belə, əgər Canary faylına toxunulmayıbsa, qanuni əməliyyat kimi qəbul edilir və bloklanmır."
)

add_figure(
    "23_negative_test_allowlist_bypass.png",
    "Şəkil 16. İcazəli Ehtiyat Nüsxə Hesabının Qorunması (FP = 0.0%)",
    "70% dəyişiklik edən icazəli agentin yalançı həyəcan doğurmadan fəaliyyətini davam etdirdiyini təsdiqləyir."
)

# ── 8. İSMS HİSSƏSİ ───────────────────────────────────────────────────────────
add_heading_1("8. İnformasiya Təhlükəsizliyi Menecment Sistemi (İSMS) və Uyğunluq")

add_p(
    "İnformasiya Təhlükəsizliyi Menecment Sistemi (İSMS) yalnız proqram kodundan ibarət deyil; "
    "o, təşkilatın risklərini idarə edən sistemli və davamlı proseslər toplusudur. "
    "CloudRDR çərçivəsində İSMS sistemini 4 sadə və strateji sual üzərində qurdum:\n"
    "1. Nəyi qoruyuruq? — Təşkilatın kritik bulud məlumatlarını, ehtiyat nüsxələrini və kriptoqrafik açarlarını (Aktiv Reyestri).\n"
    "2. Nə pis ola bilər? — Ransomware hücumu, ehtiyat nüsxənin korlanması, açarların sızması və ya daxili təhdid (Risk Reyestri).\n"
    "3. Nə edirik ki, olmasın? — Merkle tamlıq yoxlaması, AES-GCM şifrələmə, IAM dondurulması və karantin bərpası (SoA Nəzarətləri).\n"
    "4. Bunu kim və necə edir? — İnsident Cavab Qrupu, rollar və Fəlakətdən Bərpa Planı (BCP/DRP Planı)."
)

# Table 2: Asset Register
add_heading_2("8.1. İnformasiya Aktivlərinin Təsnifatı Reyestri")
add_p("Cədvəl 2. CloudRDR İnformasiya Aktivləri Reyestri və Təsnifatı", bold_prefix="")
tbl_asset = doc.add_table(rows=6, cols=5)
asset_widths = [Inches(1.2), Inches(1.8), Inches(1.0), Inches(1.0), Inches(1.3)]
asset_headers = ["Aktiv ID", "Aktivin Adı və Təsviri", "Məxfilik", "Tamlıq", "Əlçatanlıq"]
asset_data = [
    ["AST-01", "Bulud Saxlanc Faylları (Müştəri və Maliyyə sənədləri)", "Məxfi (C3)", "Kritik (I3)", "Yüksək (A2)"],
    ["AST-02", "AES-256 Ehtiyat Nüsxələri (Cold Backups)", "Məxfi (C3)", "Kritik (I3)", "Kritik (A3)"],
    ["AST-03", "Kriptoqrafik Açarlar (Ed25519 & AES Master Key)", "Çox Məxfi (C4)", "Kritik (I3)", "Kritik (A3)"],
    ["AST-04", "Zəncirvari Audit Jurnalı (Forensic Audit Logs)", "Daxili (C2)", "Kritik (I3)", "Orta (A2)"],
    ["AST-05", "SOC İdarəetmə Paneli və Monitor Agent", "Daxili (C2)", "Yüksək (I2)", "Yüksək (A2)"]
]
format_table(tbl_asset, asset_widths, asset_headers, asset_data, alignments=["C", "L", "C", "C", "C"])

# Table 3: Risk Register
add_heading_2("8.2. Risk Reyestri və Təsir Analizi")
add_p("Cədvəl 3. CloudRDR Risk Reyestri və Nəzarət Tədbirləri", bold_prefix="")
tbl_risk = doc.add_table(rows=6, cols=6)
risk_widths = [Inches(0.8), Inches(1.8), Inches(0.7), Inches(0.7), Inches(0.8), Inches(1.5)]
risk_headers = ["Risk ID", "Təhlükə və Risk Ssenarisi", "Ehtimal", "Təsir", "Səviyyə", "Tətbiq Olunan Nəzarət"]
risk_data = [
    ["RSK-01", "Bulud anbarındakı faylların ransomware tərəfindən kütləvi şifrələnməsi", "Yüksək (4)", "Fəlakətli (5)", "KRİTİK (20)", "60s Sürüşən pəncərə, Canary tələləri, avtomatlaşdırılmış IAM Freeze"],
    ["RSK-02", "Ehtiyat nüsxənin zədələnməsi və ya içinə gizli backdoor yerləşdirilməsi", "Orta (3)", "Kritik (4)", "YÜKSƏK (12)", "AES-256-GCM AEAD teqi və SHA-256 Merkle root ilə 100% tutuşdurma"],
    ["RSK-03", "Təcavüzkarın audit loqlarını silərək izləri itirməsi", "Orta (3)", "Yüksək (4)", "YÜKSƏK (12)", "Dəyişdirilməz SHA-256 Hash-chained audit jurnalı və Append-only siyasəti"],
    ["RSK-04", "Qanuni kütləvi əməliyyatların səhvən bloklanması (Yalançı həyəcan)", "Yüksək (4)", "Orta (2)", "ORTA (8)", "İcazəli hesablar siyahısı (ALLOWLISTED_ACCOUNTS) və hədd kalibrasiyası"],
    ["RSK-05", "Bulud servisi xətası və ya şəbəkə kəsilməsi", "Aşağı (2)", "Kritik (4)", "ORTA (8)", "Fasiləsiz yerli keşləmə, retry dövrləri və lokal fallback saxlanc adapteri"]
]
format_table(tbl_risk, risk_widths, risk_headers, risk_data, alignments=["C", "L", "C", "C", "C", "L"])

# Table 4: Statement of Applicability (SoA)
add_heading_2("8.3. Tətbiq Edilə Bilənlik Bəyannaməsi (SoA — ISO 27001:2022 & NIST CSF 2.0)")
add_p("Cədvəl 4. ISO 27001:2022 Əlavə A Nəzarətləri və NIST CSF 2.0 Xəritələnməsi", bold_prefix="")
tbl_soa = doc.add_table(rows=7, cols=4)
soa_widths = [Inches(1.2), Inches(1.8), Inches(2.1), Inches(1.2)]
soa_headers = ["ISO 27001 Nəzarət", "Nəzarət Tələbinin Adı", "CloudRDR Reallaşdırma Mexanizmi", "NIST CSF 2.0 Funksiyası"]
soa_data = [
    ["A.5.23", "Bulud Xidmətlərində İnformasiya Təhlükəsizliyi", "Supabase Storage üçün özəl bucket, RLS deny-all və Least Privilege IAM konfiqurasiyası", "GOVERN (GV.SC)"],
    ["A.8.7", "Zərərli Proqram Təminatından Mühafizə", "60 saniyəlik sürüşən zaman pəncərəsi və Canary decoy tələ faylları ilə ransomware aşkarlanması", "PROTECT (PR.PS)"],
    ["A.8.15", "Jurnalların Qeydiyyatı (Logging)", "Dəyişdirilməz SHA-256 hash-chained audit jurnalı və hərəkətlərin xronoloji fiksasiyası", "DETECT (DE.AE)"],
    ["A.8.16", "Monitorinq Fəaliyyətləri", "Hər 10 saniyədən bir saxlancı təftiş edən Monitor Agent və real vaxt sürət qrafiki", "DETECT (DE.CM)"],
    ["A.8.24", "Kriptoqrafiyanın İstifadəsi", "SHA-256 Merkle ağacı, AES-256-GCM AEAD ehtiyat nüsxələmə və Ed25519 rəqəmsal imzaları", "PROTECT (PR.DS)"],
    ["A.8.14", "Məlumatların Ehtiyat Nüsxələnməsi və Bərpası", "İzolyasiya olunmuş karantin sahəsində mərhələli bərpa və 100% bit-bərabərlik təsdiqi", "RECOVER (RC.RP)"]
]
format_table(tbl_soa, soa_widths, soa_headers, soa_data, alignments=["C", "L", "L", "C"])

add_heading_2("8.4. İnsident Cavab Planı (NIST SP 800-61 Rev. 2) və Fəlakətdən Bərpa (BCP/DRP)")
add_p(
    "İnsidentlərin idarə edilməsi NIST SP 800-61 standartına uyğun 4 mərhələdə aparılır:\n"
    "1. Hazırlıq (Preparation): Baseline snapshotlarının möhürlənməsi, Canary faylların səpilməsi və API açarlarının paylanması.\n"
    "2. Aşkarlama və Təhlil (Detection & Analysis): Sliding window dəyişiklik faizi və ya Canary toxunulması ilə hücumun təsdiqlənməsi.\n"
    "3. Lokallaşdırma və Məhv Etmə (Containment & Eradication): Avtomatik IAM Write-Freeze siyasəti ilə hesabın bloklanması və Ed25519 aktının imzalanması.\n"
    "4. Bərpa və Nəticə (Recovery & Post-Incident): Karantin bərpası, 100% VALID yoxlaması, dondurmanın aradan qaldırılması və dərslərin çıxarılması.\n\n"
    "Fəlakətdən Bərpa Planı (DRP) üzrə təsdiqlənmiş korporativ hədəflər:\n"
    "• RPO (Recovery Point Objective): RPO = 0 (Kriptoqrafik ehtiyat nüsxə baseline zamanı alındığı üçün heç bir məlumat itkisi olmur).\n"
    "• RTO (Recovery Time Objective): RTO < 15 dəqiqə (Real sınaqlarımızda 20 fayl cəmi 0.8 saniyəyə tam bərpa olunmuşdur)."
)

add_figure(
    "15_quarantine_staged_restore.png",
    "Şəkil 17. İki-Mərhələli Təhlükəsiz Karantin Bərpası (Staged Recovery)",
    "Faylların birbaşa canlı anbara deyil, əvvəlcə təcrid olunmuş karantin sahəsinə çıxarılaraq yoxlandığını nümayiş etdirir."
)

add_figure(
    "16_verified_recovery_100_percent.png",
    "Şəkil 18. 100% Təsdiqlənmiş Kriptoqrafik Bərpa (Verified Recovery)",
    "Bütün 20 faylın VALID statusu aldığını və Merkle kökünün ilkin vəziyyətlə bərabərliyini əks etdirir."
)

# ── 9. DASHBOARD VƏ DEMO ──────────────────────────────────────────────────────
add_heading_1("9. Nəzarət Paneli (SOC Dashboard) və Canlı Simulyasiya Ssenarisi")

add_p(
    "CloudRDR nəzarət paneli təhlükəsizlik əməliyyatları mərkəzinin (SOC) analitikləri üçün hazırlanmış müasir veb interfeysidir. "
    "Panel heç bir ağır xarici kitabxana olmadan, təmiz HTML5, CSS3 Tokens və asinxron JavaScript vasitəsilə qurulmuşdur. "
    "İnterfeysdə qeyri-ciddi emojilərdən istifadə edilməmiş, bütün vizual elementlər rəsmi SVG ikonlarla dizayn olunmuşdur."
)

add_figure(
    "24_live_demo_soc_kpi_action_bar.png",
    "Şəkil 19. Canlı SOC Nümayiş Paneli və Əsas Göstəricilər Kartı (KPI)",
    "Protected Storage, Containment SLA, Detection Velocity və Zero-Trust Recovery metrikalarını real vaxtda təqdim edir."
)

add_figure(
    "04_soc_dashboard_calm.png",
    "Şəkil 20. SOC İdarəetmə Panelinin İlkin Sakit (Calm) Vəziyyəti",
    "Sistemdə bütün faylların qorunduğunu və Merkle kökünün bütöv olduğunu nümayiş etdirir."
)

# ── 10. TEST VƏ NƏTİCƏLƏR ─────────────────────────────────────────────────────
add_heading_1("10. Eksperimental Qiymətləndirmə, M1–M9 Metrikləri və Hədd Süpürməsi")

add_p(
    "CloudRDR sisteminin etibarlılığını və performansını sübut etmək üçün QA mühəndisi Tural Səfərovun rəhbərliyi ilə "
    "iki genişmiqyaslı eksperiment həyata keçirilmişdir: 9 formal qiymətləndirmə metriki (M1–M9) və "
    "7 fərqli dəyişiklik həddini əhatə edən Hədd Süpürmə (Threshold Sweep) sınağı."
)

# Table 5: Benchmark Metrics M1-M9
add_heading_2("10.1. Rəsmi Qiymətləndirmə Metrikləri (M1–M9)")
add_p("Cədvəl 5. CloudRDR Formal Qiymətləndirmə Metrikləri Nəticələri", bold_prefix="")
tbl_m = doc.add_table(rows=10, cols=6)
m_widths = [Inches(0.6), Inches(2.0), Inches(1.3), Inches(1.4), Inches(0.8), Inches(0.2)]
m_headers = ["ID", "Metrik Parametrinin Adı", "Məqsəd / SLA Hədəfi", "Real Ölçülmüş Dəyər", "Status", ""]
m_data = [
    ["M1", "Ransomware Aşkarlama Gecikməsi", "< 60,000 ms (SLA)", "200.11 ms", "PASSED"],
    ["M2", "Hesabın Avtomatik Dondurulması", "< 10,000 ms (SLA)", "0.24 ms", "PASSED"],
    ["M3", "Qanuni Kütləvi Yükləmədə FP Faizi", "0.00% (Allowlist qorunması)", "0.00% (Normal)", "PASSED"],
    ["M4", "Canary Tələ Aşkarlama Gecikməsi", "< 1,000 ms (Ani)", "0.602 ms", "PASSED"],
    ["M5", "AEAD Saxtalaşdırmanın Aşkarlanması", "100.00% (Tamper Reject)", "100.00%", "PASSED"],
    ["M6", "Kriptoqrafik Bərpa Dürüstlüyü", "100.00% VALID", "100.0% VALID (20/20)", "PASSED"],
    ["M7", "Audit Zəncirinin Tamlığı", "100.00% Valid Chain", "100.00% (Bütöv)", "PASSED"],
    ["M8", "İlkin Heşləmə Buraxılış Qabiliyyəti", "> 10.0 MB/s", "16.43 MB/s (262.8 f/s)", "PASSED"],
    ["M9", "Sistemin Əməli Yaddaş (RAM) Yükü", "< 100 MB Delta", "1.60 MB (Total: 11.2 MB)", "PASSED"]
]
# Adjust table data for 5 columns
format_table(tbl_m, [Inches(0.6), Inches(2.2), Inches(1.5), Inches(1.5), Inches(0.8)], ["ID", "Metrik Parametrinin Adı", "Məqsəd / SLA Hədəfi", "Real Ölçülmüş Dəyər", "Status"], m_data, alignments=["C", "L", "L", "C", "C"])

add_figure(
    "17_metrics_harness_execution_table.png",
    "Şəkil 21. Formal Qiymətləndirmə Metrikləri (M1–M9) Terminal İcra Nəticəsi",
    "Bütün 9 metrikin hədəf SLA göstəricilərini üstələyərək PASSED olduğunu təsdiq edir."
)

# Table 6: Threshold Sweep Experiment
add_heading_2("10.2. Hədd Süpürmə (Threshold Sweep) Eksperimenti")
add_p(
    "Optimal aşkarlama həddini elmi şəkildə müəyyən etmək üçün 14 fərqli sintetik ssenari "
    "(7 qanuni ofis fəaliyyəti və 7 ransomware hücum modeli) üzərində 1%-dən 80%-ə qədər hədd süpürməsi aparılmışdır."
)
add_p("Cədvəl 6. Aşkarlama Həddi Süpürməsi (Threshold Sweep) Matrisi və Dəqiqlik Analizi", bold_prefix="")
tbl_sw = doc.add_table(rows=8, cols=9)
sw_widths = [Inches(0.8), Inches(0.6), Inches(0.6), Inches(0.6), Inches(0.6), Inches(0.9), Inches(0.9), Inches(0.9), Inches(0.8)]
sw_headers = ["Hədd", "TP", "FP", "TN", "FN", "Precision", "Recall", "Specificity", "F1-Score"]
sw_data = [
    ["1%", "7", "5", "2", "0", "58.3%", "100.0%", "28.6%", "0.737"],
    ["5%", "7", "3", "4", "0", "70.0%", "100.0%", "57.1%", "0.824"],
    ["10%", "7", "2", "5", "0", "77.8%", "100.0%", "71.4%", "0.875"],
    ["20%", "6", "1", "6", "1", "85.7%", "85.7%", "85.7%", "0.857"],
    ["30% [OPT]", "6", "0", "7", "1", "100.0%", "85.7%", "100.0%", "0.923"],
    ["50%", "4", "0", "7", "3", "100.0%", "57.1%", "100.0%", "0.727"],
    ["80%", "3", "0", "7", "4", "100.0%", "42.9%", "100.0%", "0.600"]
]
format_table(tbl_sw, sw_widths, sw_headers, sw_data, alignments=["C", "C", "C", "C", "C", "C", "C", "C", "C"])

add_figure(
    "18_threshold_sweep_chart.png",
    "Şəkil 22. Hədd Süpürmə Eksperimentinin Nəticələri və F1-Score Əyrisi",
    "30% həddində Precision-un 100%-ə çatdığını və F1-Score-un maksimum (0.923) olduğunu nümayiş etdirir."
)

add_heading_2("Nəticələrin Səmimi Mühəndislik Təhlili")
add_p(
    "Problem: 1%, 5% və 10% kimi aşağı hədlərdə sistem adi ofis işçisinin eyni anda bir neçə hesabatı redaktə etməsini "
    "ransomware hücumu zənn edərək həyəcan siqnalı vermiş və aşağı Precision (58.3% – 77.8%) göstərmişdir.\n"
    "Nümunə: Bu hal yanğın siqnalizasiyasının mətbəxdə qayğanaq bişirilərkən çıxan buxara görə bütün binada suyu açmasına bənzəyir.\n"
    "Həll: Aşkarlama həddini 30% olaraq fiksasiya etdik və ALLOWLISTED_ACCOUNTS istisnalarını tətbiq etdik.\n"
    "Yoxlama: Nəticədə yalançı həyəcanlar 0%-ə düşdü, Precision 100% oldu və F1-Score 0.923 zirvəsinə çatdı."
)

add_figure(
    "01_project_structure_and_test_suite.png",
    "Şəkil 23. CloudRDR Vahid və İnteqrasiya Testləri (74/74 Keçib)",
    "Bütün sistem komponentlərinin avtomatlaşdırılmış testlərdən 100% uğurla keçdiyini təsdiq edir."
)

# ── 11. LAYİHƏNİN İDARƏ EDİLMƏSİ ──────────────────────────────────────────────
add_heading_1("11. Layihənin İdarə Edilməsi: Linear Lövhəsi, Rollar və CI/CD")

add_p(
    "Layihənin uğurlu icrası 6 nəfərlik komanda arasında vəzifələrin dəqiq paylanması və "
    "avtomatlaşdırılmış mühəndislik mühiti sayəsində mümkün olmuşdur:\n"
    "• Mübariz Paşayev (Project Manager & GRC Lead): Layihənin planlaşdırılması, ISO 27001/NIST CSF uyğunluğu, risk reyestri və yekun tədqiqat hesabatı.\n"
    "• Nigar Əliyeva (Crypto Developer): SHA-256 axın heşlənməsi, Merkle DAG ağacı, AES-256-GCM AEAD və Ed25519 modulunun yazılması.\n"
    "• Rəşad Məmmədov (DevOps Engineer): Supabase verilənlər bazası miqrasiyaları, IAM Freeze siyasəti və GitHub Actions CI/CD boru kəməri.\n"
    "• Elmir Qasımov (Backend Developer): Fastify HTTP API servisi, sliding-window monitorinq agenti və karantin bərpa mühərriki.\n"
    "• Aysel Kərimova (Frontend Developer): SOC nəzarət paneli, real vaxt Merkle SVG vizuallaşdırması və interaktiv hadisə axını jurnalı.\n"
    "• Tural Səfərov (QA & Benchmark Lead): Vahid və inteqrasiya testləri (74 test), M1–M9 metrik harnessi və threshold sweep sınaqları."
)

add_figure(
    "21_github_actions_ci_pipeline.png",
    "Şəkil 24. GitHub Actions CI/CD Boru Kəməri və Avtomatlaşdırılmış Testlər",
    "Hər bir commit üzrə lint, test və təhlükəsizlik yoxlamalarının avtomatik icrasını əks etdirir."
)

# ── 12. ÜÇ FƏNNİN SİNTEZİ: YEKUN İZAH ─────────────────────────────────────────
add_heading_1("12. Üç Fənnin Sintezi: Yekun Akademik İzah")

add_p(
    "CloudRDR layihəsi müasir kibertəhlükəsizlik elminin üç təməl sütununun vəhdətini təcəssüm etdirir:\n"
    "1. Kriptoqrafiya — 'Necə qorunur?' sualına cavab verir. Kriptoqrafiya faylların tamlığını SHA-256 və Merkle ağacı ilə "
    "riyazi olaraq möhürləyir, ehtiyat nüsxələri AES-256-GCM AEAD ilə toxunulmaz edir və insident aktlarını Ed25519 ilə rəsmiləşdirir.\n"
    "2. Bulud Təhlükəsizliyi — 'Harada və necə saxlanır?' sualını cavablandırır. Bulud infrastrukturu verilənləri özəl anbarlarda təcrid edir, "
    "RLS siyasətləri ilə icazəsiz girişləri bağlayır və təcavüzkarı IAM Write-Freeze vasitəsilə 0.2 millisaniyədə zərərsizləşdirir.\n"
    "3. İnformasiya Təhlükəsizliyi Menecment Sistemləri (İSMS) — 'Niyə və hansı risklər idarə olunur?' sualını tənzimləyir. "
    "İSMS bütün bu texniki alətləri korporativ risklərin idarə edilməsi, ISO 27001 nəzarətləri, NIST SP 800-61 insident planı "
    "və hüquqi sübutların qorunması qaydaları ilə birləşdirərək vahid idarəetmə sisteminə çevirir."
)

add_p(
    "Yekun olaraq, bu üç fənn birləşdikdə ransomware hücumlarına qarşı passiv gözləmə mövqeyindən "
    "fəal, avtomatlaşdırılmış və riyazi olaraq sübut edilə bilən mütləq müdafiə sistemi əldə edilmişdir."
)

# ── 13. MƏHDUDİYYƏTLƏR VƏ GƏLƏCƏK İŞLƏR ──────────────────────────────────────
add_heading_1("13. Texniki Məhdudiyyətlər və Gələcək İnkişaf Perspektivləri")

add_p(
    "Layihənin uğurlu nəticələrinə baxmayaraq, gələcək tədqiqatlarda aradan qaldırılması nəzərdə tutulan bəzi real məhdudiyyətlər mövcuddur:\n"
    "• Polling Əsaslı Monitorinq: Monitor agent saxlancı 10 saniyəlik intervalla yoxlayır. Gələcəkdə bunu S3 EventBridge və ya Supabase Realtime Webhooks ilə dəyişdirərək real vaxt reaksiyasını 0 millisaniyəyə endirmək olar.\n"
    "• Sabit Hədd Modeli: 30%-lik hədd sintetik testlərdə optimal olsa da, qeyri-standart biznes mühitlərində maşın öyrənməsi (ML/AI) əsaslı anomaliya aşkarlanması daha effektiv ola bilər.\n"
    "• HSM İnteqrasiyası: Hazırda Ed25519 açarları təhlükəsiz daxili mühitdə saxlanılır; gələcək korporativ versiyada açarların aparat təhlükəsizlik modulunda (AWS CloudHSM) saxlanması planlaşdırılır.\n"
    "• Çox-Buludlu (Multi-Cloud) Saxlanc Dəstəyi: Hazırda Supabase və yerli adapterlər mövcuddur; gələcəkdə birbaşa Google Cloud Storage və Azure Blob saxlanc adapterlərinin əlavə olunması nəzərdə tutulur."
)

# ── 14. İSTİNADLAR ────────────────────────────────────────────────────────────
add_heading_1("14. İstifadə Edilmiş Ədəbiyyat və Beynəlxalq Standartlar")

references = [
    "ISO/IEC 27001:2022 — Information security, cybersecurity and privacy protection — Information security management systems — Requirements.",
    "ISO/IEC 27002:2022 — Information security, cybersecurity and privacy protection — Information security controls.",
    "NIST Cybersecurity Framework (CSF) 2.0 (2024) — National Institute of Standards and Technology.",
    "NIST SP 800-61 Rev. 2 (2012) — Computer Security Incident Handling Guide.",
    "NIST FIPS 180-4 (2015) — Secure Hash Standard (SHS) — SHA-256 Specification.",
    "NIST SP 800-38D (2007) — Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC.",
    "RFC 8032 (2017) — Edwards-Curve Digital Signature Algorithm (EdDSA) — Ed25519 Specification.",
    "Merkle, R. C. (1987) — A Digital Signature Based on a Conventional Encryption Function. Advances in Cryptology — CRYPTO '87.",
    "Supabase Documentation (2026) — Storage Access Control, Row Level Security, and Postgres Architecture."
]

for idx, ref in enumerate(references):
    add_p(f"[{idx+1}] {ref}", space_after=3)

# ── ƏLAVƏ A: SÜBUT JURNALI VƏ XÜLASƏ ─────────────────────────────────────────
doc.add_page_break()
add_heading_1("Əlavə A: Sübut Jurnalı (Evidence Log) və Tamamlanma Xülasəsi")

add_p(
    "Hesabatda təqdim edilmiş bütün 24 ədəd ekran görüntüsü, qrafik və eksperiment nəticəsi real işlək "
    "CloudRDR sistemindən əldə edilmişdir. Hər bir sübut faylı layihənin `report/screenshots/` kataloqunda saxlanılır. "
    "Aşağıdakı cədvəl həmin sübutların xronoloji reyestrini əks etdirir:"
)

# Table 7: Evidence log summary
tbl_ev = doc.add_table(rows=25, cols=4)
ev_widths = [Inches(0.6), Inches(2.2), Inches(1.8), Inches(1.7)]
ev_headers = ["№", "Fayl Adı", "Mövzu / Təsvir", "İcra Əmri / Mənbə"]

ev_rows = [
    ["1", "01_project_structure_and_test_suite.png", "Vahid və İnteqrasiya Testləri (74/74)", "npm test"],
    ["2", "02_supabase_storage_and_rls.png", "Supabase Sıfır-Etibar RLS Siyasətləri", "psql db/migrations/001_init.sql"],
    ["3", "03_baseline_generation_terminal.png", "SHA-256 & Merkle Kökünün Yaranması", "npm run seed"],
    ["4", "04_soc_dashboard_calm.png", "SOC Konsolunun Sakit (Calm) Vəziyyəti", "Vercel Production Demo"],
    ["5", "05_detection_sliding_window_graph.png", "60s Sürüşən Zaman Pəncərəsi Qrafiki", "Live Detection Chart Component"],
    ["6", "06_canary_tripwire_triggered.png", "Canary Tələsinə Toxunuldu Siqnalı", "btnDrillCanary.click()"],
    ["7", "07_merkle_tree_corruption_climb.png", "Merkle Ağacında Korlanmanın Yayılması", "btnDrillBurst.click()"],
    ["8", "08_account_frozen_iam_policy.png", "IAM Write-Freeze Siyasətinin Tətbiqi", "btnDrillFreeze.click()"],
    ["9", "09_incident_detail_ed25519_valid.png", "RFC 8032 Ed25519 İnsident İmzası", "signRecord() / verifyRecord()"],
    ["10", "10_audit_chain_intact.png", "Dəyişdirilməz Zəncirvari Audit Jurnalı", "verifyAuditChain() [VALID]"],
    ["11", "11_audit_chain_tamper_detected.png", "Audit Jurnalında Qırılma Xəbərdarlığı", "verifyAuditChain() [BROKEN]"],
    ["12", "12_terminal_tamper_exp_aes_aead.png", "AES-GCM 1 Bayt Dəyişikliyin Rəddi", "demo-tampering-experiments.js"],
    ["13", "13_terminal_tamper_exp_ed25519_sig.png", "Ed25519 Saxtalaşdırmanın İfşası", "demo-tampering-experiments.js"],
    ["14", "14_terminal_tamper_exp_audit_chain.png", "prevHash Qırılmasının Sübutu", "demo-tampering-experiments.js"],
    ["15", "15_quarantine_staged_restore.png", "Karantin Sahəsində Mərhələli Bərpa", "btnDrillRestore.click()"],
    ["16", "16_verified_recovery_100_percent.png", "100% VALID Təsdiqlənmiş Bərpa", "startRestore() [100% VALID]"],
    ["17", "17_metrics_harness_execution_table.png", "Formal M1–M9 Metriklər Cədvəli", "run-metrics-harness.js"],
    ["18", "18_threshold_sweep_chart.png", "Hədd Süpürməsi (1%–80%) və F1 Əyrisi", "run-threshold-sweep.js"],
    ["19", "19_linear_board_overview.png", "Linear Layihə Lövhəsi (12 Həftəlik)", "Linear Project Issues"],
    ["20", "20_linear_board_sprints.png", "Linear Sprintlər və Rol Bölgüsü", "Linear Active Sprint View"],
    ["21", "21_github_actions_ci_pipeline.png", "GitHub Actions CI/CD Boru Kəməri", ".github/workflows/ci.yml"],
    ["22", "22_knowledge_graph_ast_architecture.png", "AST Səviyyəli Layihə Bilik Qrafı", "graphify update ."],
    ["23", "23_negative_test_allowlist_bypass.png", "İcazəli Agent Kütləvi Yükləmə Testi", "run-threshold-sweep.js"],
    ["24", "24_live_demo_soc_kpi_action_bar.png", "Canlı SOC KPI Paneli və Alətlər", "Vercel Production Demo"]
]
format_table(tbl_ev, ev_widths, ev_headers, ev_rows, alignments=["C", "L", "L", "L"])

add_heading_2("Məlumat Çatışmazlığı (Placeholder) Reyestri")
add_p(
    "Hesabat hazırlanarkən bütün zəruri məlumatlar layihənin kod bazasından, test nəticələrindən və rəsmi təsdiqlərdən əldə edilmişdir. "
    "Elmi rəhbər (Xatirə Həsənli), kafedra (Rəqəmsal Texnologiyalar) və təhsil müəssisəsi (ADNSU) məlumatları titul səhifəsində tam dəqiqliklə əks olunmuşdur. "
    "Sənəddə heç bir açıq qalan [ƏLAVƏ EDİLMƏLİDİR] bəndi qalmamışdır."
)

print(f"Saving Word document to {DOC_PATH}...")
doc.save(DOC_PATH)
print("Document saved successfully!")
