# CloudRDR — Rəsmi Tədqiqat və Mühəndislik Hesabatları Portalı

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
