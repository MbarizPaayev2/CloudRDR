# CloudRDR — Evidence Log (Sübutların Qeydiyyat Jurnalı)

**Layihə:** CloudRDR (Cloud Ransomware Detection & Recovery)  
**Müəllif / Tələbə:** Mübariz Paşayev (Project Manager & GRC Lead)  
**Elmi Rəhbər / Müəllim:** Xatirə Həsənli  
**Kafedra / Təhsil Müəssisəsi:** ADNSU, Rəqəmsal Texnologiyalar  
**Tarix:** Oktyabr 2026  
**Status:** 100% Real Test Nəticələri və Canlı Sistem Skrinşotları  

---

## Sübutların Qeydiyyat Cədvəli

| Fayl Adı | Təsvir (Nəyi göstərir) | Hesabat Bölməsi | Dəqiq Əmr / İcra Olunan Əməliyyat | Vaxt Damğası (UTC/Lokal) |
|---|---|---|---|---|
| `01_project_structure_and_test_suite.png` | Layihənin qovluq strukturu və 74/74 vahid və inteqrasiya testlərinin uğurla keçməsi | Bölmə 10: Test və Nəticələr | `npm test` | 2026-10-14 23:56:39 (+04:00) |
| `02_supabase_storage_and_rls.png` | Supabase / Verilənlər bazası strukturu və bütün cədvəllərdə aktiv olan Zero-Trust Row Level Security (RLS) `deny_all` siyasətləri | Bölmə 5: Bulud Təhlükəsizliyi | `psql -f db/migrations/001_init.sql` | 2026-10-14 20:05:12 (UTC) |
| `03_baseline_generation_terminal.png` | 50 fayl üçün SHA-256 axın heşlənməsi, Merkle kökünün hesablanması və soyuq ehtiyat nüsxənin yaradılması | Bölmə 6: Kriptoqrafiya | `npm run seed` (node scripts/seed-baseline.js) | 2026-10-14 20:07:34 (UTC) |
| `04_soc_dashboard_calm.png` | SOC İdarəetmə Panelinin sakit (Calm) vəziyyəti: 100% bütövlük, 0% dəyişiklik sürəti və Merkle kökü | Bölmə 9: Dashboard və Demo | Brauzer açılışı (`https://midproject-beta.vercel.app/demo/index.html`) | 2026-10-14 20:12:25 (UTC) |
| `05_detection_sliding_window_graph.png` | 60 saniyəlik sürüşən zaman pəncərəsi (Sliding Window), dəyişiklik sürətinin analitik qrafiki və aşkarlama hədləri | Bölmə 7: Backend və Aşkarlama | Live Chart Canvas komponentinin real vaxt telemetriyası | 2026-10-14 20:13:42 (UTC) |
| `06_canary_tripwire_triggered.png` | Tələ faylına (`canary.docx`) toxunulduqda dərhal kritik Ransomware siqnalının və həyəcan bildirişinin verilməsi | Bölmə 7: Backend və Aşkarlama | `btnDrillCanary.click()` tələ simulyasiyası | 2026-10-14 20:12:28 (UTC) |
| `07_merkle_tree_corruption_climb.png` | Merkle ağacında korlanmış yarpaqların kökə qədər qırmızı rəngdə yayılması və bütövlüyün pozulması | Bölmə 6: Kriptoqrafiya | `btnDrillBurst.click()` (45% şifrələmə partlayışı) | 2026-10-15 00:13:06 (+04:00) |
| `08_account_frozen_iam_policy.png` | Təcavüzkar hesab üzərində avtomatik IAM Write-Freeze siyasətinin tətbiqi və yazma hüquqlarının dondurulması | Bölmə 5: Bulud Təhlükəsizliyi | `btnDrillFreeze.click()` (SLA: < 4 saniyə) | 2026-10-14 20:12:30 (UTC) |
| `09_incident_detail_ed25519_valid.png` | İnsident kartı: RFC 8032 Ed25519 rəqəmsal imzası, ictimai açar ID-si və məhkəmə sübutu təsdiqi | Bölmə 6: Kriptoqrafiya | `signRecord()` və `verifyRecord()` icrası | 2026-10-15 00:13:08 (+04:00) |
| `10_audit_chain_intact.png` | Dəyişdirilməz, zəncirvari heşlənmiş audit jurnalı: Genesis blokundan son bloka qədər bütün keçidlərin bütövlüyü | Bölmə 6: Kriptoqrafiya | `verifyAuditChain(defaultAuditLog.getEntries())` | 2026-10-14 20:12:31 (UTC) |
| `11_audit_chain_tamper_detected.png` | Audit jurnalında 1 bayt saxtalaşdırıldıqda `prevHash` zəncirinin dərhal qırılması və xəbərdarlıq | Bölmə 6: Kriptoqrafiya | Test loq modifikasiyası və `verifyAuditChain()` yoxlanışı | 2026-10-14 20:12:31 (UTC) |
| `12_terminal_tamper_exp_aes_aead.png` | Terminal Eksperiment 1: AES-256-GCM AEAD şifrəli mətnində 1 bit dəyişdirildikdə autentifikasiya teqinin rədd edilməsi | Bölmə 6: Kriptoqrafiya | `node scripts/demo-tampering-experiments.js` (Eksperiment 1) | 2026-10-14 20:09:11 (UTC) |
| `13_terminal_tamper_exp_ed25519_sig.png` | Terminal Eksperiment 2: İnsident qeydində status dəyişdirildikdə Ed25519 rəqəmsal imzasının ləğv edilməsi | Bölmə 6: Kriptoqrafiya | `node scripts/demo-tampering-experiments.js` (Eksperiment 2) | 2026-10-14 20:09:11 (UTC) |
| `14_terminal_tamper_exp_audit_chain.png` | Terminal Eksperiment 3: Audit jurnalı sətirində gizli dəyişiklik zamanı SHA-256 heş uyğunsuzluğunun aşkarlanması | Bölmə 6: Kriptoqrafiya | `node scripts/demo-tampering-experiments.js` (Eksperiment 3) | 2026-10-14 20:09:11 (UTC) |
| `15_quarantine_staged_restore.png` | Təhlükəsiz karantin sahəsində bərpa olunan faylların ilkin SHA-256 yoxlanışı və mərhələli bərpa | Bölmə 8: ISMS / Fəlakətdən Bərpa | `btnDrillRestore.click()` ilkin karantin mərhələsi | 2026-10-14 20:12:30 (UTC) |
| `16_verified_recovery_100_percent.png` | 100% VALID təsdiqlənmiş bərpa: Bütün faylların ilkin Merkle kökü ilə 100% bit-bərabərliyinin təsdiqi | Bölmə 8 & Bölmə 9: Demo | Canlı bərpa təsdiqi və `resolved` statusu | 2026-10-14 20:12:31 (UTC) |
| `17_metrics_harness_execution_table.png` | Formal qiymətləndirmə sistemi (M1–M9) rəsmi icra cədvəli və SLA hədəflərinin 100% keçməsi | Bölmə 10: Test və Nəticələr | `node scripts/run-metrics-harness.js` | 2026-10-14 20:10:43 (UTC) |
| `18_threshold_sweep_chart.png` | Aşkarlama həddi süpürməsi (1%–80%): Precision, Recall, Specificity və F1-Score matrisi | Bölmə 10: Test və Nəticələr | `node scripts/run-threshold-sweep.js` | 2026-10-14 19:59:45 (UTC) |
| `19_linear_board_overview.png` | Linear layihə idarəetmə lövhəsi: 12 həftəlik plan, sprintlər və 6 fərqli komanda rolunun tapşırıqları | Bölmə 11: Layihənin İdarə Olunması | Linear Issues Dashboard ekran görüntüsü | 2026-10-14 23:18:00 (+04:00) |
| `20_linear_board_sprints.png` | Linear sprint bölgüsü: GRC, Kriptoqrafiya, DevOps və Frontend tapşırıqlarının statusları | Bölmə 11: Layihənin İdarə Olunması | Linear Active Sprint View ekran görüntüsü | 2026-10-14 23:18:00 (+04:00) |
| `21_github_actions_ci_pipeline.png` | GitHub Actions CI/CD boru kəməri: Avtomatlaşdırılmış lint, təhlükəsizlik analizi və testlər | Bölmə 11: Layihənin İdarə Olunması | `.github/workflows/ci.yml` iş icrası | 2026-10-14 20:12:31 (UTC) |
| `22_knowledge_graph_ast_architecture.png` | Layihənin Graphify bilik qrafı: Komponentlərin AST səviyyəsində qarşılıqlı əlaqələri | Bölmə 4: Sistem Arxitekturu | `graphify update .` və bilik qrafı xəritəsi | 2026-10-14 23:14:00 (+04:00) |
| `23_negative_test_allowlist_bypass.png` | Neqativ testlər: İcazəli ehtiyat nüsxə kütləvi yazılışının qorunması və yalançı həyəcanın (FP) 0% olması | Bölmə 10: Test və Nəticələr | `node scripts/run-threshold-sweep.js` allowlist testi | 2026-10-14 20:12:31 (UTC) |
| `24_live_demo_soc_kpi_action_bar.png` | Canlı SOC Nümayiş Paneli: 4 əsas KPI göstəricisi, simulyasiya idarəetmə paneli və rəqəmsal sübut zənciri | Bölmə 9: Dashboard və Demo | Vercel Production (`https://midproject-beta.vercel.app/demo/`) | 2026-10-14 20:12:25 (UTC) |

---
*Qeyd: Bütün sübut faylları layihənin `report/screenshots/` qovluğunda saxlanılır və hesabat sənədinə yüksək keyfiyyətli təsvirlər kimi inteqrasiya edilmişdir.*
