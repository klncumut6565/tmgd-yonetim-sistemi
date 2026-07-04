-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 008
-- ADR UN NUMARALARI VERİTABANI + RLS
-- =====================================================================
-- adr_un_numbers tablosuna en yaygın kullanılan UN numaraları eklenir.
-- Türkiye'de tehlikeli madde taşımacılığında sık karşılaşılan maddeler
-- öncelikli olarak seçilmiştir (yakıtlar, LPG, asitler, bazlar, boyalar,
-- patlayıcılar, gazlar, çözücüler, gübreler, biyolojik maddeler vb.)
--
-- transport_category: ADR 1.1.3.6 muafiyet hesabında kullanılan kategori
--   1 → çarpan 50 kg/L
--   2 → çarpan 333 kg/L
--   3 → çarpan 1000 kg/L
--   4 → her miktarda muafiyet
--   (boş) → muafiyetten yararlanamaz
--
-- KULLANIM: Supabase SQL Editor → tamamını yapıştır → RUN (Idempotent)
-- =====================================================================

-- RLS (herkes okuyabilir, yalnızca admin yazabilir)
alter table public.adr_un_numbers enable row level security;

drop policy if exists adr_un_select on public.adr_un_numbers;
create policy adr_un_select on public.adr_un_numbers for select using (true);

drop policy if exists adr_un_write on public.adr_un_numbers;
create policy adr_un_write on public.adr_un_numbers for all using (public.is_admin());

alter table public.adr_synonyms enable row level security;
drop policy if exists adr_syn_select on public.adr_synonyms;
create policy adr_syn_select on public.adr_synonyms for select using (true);

-- =====================================================================
-- SEED VERİSİ — En yaygın UN numaraları
-- =====================================================================
insert into public.adr_un_numbers
  (un_number, proper_shipping_name, class, classification_code,
   packing_group, tunnel_code, hazard_no, labels,
   transport_category, limited_quantity, excepted_quantity)
values

-- ── SINIF 1 — Patlayıcılar ──────────────────────────────────────────
('0004','AMONYUM PİKRAT, kuru veya %10'dan az su içeren','1','1.1D','II','B','1','1.1D','',        'LQ0','E0'),
('0012','MERMI, küçük kollu ile',                         '1','1.4S','II','E','1.4','1.4S','4',    'LQ0','E0'),
('0028','KARABARUTu, preslenmiş veya pelet halinde',       '1','1.3C','II','B','1','1.3C','',       'LQ0','E0'),
('0065','KORDEL ateşleyici, esneksiz',                    '1','1.1D','II','B','1','1.1D','',       'LQ0','E0'),
('0070','MERMİ kovanı, boş, ateşlenmiş',                  '1','1.4S','II','E','1.4','1.4S','4',   'LQ0','E0'),

-- ── SINIF 2 — Gazlar ────────────────────────────────────────────────
('1001','ASETİLEN, çözünmüş',                             '2','2.1','','B','239','2.1','',         'LQ0','E0'),
('1002','HAVA, sıkıştırılmış',                            '2','2.2','','E','20','2.2','3',         'LQ1','E1'),
('1005','AMONYAK, susuz',                                 '2','2.3','','C','268','2.3+8','',       'LQ0','E0'),
('1008','BOR TRİFLORÜR',                                  '2','2.3','','C','269','2.3+8','',       'LQ0','E0'),
('1009','BROMOTRİFLOROMETAN (Freon 13B1)',                '2','2.2','','A','20','2.2','3',         'LQ1','E1'),
('1010','BÜTADİENLER, stabilize edilmiş',                 '2','2.1','','B','239','2.1','',         'LQ0','E0'),
('1011','BÜTAN',                                          '2','2.1','','D','23','2.1','',          'LQ0','E0'),
('1012','BÜTİLEN',                                        '2','2.1','','D','23','2.1','',          'LQ0','E0'),
('1013','KARBON DİOKSİT',                                 '2','2.2','','A','20','2.2','3',         'LQ1','E1'),
('1017','KLOR',                                           '2','2.3','','C','268','2.3+8','',       'LQ0','E0'),
('1030','1,1-DİFLOROETAN (Freon 152a)',                   '2','2.1','','D','23','2.1','',          'LQ0','E0'),
('1038','ETİLEN, soğutulmuş sıvı',                        '2','2.1','','D','223','2.1','',         'LQ0','E0'),
('1040','ETİLEN OKSİT',                                   '2','2.3','','C','263','2.3+3','',       'LQ0','E0'),
('1046','HELYUM, sıkıştırılmış',                          '2','2.2','','A','20','2.2','3',         'LQ1','E1'),
('1049','HİDROJEN, sıkıştırılmış',                        '2','2.1','','B','23','2.1','',          'LQ0','E0'),
('1050','HİDROJEN KLORÜR, susuz',                         '2','2.3','','C','268','2.3+8','',       'LQ0','E0'),
('1055','İZOBÜTİLEN',                                     '2','2.1','','D','23','2.1','',          'LQ0','E0'),
('1060','METİLASETİLEN ve PROPADYEN karışımı, stabilize', '2','2.1','','D','239','2.1','',         'LQ0','E0'),
('1062','METİL BROMÜR',                                   '2','2.3','','C','26','2.3','',          'LQ0','E0'),
('1072','OKSİJEN, sıkıştırılmış',                         '2','2.2','','E','25','2.2+5.1','3',     'LQ1','E1'),
('1075','PETROL GAZLARI, sıvılaştırılmış',                '2','2.1','','D','23','2.1','',          'LQ0','E0'),
('1076','FOSGEN',                                         '2','2.3','','B','265','2.3+8','',       'LQ0','E0'),
('1077','PROPİLEN',                                       '2','2.1','','D','23','2.1','',          'LQ0','E0'),
('1978','PROPAN',                                         '2','2.1','','D','23','2.1','',          'LQ0','E0'),
('1965','HİDROKARBON GAZI KARIŞIMI, sıvılaştırılmış (LPG)','2','2.1','','D','23','2.1','',        'LQ0','E0'),
('1950','AEROSOL KAPLAR',                                 '2','2.1','','E','23','2.1','',          'LQ2','E0'),
('3500','KİMYASAL MADDE ALTINDA BASINÇLI GAZ, alevlenir', '2','2.1','','D','23','2.1','',          'LQ0','E0'),

-- ── SINIF 3 — Alevlenir Sıvılar ─────────────────────────────────────
('1114','BENZEN',                                         '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1170','ETİL ALKOL (ETANOL)',                             '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1173','ETİL ASETAT',                                    '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1193','METİL ETİL KETON',                               '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1201','FUZEL YAĞI',                                     '3','F1',  'III','D','30','3',       '3','LQ5','E1'),
('1202','GAZ YAĞI veya MOTORIN veya ISITMA YAĞI, hafif',  '3','F1',  'III','D','30','3',       '3','LQ5','E1'),
('1203','MOTOR BENZİNİ (GAZOLİN/PETROLİN)',               '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1208','HEGZAN',                                         '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1219','İZOPROPANOL (İZOPROPİL ALKOL)',                  '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1223','KEROSEN',                                        '3','F1',  'III','D','30','3',       '3','LQ5','E1'),
('1230','METANOL',                                        '3','FT1', 'II', 'D','336','3+6.1',  '2','LQ4','E2'),
('1263','BOYA (alevlenir)',                                '3','F1',  'I',  'D','33','3',       '1','LQ0','E3'),
('1267','HAM PETROL',                                     '3','F1',  'I',  'D','33','3',       '1','LQ4','E3'),
('1268','PETROL DISTILATI, n.o.s.',                       '3','F1',  'III','D','30','3',       '3','LQ5','E1'),
('1294','TOLUEN',                                         '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1307','KSİLENLER',                                      '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1866','REÇİNE ÇÖZELTISI, alevlenir',                    '3','F1',  'II', 'D','33','3',       '2','LQ4','E2'),
('1993','ALEVLENIR SIVI, n.o.s.',                         '3','F1',  'III','D','30','3',       '3','LQ5','E1'),
('3295','HİDROKARBONLAR, sıvı, n.o.s.',                   '3','F1',  'III','D','30','3',       '3','LQ5','E1'),

-- ── SINIF 4.1 — Alevlenir Katılar ───────────────────────────────────
('1325','ALEVLENIR KATI ORGANİK, n.o.s.',                 '4.1','F1','II', 'E','40','4.1',    '2','LQ11','E2'),
('1334','NAFTALEN, ham veya rafine',                       '4.1','F1','III','E','40','4.1',    '3','LQ12','E1'),
('2304','NAFTALEN, eriyik',                                '4.1','F1','III','E','44','4.1',    '2','LQ0','E2'),
('3175','KATI MADDELERi alevlenir sıvı içeren, n.o.s.',   '4.1','F1','II', 'E','40','4.1',    '2','LQ11','E2'),

-- ── SINIF 4.2 — Kendiliğinden Tutuşan ───────────────────────────────
('1361','KARBON, hayvansal veya bitkisel kökenli',         '4.2','S2','III','E','40','4.2',    '3','LQ0','E1'),
('2870','ALÜMİNYUM BOROHİDRÜR',                           '4.2','SW','I',  'E','333','4.2+4.3','','LQ0','E0'),
('3127','KENDİLİĞİNDEN ISINABILEN KATI, n.o.s.',          '4.2','S1','II', 'E','40','4.2',    '2','LQ0','E2'),

-- ── SINIF 4.3 — Su ile Temas Tehlikeli ──────────────────────────────
('1428','SODYUM',                                         '4.3','W2','I',  'E','423','4.3+8', '','LQ0','E0'),
('1402','KALSİYUM KARBİT',                                '4.3','W2','I',  'E','423','4.3',   '','LQ0','E0'),
('1418','MAGNEZYUM ALAŞIMLARI tozu',                      '4.3','W2','I',  'E','43','4.3',    '','LQ0','E0'),
('3292','PİLLER, sodyum içeren',                          '4.3','W2','II', 'E','423','4.3',   '','LQ0','E0'),

-- ── SINIF 5.1 — Yükseltgeyiciler ────────────────────────────────────
('1942','AMONYUM NİTRAT',                                 '5.1','O1','III','E','50','5.1',    '3','LQ15','E1'),
('1966','HİDROJEN PEROKSİT ÇÖZELTISI %60-70',             '5.1','O1','I',  'D','558','5.1+8', '','LQ0','E0'),
('2067','AMONYUM NİTRAT bazlı gübre',                     '5.1','O1','III','E','50','5.1',    '3','LQ15','E1'),
('2014','HİDROJEN PEROKSİT ÇÖZELTISI %20-60',             '5.1','O1','II', 'D','58','5.1+8',  '2','LQ4','E2'),
('1479','YÜKSELTGEYİCİ KATI, n.o.s.',                    '5.1','O1','II', 'E','50','5.1',    '2','LQ4','E2'),

-- ── SINIF 5.2 — Organik Peroksitler ─────────────────────────────────
('3101','ORGANİK PEROKSİT TİP B, sıvı',                  '5.2','P1','II', 'D','539','5.2',   '','LQ0','E0'),
('3103','ORGANİK PEROKSİT TİP C, sıvı',                  '5.2','P2','II', 'D','539','5.2',   '','LQ0','E0'),
('3107','ORGANİK PEROKSİT TİP E, sıvı',                  '5.2','P5','II', 'D','59','5.2',    '3','LQ0','E2'),

-- ── SINIF 6.1 — Zehirli Maddeler ────────────────────────────────────
('1547','ANİLİN',                                         '6.1','T1','II', 'D','60','6.1',    '2','LQ7','E4'),
('1560','ARSENIK KLORÜR',                                 '6.1','T4','I',  'C','66','6.1',    '','LQ0','E5'),
('1583','KLOROPIKRIN KARIŞIMI, n.o.s.',                   '6.1','T1','II', 'D','60','6.1',    '','LQ0','E0'),
('1593','DİKLOROMETAN',                                   '6.1','T1','III','D','60','6.1',    '3','LQ7','E1'),
('1648','ASETONİTRİL',                                    '3','FT1', 'II', 'D','336','3+6.1', '2','LQ4','E2'),
('2811','ZEHİRLİ KATI ORGANİK, n.o.s.',                  '6.1','T1','II', 'D','60','6.1',    '2','LQ7','E4'),
('3289','ZEHİRLİ SIVI İNORGANİK, n.o.s.',                '6.1','T4','II', 'D','60','6.1',    '2','LQ7','E4'),

-- ── SINIF 8 — Aşındırıcılar ─────────────────────────────────────────
('1730','ANTİMON BEŞ KLORÜR, sıvı',                      '8','C4','II', 'E','80','8',        '2','LQ22','E2'),
('1760','AŞINDIRICI SIVI, n.o.s.',                        '8','C9','II', 'E','80','8',        '2','LQ22','E2'),
('1789','HİDROKLORİK ASİT ÇÖZELTISI',                     '8','C1','II', 'E','80','8',        '2','LQ22','E2'),
('1791','HİPOKLORİT ÇÖZELTISI',                           '8','C9','III','E','80','8',        '3','LQ24','E1'),
('1805','FOSFORİK ASİT ÇÖZELTISI',                        '8','C1','III','E','80','8',        '3','LQ24','E1'),
('1823','SODYUM HİDROKSİT, katı',                         '8','C6','II', 'E','80','8',        '2','LQ22','E2'),
('1824','SODYUM HİDROKSİT ÇÖZELTISI',                     '8','C5','II', 'E','80','8',        '3','LQ24','E1'),
('1830','SÜLFÜRİK ASİT',                                  '8','C1','II', 'E','80','8',        '2','LQ22','E2'),
('1832','SÜLFÜRİK ASİT, harcanmış',                       '8','C1','II', 'E','80','8',        '2','LQ22','E2'),
('1906','ÇUKUR YAĞI (atık sülfürik asit)',                '8','C1','II', 'E','80','8',        '2','LQ22','E2'),
('2031','NİTRİK ASİT, %65 aşmayan',                       '8','C1','II', 'E','80','8',        '2','LQ22','E2'),
('2672','AMONYAK ÇÖZELTISI %10-35',                       '8','C5','III','E','80','8',        '3','LQ24','E1'),
('3264','AŞINDIRICI SIVI ASİDİK İNORGANİK, n.o.s.',      '8','C1','II', 'E','80','8',        '2','LQ22','E2'),
('3266','AŞINDIRICI SIVI BAZİK İNORGANİK, n.o.s.',       '8','C5','II', 'E','80','8',        '3','LQ24','E1'),

-- ── SINIF 9 — Çeşitli ───────────────────────────────────────────────
('1845','KURU BUZ (katı karbondioksit)',                   '9','M11','III','A','90','9',       '3','LQ0','E1'),
('2212','ASBESTi (mavi veya kahverengi)',                  '9','M1', 'II', 'E','90','9',       '','LQ0','E0'),
('3077','ÇEVRE İÇİN TEHLİKELİ KATI, n.o.s.',             '9','M6', 'III','E','90','9',       '3','LQ24','E1'),
('3082','ÇEVRE İÇİN TEHLİKELİ SIVI, n.o.s.',             '9','M6', 'III','E','90','9',       '3','LQ24','E1'),
('3166','MOTORLU TAŞIT, yakıt içeren (benzinli)',          '9','M11','III','E','90','9',       '','LQ0','E0'),
('3171','PİL DESTEKLİ ARAÇ',                              '9','M11','III','E','90','9',       '','LQ0','E0'),
('3480','LİTYUM İYON PİL',                                '9','M4', 'II', 'E','90','9',       '','LQ0','E0'),
('3481','LİTYUM İYON PİL, ekipmana takılı',               '9','M4', 'II', 'E','90','9',       '','LQ0','E0'),
('3090','LİTYUM METAL PİL',                               '9','M4', 'I',  'E','90','9',       '','LQ0','E0'),
('3091','LİTYUM METAL PİL, ekipmana takılı',              '9','M4', 'II', 'E','90','9',       '','LQ0','E0'),
('3268','HAVA YASTIGI MODÜLÜ veya EMNİYET KEMERİ',        '9','M11','III','E','90','9',       '3','LQ0','E0'),
('3536','LİTYUM PİL KURULU ARAÇ',                         '9','M4', 'I',  'E','90','9',       '','LQ0','E0')

on conflict (un_number) do update set
  proper_shipping_name  = excluded.proper_shipping_name,
  class                 = excluded.class,
  classification_code   = excluded.classification_code,
  packing_group         = excluded.packing_group,
  tunnel_code           = excluded.tunnel_code,
  hazard_no             = excluded.hazard_no,
  labels                = excluded.labels,
  transport_category    = excluded.transport_category,
  limited_quantity      = excluded.limited_quantity,
  excepted_quantity     = excluded.excepted_quantity;
