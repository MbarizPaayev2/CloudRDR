#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/build_cloud_security_docx.py
Compiles report/Cloud_Security_Report.docx and PDF for Cloud Security.
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

DOC_PATH = os.path.abspath("report/Cloud_Security_Report.docx")
IMG_DIR = os.path.abspath("report/screenshots")

doc = docx.Document()

for section in doc.sections:
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.left_margin = Inches(1.18)
    section.right_margin = Inches(0.79)
    section.top_margin = Inches(0.79)
    section.bottom_margin = Inches(0.79)
    
    footer = section.footer
    f_p = footer.paragraphs[0]
    f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    f_run = f_p.add_run("CloudRDR — Bulud Təhlükəsizliyi Hesabatı | ADNSU | 2026")
    f_run.font.name = "Calibri"
    f_run.font.size = Pt(8.5)
    f_run.font.color.rgb = RGBColor(140, 140, 140)

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
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(15)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42)
    return p

def add_heading_2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(12.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 41, 59)
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

def add_figure(img_filename, caption_text, notice_text, max_width=5.8):
    img_path = os.path.join(IMG_DIR, img_filename)
    if not os.path.exists(img_path):
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

# Titul
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
p_div.paragraph_format.space_before = Pt(50)
p_div.paragraph_format.space_after = Pt(10)
r_proj = p_div.add_run("FƏNN TƏDQİQAT VƏ MÜHƏNDİSLİK HESABATI\n")
r_proj.font.name = "Calibri"
r_proj.font.size = Pt(13)
r_proj.font.bold = True
r_proj.font.color.rgb = RGBColor(14, 116, 144)

r_main = p_div.add_run("Bulud Texnologiyalarında Təhlükəsizlik: CloudRDR Mühitində Bulud Saxlancının Mühafizəsi, Sıfır-Etibar (Zero-Trust) RLS Sxemi və IAM Avtomatik Dondurulması")
r_main.font.name = "Calibri"
r_main.font.size = Pt(18)
r_main.font.bold = True
r_main.font.color.rgb = RGBColor(15, 23, 42)

p_subj = doc.add_paragraph()
p_subj.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_subj.paragraph_format.space_before = Pt(15)
p_subj.paragraph_format.space_after = Pt(40)
r_sub = p_subj.add_run("Tədris Fənni: Bulud Texnologiyalarında Təhlükəsizlik (Cloud Security)\nİxtisas: İnformasiya Təhlükəsizliyi")
r_sub.font.name = "Calibri"
r_sub.font.size = Pt(11)
r_sub.font.italic = True
r_sub.font.color.rgb = RGBColor(51, 65, 85)

tbl_meta = doc.add_table(rows=4, cols=2)
tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
meta_widths = [Inches(3.1), Inches(3.2)]
meta_data = [
    ["Tələbə / Layihə Rəhbəri:", "Mübariz Paşayev (Project Manager & DevOps Lead)"],
    ["Elmi Rəhbər / Fənn Müəllimi:", "Xatirə Həsənli (Rəqəmsal Texnologiyalar Kafedrası)"],
    ["İcra Texnologiyaları:", "Supabase Cloud, AWS S3 API, PostgreSQL 15, Python Flask, Docker"],
    ["Təhvil Tarixi və Məkan:", "Noyabr 2026, Bakı şəhəri, Azərbaycan"]
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

# Məzmun
add_heading_1("1. Fənnin Məqsədi və Tədqiqatın Xarakteri")
add_p(
    "Müasir şirkətlərin məlumat bazalarını və fayl arxivlərini on-premise serverlərdən bulud anbarlarına "
    "(Amazon S3, Supabase Storage, Google Cloud Storage, Azure Blob) köçürməsi onların əlçatanlığını və elastikliyini "
    "misilsiz dərəcədə artırmışdır. Lakin bu transformasiya nəticəsində ənənəvi perimetr təhlükəsizliyi (firewall, daxili şəbəkə seqmentasiyası) "
    "öz effektivliyini itirmişdir. Hücumçular artıq şirkətin daxili ofis şəbəkəsini deyil, birbaşa bulud API açarlarını, IAM rollarını "
    "və açıq qalan bulud anbarlarını (public buckets) hədəfə alırlar."
)
add_p(
    "Bu xüsusi tədqiqat hesabatının predmeti — bulud infrastrukturunda icarəyə götürülmüş obyekt anbarında (Supabase Object Storage) "
    "baş verən qanunsuz kütləvi manipulyasiyaları (Ransomware şifrələməsini) mikrosaniyələr ərzində aşkar edən, təcavüzkarın hüquqlarını "
    "proqram təminatı vasitəsilə dərhal donduran (IAM Write-Freeze) və məlumatları sıfır-etibar (Zero-Trust) əsasında bərpa edən "
    "CloudRDR sisteminin bulud arxitekturasını hərtərəfli təhlil etməkdir."
)

add_heading_1("2. Bulud Hesablama Modelləri və Birgə Məsuliyyət (Shared Responsibility)")
add_p(
    "NIST SP 800-145 standartına əsasən bulud hesablama xidmətləri üç əsas xidmət modelinə (IaaS, PaaS, SaaS) bölünür. "
    "Hər bir modeldə təhlükəsizlik vəzifələri bulud xidmət təminatçısı (CSP) ilə müştəri arasında bölüşdürülür."
)

tbl_cloud = doc.add_table(rows=4, cols=4)
cloud_headers = ["Xidmət Modeli", "Provayderin Nəzarətində", "Müştərinin Nəzarətində", "CloudRDR Layihəsində Tətbiqi"]
cloud_widths = [Inches(1.2), Inches(1.8), Inches(1.8), Inches(1.5)]
cloud_data = [
    ["IaaS (İnfrastruktur)", "Fiziki avadanlıq, şəbəkə, serverlər, virtuallaşdırma", "ƏS, şəbəkə konfiqurasiyası, verilənlər bazası, tətbiq kodu", "Yerli simulyasiya və VM mühiti"],
    ["PaaS / BaaS (Platforma)", "ƏS, verilənlər bazası mühərriki, saxlanc infrastrukturu", "Məlumatların şifrələnməsi, RLS qaydaları, istifadəçi autentifikasiyası, tətbiq loqikası", "Supabase Postgres & Storage (Əsas platforma)"],
    ["SaaS (Proqram təminatı)", "Bütün infrastruktur, verilənlər bazası və proqram təminatı", "Yalnız son istifadəçi giriş hüquqları və konfiqurasiya", "Vercel Production Hosting & Linear"]
]
format_table(tbl_cloud, cloud_widths, cloud_headers, cloud_data, alignments=["C", "L", "L", "L"])

add_heading_1("3. Supabase Cloud İnfrastrukturu və Sıfır-Etibar (Zero-Trust) RLS Arxitekturası")
add_p(
    "CloudRDR platforması bulud verilənlər bazası və obyekt anbarı kimi Supabase Cloud (Postgres 15 + AWS S3-uyğun saxlanc) üzərində dizayn olunmuşdur. "
    "Bütün daxili cədvəllərdə Row Level Security (RLS) məcburiləşdirilmiş və anonim daxilolmalar üçün qapadılmışdır."
)
add_figure("02_supabase_storage_and_rls.png", "Şəkil 1. Supabase Sıfır-Etibar (Zero-Trust) RLS Siyasətləri", "Daxili cədvəllərdə anon və authenticated rolları üçün icazələrin qapadıldığını nümayiş etdirir.")

add_heading_1("4. Avtomatlaşdırılmış IAM Write-Freeze Siyasəti və 0.24 ms Reaksiya SLA-sı")
add_p(
    "Ransomware aşkarlanandan dərhal sonra təcavüzkarın hesabına IAM Deny-All Write siyasəti tətbiq olunur. "
    "Bu siyasət oxuma hüququnu qüvvədə saxlayır, lakin bütün PutObject və DeleteObject əməliyyatlarını bloklayır. "
    "SLA hədəfi < 10 saniyə olduğu halda, sistemimiz bu reaksiyanı cəmi 0.24 millisaniyəyə icra edir."
)
add_figure("08_account_frozen_iam_policy.png", "Şəkil 2. Avtomatlaşdırılmış IAM Dondurulması və Bloklama Xəbərdarlığı", "Təhlükə qeydə alındıqdan sonra yazma hüquqlarının dərhal məhdudlaşdırıldığını təsdiq edir.")

add_heading_1("5. Müştəri Tərəfli Şifrələmə və Karantin Bərpası")
add_p(
    "Məlumatlar bulud provayderinə göndərilməzdən əvvəl yerli Python mühərrikində AES-256-GCM AEAD ilə şifrələnir. "
    "Hücum baş verdikdə bərpa olunan fayllar birbaşa canlı anbara deyil, əvvəlcə təcrid olunmuş karantin sahəsinə çıxarılır "
    "və Merkle kökü ilə 100% təsdiqləndikdən sonra canlı anbara qaytarılır."
)
add_figure("15_quarantine_staged_restore.png", "Şəkil 3. İki-Mərhələli Təhlükəsiz Karantin Bərpası", "Faylların təcrid olunmuş karantin sahəsinə çıxarılaraq yoxlandığını nümayiş etdirir.")
add_figure("16_verified_recovery_100_percent.png", "Şəkil 4. 100% Təsdiqlənmiş Kriptoqrafik Bərpa", "Bütün 20 faylın VALID statusu aldığını və Merkle kökünün ilkin vəziyyətlə bərabərliyini əks etdirir.")

add_heading_1("6. Bulud Təhlükəsizliyi Metrikləri və Ölçmə Nəticələri")
tbl_m = doc.add_table(rows=6, cols=4)
m_headers = ["Qiymətləndirilən Göstərici", "Standart / Gözlənilən Hədəf", "Real Ölçülmüş Nəticə", "Nəticə"]
m_widths = [Inches(2.5), Inches(1.8), Inches(1.8), Inches(1.0)]
m_data = [
    ["IAM Dondurma Reaksiya Vaxtı (Freeze SLA)", "< 10,000 ms", "0.24 ms", "PASSED"],
    ["Canary Tələsinin Aşkarlanma Müddəti", "< 1,000 ms", "0.602 ms", "PASSED"],
    ["Qanuni Bulud Əməliyyatında Yalançı Həyəcan", "0.00%", "0.00%", "PASSED"],
    ["Bulud Bərpasında Fayl Tamlığı (Integrity)", "100.00%", "100.00% (20/20 VALID)", "PASSED"],
    ["Bulud Saxlancına İlkin Heşləmə Buraxılışı", "> 10 MB/s", "16.43 MB/s (262 f/s)", "PASSED"]
]
format_table(tbl_m, m_widths, m_headers, m_data, alignments=["L", "C", "C", "C"])

add_heading_1("7. Ədəbiyyat Siyahısı")
refs = [
    "NIST SP 800-145 (2011) — The NIST Definition of Cloud Computing.",
    "NIST SP 800-210 (2020) — General Access Control Guidance for Cloud Systems.",
    "ISO/IEC 27017:2015 — Information security controls for cloud services.",
    "Cloud Security Alliance (CSA) (2023) — Cloud Controls Matrix (CCM) v4.0.",
    "AWS Whitepaper (2024) — AWS Well-Architected Framework: Security Pillar."
]
for idx, r_item in enumerate(refs):
    add_p(f"[{idx+1}] {r_item}", space_after=3)

doc.save(DOC_PATH)
print(f"Cloud Security DOCX saved to {DOC_PATH}")
