-- Seed: 16 projects from original project-tracker.html
-- Run AFTER schema.sql

INSERT INTO projects (pid, company, name, status, contract_start, billing_freq, deadline, handover_status, issues) VALUES
  ('24-64-005', 'PT Mitra Transaksi Indonesia',       'Pengadaan Middleware dan Database Monitoring & Maintenance Managed Service',               'Completed',                  NULL, NULL, '2026-12-31', 'Completed',          ''),
  ('22-64-110', 'PT Pertamina Bina Medika IHC',       'Sewa Pakai SD-WAN di PT Pertamina Bina Medika IHC',                                       'Completed',                  NULL, NULL, '2026-12-31', 'Completed',          ''),
  ('25-64-075', 'PT Pertamina Bina Medika IHC',       'Pertamedika Firewall BIH, DC, DRC',                                                       'Completed',                  NULL, NULL, '2026-12-31', 'Completed',          ''),
  ('24-64-065', 'Pertamedika Bali',                   'Pengadaan Sewa Pakai Server Operasional Bali International Hospital',                      'Completed',                  NULL, NULL, '2026-12-31', 'Completed',          ''),
  ('25-63-073', 'Permata Bank',                       'Pengadaan EM Oracle Tools Monitoring',                                                     'Completed',                  NULL, NULL, '2026-12-31', 'Completed',          ''),
  ('23-62-012', 'PT. Kereta Api Indonesia (Persero)', 'Oracle Exadata Cloud At Customer',                                                         'On Track',                   NULL, NULL, '2026-12-31', 'Not Started',        ''),
  ('26-62-099', 'PT. Kereta Api Indonesia (Persero)', 'Pengadaan Infrastruktur Oracle ExaCC utk Implementasi HA DB Ticketing',                    'In Progress - Minor Issues', NULL, NULL, '2026-12-31', 'Transfer Knowledge', 'Sedang dalam fase Transfer Knowledge'),
  ('25-62-086', 'PT. Kereta Api Indonesia (Persero)', 'Renewal Annual Technical Support MySQL Enterprise Edition / Renewal Subscription Oracle MySQL PT KAI Oktober 2025-2026', 'On Track', NULL, NULL, '2026-12-31', 'Not Started', ''),
  ('25-64-062', 'BPJS Ketenagakerjaan',               'Renewal Lisensi DB',                                                                       'On Track',                   NULL, NULL, '2026-12-31', 'Not Started',        ''),
  ('25-64-082', 'BPJS Ketenagakerjaan',               'ATS Media Backup (PM, CM) Commvault',                                                      'Completed',                  NULL, NULL, '2026-12-31', 'Completed',          ''),
  ('25-64-051', 'BPJS Ketenagakerjaan',               'Penyediaan Media Backup',                                                                  'On Track',                   NULL, NULL, '2026-12-31', 'Not Started',        ''),
  ('26-62-002', 'Prosia - Bea Cukai',                 'Renewal ATS Oracle',                                                                       'Completed',                  NULL, NULL, '2026-12-31', 'Completed',          ''),
  ('25-62-061', 'Perumda PAM JAYA',                   'Renewal ATS Oracle PAM Jaya',                                                              'On Track',                   NULL, NULL, '2026-12-31', 'Not Started',        ''),
  ('25-62-047', 'Perumda PAM JAYA',                   'OCS (Oracle Consulting Services)',                                                          'Completed',                  NULL, NULL, '2026-12-31', 'Completed',          ''),
  ('25-62-040', 'Perumda PAM JAYA',                   'Pengadaan Billing System Perumda PAM JAYA',                                                'Not Started',                NULL, NULL, '2026-12-31', 'Not Started',        ''),
  ('26-62-015', 'Petronas (PC Ketapang II Ltd)',       'Provision of FortiGate Maintenance and Support Services',                                  'Completed',                  NULL, NULL, '2026-12-31', 'Completed',          '')
;

-- BAST periods for projects whose original bastSteps were all completed
-- (projects with handover_status = 'Completed' had all 8 steps true in the original HTML)
-- We insert a single custom period representing the completed project handover.
INSERT INTO bast_periods (project_id, label, steps, is_custom, sort_order)
SELECT id,
       'Project Handover',
       ARRAY[true,true,true,true,true,true,true,true],
       true,
       0
FROM projects
WHERE handover_status = 'Completed';
