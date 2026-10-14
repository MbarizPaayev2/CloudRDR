#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_docx_report.py
Generates the comprehensive academic Word Document report (.docx) for CloudRDR.
Adheres strictly to the user requirements, including:
- A4 page setup (3cm left, 2cm others)
- Custom styles, line spacing 1.15, body 12pt
- Professional tables with header shading and borders
- Callout boxes with light grey shading and borders
- 24 numbered screenshots with captions and observation sentences
- Micro-structure: Nə edir / Necə etdim / Yoxla / Gözlənilən nəticə
- "Qısa: nə etdim" boxes
- Problem -> Nümunə -> Həll -> Yoxlama flow
- 3500 - 5000 words of authentic, exhaustive Azerbaijani text
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

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
    
    # Configure footer page numbering
    footer = section.footer
    f_p = footer.paragraphs[0]
    f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    f_run = f_p.add_run("CloudRDR — Yekun Tədqiqat Hesabatı | Səhifə ")
    f_run.font.name = "Calibri"
    f_run.font.size = Pt(9)
    f_run.font.color.rgb = RGBColor(120, 120, 120)

# ── 2. Helper Functions for Formatting ─────────────────────────────────────────
def set_cell_background(cell, hex_color):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
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
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
    return p

def add_heading_2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(13.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_heading_3(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_body_p(text, bold_prefix="", space_after=5):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(space_after)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(11.5)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    r = p.add_run(text)
    r.font.name = "Calibri"
    r.font.size = Pt(11.5)
    r.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_callout(purpose_text, how_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.3)
    set_cell_background(cell, "F1F5F9") # slate 100
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(3)
    
    r_title = p.add_run("Qısa: nə etdim\n")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(11)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(14, 116, 144) # cyan 700
    
    r_m = p.add_run("Məqsəd: ")
    r_m.font.bold = True
    p.add_run(purpose_text + "\n")
    
    r_n = p.add_run("Necə etdim: ")
    r_n.font.bold = True
    p.add_run(how_text)
    
    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(4)

def add_code_block(code_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.3)
    set_cell_background(cell, "1E293B") # slate 800
    set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.05
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(code_text)
    r.font.name = "Consolas"
    r.font.size = Pt(9.5)
    r.font.color.rgb = RGBColor(241, 245, 249) # white/slate
    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(4)

def add_figure(img_filename, caption_text, notice_text, max_width=6.0):
    img_path = os.path.join(IMG_DIR, img_filename)
    if not os.path.exists(img_path):
        print(f"Warning: Image {img_path} not found.")
        return
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(8)
    p_img.paragraph_format.space_after = Pt(3)
    p_img.paragraph_format.keep_with_next = True
    
    run_img = p_img.add_run()
    run_img.add_picture(img_path, width=Inches(max_width))
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_after = Pt(8)
    
    r_cap = p_cap.add_run(caption_text + " — ")
    r_cap.font.name = "Calibri"
    r_cap.font.size = Pt(10)
    r_cap.font.bold = True
    r_cap.font.color.rgb = RGBColor(51, 65, 85)
    
    r_not = p_cap.add_run(notice_text)
    r_not.font.name = "Calibri"
    r_not.font.size = Pt(10)
    r_not.font.italic = True
    r_not.font.color.rgb = RGBColor(100, 116, 139)

def format_table(tbl, col_widths, headers, data, alignments=None):
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Format header row
    hdr_cells = tbl.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "0F172A") # slate 900
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if (alignments and alignments[i] == "C") else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(title)
        r.font.name = "Calibri"
        r.font.size = Pt(10)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
    
    # Data rows
    for row_idx, row_data in enumerate(data):
        row_cells = tbl.rows[row_idx + 1].cells
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, cell_value in enumerate(row_data):
            row_cells[col_idx].width = col_widths[col_idx]
            set_cell_background(row_cells[col_idx], bg_color)
            set_cell_margins(row_cells[col_idx], top=80, bottom=80, left=120, right=120)
            p = row_cells[col_idx].paragraphs[0]
            if alignments and alignments[col_idx] == "C":
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif alignments and alignments[col_idx] == "R":
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(str(cell_value))
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(30, 41, 59)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(6)

print("Starting document content compilation...")
EOF
