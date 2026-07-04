-- =====================================================================
-- TMGD YÖNETİM SİSTEMİ — MIGRATION 009 (v2 — TEKİL)
-- TAM ADR UN NUMARALARI VERİTABANI (ADR_A_TABLOSU.xlsx kaynaklı)
-- =====================================================================
-- 366 UN numarası birden fazla satırda (farklı ambalaj grupları)
-- görünüyordu. Bu sürümde her UN için en yüksek tehlike seviyeli
-- (en düşük PG: I > II > III > boş) kayıt alındı.
-- KULLANIM: Supabase SQL Editor → tamamını yapıştır → RUN (Idempotent)
-- =====================================================================

-- RLS (008'den devam — idempotent)
alter table public.adr_un_numbers enable row level security;
drop policy if exists adr_un_select on public.adr_un_numbers;
create policy adr_un_select on public.adr_un_numbers for select using (true);
drop policy if exists adr_un_write on public.adr_un_numbers;
create policy adr_un_write on public.adr_un_numbers for all using (public.is_admin());
alter table public.adr_synonyms enable row level security;
drop policy if exists adr_syn_select on public.adr_synonyms;
create policy adr_syn_select on public.adr_synonyms for select using (true);

insert into public.adr_un_numbers
  (un_number,proper_shipping_name,class,classification_code,
   packing_group,tunnel_code,hazard_no,labels,
   transport_category,limited_quantity,excepted_quantity)
values
('0004','AMONYUM PİKRAT kütlece %10''dan  az su ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0005','KARTUŞLAR, SİLAHLAR İÇİN  paralama hakkı olan','1','1.1F','','B1000C','','1','1','','E0'),
('0006','KARTUŞLAR, SİLAHLAR İÇİN paralama hakkı olan','1','1.1E','','B1000C','','1','1','','E0'),
('0007','KARTUŞLAR, SİLAHLAR İÇİN paralama hakkı olan','1','1.2F','','B1000C','','1','1','','E0'),
('0009','MÜHİMMAT, YANGIN ÇIKARTICI paralama hakkı, fırlatma yükü veya sevk maddesi olan veya olmayan','1','1.2G','','B1000C','','1','1','','E0'),
('0010','MÜHİMMAT, YANGIN ÇIKARTICI paralama hakkı, fırlatma yükü veya sevk maddesi olan veya olmayan','1','1.3G','','C5000D','','1','1','','E0'),
('0012','KARTUŞLAR, SİLAHLAR İÇİN, TESİRSİZ MERMİLİ veya KARTUŞLAR, HAFİF SİLAHLAR İÇİN','1','1.4S','','E','','1.4','4','5 kg','E0'),
('0014','KARTUŞLAR, SİLAHLAR İÇİN, KURUSIKI veya KARTUŞLAR, HAFİF SİLAHLAR İÇİN, KURUSIKI veya KARTUŞLAR, ALETLER İÇİN, KURUSIKI','1','1.4S','','E','','1.4','4','5 kg','E0'),
('0015','MÜHİMMAT, DUMANLI paralama hakkı, fırlatma yükü veya sevk maddesi olan veya olmayan','1','1.2G','','B1000C','','1','1','','E0'),
('0016','MÜHİMMAT, DUMANLI paralama hakkı, fırlatma yükü veya sevk maddesi olan veya olmayan','1','1.3G','','C5000D','','1','1','','E0'),
('0018','MÜHİMMAT, GÖZ YAŞARTICI paralama hakkı, fırlatma yükü veya sevk maddesi olan','1','1.2G','','B1000C','','1
+6.1
+8','1','','E0'),
('0019','MÜHİMMAT, GÖZ YAŞARTICI paralama hakkı, fırlatma yükü veya sevk maddesi olan','1','1.3G','','C5000D','','1
+6.1
+8','1','','E0'),
('0020','MÜHİMMAT, ZEHİRLİ paralama hakkı,fırlatma yükü veya sevk maddesi olan','1','1.2K','TAŞINMASI YASAK','','','','','',''),
('0021','MÜHİMMAT, ZEHİRLİ paralama hakkı, fırlatma yükü veya sevk maddesi olan','1','1.3K','TAŞINMASI YASAK','','','','','',''),
('0027','KARA BARUT (BARUT), granül veya toz halinde','1','1.1D','','B1000C','','1','1','','E0'),
('0028','KARA BARUT (BARUT), SIKIŞTIRILMIŞ veya KARA BARUT (BARUT), SAÇMA HALİNDE','1','1.1D','','B1000C','','1','1','','E0'),
('0029','KAPSÜLLER, ELEKTRİKLİ OLMAYAN, patlatma için','1','1.1B','','B1000C','','1','1','','E0'),
('0030','KAPSÜLLER, ELEKTRİKLİ,patlatma için','1','1.1B','','B1000C','','1','1','','E0'),
('0033','BOMBALAR paralama hakkı olan','1','1.1F','','B1000C','','1','1','','E0'),
('0034','BOMBALAR paralama hakkı olan','1','1.1D','','B1000C','','1','1','','E0'),
('0035','BOMBALAR paralama hakkı olan','1','1.2D','','B1000C','','1','1','','E0'),
('0037','BOMBALAR, FOTO-FLAŞ','1','1.1F','','B1000C','','1','1','','E0'),
('0038','BOMBALAR, FOTO-FLAŞ','1','1.1D','','B1000C','','1','1','','E0'),
('0039','BOMBALAR, FOTO-FLAŞ','1','1.2G','','B1000C','','1','1','','E0'),
('0042','TUTUŞTURUCULAR kapsülsüz','1','1.1D','','B1000C','','1','1','','E0'),
('0043','PARALAMA HAKLARI, patlayıcı','1','1.1D','','B1000C','','1','1','','E0'),
('0044','KAPSÜLLER, BAŞLIK TİPİ','1','1.4S','','E','','1.4','4','','E0'),
('0048','İMLA HAKLARI, TAHRİPLİ','1','1.1D','','B1000C','','1','1','','E0'),
('0049','KARTUŞLAR, FLAŞ','1','1.1G','','B1000C','','1','1','','E0'),
('0050','KARTUŞLAR, FLAŞ','1','1.3G','','C5000D','','1','1','','E0'),
('0054','FİŞEKLER, İŞARET','1','1.3G','','C5000D','','1','1','','E0'),
('0055','KOVANLAR, KARTUŞ, BOŞ, KAPSÜLLÜ','1','1.4S','','E','','1.4','4','5 kg','E0'),
('0056','BOMBALARI, DERİNLİK','1','1.1D','','B1000C','','1','1','','E0'),
('0059','İMLA HAKLARI, BOŞLUKLU, kapsülsüz','1','1.1D','','B1000C','','1','1','','E0'),
('0060','İMLA HAKLARI, İLAVE, PATLAYICI','1','1.1D','','B1000C','','1','1','','E0'),
('0065','FİTİL, İNFİLAKLI, esnek','1','1.1D','','B1000C','','1','1','','E0'),
('0066','FİTİL, ATEŞLEYİCİ','1','1.4G','','E','','1.4','2','','E0'),
('0070','KESİCİLER, KABLO, PATLAYICI','1','1.4S','','E','','1.4','4','','E0'),
('0072','SİKLOTRİMETİLEN- TRİNİTRAMİN (SİKLONİT; HEKSOJEN; RDX), ISLATILMIŞ kütlece %15''ten daha az olmayan su  ile','1','1.1D','','B1000C','','1','1','','E0'),
('0073','KAPSÜLLER, MÜHİMMAT İÇİN','1','1.1B','','B1000C','','1','1','','E0'),
('0074','DİAZODİNİTROFENOL, ISLATILMIŞ kütlece %40''tan daha az olmayan su veya su alkol karışımı ile','1','1.1A','','B','','1','0','','E0'),
('0075','DİETİLENGLİKOL DİNİTRAT, DUYARLILIĞI AZALTILMIŞ  kütlece %25''ten az olmamak üzere  uçucu olmayan ve suda çözünmeyen flegmatizör','1','1.1D','','B1000C','','1','1','','E0'),
('0076','DİNİTROFENOL, kütlece %15''ten az su ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1
+6.1','1','','E0'),
('0077','DİNİTROFENOLATLAR, alkali metaller, kütlece %15''ten az su ile ıslatılmış veya kuru','1','1.3C','','C5000D','','1
+6.1','1','','E0'),
('0078','DİNİTRORESORSİNOL, kütlece %15''ten az su ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0079','HEKZANİTRODİFENİLAMİN (DİPİKRİLAMİN- HEKZİL)','1','1.1D','','B1000C','','1','1','','E0'),
('0081','PATLAYICI, TAHRİPLİ, TİP A','1','1.1D','','B1000C','','1','1','','E0'),
('0082','PATLAYICI, TAHRİPLİ, TİP B','1','1.1D','','B1000C','','1','1','','E0'),
('0083','PATLAYICI, TAHRİPLİ, TİP C','1','1.1D','','B1000C','','1','1','','E0'),
('0084','PATLAYICI, TAHRİPLİ, TİP D','1','1.1D','','B1000C','','1','1','','E0'),
('0092','İŞARET FİŞEKLERİ, YÜZEY','1','1.3G','','C5000D','','1','1','','E0'),
('0093','İŞARET FİŞEKLERİ, HAVAİ','1','1.3G','','C5000D','','1','1','','E0'),
('0094','PARLAMA TOZU','1','1.1G','','B1000C','','1','1','','E0'),
('0099','KIRICI ALETLER, PATLAYICI kapsülsüz, petrol kuyuları için','1','1.1D','','B1000C','','1','1','','E0'),
('0101','TAPA, İNFİLAKSIZ','1','1.3G','','C5000D','','1','1','','E0'),
('0102','FİTİL (TAPA), İNFİLAKLI, metal zırhlı','1','1.2D','','B1000C','','1','1','','E0'),
('0103','TAPA, ATEŞLEYİCİ, boru tipi, metal zırhlı','1','1.4G','','E','','1.4','2','','E0'),
('0104','FİTİL (TAPA), İNFİLAKLI, HAFİF ETKİLİ, metal zırhlı','1','1.4D','','E','','1.4','2','','E0'),
('0105','FİTİL, EMNİYET','1','1.4S','','E','','1.4','4','','E0'),
('0106','FÜNYELER, İNFİLAKLI','1','1.1B','','B1000C','','1','1','','E0'),
('0107','FÜNYELER, İNFİLAKLI','1','1.2B','','B1000C','','1','1','','E0'),
('0110','EL BOMBALARI, EĞİTİM, el veya tüfek ile','1','1.4S','','E','','1.4','4','','E0'),
('0113','GUANİLNİTROSAMİNO-GUALİDİN HİDRAZİN, ISLATILMIŞ kütlece %30''dan daha az olmayan su ile','1','1.1A','','B','','1','0','','E0'),
('0114','GUANİLNİTROAMİNO-GUANİLTETRAZEN (TETRAZEN),  ISLATILMIŞ kütlece %30''dan daha az olmayan su veya alkol su karışımı ile','1','1.1A','','B','','1','0','','E0'),
('0118','HEKZOLİT (HEKZOTOL) kütlece %15''ten az su ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0121','ATEŞLEYİCİLER','1','1.1G','','B1000C','','1','1','','E0'),
('0124','JET DELİCİ SİLAHLAR, YÜKLÜ, petrol kuyusu, kapsülsüz','1','1.1D','','B1000C','','1','1','','E0'),
('0129','KURŞUN AZİT, ISLATILMIŞ  kütlece %20''den az olmayan su veya alkol su karışımı ile','1','1.1A','','B','','1','0','','E0'),
('0130','KURŞUN STİFNAT (KURŞUN TRİNİTRORESORSİNAT), ISLATILMIŞ kütlece %20''den daha  az olmayan su veya alkol karışımı ile','1','1.1A','','B','','1','0','','E0'),
('0131','ÇAKMAKLAR, TAPA','1','1.4S','','E','','1.4','4','','E0'),
('0132','AROMATİK NİTRO TÜREVLERİN YANICI METAL TUZLARI, B.B.B.','1','1.3C','','C5000D','','1','1','','E0'),
('0133','MANNİTOL HEKZANİTRAT (NİTROMANNİT), ISLATILMIŞ kütlece %40''tan daha az olmayan su veya su alkol karışımı ile','1','1.1D','','B1000C','','1','1','','E0'),
('0135','CIVA FULMİNAT, ISLATILMIŞ kütlece %20''den daha az olmayan su veya alkol su karışımı ile','1','1.1A','','B','','1','0','','E0'),
('0136','MAYINLAR paralama hakkı olan','1','1.1F','','B1000C','','1','1','','E0'),
('0137','MAYINLAR paralama hakkı olan','1','1.1D','','B1000C','','1','1','','E0'),
('0138','MAYINLAR paralama hakkı olan','1','1.2D','','B1000C','','1','1','','E0'),
('0143','NİTROGLİSERİN, DUYARLILIĞI AZALTILMIŞ kütlece %40''tan az olmamak üzere uçucu olmayan ve suda çözünmeyen flegmatizör ile','1','1.1D','','B1000C','','1
+6.1','1','','E0'),
('0144','NİTROGLİSERİN ÇÖZELTİSİ ALKOLDE %1''den fazla ama %10''dan daha az nitrogliserin içeren','1','1.1D','','B1000C','','1','1','','E0'),
('0146','NİTRO-NİŞASTA, kütlece %20''den az su ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0147','NİTRO ÜRE','1','1.1D','','B1000C','','1','1','','E0'),
('0150','PENTAERİTRİT TETRANİTRAT (PENTAERİTRİTOL TETRANİTRAT; PETN), kütlece %25''ten az olmamak üzere su ile ISLATILMIŞ veya kütlece %15''ten az olmamak üzere flegmatizör ile DUYARLILIĞI AZALTILMIŞ','1','1.1D','','B1000C','','1','1','','E0'),
('0151','PENTOLİT, kütlece %15''ten az su ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0153','TRİNİTROANİLİN (PİKRAMİD)','1','1.1D','','B1000C','','1','1','','E0'),
('0154','TRİNİTROFENOL (PİKRİK ASİT),kütlece %30''dan az su ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0155','TRİNİTROKLOROBENZEN (PİKRİL KLORÜR)','1','1.1D','','B1000C','','1','1','','E0'),
('0159','BARUT KALIBI (BARUT MACUNU), ISLATILMIŞ kütlece % 25''ten daha az olmayan su ile','1','1.3C','','C5000D','','1','1','','E0'),
('0160','BARUT, DUMANSIZ','1','1.1C','','B1000C','','1','1','','E0'),
('0161','BARUT, DUMANSIZ','1','1.3C','','C5000D','','1','1','','E0'),
('0167','MERMİLER paralama hakkı olan','1','1.1F','','B1000C','','1','1','','E0'),
('0168','MERMİLER paralama hakkı olan','1','1.1D','','B1000C','','1','1','','E0'),
('0169','MERMİLER paralama hakkı olan','1','1.2D','','B1000C','','1','1','','E0'),
('0171','MÜHİMMAT, AYDINLATICI paralama hakkı, fırlatma yükü veya sevk maddesi olan veya olmayan','1','1.2G','','B1000C','','1','1','','E0'),
('0173','BOŞALTMA ALETLERİ, PATLAYICI','1','1.4S','','E','','1.4','4','','E0'),
('0174','PERÇİNLER, PATLAYICI','1','1.4S','','E','','1.4','4','','E0'),
('0180','ROKETLER paralama hakkı olan','1','1.1F','','B1000C','','1','1','','E0'),
('0181','ROKETLER paralama hakkı olan','1','1.1E','','B1000C','','1','1','','E0'),
('0182','ROKETLER paralama hakkı olan','1','1.2E','','B1000C','','1','1','','E0'),
('0183','ROKETLER tesirsiz başlıklı','1','1.3C','','C5000D','','1','1','','E0'),
('0186','ROKET MOTORLARI','1','1.3C','','C5000D','','1','1','','E0'),
('0190','NUMUNELER, PATLAYICI tepkime başlatıcı patlayıcı hariç','1','','','E','','','0','','E0'),
('0191','İŞARET ALETLERİ, EL','1','1.4G','','E','','1.4','2','','E0'),
('0192','İŞARETLER, DEMİRYOLU, PATLAYICI','1','1.1G','','B1000C','','1','1','','E0'),
('0193','İŞARETLER, DEMİRYOLU,PATLAYICI','1','1.4S','','E','','1.4','4','','E0'),
('0194','İŞARETLER, İMDAT, gemi','1','1.1G','','B1000C','','1','1','','E0'),
('0195','İŞARETLER, İMDAT, gemi','1','1.3G','','C5000D','','1','1','','E0'),
('0196','İŞARETLER, DUMAN','1','1.1G','','B1000C','','1','1','','E0'),
('0197','İŞARETLER, DUMAN','1','1.4G','','E','','1.4','2','','E0'),
('0204','SONDAJ CİHAZLARI, PATLAYICI','1','1.2F','','B1000C','','1','1','','E0'),
('0207','TETRANİTROANİLİN','1','1.1D','','B1000C','','1','1','','E0'),
('0208','TRİNİTROFENİLMETİL- NİTRAMİN (TETRİL)','1','1.1D','','B1000C','','1','1','','E0'),
('0209','TRİNİTROTOLUEN (TNT) kütlece  %30''dan daha az su ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0212','MÜHİMMAT İÇİN İZLİ MERMİLER','1','1.3G','','C5000D','','1','1','','E0'),
('0213','TRİNİTROANİZOL','1','1.1D','','B1000C','','1','1','','E0'),
('0214','TRİNİTROBENZEN, kütlece %30''dan az su ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0215','TRİNİTROBENZOİK ASİT, kuru veya kütlece %30''dan az su ile ıslatılmış','1','1.1D','','B1000C','','1','1','','E0'),
('0216','TRİNİTRO-m-KRİZOL','1','1.1D','','B1000C','','1','1','','E0'),
('0217','TRİNİTRONAFTALİN','1','1.1D','','B1000C','','1','1','','E0'),
('0218','TRİNİTROFENETOL','1','1.1D','','B1000C','','1','1','','E0'),
('0219','TRİNİTRORESORSİNOL (STİFNİK ASİT) kütlece %20''den az su veya su alkol karışımı ile ıslatılmış veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0220','ÜRE NİTRAT, kuru veya kütlece %20''den az su ile ıslatılmış','1','1.1D','','B1000C','','1','1','','E0'),
('0221','SAVAŞ BAŞLIKLARI, TORPİDO paralama hakkı olan','1','1.1D','','B1000C','','1','1','','E0'),
('0222','AMONYUM NİTRAT','1','1.1D','','B1000C','','1','1','','E0'),
('0224','BARYUM AZİT, kuru veya kütlece %50''den az su ile ıslatılmış','1','1.1A','','B','','1
+6.1','0','','E0'),
('0225','TUTUŞTURUCULAR, KAPSÜLLÜ','1','1.1B','','B1000C','','1','1','','E0'),
('0226','SİKLOTETRAMETİLEN-TETRANİTRAMİN (HMX; OKTOJEN), ISLATILMIŞ kütlece %15''ten daha az olmayan su içeren','1','1.1D','','B1000C','','1','1','','E0'),
('0234','SODYUM DİNİTRO-o-KRESOLAT, kütlece %15''ten az su ile ıslatılmış veya kuru','1','1.3C','','C5000D','','1','1','','E0'),
('0235','SODYUM PİKRAMAT, kütlece %20''den az su ile ıslatılmış veya kuru','1','1.3C','','C5000D','','1','1','','E0'),
('0236','ZİRKONYUM PİKRAMAT,kütlece %20''den az su ile ıslatılmış veya kuru','1','1.3C','','C5000D','','1','1','','E0'),
('0237','İMLA HAKLARI, BOŞLUKLU, ESNEK, DOĞRUSAL','1','1.4D','','E','','1.4','2','','E0'),
('0238','ROKETLER, HALAT FIRLATICI','1','1.2G','','B1000C','','1','1','','E0'),
('0240','ROKETLER, HALAT FIRLATICI','1','1.3G','','C5000D','','1','1','','E0'),
('0241','PATLAYICI, TAHRİPLİ, TİP E','1','1.1D','','B1000C','','1','1','','E0'),
('0242','MADDELERİ, SEVK, TOP İÇİN','1','1.3C','','C5000D','','1','1','','E0'),
('0243','MÜHİMMAT, YANGIN ÇIKARTICI, BEYAZ FOSFORLU paralama hakkı, fırlatma yükü veya sevk maddesi olan','1','1.2H','','B1000C','','1','1','','E0'),
('0244','MÜHİMMAT, YANGIN ÇIKARTICI, BEYAZ FOSFORLU paralama hakkı, fırlatma yükü veya sevk maddesi olan','1','1.3H','','C','','1','1','','E0'),
('0245','MÜHİMMAT, DUMANLI, BEYAZ FOSFORLU paralama hakkı, fırlatma yükü veya sevk maddesi olan','1','1.2H','','B1000C','','1','1','','E0'),
('0246','MÜHİMMAT, DUMANLI, BEYAZ FOSFORLU paralama hakkı, fırlatma yükü veya sevk maddesi olan','1','1.3H','','C','','1','1','','E0'),
('0247','MÜHİMMAT, YANGIN ÇIKARTICI, sıvı veya jel, paralama hakkı, fırlatma yükü veya sevk maddesi olan','1','1.3J','','C','','1','1','','E0'),
('0248','TERTİBATLAR, SU İLE ETKİNLEŞEN paralama hakkı,fırlatma yükü veya sevk maddesi olan','1','1.2L','','B','','1','0','','E0'),
('0249','TERTİBATLAR, SU İLE ETKİNLEŞEN paralama hakkı,fırlatma yükü veya sevk maddesi olan','1','1.3L','','B','','1','0','','E0'),
('0250','ROKET MOTORLARI,HİPERGOLİK SIVI İÇEREN fırlatma yükü olan veya olmayan','1','1.3L','','B','','1','0','','E0'),
('0254','MÜHİMMAT, AYDINLATICI paralama hakkı, fırlatma yükü veya sevk maddesi olan veya olmayan','1','1.3G','','C5000D','','1','1','','E0'),
('0255','KAPSÜLLER, ELEKTRİKLİ patlatma için','1','1.4B','','E','','1.4','2','','E0'),
('0257','FÜNYELER, İNFİLAKLI','1','1.4B','','E','','1.4','2','','E0'),
('0266','OKTOLİT (OKTOL), kuru veya kütlece %15''ten az su ile ıslatılmış','1','1.1D','','B1000C','','1','1','','E0'),
('0267','KAPSÜLLER, ELEKTRİKLİ OLMAYAN, patlatma için','1','1.4B','','E','','1.4','2','','E0'),
('0268','TUTUŞTURUCULAR, KAPSÜLLÜ','1','1.2B','','B1000C','','1','1','','E0'),
('0271','MADDELERİ, SEVK','1','1.1C','','B1000C','','1','1','','E0'),
('0272','MADDELERİ, SEVK','1','1.3C','','C5000D','','1','1','','E0'),
('0275','KARTUŞLARI, GÜÇ ALETİ','1','1.3C','','C5000D','','1','1','','E0'),
('0276','KARTUŞLARI, GÜÇ ALETİ','1','1.4C','','E','','1.4','2','','E0'),
('0277','KARTUŞLARI, PETROL KUYUSU','1','1.3C','','C5000D','','1','1','','E0'),
('0278','KARTUŞLARI, PETROL KUYUSU','1','1.4C','','E','','1.4','2','','E0'),
('0279','MADDELERİ, SEVK, TOP İÇİN','1','1.1C','','B1000C','','1','1','','E0'),
('0280','ROKET MOTORLARI','1','1.1C','','B1000C','','1','1','','E0'),
('0281','ROKET MOTORLARI','1','1.2C','','B1000C','','1','1','','E0'),
('0282','NİTROGUANİDİN (PİKRİT), ISLATILMIŞ kütlece %20''den daha  az su ile veya kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0283','TUTUŞTURUCULAR kapsülsüz','1','1.2D','','B1000C','','1','1','','E0'),
('0284','EL BOMBALARI, el veya tüfek, paralama hakkı olan','1','1.1D','','B1000C','','1','1','','E0'),
('0285','EL BOMBALARI, el veya tüfek, paralama hakkı olan','1','1.2D','','B1000C','','1','1','','E0'),
('0286','SAVAŞ BAŞLIKLARI, ROKET, paralama hakkı olan','1','1.1D','','B1000C','','1','1','','E0'),
('0287','SAVAŞ BAŞLIKLARI, ROKET  paralama hakkı olan','1','1.2D','','B1000C','','1','1','','E0'),
('0288','İMLA HAKLARI, BOŞLUKLU, ESNEK, DOĞRUSAL','1','1.1D','','B1000C','','1','1','','E0'),
('0289','FİTİL, İNFİLAKLI, esnek','1','1.4D','','E','','1.4','2','','E0'),
('0290','FİTİL (TAPA), İNFİLAKLI, metal  zırhlı','1','1.1D','','B1000C','','1','1','','E0'),
('0291','BOMBALAR paralama hakkı olan','1','1.2F','','B1000C','','1','1','','E0'),
('0292','EL BOMBALARI, el veya tüfek, paralama hakkı olan','1','1.1F','','B1000C','','1','1','','E0'),
('0293','EL BOMBALARI, el veya tüfek, paralama hakkı olan','1','1.2F','','B1000C','','1','1','','E0'),
('0294','MAYINLAR paralama hakkı olan','1','1.2F','','B1000C','','1','1','','E0'),
('0295','ROKETLER paralama hakkı olan','1','1.2F','','B1000C','','1','1','','E0'),
('0296','SONDAJ CİHAZLARI, PATLAYICI','1','1.1F','','B1000C','','1','1','','E0'),
('0297','MÜHİMMAT, AYDINLATICI  paralama hakkı, fırlatma yükü veya  sevk maddesi olan veya olmayan','1','1.4G','','E','','1.4','2','','E0'),
('0299','BOMBALAR, FOTO-FLAŞ','1','1.3G','','C5000D','','1','1','','E0'),
('0300','MÜHİMMAT, YANGIN  ÇIKARTICI paralama hakkı, fırlatma yükü veya sevk maddesi olan veya  olmayan','1','1.4G','','E','','1.4','2','','E0'),
('0301','MÜHİMMAT, GÖZ YAŞARTICI  paralama hakkı, fırlatma yükü veya  sevk maddesi olan','1','1.4G','','E','','1.4
+6.1
+8','2','','E0'),
('0303','MÜHİMMAT, DUMANLI paralama  hakkı, fırlatma yükü veya sevk  maddesi olan veya olmayan','1','1.4G','','E','','1.4','2','','E0'),
('0305','PARLAMA TOZU','1','1.3G','','C5000D','','1','1','','E0'),
('0306','MÜHİMMAT İÇİN İZLİ  MERMİLER','1','1.4G','','E','','1.4','2','','E0'),
('0312','FİŞEKLERİ, İŞARET','1','1.4G','','E','','1.4','2','','E0'),
('0313','İŞARETLERİ, DUMAN','1','1.2G','','B1000C','','1','1','','E0'),
('0314','ATEŞLEYİCİLER','1','1.2G','','B1000C','','1','1','','E0'),
('0315','ATEŞLEYİCİLER','1','1.3G','','C5000D','','1','1','','E0'),
('0316','FÜNYELER, ATEŞLEMELİ','1','1.3G','','C5000D','','1','1','','E0'),
('0317','FÜNYELER, ATEŞLEMELİ','1','1.4G','','E','','1.4','2','','E0'),
('0318','EL BOMBALARI, EĞİTİM, el veya  tüfek ile','1','1.3G','','C5000D','','1','1','','E0'),
('0319','KAPSÜLLER, BORU TİPİ','1','1.3G','','C5000D','','1','1','','E0'),
('0320','KAPSÜLLER, BORU TİPİ','1','1.4G','','E','','1.4','2','','E0'),
('0321','KARTUŞLAR, SİLAHLAR İÇİN  paralama hakkı olan','1','1.2E','','B1000C','','1','1','','E0'),
('0322','ROKET MOTORLARI, HİPERGOLİK SIVI İÇEREN  fırlatma yükü olan veya olmayan','1','1.2L','','B','','1','0','','E0'),
('0323','KARTUŞLARI, GÜÇ ALETİ','1','1.4S','','E','','1.4','4','','E0'),
('0324','MERMİLER paralama hakkı olan','1','1.2F','','B1000C','','1','1','','E0'),
('0325','ATEŞLEYİCİLER','1','1.4G','','E','','1.4','2','','E0'),
('0326','KARTUŞLAR, SİLAHLAR İÇİN, KURUSIKI','1','1.1C','','B1000C','','1','1','','E0'),
('0327','KARTUŞLAR, SİLAHLAR İÇİN, KURUSIKI veya KARTUŞLAR, HAFİF SİLAHLAR İÇİN, KURUSIKI','1','1.3C','','C5000D','','1','1','','E0'),
('0328','KARTUŞLAR, SİLAHLAR İÇİN, TESİRSİZ MERMİLİ','1','1.2C','','B1000C','','1','1','','E0'),
('0329','TORPİDOLAR paralama hakkı olan','1','1.1E','','B1000C','','1','1','','E0'),
('0330','TORPİDOLAR paralama hakkı olan','1','1.1F','','B1000C','','1','1','','E0'),
('0331','PATLAYICI, TAHRİPLİ, TİP B  (AJAN, TAHRİPLİ, TİP B)','1','1.5D','','B1000C','1.5D','1.5','1','','E0'),
('0332','PATLAYICI, TAHRİPLİ, TİP E  (AJAN, TAHRİPLİ, TİP E)','1','1.5D','','B1000C','1.5D','1.5','1','','E0'),
('0333','HAVAİ FİŞEKLER','1','1.1G','','B1000C','','1','1','','E0'),
('0334','HAVAİ FİŞEKLER','1','1.2G','','B1000C','','1','1','','E0'),
('0335','HAVAİ FİŞEKLER','1','1.3G','','C5000D','','1','1','','E0'),
('0336','HAVAİ FİŞEKLER','1','1.4G','','E','','1.4','2','','E0'),
('0337','HAVAİ FİŞEKLER','1','1.4S','','E','','1.4','4','','E0'),
('0338','KARTUŞLAR, SİLAHLAR İÇİN, KURUSIKI veya KARTUŞLAR, HAFİF SİLAHLAR İÇİN, KURUSIKI','1','1.4C','','E','','1.4','2','','E0'),
('0339','KARTUŞLAR, SİLAHLAR İÇİN, TESİRSİZ MERMİLİ veya  KARTUŞLAR, HAFİF SİLAHLAR  İÇİN','1','1.4C','','E','','1.4','2','','E0'),
('0340','NİTROSELÜLOZ, kütlece %25''ten  az su (veya alkol) ile ıslatılmış veya  kuru','1','1.1D','','B1000C','','1','1','','E0'),
('0341','NİTROSELÜLOZ, değiştirilmemiş  veya kütlece %18''den az olmak üzere  plastikleştirici madde ile  plastikleştirilmiş','1','1.1D','','B1000C','','1','1','','E0'),
('0342','NİTROSELÜLOZ, ISLATILMIŞ  kütlece %25''ten az olmayan alkol ile','1','1.3C','','C5000D','','1','1','','E0'),
('0343','NİTROSELÜLOZ, PLASTİKLEŞTİRİLMİŞ kütlece  %18''den az olmak üzere  plastikleştirici madde ile','1','1.3C','','C5000D','','1','1','','E0'),
('0344','MERMİLER paralama hakkı olan','1','1.4D','','E','','1.4','2','','E0'),
('0345','MERMİLER, tesirsiz, izli','1','1.4S','','E','','1.4','4','','E0'),
('0346','MERMİLER paralama hakkı veya  fırlatma yükü olan','1','1.2D','','B1000C','','1','1','','E0'),
('0347','MERMİLER paralama hakkı veya  fırlatma yükü olan','1','1.4D','','E','','1.4','2','','E0'),
('0348','KARTUŞLAR, SİLAHLAR İÇİN  paralama hakkı olan','1','1.4F','','E','','1.4','2','','E0'),
('0349','NESNELER, PATLAYICI, B.B.B.','1','1.4S','','E','','1.4','4','','E0'),
('0350','NESNELER, PATLAYICI, B.B.B.','1','1.4B','','E','','1.4','2','','E0'),
('0351','NESNELER, PATLAYICI, B.B.B.','1','1.4C','','E','','1.4','2','','E0'),
('0352','NESNELER, PATLAYICI, B.B.B.','1','1.4D','','E','','1.4','2','','E0'),
('0353','NESNELER, PATLAYICI, B.B.B.','1','1.4G','','E','','1.4','2','','E0'),
('0354','NESNELER, PATLAYICI, B.B.B.','1','1.1L','','B','','1','0','','E0'),
('0355','NESNELER, PATLAYICI, B.B.B.','1','1.2L','','B','','1','0','','E0'),
('0356','NESNELER, PATLAYICI, B.B.B.','1','1.3L','','B','','1','0','','E0'),
('0357','MADDELER, PATLAYICI, B.B.B.','1','1.1L','','B','','1','0','','E0'),
('0358','MADDELER, PATLAYICI, B.B.B.','1','1.2L','','B','','1','0','','E0'),
('0359','MADDELER, PATLAYICI, B.B.B.','1','1.3L','','B','','1','0','','E0'),
('0360','KAPSÜL DÜZENEKLERİ, ELEKTRİKLİ OLMAYAN, patlatma  için','1','1.1B','','B1000C','','1','1','','E0'),
('0361','KAPSÜL DÜZENEKLERİ, ELEKTRİKLİ OLMAYAN, patlatma  için','1','1.4B','','E','','1.4','2','','E0'),
('0362','MÜHİMMATI, EĞİTİM','1','1.4G','','E','','1.4','2','','E0'),
('0363','MÜHİMMATI, DENEME ATIŞI','1','1.4G','','E','','1.4','2','','E0'),
('0364','KAPSÜLLER, MÜHİMMAT İÇİN','1','1.2B','','B1000C','','1','1','','E0'),
('0365','KAPSÜLLER, MÜHİMMAT İÇİN','1','1.4B','','E','','1.4','2','','E0'),
('0366','KAPSÜLLER, MÜHİMMAT İÇİN','1','1.4S','','E','','1.4','4','','E0'),
('0367','FÜNYELER, İNFİLAKLI','1','1.4S','','E','','1.4','4','','E0'),
('0368','FÜNYELER, ATEŞLEMELİ','1','1.4S','','E','','1.4','4','','E0'),
('0369','SAVAŞ BAŞLIKLARI, paralama  hakkı olan','1','1.1F','','B1000C','','1','1','','E0'),
('0370','SAVAŞ BAŞLIKLARI, ROKET, paralama hakkı veya fırlatma yükü  olan','1','1.4D','','E','','1.4','2','','E0'),
('0371','SAVAŞ BAŞLIKLARI, ROKET, paralama hakkı veya fırlatma yükü  olan','1','1.4F','','E','','1.4','2','','E0'),
('0372','EL BOMBALARI, EĞİTİM, el veya  tüfek ile','1','1.2G','','B1000C','','1','1','','E0'),
('0373','İŞARET ALETLERİ, EL','1','1.4S','','E','','1.4','4','','E0'),
('0374','SONDAJ CİHAZLARI, PATLAYICI','1','1.1D','','B1000C','','1','1','','E0'),
('0375','SONDAJ CİHAZLARI, PATLAYICI','1','1.2D','','B1000C','','1','1','','E0'),
('0376','KAPSÜLLER, BORU TİPİ','1','1.4S','','E','','1.4','4','','E0'),
('0377','KAPSÜLLER, BAŞLIK TİPİ','1','1.1B','','B1000C','','1','1','','E0'),
('0378','KAPSÜLLER, BAŞLIK TİPİ','1','1.4B','','E','','1.4','2','','E0'),
('0379','KOVANLAR, KARTUŞ, BOŞ, KAPSÜLLÜ','1','1.4C','','E','','1.4','2','','E0'),
('0380','NESNELER, PİROFORİK','1','1.2L','','B','','1','0','','E0'),
('0381','KARTUŞLARI, GÜÇ ALETİ','1','1.2C','','B1000C','','1','1','','E0'),
('0382','BİLEŞENLERİ, PATLAYICI  ZİNCİRİ, B.B.B.','1','1.2B','','B1000C','','1','1','','E0'),
('0383','BİLEŞENLERİ, PATLAYICI  ZİNCİRİ, B.B.B.','1','1.4B','','E','','1.4','2','','E0'),
('0384','BİLEŞENLERİ, PATLAYICI  ZİNCİRİ, B.B.B.','1','1.4S','','E','','1.4','4','','E0'),
('0385','5-NİTROBENZOTRİAZOL','1','1.1D','','B1000C','','1','1','','E0'),
('0386','TRİNİTROBENZENSÜLFONİK  ASİT','1','1.1D','','B1000C','','1','1','','E0'),
('0387','TRİNİTROFLORENON','1','1.1D','','B1000C','','1','1','','E0'),
('0388','TRİNİTROTOLUEN (TNT) VE  TRİNİTROBENZEN KARIŞIMI  veya TRİNİTROTOLUEN (TNT) VE  HEKZANİTROSTİLBEN  KARIŞIMI','1','1.1D','','B1000C','','1','1','','E0'),
('0389','TRİNİTROTOLUEN (TNT)  KARIŞIMI TRİNİTROBENZEN VE  HEKZANİTROSTİLBEN İÇEREN','1','1.1D','','B1000C','','1','1','','E0'),
('0390','TRİTONAL','1','1.1D','','B1000C','','1','1','','E0'),
('0391','SİKLOTRİMETİLEN- TRİNİTRAMİN (SİKLONİT;  HEKSOJEN; RDX) VE  SİKLOTETRAMETİLEN- TETRANİTRAMİN (HMX;  OKTOJEN) KARIŞIM, kütlece %  15''ten az olmayan su ile  ISLATILMIŞ veya %10''dan az  olmayan flegmatizör ile  DUYARLILIĞI AZALTILMIŞ','1','1.1D','','B1000C','','1','1','','E0'),
('0392','HEKZANİTROSTİLBEN','1','1.1D','','B1000C','','1','1','','E0'),
('0393','HEKZOTONAL','1','1.1D','','B1000C','','1','1','','E0'),
('0394','TRİNİTRORESORSİNOL (STİFNİK  ASİT) ISLATILMIŞ kütlece %20''den  az olmayan su veya su alkol','1','1.1D','','B1000C','','1','1','','E0'),
('0395','ROKET MOTORLARI, SIVI  YAKITLI','1','1.2J','','B1000C','','1','1','','E0'),
('0396','ROKET MOTORLARI, SIVI  YAKITLI','1','1.3J','','C','','1','1','','E0'),
('0397','ROKETLER, SIVI YAKITLI  paralama hakkı olan','1','1.1J','','B1000C','','1','1','','E0'),
('0398','ROKETLER, SIVI YAKITLI  paralama hakkı olan','1','1.2J','','B1000C','','1','1','','E0'),
('0399','BOMBALAR, ALEVLENEBİLİR SIVISI OLAN paralama hakkı olan','1','1.1J','','B1000C','','1','1','','E0'),
('0400','BOMBALAR, ALEVLENEBİLİR SIVISI OLAN paralama hakkı olan','1','1.2J','','B1000C','','1','1','','E0'),
('0401','DİPİKRİL SÜLFÜR, kuru veya  kütlece %10''dan az suyla ıslatılmış','1','1.1D','','B1000C','','1','1','','E0'),
('0402','AMONYUM PERKLORAT','1','1.1D','','B1000C','','1','1','','E0'),
('0403','İŞARET FİŞEKLERİ, HAVAİ','1','1.4G','','E','','1.4','2','','E0'),
('0404','İŞARET FİŞEKLERİ, HAVAİ','1','1.4S','','E','','1.4','4','','E0'),
('0405','FİŞEKLERİ, İŞARET','1','1.4S','','E','','1.4','4','','E0'),
('0406','DİNİTROSOBENZEN','1','1.3C','','C5000D','','1','1','','E0'),
('0407','TETRAZOL-1-ASETİK ASİT','1','1.4C','','E','','1.4','2','','E0'),
('0408','FÜNYELER, İNFİLAKLI, koruyucu  özellikli','1','1.1D','','B1000C','','1','1','','E0'),
('0409','FÜNYELER, İNFİLAKLI, koruyucu  özellikli','1','1.2D','','B1000C','','1','1','','E0'),
('0410','FÜNYELER, İNFİLAKLI, koruyucu  özellikli','1','1.4D','','E','','1.4','2','','E0'),
('0411','PENTAERİTRİT TETRANİTRAT  (PENTAERİTRİTOL  TETRANİTRAT; PETN) kütlece  %7''den az olmayan balmumu ile','1','1.1D','','B1000C','','1','1','','E0'),
('0412','KARTUŞLAR, SİLAHLAR İÇİN  paralama hakkı olan','1','1.4E','','E','','1.4','2','','E0'),
('0413','KARTUŞLAR, SİLAHLAR İÇİN, KURUSIKI','1','1.2C','','B1000C','','1','1','','E0'),
('0414','MADDELERİ, SEVK, TOP İÇİN','1','1.2C','','B1000C','','1','1','','E0'),
('0415','MADDELERİ, SEVK','1','1.2C','','B1000C','','1','1','','E0'),
('0417','KARTUŞLAR, SİLAHLAR İÇİN, TESİRSİZ MERMİLİ veya  KARTUŞLAR, HAFİF SİLAHLAR  İÇİN','1','1.3C','','C5000D','','1','1','','E0'),
('0418','İŞARET FİŞEKLERİ, YÜZEY','1','1.1G','','B1000C','','1','1','','E0'),
('0419','İŞARET FİŞEKLERİ, YÜZEY','1','1.2G','','B1000C','','1','1','','E0'),
('0420','İŞARET FİŞEKLERİ, HAVAİ','1','1.1G','','B1000C','','1','1','','E0'),
('0421','İŞARET FİŞEKLERİ, HAVAİ','1','1.2G','','B1000C','','1','1','','E0'),
('0424','MERMİLER, tesirsiz, izli','1','1.3G','','C5000D','','1','1','','E0'),
('0425','MERMİLER, tesirsiz, izli','1','1.4G','','E','','1.4','2','','E0'),
('0426','MERMİLER paralama hakkı veya  fırlatma yükü olan','1','1.2F','','B1000C','','1','1','','E0'),
('0427','MERMİLER paralama hakkı veya  fırlatma yükü olan','1','1.4F','','E','','1.4','2','','E0'),
('0428','NESNELER, PİROTEKNİK teknik  amaçlar için','1','1.1G','','B1000C','','1','1','','E0'),
('0429','NESNELER, PİROTEKNİK teknik  amaçlar için','1','1.2G','','B1000C','','1','1','','E0'),
('0430','NESNELER, PİROTEKNİK teknik  amaçlar için','1','1.3G','','C5000D','','1','1','','E0'),
('0431','NESNELER, PİROTEKNİK teknik  amaçlar için','1','1.4G','','E','','1.4','2','','E0'),
('0432','NESNELER, PİROTEKNİK teknik  amaçlar için','1','1.4S','','E','','1.4','4','','E0'),
('0433','BARUT KALIBI (BARUT  MACUNU), ISLATILMIŞ, kütlece  %17''den daha az olmayan alkol ile','1','1.1C','','B1000C','','1','1','','E0'),
('0434','MERMİLER paralama hakkı veya  fırlatma yükü olan','1','1.2G','','B1000C','','1','1','','E0'),
('0435','MERMİLER paralama hakkı veya  fırlatma yükü olan','1','1.4G','','E','','1.4','2','','E0'),
('0436','ROKETLER fırlatma yükü olan','1','1.2C','','B1000C','','1','1','','E0'),
('0437','ROKETLER fırlatma yükü olan','1','1.3C','','C5000D','','1','1','','E0'),
('0438','ROKETLER fırlatma yükü olan','1','1.4C','','E','','1.4','2','','E0'),
('0439','İMLA HAKLARI, BOŞLUKLU, kapsülsüz','1','1.2D','','B1000C','','1','1','','E0'),
('0440','İMLA HAKLARI, BOŞLUKLU, kapsülsüz','1','1.4D','','E','','1.4','2','','E0'),
('0441','İMLA HAKLARI, BOŞLUKLU, kapsülsüz','1','1.4S','','E','','1.4','4','','E0'),
('0442','İMLA HAKLARI, İNFİLAKLI,  TİCARİ kapsülsüz','1','1.1D','','B1000C','','1','1','','E0'),
('0443','İMLA HAKLARI, İNFİLAKLI,  TİCARİ kapsülsüz','1','1.2D','','B1000C','','1','1','','E0'),
('0444','İMLA HAKLARI, İNFİLAKLI,  TİCARİ kapsülsüz','1','1.4D','','E','','1.4','2','','E0'),
('0445','İMLA HAKLARI, İNFİLAKLI,  TİCARİ kapsülsüz','1','1.4S','','E','','1.4','4','','E0'),
('0446','KOVANLAR, YANICI, BOŞ, KAPSÜLSÜZ','1','1.4C','','E','','1.4','2','','E0'),
('0447','KOVANLAR, YANICI, BOŞ, KAPSÜLSÜZ','1','1.3C','','C5000D','','1','1','','E0'),
('0448','5-MERKAPTOTETRAZOL-1- ASETİK ASİT','1','1.4C','','E','','1.4','2','','E0'),
('0449','TORPİDOLAR, SIVI YAKITLI, paralama hakkı olan veya olmayan','1','1.1J','','B1000C','','1','1','','E0'),
('0450','TORPİDOLAR, SIVI YAKITLI, tesirsiz başlığı olan','1','1.3J','','C','','1','1','','E0'),
('0451','TORPİDOLAR paralama hakkı olan','1','1.1D','','B1000C','','1','1','','E0'),
('0452','EL BOMBALARI, EĞİTİM, el veya  tüfek ile','1','1.4G','','E','','1.4','2','','E0'),
('0453','ROKETLER, HALAT FIRLATICI','1','1.4G','','E','','1.4','2','','E0'),
('0454','ATEŞLEYİCİLER','1','1.4S','','E','','1.4','4','','E0'),
('0455','KAPSÜLLER, ELEKTRİKLİ  OLMAYAN, patlatma için','1','1.4S','','E','','1.4','4','','E0'),
('0456','KAPSÜLLER, ELEKTRİKLİ  patlatma için','1','1.4S','','E','','1.4','4','','E0'),
('0457','İMLA HAKLARI, PARALAMA, PLASTİK BAĞLI','1','1.1D','','B1000C','','1','1','','E0'),
('0458','İMLA HAKLARI, PARALAMA, PLASTİK BAĞLI','1','1.2D','','B1000C','','1','1','','E0'),
('0459','İMLA HAKLARI, PARALAMA, PLASTİK BAĞLI','1','1.4D','','E','','1.4','2','','E0'),
('0460','İMLA HAKLARI, PARALAMA, PLASTİK BAĞLI','1','1.4S','','E','','1.4','4','','E0'),
('0461','BİLEŞENLERİ, PATLAYICI  ZİNCİRİ, B.B.B.','1','1.1B','','B1000C','','1','1','','E0'),
('0462','NESNELER, PATLAYICI, B.B.B.','1','1.1C','','B1000C','','1','1','','E0'),
('0463','NESNELER, PATLAYICI, B.B.B.','1','1.1D','','B1000C','','1','1','','E0'),
('0464','NESNELER, PATLAYICI, B.B.B.','1','1.1E','','B1000C','','1','1','','E0'),
('0465','NESNELER, PATLAYICI, B.B.B.','1','1.1F','','B1000C','','1','1','','E0'),
('0466','NESNELER, PATLAYICI, B.B.B.','1','1.2C','','B1000C','','1','1','','E0'),
('0467','NESNELER, PATLAYICI, B.B.B.','1','1.2D','','B1000C','','1','1','','E0'),
('0468','NESNELER, PATLAYICI, B.B.B.','1','1.2E','','B1000C','','1','1','','E0'),
('0469','NESNELER, PATLAYICI, B.B.B.','1','1.2F','','B1000C','','1','1','','E0'),
('0470','NESNELER, PATLAYICI, B.B.B.','1','1.3C','','C5000D','','1','1','','E0'),
('0471','NESNELER, PATLAYICI, B.B.B.','1','1.4E','','E','','1.4','2','','E0'),
('0472','NESNELER, PATLAYICI, B.B.B.','1','1.4F','','E','','1.4','2','','E0'),
('0473','MADDELER, PATLAYICI, B.B.B.','1','1.1A','','B','','1','0','','E0'),
('0474','MADDELER, PATLAYICI, B.B.B.','1','1.1C','','B1000C','','1','1','','E0'),
('0475','MADDELER, PATLAYICI, B.B.B.','1','1.1D','','B1000C','','1','1','','E0'),
('0476','MADDELER, PATLAYICI, B.B.B.','1','1.1G','','B1000C','','1','1','','E0'),
('0477','MADDELER, PATLAYICI, B.B.B.','1','1.3C','','C5000D','','1','1','','E0'),
('0478','MADDELER, PATLAYICI, B.B.B.','1','1.3G','','C5000D','','1','1','','E0'),
('0479','MADDELER, PATLAYICI, B.B.B.','1','1.4C','','E','','1.4','2','','E0'),
('0480','MADDELER, PATLAYICI, B.B.B.','1','1.4D','','E','','1.4','2','','E0'),
('0481','MADDELER, PATLAYICI, B.B.B.','1','1.4S','','E','','1.4','4','','E0'),
('0482','MADDELER, PATLAYICI, ÇOK  DUYARSIZ (MADDELER, EVI), B.B.B.','1','1.5D','','B1000C','','1.5','1','','E0'),
('0483','SİKLOTRİMETİLEN- TRİNİTRAMİN (SİKLONİT;  HEKSOJEN; RDX), DUYARLILIĞI  AZALTILMIŞ','1','1.1D','','B1000C','','1','1','','E0'),
('0484','SİKLOTETRAMETİLEN- TETRANİTRAMİN (HMX;  OKTOJEN), DUYARLILIĞI  AZALTILMIŞ','1','1.1D','','B1000C','','1','1','','E0'),
('0485','MADDELER, PATLAYICI, B.B.B.','1','1.4G','','E','','1.4','2','','E0'),
('0486','NESNELER, PATLAYICI, AŞIRI  DUYARSIZ (NESNELER, EEI)','1','1.6N','','E','','1.6','2','','E0'),
('0487','İŞARETLERİ, DUMAN','1','1.3G','','C5000D','','1','1','','E0'),
('0488','MÜHİMMATI, EĞİTİM','1','1.3G','','C5000D','','1','1','','E0'),
('0489','DİNİTROGLİKOLURİL (DINGU)','1','1.1D','','B1000C','','1','1','','E0'),
('0490','NİTROTRİAZOLON (NTO)','1','1.1D','','B1000C','','1','1','','E0'),
('0491','MADDELERİ, SEVK','1','1.4C','','E','','1.4','2','','E0'),
('0492','İŞARETLERİ, DEMİRYOLU, PATLAYICI','1','1.3G','','C5000D','','1','1','','E0'),
('0493','İŞARETLERİ, DEMİRYOLU, PATLAYICI','1','1.4G','','E','','1.4','2','','E0'),
('0494','JET DELİCİ SİLAHLAR, YÜKLÜ, petrol kuyusu, kapsülsüz','1','1.4D','','E','','1.4','2','','E0'),
('0495','SEVK YAKITI, SIVI','1','1.3C','','C5000D','','1','1','','E0'),
('0496','OKTONAL','1','1.1D','','B1000C','','1','1','','E0'),
('0497','SEVK YAKITI, SIVI','1','1.1C','','B1000C','','1','1','','E0'),
('0498','SEVK YAKITI, KATI','1','1.1C','','B1000C','','1','1','','E0'),
('0499','SEVK YAKITI, KATI','1','1.3C','','C5000D','','1','1','','E0'),
('0500','KAPSÜL DÜZENEKLERİ, ELEKTRİKLİ OLMAYAN, patlatma  için','1','1.4S','','E','','1.4','4','','E0'),
('0501','SEVK YAKITI, KATI','1','1.4C','','E','','1.4','2','','E0'),
('0502','ROKETLER tesirsiz başlığı olan','1','1.2C','','B1000C','','1','1','','E0'),
('0503','EMNİYET CİHAZLARI, PİROTEKNİK','1','1.4G','','E','','1.4','2','','E0'),
('0504','1H-TETRAZOL','1','1.1D','','B1000C','','1','1','','E0'),
('0505','İŞARETLER, İMDAT, gemi','1','1.4G','','E','','1.4','2','','E0'),
('0506','İŞARETLER, İMDAT, gemi','1','1.4S','','E','','1.4','4','','E0'),
('0507','İŞARETLERİ, DUMAN','1','1.4S','','E','','1.4','4','','E0'),
('0508','1-HİDROKSİBENZOTRİAZOL, SUSUZ, kütlece %20''den az su ile  ıslatılmış veya kuru','1','1.3C','','C5000D','','1','1','','E0'),
('0509','BARUT, DUMANSIZ','1','1.4C','','E','','1.4','2','','E0'),
('0510','ROKET MOTORLARI','1','1.4C','','E','','1.4','2','','E0'),
('0511','KAPSÜLLER, ELEKTRONİK  programlanabilir patlama için','1','1.1B','','B1000C','','1','1','','E0'),
('0512','KAPSÜLLER, ELEKTRONİK  programlanabilir patlama için','1','1.4B','','E','','1.4','2','','E0'),
('0513','KAPSÜLLER, ELEKTRONİK  programlanabilir patlama için','1','1.4S','','E','','1.4','4','','E0'),
('0514','YANGIN SÖNDÜRÜCÜ DAĞITICI  CİHAZLAR','1','1.4S','','E','','1.4','4','','E0'),
('1001','ASETİLEN, ÇÖZÜNMÜŞ','2','4F','','B/D','239','2.1','2','','E0'),
('1002','HAVA, SIKIŞTIRILMIŞ','2','1A','','E','20','2.2','3','120 ml','E1'),
('1003','HAVA, SOĞUTULMUŞ SIVI','2','3O','','C/E','225','2.2
+5.1','3','','E0'),
('1005','AMONYAK, SUSUZ','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('1006','ARGON, SIKIŞTIRILMIŞ','2','1A','','E','20','2.2','3','120 ml','E1'),
('1008','BOR TRİFLORÜR','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('1009','BROMOTRİFLOROMETAN  (SOĞUTUCU GAZ R 13B1)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1010','BÜTADİENLER, STABİLİZE veya  BÜTADİENLER VE  HİDROKARBON KARIŞIMI, STABİLİZE, ,% 20''tan fazla butadien  içeren','2','2F','','B/D','239','2.1','2','','E0'),
('1011','BÜTAN','2','2F','','B/D','23','2.1','2','','E0'),
('1012','BÜTİLEN','2','2F','','B/D','23','2.1','2','','E0'),
('1013','KARBON DİOKSİT','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1016','KARBON MONOKSİT, SIKIŞTIRILMIŞ','2','1TF','','B/D','263','2.3
+2.1','1','','E0'),
('1017','KLOR','2','2TOC','','C/D','265','2.3
+5.1
+8','1','','E0'),
('1018','KLORODİFLOROMETAN  (SOĞUTUCU GAZ R 22)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1020','KLOROPENTAFLORO-ETAN  (SOĞUTUCU GAZ R 115)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1021','1-KLORO-1,2,2,2- TETRAFLOROETAN (SOĞUTUCU  GAZ R 124)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1022','KLOROTRİFLOROMETAN  (SOĞUTUCU GAZ R 13)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1023','KÖMÜR GAZI, SIKIŞTIRILMIŞ','2','1TF','','B/D','263','2.3
+2.1','1','','E0'),
('1026','SİYANOJEN','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('1027','SİKLOPROPAN','2','2F','','B/D','23','2.1','2','','E0'),
('1028','DİKLORODİFLOROMETAN  (SOĞUTUCU GAZ R 12)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1029','DİKLORODİFLOROMETAN  (SOĞUTUCU GAZ R 21)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1030','1,1-DİFLOROETAN (SOĞUTUCU  GAZ R 152a)','2','2F','','B/D','23','2.1','2','','E0'),
('1032','DİMETİLAMİN, SUSUZ','2','2F','','B/D','23','2.1','2','','E0'),
('1033','DİMETİL ETER','2','2F','','B/D','23','2.1','2','','E0'),
('1035','ETAN','2','2F','','B/D','23','2.1','2','','E0'),
('1036','ETİLAMİN','2','2F','','B/D','23','2.1','2','','E0'),
('1037','ETİL KLORÜR','2','2F','','B/D','23','2.1','2','','E0'),
('1038','ETİLEN, SOĞUTULMUŞ SIVI','2','3F','','B/D','223','2.1','2','','E0'),
('1039','ETİL METİL ETER','2','2F','','B/D','23','2.1','2','','E0'),
('1040','ETİLEN OKSİT','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('1041','ETİLEN OKSİT VE KARBON  DİOKSİT KARIŞIM %9''dan fazlaa  olan ancak %87''den fazla olmayan etilen oksit','2','2F','','B/D','239','2.1','2','','E0'),
('1043','GÜBRE, AMONYAKLAŞTIRICI  ÇÖZELTİ, serbest amonyak ile','2','4A','','E','','2.2','','',''),
('1044','YANGIN SÖNDÜRÜCÜLER  sıkıştırılmış veya sıvılaştırılmış gazlı','2','6A','','E','','2.2','3','120 ml','E0'),
('1045','FLOR, SIKIŞTIRILMIŞ','2','1TOC','','D','','2.3
+5.1
+8','1','','E0'),
('1046','HELYUM, SIKIŞTIRILMIŞ','2','1A','','E','20','2.2','3','120 ml','E1'),
('1048','HİDROJEN BROMÜR, SUSUZ','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('1049','HİDROJEN, SIKIŞTIRILMIŞ','2','1F','','B/D','23','2.1','2','','E0'),
('1050','HİDROJEN KLORÜR, SUSUZ','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('1051','HİDROJEN SİYANÜR, STABİLİZE  %3''ten az su içeren','6.1','TF1','I','D','','6.1
+3','0','','E0'),
('1052','HİDROJEN FLORÜR, SUSUZ','8','CT1','I','C/D','886','8
+6.1','1','','E0'),
('1053','HİDROJEN SÜLFÜR','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('1055','İZOBÜTİLEN','2','2F','','B/D','23','2.1','2','','E0'),
('1056','KRİPTON, SIKIŞTIRILMIŞ','2','1A','','E','20','2.2','3','120 ml','E1'),
('1057','ÇAKMAKLAR veya ÇAKMAK  GAZI KARTUŞLARI, alevlenebilir gaz içeren','2','6F','','D','','2.1','2','','E0'),
('1058','SIVILAŞTIRILMIŞ GAZLAR, alevlenebilir olmayan, azot, karbondioksit, veya hava yüklü','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1060','METİL ASETİLEN VE  PROPADİEN KARIŞIMI, STABİLİZE karışım P1 veya karışım P2','2','2F','','B/D','239','2.1','2','','E0'),
('1061','METİLAMİN, SUSUZ','2','2F','','B/D','23','2.1','2','','E0'),
('1062','METİL BROMÜR %2''den daha az  kloropikrin ile','2','2T','','C/D','26','2.3','1','','E0'),
('1063','METİL KLORÜR (SOĞUTUCU  GAZ R 40)','2','2F','','B/D','23','2.1','2','','E0'),
('1064','METİL MERKAPTAN','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('1065','NEON, SIKIŞTIRILMIŞ','2','1A','','E','20','2.2','3','120 ml','E1'),
('1066','AZOT, SIKIŞTIRILMIŞ','2','1A','','E','20','2.2','3','120 ml','E1'),
('1067','DİAZOT TETRAOKSİT (AZOT  DİOKSİT)','2','2TOC','','C/D','265','2.3
+5.1
+8','1','','E0'),
('1069','NİTROZİL KLORÜR','2','2TC','','D','','2.3
+8','1','','E0'),
('1070','NİTRÖZ OKSİT','2','2O','','C/E','25','2.2
+5.1','3','','E0'),
('1071','PETROL GAZI, SIKIŞTIRILMIŞ','2','1TF','','B/D','263','2.3
+2.1','1','','E0'),
('1072','OKSİJEN, SIKIŞTIRILMIŞ','2','1O','','E','25','2.2
+5.1','3','','E0'),
('1073','OKSİJEN, SOĞUTULMUŞ SIVI','2','3O','','C/E','225','2.2
+5.1','3','','E0'),
('1075','PETROL GAZLARI, SIVILAŞTIRILMIŞ','2','2F','','B/D','23','2.1','2','','E0'),
('1076','FOSGEN','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('1077','PROPİLEN','2','2F','','B/D','23','2.1','2','','E0'),
('1078','SOĞUTUCU GAZ, B.B.B., karışım  F1, karışım F2 veya karışım F3 gibi','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1079','KÜKÜRT DİOKSİT','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('1080','KÜKÜRT HEKZAFLORÜR','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1081','TETRAFLOROETİLEN, STABİLİZE','2','2F','','B/D','239','2.1','2','','E0'),
('1082','TRİFLOROKLOROETİLEN, STABİLİZE (SOĞUTUCU GAZ R  1113)','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('1083','TRİMETİLAMİN, SUSUZ','2','2F','','B/D','23','2.1','2','','E0'),
('1085','VİNİL BROMÜR, STABİLİZE','2','2F','','B/D','239','2.1','2','','E0'),
('1086','VİNİL KLORÜR, STABİLİZE','2','2F','','B/D','239','2.1','2','','E0'),
('1087','VİNİL METİL ETER, STABİLİZE','2','2F','','B/D','239','2.1','2','','E0'),
('1088','ASETAL','3','F1','II','D/E','33','3','2','1 L','E2'),
('1089','ASETALDEHİT','3','F1','I','D/E','33','3','1','','E0'),
('1090','ASETON','3','F1','II','D/E','33','3','2','1 L','E2'),
('1091','ASETON YAĞLARI','3','F1','II','D/E','33','3','2','1 L','E2'),
('1092','AKROLEİN, STABİLİZE','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('1093','AKRİLONİTRİL, STABİLİZE','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1098','ALİL ALKOL','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('1099','ALİL BROMÜR','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1100','ALİL KLORÜR','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1104','AMİL ASETATLAR','3','F1','III','D/E','30','3','3','5 L','E1'),
('1105','PENTANOLLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('1106','AMİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1107','AMİL KLORÜR','3','F1','II','D/E','33','3','2','1 L','E2'),
('1108','1-PENTEN (n-AMİLEN)','3','F1','I','D/E','33','3','1','','E3'),
('1109','AMİL FORMATLAR','3','F1','III','D/E','30','3','3','5 L','E1'),
('1110','n-AMİL METİL KETON','3','F1','III','D/E','30','3','3','5 L','E1'),
('1111','AMİL MERKAPTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1112','AMİL NİTRAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1113','AMİL NİTRİT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1114','BENZEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1120','BÜTANOLLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('1123','BÜTİL ASETATLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('1125','n-BÜTİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1126','1 -BROMOBÜTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1127','KLOROBÜTANLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('1128','n-BÜTİL FORMAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1129','BÜTİRALDEHİT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1130','KAFUR YAĞI','3','F1','III','D/E','30','3','3','5 L','E1'),
('1131','KARBON DİSÜLFÜR','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1133','YAPIŞTIRICILAR alevlenebilir sıvı  içeren','3','F1','I','D/E','33','3','1','500 ml','E3'),
('1134','KLOROBENZEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('1135','ETİLEN KLOROHİDRİN','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('1136','KÖMÜR KATRANI  DİSTİLATLARI, ALEVLENEBİLİR','3','F1','II','D/E','33','3','2','1 L','E2'),
('1139','KAPLAMA ÇÖZELTİSİ (yüzey  uygulamaları veya endüstriyel veya  araç alt kaplaması, varil veya fıçı iç  kaplaması gibi diğer kaplamaları  kapsar)','3','F1','I','D/E','33','3','1','500 ml','E3'),
('1143','KROTONALDEHİT veya  KROTONALDEHİT, STABİLİZE','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('1144','KROTONİLEN','3','F1','I','D/E','339','3','1','','E3'),
('1145','SİKLOHEKZAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1146','SİKLOPENTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1147','DEKAHİDRONAFTALİN','3','F1','III','D/E','30','3','3','5 L','E1'),
('1148','DİASETON ALKOL','3','F1','II','D/E','33','3','2','1 L','E2'),
('1149','DİBÜTİL ETERLER','3','F1','III','D/E','30','3','3','5 L','E1'),
('1150','1,2-DİKLOROETİLEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1152','DİKLOROPENTANLAR','3','F1','III','D/E','30','3','3','5 L','E1'),
('1153','ETİLEN GLİKOL DİETİL ETER','3','F1','II','D/E','33','3','2','1 L','E2'),
('1154','DİETİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1155','DİETİL ETER (ETİL ETER)','3','F1','I','D/E','33','3','1','','E3'),
('1156','DİETİL KETON','3','F1','II','D/E','33','3','2','1 L','E2'),
('1157','DİİZOBÜTİL KETON','3','F1','III','D/E','30','3','3','5 L','E1'),
('1158','DİİZOPROPİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1159','DİİZOPROPİL ETER','3','F1','II','D/E','33','3','2','1 L','E2'),
('1160','DİMETİLAMİN SULU ÇÖZELTİ','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1161','DİMETİL KARBONAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1162','DİMETİLDİKLOROSİLAN','3','FC','II','D/E','X338','3
+8','2','','E0'),
('1163','DİMETİLHİDRAZİN, ASİMETRİK','6.1','TFC','I','C/D','663','6.1
+3
+8','1','','E0'),
('1164','DİMETİL SÜLFÜR','3','F1','II','D/E','33','3','2','1 L','E2'),
('1165','DİOKSAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1166','DİOKSOLAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1167','DİVİNİL ETER, STABİLİZE','3','F1','I','D/E','339','3','1','','E3'),
('1170','ETANOL (ETİL ALKOL) veya  ETANOL ÇÖZELTİSİ (ETİL  ALKOL ÇÖZELTİSİ)','3','F1','II','D/E','33','3','2','1 L','E2'),
('1171','ETİLEN GLİKOL MONOETİL  ETER','3','F1','III','D/E','30','3','3','5 L','E1'),
('1172','ETİLEN GLİKOL MONOETİL  ETER ASETAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1173','ETİL ASETAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1175','ETİLBENZEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1176','ETİL BORAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1177','2-ETİLBÜTİL ASETAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1178','2-ETİLBÜTİRALDEHİT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1179','ETİL BÜTİL ETER','3','F1','II','D/E','33','3','2','1 L','E2'),
('1180','ETİL BÜTİRAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1181','ETİL KLOROASETAT','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E4'),
('1182','ETİL KLOROFORMAT','6.1','TFC','I','C/D','663','6.1
+3
+8','1','','E0'),
('1183','ETİLDİKLOROSİLAN','4.3','WFC','I','B/E','X338','4.3
+3
+8','0','','E0'),
('1184','ETİLEN DİKLORÜR','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('1185','ETİLENİMİN, STABİLİZE','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('1188','ETİLEN GLİKOL MONOMETİL  ETER','3','F1','III','D/E','30','3','3','5 L','E1'),
('1189','ETİLEN GLİKOL MONOMETİL  ETER ASETAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1190','ETİL FORMAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1191','OKTİL ALDEHİTLER','3','F1','III','D/E','30','3','3','5 L','E1'),
('1192','ETİL LAKTAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1193','ETİL METİL KETON (METİL ETİL  KETON)','3','F1','II','D/E','33','3','2','1 L','E2'),
('1194','ETİL NİTRİT ÇÖZELTİSİ','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1195','ETİL PROPİONAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1196','ETİLTRİKLOROSİLAN','3','FC','II','D/E','X338','3
+8','2','','E0'),
('1197','ÖZÜTLER, SIVI tat veya aroma için (50 °C''de buhar basıncı 110 kPa’dan  daha yüksek olan)','3','F1','II','D/E','33','3','2','5 L','E2'),
('1198','FORMALDEHİT ÇÖZELTİSİ, ALEVLENEBİLİR','3','FC','III','D/E','38','3
+8','3','5 L','E1'),
('1199','FURALDEHİTLER','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E4'),
('1201','FUZEL YAĞI','3','F1','II','D/E','33','3','2','1 L','E2'),
('1202','GAZ YAĞI veya DİZEL YAKIT  veya ISITMA YAĞI, HAFİF  (parlama noktası 60 °C''den fazla  olmayan)','3','F1','III','D/E','30','3','3','5 L','E1'),
('1203','BENZİN veya GAZOLİN veya  PETROL','3','F1','II','D/E','33','3','2','1 L','E2'),
('1204','NİTROGLİSERİN ÇÖZELTİSİ, ALKOLDE %1''den az nitrogliserin  ile','3','D','II','B','','3','2','1 L','E0'),
('1206','HEPTANLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('1207','HEKZALDEHİT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1208','HEKZANLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('1210','MATBAA MÜREKKEBİ, alevlenebilir veya MATBAA  MÜREKKEBİ İLE İLGİLİ  MALZEME (matbaa mürekkebi  inceltici veya azaltıcı bileşiği dâhil), alevlenebilir','3','F1','I','D/E','33','3','1','500 ml','E3'),
('1212','İZOBÜTANOL (İZOBÜTİL  ALKOL)','3','F1','III','D/E','30','3','3','5 L','E1'),
('1213','İZOBÜTİL ASETAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1214','İZOBÜTİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1216','İZOOKTENLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('1218','İZOPREN, STABİLİZE','3','F1','I','D/E','339','3','1','','E3'),
('1219','İZOPROPANOL (İZOPROPİL  ALKOL)','3','F1','II','D/E','33','3','2','1 L','E2'),
('1220','İZOPROPİL ASETAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1221','İZOPROPİLAMİN','3','FC','I','C/E','338','3
+8','1','','E0'),
('1222','İZOPROPİL NİTRAT','3','F1','II','E','','3','2','1 L','E2'),
('1223','KEROSEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('1224','KETONLAR, SIVI, B.B.B (50 °C''de  buhar basıncı 110 kPa’dan daha  yüksek olan)','3','F1','II','D/E','33','3','2','1 L','E2'),
('1228','MERKAPTANLAR, SIVI, ALEVLENEBİLİR, ZEHİRLİ, B.B.B. veya MERKAPTAN  KARIŞIMI, SIVI, ALEVLENEBİLİR, ZEHİRLİ, B.B.B.','3','FT1','II','D/E','336','3
+6.1','2','1 L','E0'),
('1229','MESİTİL OKSİT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1230','METANOL','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('1231','METİL ASETAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1233','METİLAMİL ASETAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1234','METİLAL','3','F1','II','D/E','33','3','2','1 L','E2'),
('1235','METİLAMİN, SULU ÇÖZELTİ','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1237','METİL BÜTİRAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1238','METİL KLOROFORMAT','6.1','TFC','I','C/D','663','6.1
+3
+8','1','','E0'),
('1239','METİL KLOROMETİL ETER','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('1242','METİLDİKLOROSİLAN','4.3','WFC','I','B/E','X338','4.3
+3
+8','0','','E0'),
('1243','METİL FORMAT','3','F1','I','D/E','33','3','1','','E3'),
('1244','METİLHİDRAZİN','6.1','TFC','I','C/D','663','6.1
+3
+8','1','','E0'),
('1245','METİL İZOBÜTİL KETON','3','F1','II','D/E','33','3','2','1 L','E2'),
('1246','METİL İZOPROPENİL KETON, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('1247','METİL METAKRİLAT  MONOMER, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('1248','METİL PROPİONAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1249','METİL PROPİL KETON','3','F1','II','D/E','33','3','2','1 L','E2'),
('1250','METİLTRİKLOROSİLAN','3','FC','II','D/E','X338','3
+8','2','','E0'),
('1251','METİL VİNİL KETON, STABİLİZE','6.1','TFC','I','C/D','639','6.1
+3
+8','1','','E0'),
('1259','NİKEL KARBONİL','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('1261','NİTROMETAN','3','F1','II','E','','3','2','1 L','E0'),
('1262','OKTANLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('1263','BOYA (boya, vernik, emaye, renklendirici, lake, cila, parlatıcı sıvı  dolgu ve sıvı vernik bazı dâhil) veya  BOYA İLE İLGİLİ MALZEME  (boya inceltici veya azaltıcı bileşiği  dâhil)','3','F1','I','D/E','33','3','1','500 ml','E3'),
('1264','PARALDEHİT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1265','PENTANLAR, sıvı','3','F1','I','D/E','33','3','1','','E3'),
('1266','PARFÜMERİ ÜRÜNLERİ  alevlenebilir çözücüler içeren (50  °C''de buhar basıncı, 110 kPa’dan  daha yüksek olan)','3','F1','II','D/E','33','3','2','5 L','E2'),
('1267','HAM PETROL','3','F1','I','D/E','33','3','1','500 ml','E3'),
('1268','PETROL DİSTİLATLARI, B.B.B. veya PETROL ÜRÜNLERİ, B.B.B.','3','F1','I','D/E','33','3','1','500 ml','E3'),
('1272','ÇAM YAĞI','3','F1','III','D/E','30','3','3','5 L','E1'),
('1274','n-PROPANOL (PROPİL ALKOL, NORMAL)','3','F1','II','D/E','33','3','2','1 L','E2'),
('1275','PROPİONALDEHİT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1276','n-PROPİL ASETAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1277','PROPİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1278','1-KLOROPROPAN','3','F1','II','D/E','33','3','2','1 L','E0'),
('1279','1,2-DİKLOROPROPAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1280','PROPİLEN OKSİT','3','F1','I','D/E','33','3','1','','E3'),
('1281','PROPİL FORMATLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('1282','PRİDİN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1286','ÇAM SAKIZI YAĞI (50 °C''de buhar  basıncı 110 kPa’dan daha yüksek  olan)','3','F1','II','D/E','33','3','2','5 L','E2'),
('1287','KAUÇUK ÇÖZELTİSİ (50 °C''de  buhar basıncı 110 kPa’dan daha  yüksek olan)','3','F1','II','D/E','33','3','2','5 L','E2'),
('1288','ŞİST YAĞI','3','F1','II','D/E','33','3','2','1 L','E2'),
('1289','SODYUM METİLAT ÇÖZELTİSİ  alkolde','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1292','TETRAETİL SİLİKAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('1293','TENTÜRLER, TIBBİ','3','F1','II','D/E','33','3','2','1 L','E2'),
('1294','TOLÜEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('1295','TRİKLOROSİLAN','4.3','WFC','I','B/E','X338','4.3
+3
+8','0','','E0'),
('1296','TRİETİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1297','TRİMETİLAMİN, SULU ÇÖZELTİ, kütlece %50''den az trimetilamin','3','FC','I','C/E','338','3
+8','1','','E0'),
('1298','TRİMETİLKLOROSİLAN','3','FC','II','D/E','X338','3
+8','2','','E0'),
('1299','TEREBENTİN','3','F1','III','D/E','30','3','3','5 L','E1'),
('1300','TEREBENTİN İKAMESİ','3','F1','II','D/E','33','3','2','1 L','E2'),
('1301','VİNİL ASETAT, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('1302','VİNİL ETİL ETER, STABİLİZE','3','F1','I','D/E','339','3','1','','E3'),
('1303','VİNİLİDEN KLORÜR, STABİLİZE','3','F1','I','D/E','339','3','1','','E3'),
('1304','VİNİL İZOBÜTİL ETER, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('1305','VİNİLTRİKLOROSİLAN','3','FC','II','D/E','X338','3
+8','2','','E0'),
('1306','AHŞAP KORUYUCULAR, SIVI (50  °C''de buhar basıncı 110 kPa’dan daha  yüksek olan)','3','F1','II','D/E','33','3','2','5 L','E2'),
('1307','KSİLENLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('1308','ZİRKONYUM, ALEVLENEBİLİR SIVI İÇİNDE ASKIDA','3','F1','I','D/E','33','3','1','','E0'),
('1309','ALÜMİNYUM TOZU, KAPLANMIŞ','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1310','AMONYUM PİKRAT, ISLATILMIŞ  kütlece %10''dan az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1312','BORNEOL','4.1','F1','III','E','40','4.1','3','5 kg','E1'),
('1313','KALSİYUM REZİNAT','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('1314','KALSİYUM REZİNAT, ERGİTİLMİŞ','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('1318','KOBALT REZİNAT, ÇÖKELMİŞ','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('1320','DİNİTROFENOL, ISLATILMIŞ  kütlece %15''ten az olmayan su ile','4.1','DT','I','B','','4.1
+6.1','1','','E0'),
('1321','DİNİTROFENOLATLAR, ISLATILMIŞ kütlece %15''ten az  olmayan su ile','4.1','DT','I','B','','4.1
+6.1','1','','E0'),
('1322','DİNİTRORESORSİNOL, ISLATILMIŞ kütlece %15''ten az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1323','FERROSERYUM','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1324','FİLMLER, NİTROSELÜLOZ  ESASLI, jelatin kaplı, artık olanlar  hariç','4.1','F1','III','E','','4.1','3','5 kg','E1'),
('1325','ALEVLENEBİLİR KATI, ORGANİK, B.B.B.','4.1','F1','II','E','40','4.1','2','1 kg','E2'),
('1326','HAFNİYUM TOZU, ISLATILMIŞ  %25''ten az olmayan su ile','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1327','Kuru ot, Saman veya Anız','4.1','F1','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('1328','HEKZAMETİLENTETRAMİN','4.1','F1','III','E','40','4.1','3','5 kg','E1'),
('1330','MANGANEZ REZİNAT','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('1331','KİBRİTLER, ''HERHANGİ BİR  YERDE ÇAKILABİLİR''','4.1','F1','III','E','','4.1','4','5 kg','E0'),
('1332','METALDEHİT','4.1','F1','III','E','40','4.1','3','5 kg','E1'),
('1333','SERYUM, plakalar, külçeler veya  çubuklar','4.1','F3','II','E','','4.1','2','1 kg','E2'),
('1334','NAFTALİN, HAM veya NAFTALİN, RAFİNE','4.1','F1','III','E','40','4.1','3','5 kg','E1'),
('1336','NİTROGUANİDİN (PİKRİT), ISLATILMIŞ kütlece %20''den az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1337','NİTRO-NİŞASTA, ISLATILMIŞ  kütlece %20''den az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1338','FOSFOR, AMORF','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('1339','FOSFOR HEPTASÜLFİT, sarı ve  beyaz fosfor içermeyen','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1340','FOSFOR PENTASÜLFİT, sarı ve  beyaz fosfor içermeyen','4.3','WF2','II','D/E','423','4.3
+4.1','0','500 g','E2'),
('1341','FOSFOR SESKUİSÜLFİT, sarı ve  beyaz fosfor içermeyen','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1343','FOSFOR TRİSÜLFİT, sarı ve beyaz  fosfor içermeyen','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1344','TRİNİTROFENOL (PİKRİK ASİT)  ISLATILMIŞ kütlece %30''dan az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1345','KAUÇUK HURDA veya KAUÇUK  DÖKÜNTÜ, toz veya granül 840  mikronu ve kauçuk içeriği %45''i  geçmeyen','4.1','F1','II','E','40','4.1','4','1 kg','E2'),
('1346','SİLİKON TOZU, AMORF','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('1347','GÜMÜŞ PİKRAT, ISLATILMIŞ  kütlece %30''dan az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1348','SODYUM DİNİTRO-o-KRESOLAT, ISLATILMIŞ kütlece %15''ten az  olmayan su ile','4.1','DT','I','B','','4.1
+6.1','1','','E0'),
('1349','SODYUM PİKRAMAT, ISLATILMIŞ kütlece %20''den az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1350','KÜKÜRT','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('1352','TİTANYUM TOZU, ISLATILMIŞ  %25''ten az olmayan su ile','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1353','LİFLER veya KUMAŞLAR, HAFİFÇE NİTRATLANMIŞ  NİTROSELÜLOZA EMDİRİLMİŞ, B.B.B.','4.1','F1','III','E','','4.1','3','5 kg','E1'),
('1354','TRİNİTROBENZEN, ISLATILMIŞ  kütlece %30''dan az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1355','TRİNİTROBENZOİK ASİT, ISLATILMIŞ kütlece %30''dan az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1356','TRİNİTROTOLUEN (TNT), ISLATILMIŞ kütlece %30''dan az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1357','ÜRE NİTRAT, ISLATILMIŞ kütlece  %20''den az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1358','ZİRKONYUM TOZU, ISLATILMIŞ  %25''ten az olmayan su ile','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1360','KALSİYUM FOSFÜR','4.3','WT2','I','E','','4.3
+6.1','1','','E0'),
('1361','KARBON, hayvansal veya bitkisel  kaynaklı','4.2','S2','II','D/E','40','4.2','2','','E0'),
('1362','KARBON, AKTİF','4.2','S2','III','E','40','4.2','4','','E1'),
('1363','KOPRA','4.2','S2','III','E','40','4.2','3','','E0'),
('1364','PAMUK ARTIĞI, YAĞLI','4.2','S2','III','E','40','4.2','3','','E0'),
('1365','PAMUK, ISLAK','4.2','S2','III','E','40','4.2','3','','E0'),
('1369','p-NİTROSODİMETİLANİLİN','4.2','S2','II','D/E','40','4.2','2','','E2'),
('1372','Lifler, hayvansal veya lifler, bitkisel  yanmış, ıslak veya nemli','4.2','S2','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('1373','LİFLER veya KUMAŞLAR, HAYVANSAL veya BİTKİSEL veya  SENTETİK, B.B.B. yağlı','4.2','S2','III','E','40','4.2','3','','E0'),
('1374','BALIK UNU (BALIK ATIĞI), STABİLİZE OLMAYAN','4.2','S2','II','D/E','40','4.2','2','','E2'),
('1376','DEMİR OKSİT, KULLANILMIŞ  veya DEMİR SÜNGERİ, KULLANILMIŞ, kömür gaz  saflaştırma ile elde edilen','4.2','S4','III','E','40','4.2','3','','E0'),
('1378','METAL KATALİZÖR, ISLATILMIŞ, görünür derecede fazla  sıvı ile','4.2','S4','II','D/E','40','4.2','2','','E0'),
('1379','KAĞIT, DOYMAMIŞ YAĞ İLE  İŞLEM GÖRMÜŞ, tümüyle  kurutulmamış (karbon kağıt dâhil)','4.2','S2','III','E','40','4.2','3','','E0'),
('1380','PENTABORAN','4.2','ST3','I','B/E','333','4.2
+6.1','0','','E0'),
('1381','FOSFOR, BEYAZ veya SARI, SU  ALTINDA veya ÇÖZELTİ İÇİNDE','4.2','ST3','I','B/E','46','4.2
+6.1','0','','E0'),
('1382','POTASYUM SÜLFÜR, SUSUZ veya  POTASYUM SÜLFÜR %30''dan az  kristalizasyon suyu ile','4.2','S4','II','D/E','40','4.2','2','','E2'),
('1383','PİROFORİK METAL, B.B.B. veya  PİROFORİK ALAŞIM, B.B.B.','4.2','S4','I','B/E','43','4.2','0','','E0'),
('1384','SODYUM DİTİYONİT (SODYUM  HİDROSÜLFİT)','4.2','S4','II','D/E','40','4.2','2','','E2'),
('1385','SODYUM SÜLFÜR, SUSUZ veya  SODYUM SÜLFÜR %30''dan az  kristalizasyon suyu ile','4.2','S4','II','D/E','40','4.2','2','','E2'),
('1386','TOHUM KÜSPESİ kütlece %1,5''ten  fazla yağ ve kütlece %11''den az nem  ile','4.2','S2','III','E','40','4.2','3','','E0'),
('1387','Yün atıkları, ıslak','4.2','S2','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('1389','ALKALİ METAL AMALGAM, SIVI','4.3','W1','I','B/E','X323','4.3','1','','E0'),
('1390','ALKALİ METAL AMİTLER','4.3','W2','II','D/E','423','4.3','0','500 g','E2'),
('1391','ALKALİ METAL DAĞILIMI veya  ALKALİ TOPRAK METAL  DAĞILIMI','4.3','W1','I','B/E','X323','4.3','1','','E0'),
('1392','ALKALİ TOPRAK METAL  AMALGAM, SIVI','4.3','W1','I','B/E','X323','4.3','1','','E0'),
('1393','ALKALİ TOPRAK METAL  ALAŞIM, B.B.B.','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('1394','ALÜMİNYUM KARBÜR','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('1395','ALÜMİNYUM FERROSİLİKON TOZU','4.3','WT2','II','D/E','462','4.3
+6.1','2','500 g','E2'),
('1396','ALÜMİNYUM TOZU, KAPLANMAMIŞ','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('1397','ALÜMİNYUM FOSFÜR','4.3','WT2','I','E','','4.3
+6.1','1','','E0'),
('1398','ALÜMİNYUM SİLİKON TOZU, KAPLANMAMIŞ','4.3','W2','III','E','423','4.3','3','1 kg','E1'),
('1400','BARYUM','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('1401','KALSİYUM','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('1402','KALSİYUM KARBÜR','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('1403','KALSİYUM SİYANAMİD %0,1''den  fazla kalsiyum karbür ile','4.3','W2','III','E','423','4.3','0','1 kg','E1'),
('1404','KALSİYUM HİDRÜR','4.3','W2','I','E','','4.3','1','','E0'),
('1405','KALSİYUM SİLİSİD','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('1407','SEZYUM','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('1408','FERROSİLİKON %30 veya daha  fazla ancak %90''dan az silikon ile','4.3','WT2','III','E','462','4.3
+6.1','3','1 kg','E1'),
('1409','METAL HİDRİTLERİ, SU İLE  TEPKİMEYE GİREN, B.B.B.','4.3','W2','I','E','','4.3','1','','E0'),
('1410','LİTYUM ALÜMİNYUM HİDRÜR','4.3','W2','I','E','','4.3','1','','E0'),
('1411','LİTYUM ALÜMİNYUM HİDRÜR, ETERSİ','4.3','WF1','I','E','','4.3
+3','1','','E0'),
('1413','LİTYUM BOROHİDRÜR','4.3','W2','I','E','','4.3','1','','E0'),
('1414','LİTYUM HİDRÜR','4.3','W2','I','E','','4.3','1','','E0'),
('1415','LİTYUM','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('1417','LİTYUM SİLİKON','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('1418','MAGNEZYUM TOZU veya  MAGNEZYUM ALAŞIMLARI  TOZU','4.3','WS','I','E','','4.3
+4.2','1','','E0'),
('1419','MAGNEZYUM ALÜMİNYUM  FOSFÜR','4.3','WT2','I','E','','4.3
+6.1','1','','E0'),
('1420','POTASYUM METAL  ALAŞIMLARI, SIVI','4.3','W1','I','B/E','X323','4.3','1','','E0'),
('1421','ALKALİ METAL ALAŞIM, SIVI, B.B.B.','4.3','W1','I','B/E','X323','4.3','1','','E0'),
('1422','POTASYUM SODYUM  ALAŞIMLARI, SIVI','4.3','W1','I','B/E','X323','4.3','1','','E0'),
('1423','RUBİDYUM','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('1426','SODYUM BOROHİDRÜR','4.3','W2','I','E','','4.3','1','','E0'),
('1427','SODYUM HİDRÜR','4.3','W2','I','E','','4.3','1','','E0'),
('1428','SODYUM','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('1431','SODYUM METİLAT','4.2','SC4','II','D/E','48','4.2
+8','2','','E2'),
('1432','SODYUM FOSFÜR','4.3','WT2','I','E','','4.3
+6.1','1','','E0'),
('1433','KALAY FOSFÜRLER','4.3','WT2','I','E','','4.3
+6.1','1','','E0'),
('1435','ÇİNKO KÜLLERİ','4.3','W2','III','E','423','4.3','3','1 kg','E1'),
('1436','ÇİNKO TOZU veya ÇİNKO TOZ','4.3','WS','I','E','','4.3
+4.2','1','','E0'),
('1437','ZİRKONYUM HİDRÜR','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1438','ALÜMİNYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1439','AMONYUM DİKROMAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1442','AMONYUM PERKLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1444','AMONYUM PERSÜLFAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1445','BARYUM KLORAT, KATI','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('1446','BARYUM NİTRAT','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('1447','BARYUM PERKLORAT, KATI','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('1448','BARYUM PERMANGANAT','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('1449','BARYUM PEROKSİT','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('1450','BROMATLAR, İNORGANİK, B.B.B.','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1451','SEZYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1452','KALSİYUM KLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1453','KALSİYUM KLORİT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1454','KALSİYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1455','KALSİYUM PERKLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1456','KALSİYUM PERMANGANAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1457','KALSİYUM PEROKSİT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1458','KLORAT VE BORAT KARIŞIMI','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1459','KLORAT VE MAGNEZYUM  KLORÜR KARIŞIMI, KATI','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1461','KLORATLAR, İNORGANİK, B.B.B.','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1462','KLORİTLER, İNORGANİK, B.B.B.','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1463','KROM TRİOKSİT, SUSUZ','5.1','OTC','II','E','568','5.1
+6.1
+8','2','1 kg','E2'),
('1465','DİDİMİYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1466','DEMİR NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1467','GUANİDİN NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1469','KURŞUN NİTRAT','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('1470','KURŞUN PERKLORAT, KATI','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('1471','LİTYUM HİPOKLORİT, KURU  veya LİTYUM HİPOKLORİT  KARIŞIMI','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1472','LİTYUM PEROKSİT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1473','MAGNEZYUM BROMAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1474','MAGNEZYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1475','MAGNEZYUM PERKLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1476','MAGNEZYUM PEROKSİT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1477','NİTRATLAR, İNORGANİK, B.B.B.','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1479','YÜKSELTGEN KATI, B.B.B.','5.1','O2','I','E','','5.1','1','','E0'),
('1481','PERKLORATLAR, İNORGANİK, B.B.B.','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1482','PERMANGANATLAR, İNORGANİK, B.B.B.','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1483','PEROKSİTLER, İNORGANİK, B.B.B.','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1484','POTASYUM BROMAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1485','POTASYUM KLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1486','POTASYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1487','POTASYUM NİTRAT VE  SODYUM NİTRİT KARIŞIMI','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1488','POTASYUM NİTRİT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1489','POTASYUM PERKLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1490','POTASYUM PERMANGANAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1491','POTASYUM PEROKSİT','5.1','O2','I','E','','5.1','1','','E0'),
('1492','POTASYUM PERSÜLFAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1493','GÜMÜŞ NİTRAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1494','SODYUM BROMAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1495','SODYUM KLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1496','SODYUM KLORİT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1498','SODYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1499','POTASYUM NİTRAT VE  SODYUM NİTRAT KARIŞIMI','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1500','SODYUM NİTRİT','5.1','OT2','III','E','56','5.1
+6.1','3','5 kg','E1'),
('1502','SODYUM PERKLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1503','SODYUM PERMANGANAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1504','SODYUM PEROKSİT','5.1','O2','I','E','','5.1','1','','E0'),
('1505','SODYUM PERSÜLFAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1506','STRONSİYUM KLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1507','STRONSİYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1508','STRONSİYUM PERKLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1509','STRONSİYUM PEROKSİT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1510','TETRANİTROMETAN','6.1','TO1','I','B/D','665','6.1
+5.1','1','','E0'),
('1511','ÜRE HİDROJEN PEROKSİT','5.1','OC2','III','E','58','5.1
+8','3','5 kg','E1'),
('1512','ÇİNKO AMONYUM NİTRİT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1513','ÇİNKO KLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1514','ÇİNKO NİTRAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1515','ÇİNKO PERMANGANAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1516','ÇİNKO PEROKSİT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1517','ZİRKONYUM PİKRAMAT, ISLATILMIŞ kütlece %20''den az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('1541','ASETON SİYANOHİDRİN, STABİLİZE','6.1','T1','I','C/D','669','6.1','1','','E0'),
('1544','ALKALOİTLER, KATI, B.B.B. veya  ALKALOİT TUZLARI, KATI, B.B.B.','6.1','T2','I','C/E','66','6.1','1','','E5'),
('1545','ALİL İZOTİYOSİYANAT, STABİLİZE','6.1','TF1','II','D/E','639','6.1
+3','2','100 ml','E0'),
('1546','AMONYUM ARSENAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1547','ANİLİN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1548','ANİLİN HİDROKLORÜR','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('1549','ANTİMON BİLEŞİĞİ, İNORGANİK, KATI, B.B.B.','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('1550','ANTİMON LAKTAT','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('1551','ANTİMON POTASYUM  TARTARAT','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('1553','ARSENİK ASİT, SIVI','6.1','T4','I','C/E','66','6.1','1','','E5'),
('1554','ARSENİK ASİT, KATI','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1555','ARSENİK BROMÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1556','ARSENİK BİLEŞİĞİ, SIVI, B.B.B., inorganik, içeriği: Arsenatlar, b.b.b., Arsenitler, b.b.b., ve Arsenik sülfürler, b.b.b.','6.1','T4','I','C/E','66','6.1','1','','E5'),
('1557','ARSENİK BİLEŞİĞİ, KATI, B.B.B., inorganik, içeriği: Arsenatlar, b.b.b., Arsenitler, b.b.b. ve Arsenik sülfürler b.b.b.','6.1','T5','I','C/E','66','6.1','1','','E5'),
('1558','ARSENİK','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1559','ARSENİK PENTOKSİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1560','ARSENİK TRİKLORÜR','6.1','T4','I','C/E','66','6.1','1','','E0'),
('1561','ARSENİK TRİOKSİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1562','ARSENİK TOZU','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1564','BARYUM BİLEŞİĞİ, B.B.B.','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1565','BARYUM SİYANÜR','6.1','T5','I','C/E','66','6.1','1','','E5'),
('1566','BERİLYUM BİLEŞİĞİ, B.B.B.','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1567','BERİLYUM TOZU','6.1','TF3','II','D/E','64','6.1
+4.1','2','500 g','E4'),
('1569','BROMOASETON','6.1','TF1','II','D/E','63','6.1
+3','2','','E0'),
('1570','BRÜSİN','6.1','T2','I','C/E','66','6.1','1','','E5'),
('1571','BARYUM AZİT, ISLATILMIŞ  kütlece %50''den az olmayan su ile','4.1','DT','I','B','','4.1
+6.1','1','','E0'),
('1572','KAKODİLİK ASİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1573','KALSİYUM ARSENAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1574','KALSİYUM ARSENAT VE  KALSİYUM ARSENİT KARIŞIMI, KATI','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1575','KALSİYUM SİYANÜR','6.1','T5','I','C/E','66','6.1','1','','E5'),
('1577','KLORODİNİTROBENZENLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1578','KLORONİTROBENZENLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1579','4-KLORO-o-TOLUİDİN  HİDROKLORÜR, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('1580','KLOROPİKRİN','6.1','T1','I','C/D','66','6.1','1','','E0'),
('1581','KLOROPİKRİN VE METİL  BROMÜR KARIŞIMI %2''den fazla  kloropikrin ile','2','2T','','C/D','26','2.3','1','','E0'),
('1582','KLOROPİKRİN VE METİL  KLORÜR KARIŞIMI','2','2T','','C/D','26','2.3','1','','E0'),
('1583','KLOROPİKRİN KARIŞIMI, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E0'),
('1585','BAKIR ASETOARSENİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1586','BAKIR ARSENİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1587','BAKIR SİYANÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1588','SİYANÜRLER, İNORGANİK, KATI, B.B.B.','6.1','T5','I','C/E','66','6.1','1','','E5'),
('1589','SİYANOJEN KLORÜR,  STABİLİZE','2','2TC','','D','','2.3
+8','1','','E0'),
('1590','DİKLOROANİLİNLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1591','o-DİKLOROBENZEN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('1593','DİKLOROMETAN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('1594','DİETİL SÜLFAT','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1595','DİMETİL SÜLFAT','6.1','TC1','I','C/D','668','6.1
+8','1','','E0'),
('1596','DİNİTROANİLİNLER','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1597','DİNİTROBENZENLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1598','DİNİTRO-o-KRESOL','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1599','DİNİTROFENOL ÇÖZELTİSİ','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1600','DİNİTROTOLUENLER, ERİMİŞ','6.1','T1','II','D/E','60','6.1','0','','E0'),
('1601','DEZENFEKTAN, KATI, ZEHİRLİ, B.B.B.','6.1','T2','I','C/E','66','6.1','1','','E5'),
('1602','BOYA, SIVI, ZEHİRLİ, B.B.B. veya  BOYA ARA ÜRÜN, SIVI, ZEHİRLİ, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E5'),
('1603','ETİL BROMOASETAT','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E0'),
('1604','ETİLENDİAMİN','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('1605','ETİLEN DİBROMÜR','6.1','T1','I','C/D','66','6.1','1','','E0'),
('1606','DEMİR ARSENAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1607','DEMİR ARSENİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1608','FERROZ ARSENAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1611','HEKZAETİL TETRAFOSFAT','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1612','HEKZAETİL TETRAFOSFAT VE  SIKIŞTIRILMIŞ GAZ KARIŞIMI','2','1T','','C/D','26','2.3','1','','E0'),
('1613','HİDROSİYANİK ASİT, SULU  ÇÖZELTİ (HİDROJEN SİYANÜR, SULU ÇÖZELTİ) %20''den fazla  olmayan hidrojen siyanür ile','6.1','TF1','I','C/D','663','6.1
+3','0','','E0'),
('1614','HİDROJEN SİYANÜR, STABİLİZE, %3''ten az su içeren ve gözenekli inert  malzemeye emdirilmiş','6.1','TF1','I','D','','6.1
+3','0','','E0'),
('1616','KURŞUN ASETAT','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('1617','KURŞUN ARSENATLAR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1618','KURŞUN ARSENİTLER','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1620','KURŞUN SİYANÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1621','LONDON PURPLE (ETKEN  MADDESİ KALSİYUM ARSENAT  OLAN İNSEKTİSİT)','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1622','MAGNEZYUM ARSENAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1623','CIVA ARSENAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1624','CIVA KLORÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1625','CIVA NİTRAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1626','CIVA POTASYUM SİYANÜR','6.1','T5','I','C/E','66','6.1','1','','E5'),
('1627','CIVA NİTRAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1629','CIVA ASETAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1630','CIVA AMONYUM KLORÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1631','CIVA BENZOAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1634','CIVA BROMÜRLER','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1636','CIVA SİYANÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1637','CIVA GLUKONAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1638','CIVA İYODÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1639','CIVA NÜKLEAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1640','CIVA OLEAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1641','CIVA OKSİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1642','CIVA OKSİSİYANÜR, DUYARLILIĞI AZALTILMIŞ','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1643','CIVA POTASYUM İYODÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1644','CIVA SALİSİLAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1645','CIVA SÜLFAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1646','CIVA TİYOSİYANAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1647','METİL BROMÜR VE ETİLEN  DİBROMÜR KARIŞIMI, SIVI','6.1','T1','I','C/D','66','6.1','1','','E0'),
('1648','ASETONİTRİL','3','F1','II','D/E','33','3','2','1 L','E2'),
('1649','MOTOR YAKITI VURUNTU  ÖNLEYİCİ KARIŞIM','6.1','T3','I','C/E','66','6.1','1','','E0'),
('1650','beta-NAFTİLAMİN, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1651','NAFTİLİTİYOÜRE','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1652','NAFTİLÜRE','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1653','NİKEL SİYANÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1654','NİKOTİN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1655','NİKOTİN BİLEŞİĞİ, KATI, B.B.B. veya NİKOTİN MÜSTAHZAR, KATI, B.B.B.','6.1','T2','I','C/E','66','6.1','1','','E5'),
('1656','NİKOTİN HİDROKLORÜR, SIVI  veya ÇÖZELTİ','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1657','NİKOTİN SALİSİLAT','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1658','NİKOTİN SÜLFAT, ÇÖZELTİ','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1659','NİKOTİN TARTARAT','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1660','NİTRİK OKSİT, SIKIŞTIRILMIŞ','2','1TOC','','D','','2.3
+5.1
+8','1','','E0'),
('1661','NİTROANİLİNLER (o-, m-, p)','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1662','NİTROBENZEN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1663','NİTROFENOLLER (o-, m-, p-)','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('1664','NİTROTOLUENLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1665','NİTROKSİLENLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1669','PENTAKLOROETAN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1670','PERKLOROMETİL MERKAPTAN','6.1','T1','I','C/D','66','6.1','1','','E0'),
('1671','FENOL, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1672','FENİLKARBİLAMİN KLORÜR','6.1','T1','I','C/E','66','6.1','1','','E0'),
('1673','FENİLENDİAMİNLER (o-, m-, p-)','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('1674','FENİLCIVA ASETAT','6.1','T3','II','D/E','60','6.1','2','500 g','E4'),
('1677','POTASYUM ARSENAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1678','POTASYUM ARSENİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1679','POTASYUM KUPROSİYANÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1680','POTASYUM SİYANÜR, KATI','6.1','T5','I','C/E','66','6.1','1','','E5'),
('1683','GÜMÜŞ ARSENİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1684','GÜMÜŞ SİYANÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1685','SODYUM ARSENAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1686','SODYUM ARSENİT, SULU  ÇÖZELTİ','6.1','T4','II','D/E','60','6.1','2','100 ml','E4'),
('1687','SODYUM AZİD','6.1','T5','II','E','','6.1','2','500 g','E4'),
('1688','SODYUM KAKODİLAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1689','SODYUM SİYANÜR, KATI','6.1','T5','I','C/E','66','6.1','1','','E5'),
('1690','SODYUM FLORÜR, KATI','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('1691','STRONSİYUM ARSENİT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1692','STRİKNİN veya STRİKNİN  TUZLARI','6.1','T2','I','C/E','66','6.1','1','','E5'),
('1693','GÖZ YAŞARTICI GAZ MADDESİ, SIVI, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E0'),
('1694','BROMOBENZİL SİYANÜRLER, SIVI','6.1','T1','I','C/E','66','6.1','1','','E0'),
('1695','KLOROASETON, STABİLİZE','6.1','TFC','I','C/D','663','6.1
+3
+8','1','','E0'),
('1697','KLOROASETOFENON, KATI','6.1','T2','II','D/E','60','6.1','2','','E0'),
('1698','DİFENİLAMİN KLOROARSİN','6.1','T3','I','C/E','66','6.1','1','','E0'),
('1699','DİFENİLKLORO-ARSİN, SIVI','6.1','T3','I','C/E','66','6.1','1','','E0'),
('1700','GÖZ YAŞARTICI GAZ MUMLARI','6.1','TF4','','E','','6.1
+4.1','2','','E0'),
('1701','KSİLİL BROMÜR, SIVI','6.1','T1','II','D/E','60','6.1','2','','E0'),
('1702','1,1,2,2-TETRAKLOROETAN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1704','TETRAETİL DİTİYOPİROFOSFAT','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1707','TALYUM BİLEŞİĞİ, B.B.B.','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1708','TOLUİDİNLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1709','2,4-TOLUİLENDİAMİN, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('1710','TRİKLOROETİLEN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('1711','KSİLİDİNLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1712','ÇİNKO ARSENAT, ÇİNKO  ARSENİT veya ÇİNKO ARSENAT  VE ÇİNKO ARSENİT KARIŞIMI','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('1713','ÇİNKO SİYANÜR','6.1','T5','I','C/E','66','6.1','1','','E5'),
('1714','ÇİNKO FOSFÜR','4.3','WT2','I','E','','4.3
+6.1','1','','E0'),
('1715','ASETİK ANHİDRİT','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('1716','ASETİL BROMÜR','8','C3','II','E','80','8','2','1 L','E2'),
('1717','ASETİL KLORÜR','3','FC','II','D/E','X338','3
+8','2','1 L','E2'),
('1718','BÜTİL ASİT FOSFAT','8','C3','III','E','80','8','3','5 L','E1'),
('1719','KOSTİK ALKALİ SIVI, B.B.B.','8','C5','II','E','80','8','2','1 L','E2'),
('1722','ALİL KLOROFORMAT','6.1','TFC','I','C/D','668','6.1
+3
+8','1','','E0'),
('1723','ALİL İYODÜR','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1724','ALİLTRİKLOROSİLAN, STABİLİZE','8','CF1','II','D/E','X839','8
+3','2','','E0'),
('1725','ALÜMİNYUM BROMÜR, SUSUZ','8','C2','II','E','80','8','2','1 kg','E2'),
('1726','ALÜMİNYUM KLORÜR, SUSUZ','8','C2','II','E','80','8','2','1 kg','E2'),
('1727','AMONYUM  HİDROJENDİFLORÜR, KATI','8','C2','II','E','80','8','2','1 kg','E2'),
('1728','AMİLTRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1729','ANİZOİL KLORÜR','8','C4','II','E','80','8','2','1 kg','E2'),
('1730','ANTİMON PENTAKLORÜR, SIVI','8','C1','II','E','X80','8','2','1 L','E2'),
('1731','ANTİMON PENTAKLORÜR ÇÖZELTİSİ','8','C1','II','E','80','8','2','1 L','E2'),
('1732','ANTİMON PENTAFLORÜR','8','CT1','II','E','86','8
+6.1','2','1 L','E0'),
('1733','ANTİMON TRİKLORÜR','8','C2','II','E','80','8','2','1 kg','E2'),
('1736','BENZOİL KLORÜR','8','C3','II','E','80','8','2','1 L','E2'),
('1737','BENZİL BROMÜR','6.1','TC1','II','D/E','68','6.1
+8','2','','E4'),
('1738','BENZİL KLORÜR','6.1','TC1','II','D/E','68','6.1
+8','2','','E4'),
('1739','BENZİL KLOROFORMAT','8','C9','I','E','88','8','1','','E0'),
('1740','HİDROJENDİFLORÜRLER, KATI, B.B.B.','8','C2','II','E','80','8','2','1 kg','E2'),
('1741','BOR TRİKLORÜR','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('1742','BOR TRİFLORÜR ASETİK ASİT  KOMPLEKSİ, SIVI','8','C3','II','E','80','8','2','1 L','E2'),
('1743','BOR TRİFLORÜR PROPİONİK  ASİT KOMPLEKSİ, SIVI','8','C3','II','E','80','8','2','1 L','E2'),
('1744','BROM veya BROM ÇÖZELTİSİ','8','CT1','I','C/D','886','8
+6.1','1','','E0'),
('1745','BROM PENTAFLORÜR','5.1','OTC','I','B/E','568','5.1
+6.1
+8','1','','E0'),
('1746','BROM TRİFLORÜR','5.1','OTC','I','B/E','568','5.1
+6.1
+8','1','','E0'),
('1747','BÜTİLTRİKLOROSİLAN','8','CF1','II','D/E','X83','8
+3','2','','E0'),
('1748','KALSİYUM HİPOKLORİT, KURU  veya KALSİYUM HİPOKLORİT  KARIŞIMI, KURU %39''dan fazla  hazır klorür (%8,8 hazır oksijen) ile','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('1749','KLOR TRİFLORÜR','2','2TOC','','C/D','265','2.3
+5.1
+8','1','','E0'),
('1750','KLOROASETİK ASİT ÇÖZELTİSİ','6.1','TC1','II','D/E','68','6.1
+8','2','100 ml','E4'),
('1751','KLOROASETİK ASİT, KATI','6.1','TC2','II','D/E','68','6.1
+8','2','500 g','E4'),
('1752','KLOROASETİL KLORÜR','6.1','TC1','I','C/D','668','6.1
+8','1','','E0'),
('1753','KLOROFENİL-TRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1754','KLOROSÜLFONİK ASİT (kükürt  trioksit içeren veya içermeyen)','8','C1','I','E','X88','8','1','','E0'),
('1755','KROMİK ASİT ÇÖZELTİSİ','8','C1','II','E','80','8','2','1 L','E2'),
('1756','KROMİK FLORÜR, KATI','8','C2','II','E','80','8','2','1 kg','E2'),
('1757','KROMİK FLORÜR ÇÖZELTİSİ','8','C1','II','E','80','8','2','1 L','E2'),
('1758','KROM OKSİKLORÜR','8','C1','I','E','X88','8','1','','E0'),
('1759','AŞINDIRICI KATI, B.B.B.','8','C10','I','E','88','8','1','','E0'),
('1760','AŞINDIRICI SIVI, B.B.B.','8','C9','I','E','88','8','1','','E0'),
('1761','KÜPRİETİLENDİAMİN  ÇÖZELTİSİ','8','CT1','II','E','86','8
+6.1','2','1 L','E2'),
('1762','SİKLOHEKSENİLTRİKLORO- SİLAN','8','C3','II','E','X80','8','2','','E0'),
('1763','SİKLOHEKSENİLTRİKLORO- SİLAN','8','C3','II','E','X80','8','2','','E0'),
('1764','DİKLOROASETİK ASİT','8','C3','II','E','80','8','2','1 L','E2'),
('1765','DİKLOROASETİL KLORÜR','8','C3','II','E','X80','8','2','1 L','E2'),
('1766','DİKLOROFENİL- TRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1767','DİETİLDİKLOROSİLAN','8','CF1','II','D/E','X83','8
+3','2','','E0'),
('1768','DİFLOROFOSFORİK ASİT, SUSUZ','8','C1','II','E','80','8','2','1 L','E2'),
('1769','DİFENİLDİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1770','DİFENİLMETİL BROMÜR','8','C10','II','E','80','8','2','1 kg','E2'),
('1771','DODESİLTRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1773','DEMİR KLORÜR, SUSUZ','8','C2','III','E','80','8','3','5 kg','E1'),
('1774','YANGIN SÖNDÜRME CİHAZI  SEVK MADDELERİ, aşındırıcı sıvı','8','C9','II','E','','8','2','1 L','E0'),
('1775','FLOROBORİK ASİT','8','C1','II','E','80','8','2','1 L','E2'),
('1776','FLOROFOSFORİK ASİT, SUSUZ','8','C1','II','E','80','8','2','1 L','E2'),
('1777','FLOROSÜLFONİK ASİT','8','C1','I','E','88','8','1','','E0'),
('1778','FLOROSİLİSİK ASİT','8','C1','II','E','80','8','2','1 L','E2'),
('1779','FORMİK ASİT kütlece %85''ten fazla  asit içeren','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('1780','FUMARİL KLORÜR','8','C3','II','E','80','8','2','1 L','E2'),
('1781','HEKZADESİLTRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1782','HEKZAFLOROFOSFORİK ASİT','8','C1','II','E','80','8','2','1 L','E2'),
('1783','HEKZAMETİLENDİAMİN  ÇÖZELTİSİ','8','C7','II','E','80','8','2','1 L','E2'),
('1784','HEKZİLTRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1786','HİDROFLORİK ASİT VE  SÜLFÜRİK ASİT KARIŞIMI','8','CT1','I','C/D','886','8
+6.1','1','','E0'),
('1787','HİDRİYODİK ASİT','8','C1','II','E','80','8','2','1 L','E2'),
('1788','HİDROBROMİK ASİT','8','C1','II','E','80','8','2','1 L','E2'),
('1789','HİDROKLORİK ASİT','8','C1','II','E','80','8','2','1 L','E2'),
('1790','HİDROFLORİK ASİT %85''ten fazla  hidrojen florür içeren','8','CT1','I','C/D','886','8
+6.1','1','','E0'),
('1791','HİPOKLORİT ÇÖZELTİSİ','8','C9','II','E','80','8','2','1 L','E2'),
('1792','İYOT MONOKLORÜR, KATI','8','C2','II','E','80','8','2','1 kg','E0'),
('1793','İZOPROPİL ASİT FOSFAT','8','C3','III','E','80','8','3','5 L','E1'),
('1794','KURŞUN SÜLFAT %3''ten fazla  serbest asit içeren','8','C2','II','E','80','8','2','1 kg','E2'),
('1796','NİTRATLAYICI ASİT KARIŞIMI  %50''den fazla nitrik asit içeren','8','CO1','I','E','885','8
+5.1','1','','E0'),
('1798','NİTROHİDROKLORİK ASİT','8','COT','TAŞINMASI YASAKTIR','','','','','',''),
('1799','NONİLTRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1800','OKTADESİLTRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1801','OKTİLTRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1802','PERKLORİK ASİT, kütlece %50''den  fazla asit içermeyen','8','CO1','II','E','85','8
+5.1','2','1 L','E0'),
('1803','FENOLSÜLFONİK ASİT, SIVI','8','C3','II','E','80','8','2','1 L','E2'),
('1804','FENİLTRİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('1805','FOSFORİK ASİT, ÇÖZELTİ','8','C1','III','E','80','8','3','5 L','E1'),
('1806','FOSFOR PENTAKLORÜR','8','C2','II','E','80','8','2','1 kg','E0'),
('1807','FOSFOR PENTOKSİT','8','C2','II','E','80','8','2','1 kg','E2'),
('1808','FOSFOR TRİBROMÜR','8','C1','II','E','X80','8','2','1 L','E0'),
('1809','FOSFOR TRİKLORÜR','6.1','TC3','I','C/D','668','6.1
+8','1','','E0'),
('1810','FOSFOR OKSİKLORÜR','6.1','TC3','I','C/D','X668','6.1
+8','1','','E0'),
('1811','POTASYUM  HİDROJENDİFLORÜR, KATI','8','CT2','II','E','86','8
+6.1','2','1 kg','E2'),
('1812','POTASYUM FLORÜR, KATI','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('1813','POTASYUM HİDROKSİT, KATI','8','C6','II','E','80','8','2','1 kg','E2'),
('1814','POTASYUM HİDROKSİT  ÇÖZELTİSİ','8','C5','II','E','80','8','2','1 L','E2'),
('1815','PROPİONİL KLORÜR','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1816','PROPİLTRİKLOROSİLAN','8','CF1','II','D/E','X83','8
+3','2','','E0'),
('1817','PİROSÜLFİRİL KLORÜR','8','C1','II','E','X80','8','2','1 L','E2'),
('1818','SİLİKON TETRAKLORÜR','8','C1','II','E','X80','8','2','','E0'),
('1819','SODYUM ALÜMİNAT ÇÖZELTİSİ','8','C5','II','E','80','8','2','1 L','E2'),
('1823','SODYUM HİDROKSİT, KATI','8','C6','II','E','80','8','2','1 kg','E2'),
('1824','SODYUM HİDROKSİT ÇÖZELTİSİ','8','C5','II','E','80','8','2','1 L','E2'),
('1825','SODYUM MONOKSİT','8','C6','II','E','80','8','2','1 kg','E2'),
('1826','NİTRATLAYICI ASİT KARIŞIMI, KULLANILMIŞ %50''den fazla nitrik  asit içeren','8','CO1','I','E','885','8
+5.1','1','','E0'),
('1827','KALAY KLORÜR SUSUZ','8','C1','II','E','X80','8','2','1 L','E2'),
('1828','KÜKÜRT KLORÜRLER','8','C1','I','E','X88','8','1','','E0'),
('1829','KÜKÜRT TRİOKSİT, STABİLİZE','8','C1','I','E','X88','8','1','','E0'),
('1830','SÜLFÜRİK ASİT %51''den fazla asit  içeren','8','C1','II','E','80','8','2','1 L','E2'),
('1831','SÜLFÜRİK ASİT, DUMANLI','8','CT1','I','C/D','X886','8
+6.1','1','','E0'),
('1832','SÜLFÜRİK ASİT, KULLANILMIŞ','8','C1','II','E','80','8','2','1 L','E0'),
('1833','KÜKÜRTLÜ ASİT','8','C1','II','E','80','8','2','1 L','E2'),
('1834','SÜLFÜRİL KLORÜR','6.1','TC3','I','C/D','X668','6.1
+8','1','','E0'),
('1835','TETRAMETİLAMONYUM HİDROKSİT SULU ÇÖZELTİSİ,  %2,5’dan fazla ancak %25’ten az  tetrametilamonyum hidroksit içeren','8','CT1','II','E','86','8
+6.1','2','1 L','E2'),
('1836','TİYONİL KLORÜR','8','C1','I','E','X88','8','1','','E0'),
('1837','TİYOFOSFORİL KLORÜR','8','C1','II','E','X80','8','2','1 L','E0'),
('1838','TİTANYUM TETRAKLORÜR','6.1','TC3','I','C/D','X668','6.1
+8','1','','E0'),
('1839','TRİKLOROASETİK ASİT','8','C4','II','E','80','8','2','1 kg','E2'),
('1840','ÇİNKO KLORÜR ÇÖZELTİSİ','8','C1','III','E','80','8','3','5 L','E1'),
('1841','ASETALDEHİT AMONYAK','9','M11','III','E','90','9','3','5 kg','E1'),
('1843','AMONYUM DİNİTRO-o- KRESOLAT, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1845','Karbon dioksit, katı (Kuru buz)','9','M11','5.5.3 hariç ADR''YE TABİ DEĞİLDİR','','','','','',''),
('1846','KARBON TETRAKLORÜR','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1847','POTASYUM SÜLFÜR,  HİDRATLANMIŞ, %30''dan az  olmayan kristalizasyon suyu ile','8','C6','II','E','80','8','2','1 kg','E2'),
('1848','PROPİYONİK ASİT, kütlece  %10''dan fazla ancak %90''dan az asit  içeren','8','C3','III','E','80','8','3','5 L','E1'),
('1849','SODYUM SÜLFÜR,  HİDRATLANMIŞ %30''dan az  olmayan su ile','8','C6','II','E','80','8','2','1 kg','E2'),
('1851','İLAÇ, SIVI, ZEHİRLİ, B.B.B.','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1854','BARYUM ALAŞIMLARI, PİROFORİK','4.2','S4','I','B/E','43','4.2','0','','E0'),
('1855','KALSİYUM, PİROFORİK veya  KALSİYUM ALAŞIMLARI, PİROFORİK','4.2','S4','I','E','','4.2','0','','E0'),
('1856','Paçavralar, yağlı','4.2','S2','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('1857','Tekstil atığı, ıslak','4.2','S2','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('1858','HEKZAFLOROPROPİLEN  (SOĞUTUCU GAZ R 1216)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1859','SİLİKON TETRAFLORÜR','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('1860','VİNİL FLORÜR, STABİLİZE','2','2F','','B/D','239','2.1','2','','E0'),
('1862','ETİL KROTONAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('1863','YAKITI, HAVACILIK, TÜRBİN  MOTORU','3','F1','I','D/E','33','3','1','500 ml','E3'),
('1865','n-PROPİL NİTRAT','3','F1','II','E','','3','2','1 L','E2'),
('1866','REÇİNE ÇÖZELTİSİ, alevlenebilir','3','F1','I','D/E','33','3','1','500 ml','E3'),
('1868','DEKABORAN','4.1','FT2','II','E','46','4.1
+6.1','2','1 kg','E0'),
('1869','MAGNEZYUM veya  MAGNEZYUM ALAŞIMLARI  topak, talaş veya bantlar halinde  %50''den fazla magnezyum içeren','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('1870','POTASYUM BOROHİDRİT','4.3','W2','I','E','','4.3','1','','E0'),
('1871','TİTANYUM HİDRİT','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('1872','KURŞUN DİOKSİT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1873','PERKLORİK ASİT %50''den fazla, %72''den az asit içeren','5.1','OC1','I','B/E','558','5.1
+8','1','','E0'),
('1884','BARYUM OKSİT','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('1885','BENZİDİN','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('1886','BENZİLİDEN KLORÜR','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('1887','BROMOKLOROMETAN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('1888','KLOROFORM','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('1889','SİYANOJEN BROMÜR','6.1','TC2','I','C/E','668','6.1
+8','1','','E0'),
('1891','ETİL BROMÜR','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('1892','ETİLDİKLOROARSİN','6.1','T3','I','C/D','66','6.1','1','','E0'),
('1894','FENİLCIVA HİDROKSİT','6.1','T3','II','D/E','60','6.1','2','500 g','E4'),
('1895','FENİLCIVA NİTRAT','6.1','T3','II','D/E','60','6.1','2','500 g','E4'),
('1897','TETRAKLOROETİLEN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('1898','ASETİL İYODÜR','8','C3','II','E','80','8','2','1 L','E2'),
('1902','DİİZOOKTİL ASİT FOSFAT','8','C3','III','E','80','8','3','5 L','E1'),
('1903','DEZENFEKTAN, SIVI, AŞINDIRICI, B.B.B.','8','C9','I','E','88','8','1','','E0'),
('1905','SELENİK ASİT','8','C2','I','E','88','8','1','','E0'),
('1906','CÜRUF ASİT','8','C1','II','E','80','8','2','1 L','E0'),
('1907','SODALI KİREÇ %4''ten daha fazla  sodyum hidroksit içeren','8','C6','III','E','80','8','3','5 kg','E1'),
('1908','KLORİT ÇÖZELTİSİ','8','C9','II','E','80','8','2','1 L','E2'),
('1910','Kalsiyum oksit','8','C6','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('1911','DİBORAN','2','2TF','','D','','2.3
+2.1','1','','E0'),
('1912','METİL KLORÜR VE METİLEN  KLORÜR KARIŞIMI','2','2F','','B/D','23','2.1','2','','E0'),
('1913','NEON, SOĞUTULMUŞ SIVI','2','3A','','C/E','22','2.2','3','120 ml','E1'),
('1914','BÜTİL PROPİONATLAR','3','F1','III','D/E','30','3','3','5 L','E1'),
('1915','SİKLOHEKZANON','3','F1','III','D/E','30','3','3','5 L','E1'),
('1916','2,2''-DİKLORODİETİL ETER','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E4'),
('1917','ETİL AKRİLAT, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('1918','İZOPROPİLBENZEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('1919','METİL AKRİLAT, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('1920','NONANLAR','3','F1','III','D/E','30','3','3','5 L','E1'),
('1921','PROPİLENİMİN, STABİLİZE','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1922','PİROLİDİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('1923','KALSİYUM DİTİYONİT  (KALSİYUM HİDROSÜLFİTR)','4.2','S4','II','D/E','40','4.2','2','','E2'),
('1928','METİL MAGNEZYUM BROMÜR  ETİL ETER İÇİNDE','4.3','WF1','I','B/E','X323','4.3
+3','0','','E0'),
('1929','POTASYUM DİTİYONİT  (POTASYUM HİDROSÜLFİT)','4.2','S4','II','D/E','40','4.2','2','','E2'),
('1931','ÇİNKO DİTİYONİT (ÇİNKO  HİDROSÜLFİT)','9','M11','III','E','90','9','3','5 kg','E1'),
('1932','ZİRKONYUM HURDASI','4.2','S4','III','E','40','4.2','3','','E0'),
('1935','SİYANÜR ÇÖZELTİSİ, B.B.B.','6.1','T4','I','C/E','66','6.1','1','','E5'),
('1938','BROMOASETİK ASİT ÇÖZELTİSİ','8','C3','II','E','80','8','2','1 L','E2'),
('1939','FOSFOR OKSİBROMÜR','8','C2','II','E','80','8','2','1 kg','E0'),
('1940','TİYOGLİKOLİK ASİT','8','C3','II','E','80','8','2','1 L','E2'),
('1941','DİBROMODİFLOROMETAN','9','M11','III','E','90','9','3','5 L','E1'),
('1942','AMONYUM NİTRAT eklenen  herhangi bir diğer madde hariç  tutularak, karbon olarak hesaplanan  herhangi bir organik madde dâhil olmak üzere, %0,2''den fazla  tutuşabilir madde bulunmayan','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('1944','KİBRİTLERİ, EMNİYET (paket, karton veya kutu)','4.1','F1','III','E','','4.1','4','5 kg','E1'),
('1945','KİBRİTLER, MUMLU ''VESTA''','4.1','F1','III','E','','4.1','4','5 kg','E1'),
('1950','AEROSOLLER, asfiksant','2','5A','','E','','2.2','3','1 L','E0'),
('1951','ARGON, SOĞUTULMUŞ SIVI','2','3A','','C/E','22','2.2','3','120 ml','E1'),
('1952','ETİLEN OKSİT VE KARBON DİOKSİT KARIŞIMI %9''dan fazla olmayan etilen oksit ile','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1953','SIKIŞTIRILMIŞ GAZ, ZEHİRLİ, ALEVLENEBİLİR, B.B.B.','2','1TF','','B/D','263','2.3
+2.1','1','','E0'),
('1954','SIKIŞTIRILMIŞ GAZ, ALEVLENEBİLİR, B.B.B.','2','1F','','B/D','23','2.1','2','','E0'),
('1955','SIKIŞTIRILMIŞ GAZ, ZEHİRLİ, B.B.B.','2','1T','','C/D','26','2.3','1','','E0'),
('1956','SIKIŞTIRILMIŞ GAZ, B.B.B.','2','1A','','E','20','2.2','3','120 ml','E1'),
('1957','DOTERYUM, SIKIŞTIRILMIŞ','2','1F','','B/D','23','2.1','2','','E0'),
('1958','1,2-DİKLORO-1,1,2,2- TETRAFLOROETAN (SOĞUTUCU  GAZ R 114)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1959','1,1-DİFLOROETİLEN  (SOĞUTUCU GAZ R 1132a)','2','2F','','B/D','239','2.1','2','','E0'),
('1961','ETAN, SOĞUTULMUŞ SIVI','2','3F','','B/D','223','2.1','2','','E0'),
('1962','ETİLEN','2','2F','','B/D','23','2.1','2','','E0'),
('1963','HELYUM, SOĞUTULMUŞ SIVI','2','3A','','C/E','22','2.2','3','120 ml','E1'),
('1964','HİDROKARBON GAZ KARIŞIMI, SIKIŞTIRILMIŞ, B.B.B.','2','1F','','B/D','23','2.1','2','','E0'),
('1965','HİDROKARBON GAZ KARIŞIMI, SIVILAŞTIRILMIŞ, B.B.B. A, A01, A02, A0, A1, B1, B2, B veya C  karışımları gibi','2','2F','','B/D','23','2.1','2','','E0'),
('1966','HİDROJEN, SOĞUTULMUŞ SIVI','2','3F','','B/D','223','2.1','2','','E0'),
('1967','İNSEKTİSİT GAZ, ZEHİRLİ, B.B.B.','2','2T','','C/D','26','2.3','1','','E0'),
('1968','İNSEKTİSİT GAZ, B.B.B.','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1969','İZOBÜTAN','2','2F','','B/D','23','2.1','2','','E0'),
('1970','KRİPTON, SOĞUTULMUŞ SIVI','2','3A','','C/E','22','2.2','3','120 ml','E1'),
('1971','METAN, SIKIŞTIRILMIŞ veya  DOĞAL GAZ, SIKIŞTIRILMIŞ  yüksek metan içeren','2','1F','','B/D','23','2.1','2','','E0'),
('1972','METAN, SOĞUTULMUŞ SIVI veya  DOĞAL GAZ, SOĞUTULMUŞ  SIVI, yüksek metan içeren','2','3F','','B/D','223','2.1','2','','E0'),
('1973','KLORODİFLOROMETAN VE  KLOROPENTAFLOROETAN  KARIŞIMI sabitlenmiş kaynama  noktası, yaklaşık %49  klorodiflorometan içeren  (SOĞUTUCU GAZ R 502)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1974','KLORODİFLOROBROMO- METAN (SOĞUTUCU GAZ R  12B1)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1975','NİTRİK OKSİT VE DİAZOT  TETROKSİT KARIŞIMI (NİTRİK  OKSİT VE AZOT DİOKSİT  KARIŞIMI)','2','2TOC','','D','','2.3
+5.1
+8','1','','E0'),
('1976','OKTAFLOROSİKLOBÜTAN  (SOĞUTUCU GAZ RC 318)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1977','AZOT, SOĞUTULMUŞ SIVI','2','3A','','C/E','22','2.2','3','120 ml','E1'),
('1978','PROPAN','2','2F','','B/D','23','2.1','2','','E0'),
('1982','TETLAFLOROMETAN  (SOĞUTUCU GAZ R 14)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1983','1-KLORO-2,2,2-TRİFLOROETAN  (SOĞUTUCU GAZ R 133a)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1984','TRİFLOROMETAN (SOĞUTUCU  GAZ R 23)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('1986','ALKOLLER, ALEVLENEBİLİR,  ZEHİRLİ, B.B.B.','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1987','ALKOLLER, B.B.B (50 °C''de buhar  basıncı 110 kPa’dan daha yüksek  olan)','3','F1','II','D/E','33','3','2','1 L','E2'),
('1988','ALDEHİTLER, ALEVLENEBİLİR,  ZEHİRLİ, B.B.B.','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1989','ALDEHİTLER, B.B.B.','3','F1','I','D/E','33','3','1','','E3'),
('1990','BENZALDEHİT','9','M11','III','E','90','9','3','5 L','E1'),
('1991','KLOROPREN, STABİLİZE','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1992','ALEVLENEBİLİR SIVI, ZEHİRLİ, B.B.B.','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('1993','ALEVLENEBİLİR SIVI, B.B.B.','3','F1','I','D/E','33','3','1','','E3'),
('1994','DEMİR PENTAKARBONİL','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('1999','KATRANLAR, SIVI, yol yağı ve  inceltilmiş bitümler dâhil (50 °C''de  buhar basıncı 110 kPa’dan daha  yüksek olan)','3','F1','II','D/E','33','3','2','5 L','E2'),
('2000','SELÜLOİT blok, çubuk, rulo, tabaka, tüpler, vb. halinde, hurda dışında','4.1','F1','III','E','','4.1','3','5 kg','E1'),
('2001','KOBALT NAFTENATLAR, TOZ','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('2002','SELÜLOİT ARTIK','4.2','S2','III','E','','4.2','3','','E0'),
('2004','MAGNEZYUM DİAMİD','4.2','S4','II','D/E','40','4.2','2','','E2'),
('2006','PLASTİKLER, NİTROSELÜLOZ  ESASLI, KENDİLİĞİNDEN  ISINAN, B.B.B.','4.2','S2','III','E','','4.2','3','','E0'),
('2008','ZİRKONYUM TOZU, KURU','4.2','S4','I','B/E','43','4.2','0','','E0'),
('2009','ZİRKONYUM, KURU, işlenmiş  tabakalar, şeritler veya sarmal tel  şeklinde','4.2','S4','III','E','40','4.2','3','','E1'),
('2010','MAGNEZYUM HİDRİT','4.3','W2','I','E','','4.3','1','','E0'),
('2011','MAGNEZYUM FOSFÜR','4.3','WT2','I','E','','4.3
+6.1','1','','E0'),
('2012','POTASYUM FOSFÜR','4.3','WT2','I','E','','4.3
+6.1','1','','E0'),
('2013','STRONSİYUM FOSFÜR','4.3','WT2','I','E','','4.3
+6.1','1','','E0'),
('2014','HİDROJEN PEROKSİT, SULU  ÇÖZELTİ hidrojen peroksit oranı  %20''den fazla, ancak %60''tan az  (gerektiği gibi stabilize)','5.1','OC1','II','E','58','5.1
+8','2','1 L','E2'),
('2015','HİDROJEN PEROKSİT, STABİLİZE veya HİDROJEN  PEROKSİT, SULU ÇÖZELTİ, STABİLİZE %70''den fazla hidrojen  peroksit ile','5.1','OC1','I','B/E','559','5.1
+8','1','','E0'),
('2016','MÜHİMMAT, ZEHİRLİ, PATLAYICI OLMAYAN paralama  hakkı veya fırlatma yükü olmayan, fünyesiz','6.1','T10','','E','','6.1','2','','E0'),
('2017','MÜHİMMAT, GÖZ YAŞARTICI, PATLAYICI OLMAYAN paralama  hakkı veya fırlatma yükü olmayan, fünyesiz','6.1','TC5','','E','','6.1
+8','2','','E0'),
('2018','KLOROANİLİNLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2019','KLOROANİLİNLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2020','KLOROFENOLLER, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2021','KLOROFENOLLER, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2022','KRESİLİK ASİT','6.1','TC1','II','D/E','68','6.1
+8','2','100 ml','E4'),
('2023','EPİKLOROHİDRİN','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E4'),
('2024','CIVA BİLEŞİĞİ, SIVI, B.B.B.','6.1','T4','I','C/E','66','6.1','1','','E5'),
('2025','CIVA BİLEŞİĞİ, KATI, B.B.B.','6.1','T5','I','C/E','66','6.1','1','','E5'),
('2026','FENİLCIVA BİLEŞİĞİ, B.B.B.','6.1','T3','I','C/E','66','6.1','1','','E5'),
('2027','SODYUM ARSENİT, KATI','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('2028','BOMBALAR, SİS, PATLAYICI  OLMAYAN, aşındırıcı sıvı ile, tepkime başlatma düzeneği olmayan','8','C11','','E','','8','2','','E0'),
('2029','HİDRAZİN, SUSUZ','8','CFT','I','E','','8
+3
+6.1','1','','E0'),
('2030','HİDRAZİN SULU ÇÖZELTİ, kütlece  %37''den fazla hidrazin içeren','8','CT1','I','C/D','886','8
+6.1','1','','E0'),
('2031','NİTRİK ASİT, kırmızı dumanlı  dışında, %70''den fazla nitrik asit  içeren','8','CO1','I','E','885','8
+5.1','1','','E0'),
('2032','NİTRİK ASİT, KIRMIZI DUMANLI','8','COT','I','C/D','856','8
+5.1
+6.1','1','','E0'),
('2033','POTASYUM MONOKSİT','8','C6','II','E','80','8','2','1 kg','E2'),
('2034','HİDROJEN VE METAN KARIŞIMI, SIKIŞTIRILMIŞ','2','1F','','B/D','23','2.1','2','','E0'),
('2035','1,1,1-TRİFLOROETAN  (SOĞUTUCU GAZ R 143a)','2','2F','','B/D','23','2.1','2','','E0'),
('2036','KSENON','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('2037','KAPLAR, KÜÇÜK, GAZ İÇEREN  (GAZ KARTUŞLARI) tahliye  düzeneği olmayan ve yeniden  doldurulamayan','2','5A','','E','','2.2','3','1 L','E0'),
('2038','DİNİTROTOLUENLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2044','2,2-DİMETİLPROPAN','2','2F','','B/D','23','2.1','2','','E0'),
('2045','İZOBÜTİRALDEHİT (İZOBÜTİL  ALDEHİT)','3','F1','II','D/E','33','3','2','1 L','E2'),
('2046','SİMENLER','3','F1','III','D/E','30','3','3','5 L','E1'),
('2047','DİKLOROPROPENLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2048','DİSİKLOPENTADİEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2049','DİETİLBENZEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2050','DİİZOBÜTİLEN, İZOMERİK  BİLEŞİKLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2051','2-DİMETİLAMİNO-ETANOL','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2052','DİPENTEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2053','METİL İZOBÜTİL KARBİNOL','3','F1','III','D/E','30','3','3','5 L','E1'),
('2054','MORFOLİN','8','CF1','I','D/E','883','8
+3','1','','E0'),
('2055','STRİEN MONOMER, STABİLİZE','3','F1','III','D/E','39','3','3','5 L','E1'),
('2056','TETRAHİDROFURAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2057','TRİPROPİLEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2058','VALERALDEHİT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2059','NİTROSELÜLOZ ÇÖZELTİSİ, ALEVLENEBİLİR kuru kütlece  %12,6''dan fazla azot ve %55''ten fazla  nitroselüloz içermeyen','3','D','I','B','33','3','1','','E0'),
('2067','AMONYUM NİTRAT ESASLI  GÜBRELER','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('2071','AMONYUM NİTRAT ESASLI  GÜBRELER','9','M11','','','','','','',''),
('2073','AMONYAK ÇÖZELTİSİ, 15 °C''de  su içerisinde bağıl yoğunluğu  0,880''den az olan ve %35''ten fazla  ama %50''den az amonyak içeren','2','4A','','E','20','2.2','3','120 ml','E0'),
('2074','AKRİLAMİD, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2075','KLORAL, SUSUZ, STABİLİZE','6.1','T1','II','D/E','69','6.1','2','100 ml','E4'),
('2076','KREZOLLER, SIVI','6.1','TC1','II','D/E','68','6.1
+8','2','100 ml','E4'),
('2077','alfa-NAFTİLAMİN','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2078','TOLUEN DİİZOSİYANAT','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2079','DİETİLENTRİAMİN','8','C7','II','E','80','8','2','1 L','E2'),
('2186','HİDROJEN KLORÜR,  SOĞUTULMUŞ SIVI','2','3TC','TAŞINMASI YASAKTIR','','','','','',''),
('2187','KARBON DİOKSİT, SOĞUTULMUŞ SIVI','2','3A','','C/E','22','2.2','3','120 ml','E1'),
('2188','ARSİN','2','2TF','','D','','2.3
+2.1','1','','E0'),
('2189','DİKLOROSİLAN','2','2TFC','','B/D','263','2.3
+2.1
+8','1','','E0'),
('2190','OKSİJEN DİFLORÜR SIKIŞTIRILMIŞ','2','1TOC','','D','','2.3
+5.1
+8','1','','E0'),
('2191','SÜLFÜRİL FLORÜR','2','2T','','C/D','26','2.3','1','','E0'),
('2192','GERMAN','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('2193','HEKZAFLOROETAN (SOĞUTUCU  GAZ R 116)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('2194','SELENYUM HEKZAFLORÜR','2','2TC','','D','','2.3
+8','1','','E0'),
('2195','TELLÜR HEKZAFLORÜR','2','2TC','','D','','2.3
+8','1','','E0'),
('2196','TUNGSTEN HEKZAFLORÜR','2','2TC','','D','','2.3
+8','1','','E0'),
('2197','HİDROJEN İYODÜR, SUSUZ','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('2198','FOSFOR PENTAFLORÜR','2','2TC','','D','','2.3
+8','1','','E0'),
('2199','FOSFİN','2','2TF','','D','','2.3
+2.1','1','','E0'),
('2200','PROPADİEN, STABİLİZE','2','2F','','B/D','239','2.1','2','','E0'),
('2201','AZOT OKSİT, SOĞUTULMUŞ SIVI','2','3O','','C/E','225','2.2
+5.1','3','','E0'),
('2202','HİDROJEN SELENÜR, SUSUZ','2','2TF','','D','','2.3
+2.1','1','','E0'),
('2203','SİLAN','2','2F','','B/D','23','2.1','2','','E0'),
('2204','KARBONİL SÜLFÜR','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('2205','ADİPONİTRİL','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2206','İZOSİYANATLAR, ZEHİRLİ, B.B.B. veya İZOSİYANAT  ÇÖZELTİSİ, ZEHİRLİ, B.B.B.','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2208','KALSİYUM HİPOKLORİT  KARIŞIMI, KURU % 10''dan fazla  ancak% 39''dan az hazır klor içeren','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('2209','FORMALDEHİT ÇÖZELTİ %25''ten  fazla formaldehit içeren','8','C9','III','E','80','8','3','5 L','E1'),
('2210','MANEB veya MANEB  MÜSTAHZARI %60''tan fazla maneb  içeren','4.2','SW1','III','E','40','4.2
+4.3','3','','E1'),
('2211','POLİMERİK BONCUKLAR, GENLEŞEBİLİR, alevlenebilir buhar  açığa çıkaran','9','M3','III','D/E','90','Yok','3','5 kg','E1'),
('2212','ASBEST, AMFİBOL (amosit, tremolit, aktinolit, antofilit, krokidolit)','9','M1','II','E','90','9','2','1 kg','E0'),
('2213','PARAFORMALDEHİT','4.1','F1','III','E','40','4.1','3','5 kg','E1'),
('2214','FİTALİK ANHİDRİT %0,05''ten fazla maleik anhidrit içeren','8','C4','III','E','80','8','3','5 kg','E1'),
('2215','MALEİK ANHİDRİT, ERİMİŞ','8','C3','III','E','80','8','0','','E0'),
('2216','Balık unu (Balık atığı), stabilize','9','M11','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('2217','TOHUM KÜSPESİ kütlece %1,5''ten  az yağ ve kütlece %11''den az nem  içeren','4.2','S2','III','E','40','4.2','3','','E0'),
('2218','AKRİLİK ASİT, STABİLİZE','8','CF1','II','D/E','839','8
+3','2','1 L','E2'),
('2219','ALİL GLİSİDİL ETER','3','F1','III','D/E','30','3','3','5 L','E1'),
('2222','ANİZOL','3','F1','III','D/E','30','3','3','5 L','E1'),
('2224','BENZONİTRİL','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2225','BENZENSÜLFONİL KLORÜR','8','C3','III','E','80','8','3','5 L','E1'),
('2226','BENZOTRİKLORÜR','8','C9','II','E','80','8','2','1 L','E2'),
('2227','n-BÜTİL METAKRİLAT, STABİLİZE','3','F1','III','D/E','39','3','3','5 L','E1'),
('2232','2-KLOROETANAL','6.1','T1','I','C/D','66','6.1','1','','E0'),
('2233','KLOROANİSİDİNLER','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2234','KLOROBENZO-TRİFLORÜRLER','3','F1','III','D/E','30','3','3','5 L','E1'),
('2235','KLOROBENZİL KLORÜRLER, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2236','3-KLORO-4-METİLFENİL  İZOSİYANAT, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2237','KLORONİTROANİLİNLER','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2238','KLOROTOLUENLER','3','F1','III','D/E','30','3','3','5 L','E1'),
('2239','KLOROTOLUİDİNLER, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2240','KROMOSÜLFÜRİK ASİT','8','C1','I','E','88','8','1','','E0'),
('2241','SİKLOHEPTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2242','SİKLOHEPTEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2243','SİKLOHEKSİL ASETAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2244','SİKLOPENTANOL','3','F1','III','D/E','30','3','3','5 L','E1'),
('2245','SİKLOPENTANON','3','F1','III','D/E','30','3','3','5 L','E1'),
('2246','SİKLOPENTEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2247','n-DEKAN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2248','Dİ-n-BÜTİLAMİN','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2249','DİKLORODİMETİL ETER, SİMETRİK','6.1','TF1','TAŞINMASI YASAKTIR','','','','','',''),
('2250','DİKLOROFENİL  İZOSİYANATLAR','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2251','BİSİKLO[2.2.1]HEPTA-2,5-DİEN, STABİLİZE (2,5- NORBORNADİEN, STABİLİZE)','3','F1','II','D/E','339','3','2','1 L','E2'),
('2252','1,2-DİMETOKSİETAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2253','N,N-DİMETİLANİLİN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2254','KİBRİTLER, İRİ BAŞLI','4.1','F1','III','E','','4.1','4','5 kg','E0'),
('2256','SİKLOHEKSEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2257','POTASYUM','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('2258','1,2-PROPİLENDİAMİN','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2259','TRİETİLENTETRAMİN','8','C7','II','E','80','8','2','1 L','E2'),
('2260','TRİPROPİLAMİN','3','FC','III','D/E','38','3
+8','3','5 L','E1'),
('2261','KSİLENOLLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2262','DİMETİLKARBAMOİL KLORÜR','8','C3','II','E','80','8','2','1 L','E2'),
('2263','DİMETİLSİKLOHEKZANLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('2264','N,N-DİMETİL- SİKLOHEKZİLAMİN','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2265','N,N-DİMETİL-FORMAMİD','3','F1','III','D/E','30','3','3','5 L','E1'),
('2266','DİMETİL-N-PROPİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2267','DİMETİL TİYOFOSFORİL  KLORÜR','6.1','TC1','II','D/E','68','6.1
+8','2','100 ml','E4'),
('2269','3,3''-İMİNODİPROPİLAMİN','8','C7','III','E','80','8','3','5 L','E1'),
('2270','ETİLAMİN, SULU ÇÖZELTİ kütlece  %50''den fazla ancak %70''ten az  etilamin içeren','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2271','ETİL AMİL KETON','3','F1','III','D/E','30','3','3','5 L','E1'),
('2272','N-ETİLANİLİN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2273','2-ETİLANİLİN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2274','N-ETİL-N-BENZİLANİLİN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2275','2-ETİLBÜTANOL','3','F1','III','D/E','30','3','3','5 L','E1'),
('2276','2-ETİLHEKZİLAMİN','3','FC','III','D/E','38','3
+8','3','5 L','E1'),
('2277','ETİL METAKRİLAT, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('2278','n-HEPTEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2279','HEKZAKLOROBÜTADİEN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2280','HEKZAMETİLENDİAMİN, KATI','8','C8','III','E','80','8','3','5 kg','E1'),
('2281','HEKZAMETİLEN DİİZOSİYANAT','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2282','HEKZANOLLER','3','F1','III','D/E','30','3','3','5 L','E1'),
('2283','İZOBÜTİL METAKRİLAT, STABİLİZE','3','F1','III','D/E','39','3','3','5 L','E1'),
('2284','İZOBÜTİRONİTRİL','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2285','İZOSİYANATOBENZO- TRİFLORÜRLER','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E4'),
('2286','PENTAMETİLHEPTAN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2287','İZOHEPTEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2288','İZOHEKSEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2289','İZOFORONDİAMİN','8','C7','III','E','80','8','3','5 L','E1'),
('2290','İZOFORON DİİZOSİYANAT','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2291','KURŞUN BİLEŞİĞİ, KATI, B.B.B.','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2293','4-METOKSİ-4-METİLPENTAN- 2- ON','3','F1','III','D/E','30','3','3','5 L','E1'),
('2294','N-METİLANİLİN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2295','METİL KLOROASETAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2296','METİLSİKLOHEKZAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2297','METİLSİKLOHEKZANON','3','F1','III','D/E','30','3','3','5 L','E1'),
('2298','METİLSİKLOPENTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2299','METİL DİKLOROASETAT','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2300','2-METİL-5-ETİLPİRİDİN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2301','2-METİLFURAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2302','5-METİLHEKZAN-2-ON','3','F1','III','D/E','30','3','3','5 L','E1'),
('2303','İZOPROPENİLBENZEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2304','NAFTALİN, ERİMİŞ','4.1','F2','III','E','44','4.1','3','','E0'),
('2305','NİTROBENZENSÜLFONİK ASİT','8','C4','II','E','80','8','2','1 kg','E2'),
('2306','NİTROBENZOTRİFLORÜRLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2307','3-NİTRO-4-KLORO- BENZOTRİFLORÜR','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2308','NİTROSİLSÜLFÜRİK ASİT, SIVI','8','C1','II','E','X80','8','2','1 L','E2'),
('2309','OKTADİENLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2310','PENTAN-2,4-DİON','3','FT1','III','D/E','36','3
+6.1','3','5 L','E1'),
('2311','FENETİDİNLER','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2312','FENOL, ERİMİŞ','6.1','T1','II','D/E','60','6.1','0','','E0'),
('2313','PİKOLİNLER','3','F1','III','D/E','30','3','3','5 L','E1'),
('2315','POLİKLORİNLENMİŞ  BİFENİLLER, SIVI','9','M2','II','D/E','90','9','0','1 L','E2'),
('2316','SODYUM KUPROSİYANÜR, KATI','6.1','T5','I','C/E','66','6.1','1','','E5'),
('2317','SODYUM KUPROSİYANÜR  ÇÖZELTİSİ','6.1','T4','I','C/E','66','6.1','1','','E5'),
('2318','SODYUM HİDROSÜLFÜR %25''ten  az kristalizasyon suyu içeren','4.2','S4','II','D/E','40','4.2','2','','E2'),
('2319','TERPEN HİDROKARBONLAR, B.B.B.','3','F1','III','D/E','30','3','3','5 L','E1'),
('2320','TETRAETİLENPENTAMİN','8','C7','III','E','80','8','3','5 L','E1'),
('2321','TRİKLOROBENZENLER, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2322','TRİKLOROBÜTEN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2323','TRİETİL FOSFİT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2324','TRİİZOBÜTİLEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2325','1,3,5-TRİMETİLBENZEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2326','TRİMETİLSİKLO-HEKZİLAMİN','8','C7','III','E','80','8','3','5 L','E1'),
('2327','TRİMETİLHEKZA- METİLENDİAMİNLER','8','C7','III','E','80','8','3','5 L','E1'),
('2328','TRİMETİLHEKZAMETİLEN  DİİZOSİYANAT','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2329','TRİMETİL FOSFİT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2330','UNDEKAN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2331','ÇİNKO KLORÜR, SUSUZ','8','C2','III','E','80','8','3','5 kg','E1'),
('2332','ASETALDEHİT OKSİM','3','F1','III','D/E','30','3','3','5 L','E1'),
('2333','ALİL ASETAT','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2334','ALİLAMİN','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2335','ALİL ETİL ETER','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2336','ALİL FORMAT','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('2337','FENİL MERKAPTAN','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2338','BENZOTRİFLORÜR','3','F1','II','D/E','33','3','2','1 L','E2'),
('2339','2-BROMOBÜTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2340','2-BROMOETİL ETİL ETER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2341','1-BROMO-3-METİLBÜTAN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2342','BROMOMETİLPROPANLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('2343','2-BROMOPENTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2344','BROMOPROPANLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('2345','3-BROMOPROPİN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2346','BÜTANDİON','3','F1','II','D/E','33','3','2','1 L','E2'),
('2347','BÜTİL MERKAPTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2348','BÜTİL AKRİLATLAR, STABİLİZE','3','F1','III','D/E','39','3','3','5 L','E1'),
('2350','BÜTİL METİL ETER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2351','BÜTİL NİTRİTLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2352','BÜTİL VİNİL ETER, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('2353','BÜTİRİL KLORÜR','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2354','KLOROMETİL ETİL ETER','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2356','2-KLOROPROPAN','3','F1','I','D/E','33','3','1','','E3'),
('2357','SİKLOHEKZİLAMİN','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2358','SİKLOOKTATETRAEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2359','DİALİLAMİN','3','FTC','II','D/E','338','3
+6.1
+8','2','1 L','E2'),
('2360','DİALİL ETER','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2361','DİİZOBÜTİLAMİN','3','FC','III','D/E','38','3
+8','3','5 L','E1'),
('2362','1,1-DİKLOROETAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2363','ETİL MERKAPTAN','3','F1','I','D/E','33','3','1','','E0'),
('2364','n-PROPİLBENZEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2366','DİETİL KARBONAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2367','alfa-METİL- VALERALDEHİT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2368','alfa-PİNEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2370','1-HEKSEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2371','İZOPENTENLER','3','F1','I','D/E','33','3','1','','E3'),
('2372','1,2-Dİ-(DİMETİLAMİNO) ETAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2373','DİETOKSİMETAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2374','3,3-DİETOKSİPROPEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2375','DİETİL SÜLFÜR','3','F1','II','D/E','33','3','2','1 L','E2'),
('2376','2,3-DİHİDROPİRAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2377','1,1-DİMETOKSİETAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2378','2-DİMETİLAMİNO-ASETONİTRİL','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2379','1,3-DİMETİL-BÜTİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2380','DİMETİLDİETOKSİSİLAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2381','DİMETİL DİSÜLFÜR','3','FT1','II','D/E','336','3
+6.1','2','1 L','E0'),
('2382','DİMETİLHİDRAZİN, SİMETRİK','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2383','DİPROPİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2384','Dİ-n-PROPİL ETER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2385','ETİL İZOBÜTİRAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2386','1-ETİLPİPERİDİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2387','FLOROBENZEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2388','FLOROTOLUENLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2389','FURAN','3','F1','I','D/E','33','3','1','','E3'),
('2390','2-İYODOBÜTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2391','İYODOMETİLPROPANLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('2392','İYODOPROPANLAR','3','F1','III','D/E','30','3','3','5 L','E1'),
('2393','İZOBÜTİL FORMAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2394','İZOBÜTİL PROPİONAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2395','İZOBÜTİRİL KLORÜR','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2396','METAKRİLALDEHİT, STABİLİZE','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2397','3-METİLBÜTAN-2-ON','3','F1','II','D/E','33','3','2','1 L','E2'),
('2398','METİL tert-BÜTİL ETER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2399','1-METİLPİPERİDİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2400','METİL İZOVALERAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2401','PİPERİDİN','8','CF1','I','D/E','883','8
+3','1','','E0'),
('2402','PROPANETİYOLLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2403','İZOPROPENİL ASETAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2404','PROPİONİTRİL','3','FT1','II','D/E','336','3
+6.1','2','1 L','E0'),
('2405','İZOPROPİL BÜTİRAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2406','İZOPROPİL İZOBÜTİRAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2407','İZOPROPİL KLOROFORMAT','6.1','TFC','I','D','','6.1
+3
+8','1','','E0'),
('2409','İZOPROPİL PROPİONAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2410','1,2,3,6-TETRAHİDROPİRİDİN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2411','BÜTİRONİTRİL','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2412','TETRAHİDROTİYOFEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2413','TETRAPROPİL ORTOTİTANAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2414','TİYOFEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2416','TRİMETİL BORAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2417','KARBONİL FLORÜR','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('2418','KÜKÜRT TETRAFLORÜR','2','2TC','','D','','2.3
+8','1','','E0'),
('2419','BROMOTRİFLOROETİLEN','2','2F','','B/D','23','2.1','2','','E0'),
('2420','HEKZAFLOROASETON','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('2421','AZOT TRİOKSİT','2','2TOC','TAŞINMASI YASAKTIR','','','','','',''),
('2422','OKTAFLOROBUT-2-ENE  (SOĞUTUCU GAZ R 1318)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('2424','OKTAFLOROPROPAN  (SOĞUTUCU GAZ R 218)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('2426','AMONYUM NİTRAT, SIVI (sıcak  konsantre çözelti)','5.1','O1','','E','59','5.1','0','','E0'),
('2427','POTASYUM KLORAT, SULU  ÇÖZELTİ','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('2428','SODYUM KLORAT, SULU  ÇÖZELTİ','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('2429','KALSİYUM KLORAT, SULU  ÇÖZELTİ','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('2430','ALKİLFENOLLER, KATI, B.B.B. (C2-C12 homologlar dâhil)','8','C4','I','E','88','8','1','','E0'),
('2431','ANİSİDİNLER','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2432','N,N-DİETİLANİLİN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2433','KLORONİTROTOLUENLER, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2434','DİBENZİLDİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('2435','ETİLFENİL-DİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('2436','TİYOASETİK ASİT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2437','METİLFENİL-DİKLOROSİLAN','8','C3','II','E','X80','8','2','','E0'),
('2438','TRİMETİLASETİL KLORÜR','6.1','TFC','I','C/D','663','6.1
+3
+8','1','','E0'),
('2439','SODYUM HİDROJENDİFLORÜR','8','C2','II','E','80','8','2','1 kg','E2'),
('2440','KALAY KLORÜR PENTAHİDRAT','8','C2','III','E','80','8','3','5 kg','E1'),
('2441','TİTANYUM TRİKLORÜR,  PİROFORİK veya TİTANYUM  TRİKLORÜR KARIŞIMI, PİROFORİK','4.2','SC4','I','E','','4.2
+8','0','','E0'),
('2442','TRİKLOROASETİL KLORÜR','8','C3','II','E','X80','8','2','','E0'),
('2443','VANADYUM OKSİTRİKLORÜR','8','C1','II','E','80','8','2','1 L','E0'),
('2444','VANADYUM TETRAKLORÜR','8','C1','I','E','X88','8','1','','E0'),
('2446','NİTROKRESOLLER, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2447','FOSFOR, BEYAZ, ERİMİŞ','4.2','ST3','I','B/E','446','4.2
+6.1','0','','E0'),
('2448','KÜKÜRT, ERİMİŞ','4.1','F3','III','E','44','4.1','3','','E0'),
('2451','AZOT TRİFLORÜR','2','2O','','C/E','25','2.2
+5.1','3','','E0'),
('2452','ETİL ASETİLEN, STABİLİZE','2','2F','','B/D','239','2.1','2','','E0'),
('2453','ETİL FLORÜR (SOĞUTUCU GAZ  R 161)','2','2F','','B/D','23','2.1','2','','E0'),
('2454','METİL FLORÜR (SOĞUTUCU GAZ  R 41)','2','2F','','B/D','23','2.1','2','','E0'),
('2455','METİL NİTRİT','2','2A','TAŞINMASI YASAKTIR','','','','','',''),
('2456','2-KLOROPROPEN','3','F1','I','D/E','33','3','1','','E3'),
('2457','2,3-DİMETİLBÜTAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2458','HEKZADİENLER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2459','2-METİL-1-BÜTEN','3','F1','I','D/E','33','3','1','','E3'),
('2460','2-METİL-2-BÜTEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2461','METİLPENTADİEN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2463','ALÜMİNYUM HİDRİT','4.3','W2','I','E','','4.3','1','','E0'),
('2464','BERİLYUM NİTRAT','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('2465','DİKLOROİZOSİYANÜRİK ASİT, KURU veya  DİKLOROİZOSİYANÜRİK ASİT  TUZLARI','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('2466','POTASYUM SÜPEROKSİT','5.1','O2','I','E','','5.1','1','','E0'),
('2468','TRİKLOROİZOSİYANÜRİK ASİT, KURU','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('2469','ÇİNKO BROMAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('2470','FENİLASETONİTRİL, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2471','OSMİYUM TETROKSİT','6.1','T5','I','C/E','66','6.1','1','','E5'),
('2473','SODYUM ARSANİLAT','6.1','T3','III','E','60','6.1','2','5 kg','E1'),
('2474','TİYOFOSGEN','6.1','T1','I','C/D','66','6.1','1','','E0'),
('2475','VANADYUM TRİKLORÜR','8','C2','III','E','80','8','3','5 kg','E1'),
('2477','METİL İZOTİYOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2478','İZOSİYANATLAR, ALEVLENEBİLİR, ZEHİRLİ, B.B.B. veya İZOSİYANAT  ÇÖZELTİSİ, ALEVLENEBİLİR,  ZEHİRLİ, B.B.B.','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2480','METİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2481','ETİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2482','n-PROPİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2483','İZOPROPİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2484','tert-BÜTİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2485','n-BÜTİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2486','İZOBÜTİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2487','FENİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2488','SİKLOHEKSİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2490','DİKLOROİZOPROPİL ETER','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2491','ETANOLAMİN veya  ETANOLAMİN ÇÖZELTİSİ','8','C7','III','E','80','8','3','5 L','E1'),
('2493','HEKZAMETİLENİMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2495','İYOT PENTAFLORÜR','5.1','OTC','I','B/E','568','5.1
+6.1
+8','1','','E0'),
('2496','PROPİYONİK ANHİDRİT','8','C3','III','E','80','8','3','5 L','E1'),
('2498','1,2,3,6-TETRAHİDROBENZAL- DEHİT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2501','TRİS-(1-AZİRİDİNİL) FOSFİN  OKSİT ÇÖZELTİSİ','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2502','VALERİL KLORÜR','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2503','ZİRKONYUM TETRAKLORÜR','8','C2','III','E','80','8','3','5 kg','E1'),
('2504','TETRABROMOETAN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2505','AMONYUM FLORÜR','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2506','AMONYUM HİDROJEN SÜLFAT','8','C2','II','E','80','8','2','1 kg','E2'),
('2507','KLOROPLATİNİK ASİT, KATI','8','C2','III','E','80','8','3','5 kg','E1'),
('2508','MOLİBDEN PENTAKLORÜR','8','C2','III','E','80','8','3','5 kg','E1'),
('2509','POTASYUM HİDROJEN SÜLFAT','8','C2','II','E','80','8','2','1 kg','E2'),
('2511','2-KLOROPROPİYONİK ASİT','8','C3','III','E','80','8','3','5 L','E1'),
('2512','AMİNOFENOLLER (o-, m-, p-)','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2513','BROMOASETİL BROMÜR','8','C3','II','E','X80','8','2','1 L','E2'),
('2514','BROMOBENZEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2515','BROMOFORM','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2516','KARBON TETRABROMÜR','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2517','1-KLORO-1,1- DİFLOROETAN  (SOĞUTUCU GAZ R 142b)','2','2F','','B/D','23','2.1','2','','E0'),
('2518','1,5,9-SİKLODODEKATRİEN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2520','SİKLOOKTADİENLER','3','F1','III','D/E','30','3','3','5 L','E1'),
('2521','DİKETEN, STABİLİZE','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2522','2-DİMETİLAMİNOETİL  METAKRİLAT, STABİLİZE','6.1','T1','II','D/E','69','6.1','2','100 ml','E4'),
('2524','ETİL ORTOFORMAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2525','ETİL OKSALAT','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2526','FURFURİLAMİN','3','FC','III','D/E','38','3
+8','3','5 L','E1'),
('2527','İZOBÜTİL AKRİLAT, STABİLİZE','3','F1','III','D/E','39','3','3','5 L','E1'),
('2528','İZOBÜTİL İZOBÜTİRAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2529','İZOBÜTİRİK ASİT','3','FC','III','D/E','38','3
+8','3','5 L','E1'),
('2531','METAKRİLİK ASİT, STABİLİZE','8','C3','II','E','89','8','2','1 L','E2'),
('2533','METİL TRİKLOROASETAT','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2534','METİLKLOROSİLAN','2','2TFC','','B/D','263','2.3
+2.1
+8','1','','E0'),
('2535','4-METİLMORFOLİN (N- METİLMORFOLİN)','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2536','METİLTETRAHİDRO-FURAN','3','F1','II','D/E','33','3','2','1 L','E2'),
('2538','NİTRONAFTALİN','4.1','F1','III','E','40','4.1','3','5 kg','E1'),
('2541','TERPİNOLEN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2542','TRİBÜTİLAMİN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2545','HAFNİYUM TOZU, KURU','4.2','S4','I','E','','4.2','0','','E0'),
('2546','TİTANYUM TOZU, KURU','4.2','S4','I','E','','4.2','0','','E0'),
('2547','SODYUM SÜPEROKSİT','5.1','O2','I','E','','5.1','1','','E0'),
('2548','KLOR PENTAFLORÜR','2','2TOC','','D','','2.3
+5.1
+8','1','','E0'),
('2552','HEKZAFLOROASETON HİDRAT, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2554','METİLALİL KLORÜR','3','F1','II','D/E','33','3','2','1 L','E2'),
('2555','NİTROSELÜLOZ, SULU (kütlece  %25''ten az olmayan su ile)','4.1','D','II','B','','4.1','2','','E0'),
('2556','NİTROSELÜLOZ, ALKOLLÜ  (kütlece %25''ten az olmayan alkol  içeren ve kuru kütle bazında azot  miktarı %12,6''dan fazla olmayan)','4.1','D','II','B','','4.1','2','','E0'),
('2557','NİTROSELÜLOZ, kuru kütle  bazında azot miktarı %12,6''dan fazla  olmayan, PLASTİKLEŞTİRİCİ  İÇEREN veya İÇERMEYEN, PİGMENT İÇEREN veya  İÇERMEYEN KARIŞIM','4.1','D','II','B','','4.1','2','','E0'),
('2558','EPİBROMOHİDRİN','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2560','2-METİLPENTAN-2-OL','3','F1','III','D/E','30','3','3','5 L','E1'),
('2561','3-METİL-1-BÜTEN','3','F1','I','D/E','33','3','1','','E3'),
('2564','TRİKLOROASETİK ASİT  ÇÖZELTİSİ','8','C3','II','E','80','8','2','1 L','E2'),
('2565','DİSİKLOHEKZİLAMİN','8','C7','III','E','80','8','3','5 L','E1'),
('2567','SODYUM PENTAKLOROFENAT','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2570','KADMİYUM BİLEŞİĞİ','6.1','T5','I','C/E','66','6.1','1','','E5'),
('2571','ALKİLSÜLFÜRİK ASİTLER','8','C3','II','E','80','8','2','1 L','E2'),
('2572','FENİLHİDRAZİN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2573','TALYUM KLORAT','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('2574','TRİKRESİL FOSFAT %3''ten fazla  orto izomer içeren','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2576','FOSFOR, OKSİBROMÜR, ERİMİŞ','8','C1','II','E','80','8','2','','E0'),
('2577','FENİLASETİL KLORÜR','8','C3','II','E','80','8','2','1 L','E2'),
('2578','FOSFOR TRİOKSİT','8','C2','III','E','80','8','3','5 kg','E1'),
('2579','PİPERAZİN','8','C8','III','E','80','8','3','5 kg','E1'),
('2580','ALÜMİNYUM BROMÜR  ÇÖZELTİSİ','8','C1','III','E','80','8','3','5 L','E1'),
('2581','ALÜMİNYUM KLORÜR ÇÖZELTİSİ','8','C1','III','E','80','8','3','5 L','E1'),
('2582','DEMİR KLORÜR ÇÖZELTİSİ','8','C1','III','E','80','8','3','5 L','E1'),
('2583','ALKİLSÜLFONİK ASİTLER, KATI  veya ARİLSÜLFONİK ASİTLER, KATI %5''ten fazla serbest sülfirik asit  içeren','8','C2','II','E','80','8','2','1 kg','E2'),
('2584','ALKİLSÜLFONİK ASİTLER, SIVI  veya ARİLSÜLFONİK ASİTLER, SIVI %5''ten fazla serbest sülfirik asit  içeren','8','C1','II','E','80','8','2','1 L','E2'),
('2585','ALKİLSÜLFONİK ASİTLER, KATI  veya ARİLSÜLFONİK ASİTLER, KATI %5''ten az serbest sülfirik asit  içeren','8','C4','III','E','80','8','3','5 kg','E1'),
('2586','ALKİLSÜLFONİK ASİTLER, SIVI  veya ARİLSÜLFONİK ASİTLER, SIVI %5''ten az serbest sülfirik asit  içeren','8','C3','III','E','80','8','3','5 L','E1'),
('2587','BENZOKUİNON','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2588','PESTİSİT, KATI, ZEHİRLİ, B.B.B.','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2589','VİNİL KLOROASETAT','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E4'),
('2590','ASBEST, KRİZOTİL','9','M1','III','E','90','9','3','5 kg','E1'),
('2591','KSENON, SOĞUTULMUŞ SIVI','2','3A','','C/E','22','2.2','3','120 ml','E1'),
('2599','KLOROTRİFLOROMETAN ve  TRİFLOROMETAN AZEOTROPİK  KARIŞIMI, yaklaşık %60  kloroflorometan içeren (SOĞUTUCU  GAZ R 503)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('2601','SİKLOBÜTAN','2','2F','','B/D','23','2.1','2','','E0'),
('2602','DİKLORODİFLOROMETAN VE  1,1-DİFLOROETAN AZEOTROPİK  KARIŞIMI, yaklaşık %74  diklorodiflorometan içeren  (SOĞUTUCU GAZ R 500)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('2603','SİKLOHEPTATRİEN','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2604','BOR TRİFLORÜR DİETİL  ETERAT','8','CF1','I','D/E','883','8
+3','1','','E0'),
('2605','METOKSİMETİL İZOSİYANAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2606','METİL ORTOSİLİKAT','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2607','AKROLEİN DİMER, STABİLİZE','3','F1','III','D/E','39','3','3','5 L','E1'),
('2608','NİTROPROPANLAR','3','F1','III','D/E','30','3','3','5 L','E1'),
('2609','TRİALİL BORAT','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2610','TRİALİLAMİN','3','FC','III','D/E','38','3
+8','3','5 L','E1'),
('2611','PROPİLEN KLOROHİDRİN','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E4'),
('2612','METİL PROPİL ETER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2614','METALİL ALKOL','3','F1','III','D/E','30','3','3','5 L','E1'),
('2615','ETİL PROPİL ETER','3','F1','II','D/E','33','3','2','1 L','E2'),
('2616','TRİİZOPROPİL BORAT','3','F1','II','D/E','33','3','2','1 L','E2'),
('2617','METİLSİKLOHEKZANOLLER, alevlenebilir','3','F1','III','D/E','30','3','3','5 L','E1'),
('2618','VİNİLTOLUENLER, STABİLİZE','3','F1','III','D/E','39','3','3','5 L','E1'),
('2619','BENZİLDİMETİLAMİN','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2620','AMİL BÜTİRATLAR','3','F1','III','D/E','30','3','3','5 L','E1'),
('2621','ASETİL METİL KARBİNOL','3','F1','III','D/E','30','3','3','5 L','E1'),
('2622','GLİSİDALDEHİT','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('2623','ATEŞ YAKICI, ÇIRA veya  TUTUŞTURUCU TABLET vb.','4.1','F1','III','E','','4.1','4','5 kg','E1'),
('2624','MAGNEZYUM SİLİSİD','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('2626','KLORİK ASİT, SULU ÇÖZELTİ  klorik asit oranı %10''dan fazla  olmayan','5.1','O1','II','E','50','5.1','2','1 L','E0'),
('2627','NİTRİTLER, İNORGANİK, B.B.B.','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('2628','POTASYUM FLOROASETAT','6.1','T2','I','C/E','66','6.1','1','','E5'),
('2629','SODYUM FLOROASETAT','6.1','T2','I','C/E','66','6.1','1','','E5'),
('2630','SELENATLAR veya SELENİTLER','6.1','T5','I','C/E','66','6.1','1','','E5'),
('2642','FLOROASETİK ASİT','6.1','T2','I','C/E','66','6.1','1','','E5'),
('2643','METİL BROMOASETAT','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2644','METİL İYODÜR','6.1','T1','I','C/D','66','6.1','1','','E0'),
('2645','FENASİL BROMÜR','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2646','HEKZAKLOROSİKLO- PENTADİEN','6.1','T1','I','C/D','66','6.1','1','','E0'),
('2647','MALONONİTRİL','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2648','1,2-DİBROMOBÜTAN-3-ON','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2649','1,3-DİKLOROASETON','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2650','1,1-DİKLORO-1-NİTROETAN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2651','4,4''-DİAMİNODİFENİL- METAN','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2653','BENZİL İYODÜR','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2655','POTASYUM FLOROSİLİKAT','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2656','KUİNOLİN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2657','SELENYUM DİSÜLFÜR','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('2659','SODYUM KLOROASETAT','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2660','NİTROTOLUİDİNLER (MONO)','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2661','HEKZAKLOROASETON','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2664','DİBROMOMETAN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2667','BÜTİLTOLUENLER','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2668','KLOROASETONİTRİL','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('2669','KLOROKRESOLLER ÇÖZELTİSİ','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2670','SİYANÜRİK KLORÜR','8','C4','II','E','80','8','2','1 kg','E2'),
('2671','AMİNOPİRİDİNLER (o-, m-, p-)','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2672','AMONYAK ÇÖZELTİSİ, 15 °C''de su  içerisinde bağıl yoğunluğu 0,880 veya  0,957 arasında olan ve %10''dan fazla  ama %35''ten az amonyak içeren','8','C5','III','E','80','8','3','5 L','E1'),
('2673','2-AMİNO-4-KLOROFENOL','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('2674','SODYUM FLOROSİLİKAT','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2676','STİBİN','2','2TF','','D','','2.3
+2.1','1','','E0'),
('2677','RUBİDYUM HİDROKSİT  ÇÖZELTİSİ','8','C5','II','E','80','8','2','1 L','E2'),
('2678','RUBİDYUM HİDROKSİT','8','C6','II','E','80','8','2','1 kg','E2'),
('2679','LİTYUM HİDROKSİT ÇÖZELTİSİ','8','C5','II','E','80','8','2','1 L','E2'),
('2680','LİTYUM HİDROKSİT','8','C6','II','E','80','8','2','1 kg','E2'),
('2681','SEZYUM HİDROKSİT ÇÖZELTİSİ','8','C5','II','E','80','8','2','1 L','E2'),
('2682','SEZYUM HİDROKSİT','8','C6','II','E','80','8','2','1 kg','E2'),
('2683','AMONYUM SÜLFÜR ÇÖZELTİSİ','8','CFT','II','D/E','836','8
+3
+6.1','2','1 L','E2'),
('2684','3-DİETİLAMİNOPROPİL- AMİN','3','FC','III','D/E','38','3
+8','3','5 L','E1'),
('2685','N,N-DİETİLETİLEN-DİAMİN','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2686','2-DİETİLAMİNOETANOL','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2687','DİSİKLOHEKZİLAMONYUM  NİTRİT','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('2688','1-BROMO-3-KLOROPROPAN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2689','GLİSEROL alfa- MONOKLOROHİDRİN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2690','N,n-BÜTİLİMİDAZOL','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2691','FOSFOR PENTABROMÜR','8','C2','II','E','80','8','2','1 kg','E0'),
('2692','BOR TRİBROMÜR','8','C1','I','E','X88','8','1','','E0'),
('2693','BİSÜLFİTLER, SULU ÇÖZELTİ, B.B.B.','8','C1','III','E','80','8','3','5 L','E1'),
('2698','TETRAHİDROFTALİK  ANHİDRİTLER, %0,05''ten fazla  maleik anhidrit içeren','8','C4','III','E','80','8','3','5 kg','E1'),
('2699','TRİFLOROASETİK ASİT','8','C3','I','E','88','8','1','','E0'),
('2705','1-PENTOL','8','C9','II','E','80','8','2','1 L','E2'),
('2707','DİMETİLDİOKSANLAR','3','F1','II','D/E','33','3','2','1 L','E2'),
('2709','BÜTİLBENZENLER','3','F1','III','D/E','30','3','3','5 L','E1'),
('2710','DİPROPİL KETON','3','F1','III','D/E','30','3','3','5 L','E1'),
('2713','AKRİDİN','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2714','ÇİNKO REZİNAT','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('2715','ALÜMİNYUM REZİNAT','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('2716','1,4-BÜTİNDİOL','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2717','KAFUR, sentetik','4.1','F1','III','E','40','4.1','3','5 kg','E1'),
('2719','BARYUM BROMAT','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('2720','KROM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('2721','BAKIR KLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('2722','LİTYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('2723','MAGNEZYUM KLORAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('2724','MANGANEZ NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('2725','NİKEL NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('2726','NİKEL NİTRİT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('2727','TALYUM NİTRAT','6.1','TO2','II','D/E','65','6.1
+5.1','2','500 g','E4'),
('2728','ZİRKONYUM NİTRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('2729','HEKZAKLOROBENZEN','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2730','NİTROANİZOLLER, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2732','NİTROBROMOBENZENLER, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2733','AMİNLER, ALEVLENEBİLİR,  AŞINDIRICI, B.B.B. veya POLİAMİNLER, ALEVLENEBİLİR,  AŞINDIRICI, B.B.B.','3','FC','I','C/E','338','3
+8','1','','E0'),
('2734','AMİNLER, SIVI, AŞINDIRICI, ALEVLENEBİLİR, B.B.B. veya  POLİAMİNLER, SIVI, AŞINDIRICI, ALEVLENEBİLİR, B.B.B.','8','CF1','I','D/E','883','8
+3','1','','E0'),
('2735','AMİNLER, SIVI, AŞINDIRICI, B.B.B. veya POLİAMİNLER, SIVI, AŞINDIRICI, B.B.B.','8','C7','I','E','88','8','1','','E0'),
('2738','N-BÜTİLANİLİN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2739','BÜTİRİK ANHİDRİT','8','C3','III','E','80','8','3','5 L','E1'),
('2740','n-PROPİL KLOROFORMAT','6.1','TFC','I','C/D','668','6.1
+3
+8','1','','E0'),
('2741','BARYUM HİPOKLORİT %22''den  fazla hazır klor içeren','5.1','OT2','II','E','56','5.1
+6.1','2','1 kg','E2'),
('2742','KLOROFORMATLAR, ZEHİRLİ, AŞINDIRICI, ALEVLENEBİLİR,  B.B.B.','6.1','TFC','II','D/E','638','6.1
+3
+8','2','100 ml','E4'),
('2743','n-BÜTİL KLOROFORMAT','6.1','TFC','II','D/E','638','6.1
+3
+8','2','100 ml','E0'),
('2744','SİKLOBÜTİL KLOROFORMAT','6.1','TFC','II','D/E','638','6.1
+3
+8','2','100 ml','E4'),
('2745','KLOROMETİL KLOROFORMAT','6.1','TC1','II','D/E','68','6.1
+8','2','100 ml','E4'),
('2746','FENİL KLOROFORMAT','6.1','TC1','II','D/E','68','6.1
+8','2','100 ml','E4'),
('2747','tert-BÜTİLSİKLOHEKZİL  KLOROFORMAT','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2748','2-ETİLHEKZİL KLOROFORMAT','6.1','TC1','II','D/E','68','6.1
+8','2','100 ml','E4'),
('2749','TETRAMETİLSİLAN','3','F1','I','D/E','33','3','1','','E0'),
('2750','1,3-DİKLOROPROPANOL-2','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2751','DİETİLTİOFOSFORİL KLORÜR','8','C3','II','E','80','8','2','1 L','E2'),
('2752','1,2-EPOKSİ-3-ETOKSİPROPAN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2753','N-ETİLBENZİLTOLUİDİNLER, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2754','N-ETİLTOLUİDİNLER','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2757','KARBAMAT PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2758','KARBAMAT PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2759','ARSENİKLİ PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2760','ARSENİKLİ PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2761','ORGANOKLORİN PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2762','ORGANOKLORLU PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2763','TRİAZİN PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2764','TRİAZİN PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2771','TİYOKARBAMAT PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2772','TİYOKARBAMAT PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2775','BAKIR ESASLI PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2776','BAKIR ESASLI PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2777','CIVA ESASLI PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2778','CIVA ESASLI PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2779','İKAMELİ NİTROFENOL  PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2780','İKAMELİ NİTROFENOL  PESTİSİT, SIVI, ALEVLENEBİLİR,  ZEHİRLİ, parlama noktası 23 °C''den  düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2781','BİPİRİDİLYUM PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2782','BİPİRİDİLYUM PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2783','ORGANOFOSFOR PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2784','ORGANOFOSFOR PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2785','4-TİYAPENTANAL','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2786','ORGANOTİN PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('2787','ORGANOTİN PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('2788','ORGANOTİN BİLEŞİĞİ, SIVI, B.B.B.','6.1','T3','I','C/E','66','6.1','1','','E5'),
('2789','ASETİK ASİT, GLASİYAL veya  ASETİK ASİT ÇÖZELTİSİ, kütlece  %80''den fazla asit içeren','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('2790','ASETİK ASİT ÇÖZELTİSİ, kütlece  %50''den fazla ancak %80''den az asit  içeren','8','C3','II','E','80','8','2','1 L','E2'),
('2793','DEMİR METAL TALAŞLARI,  KIRPINTILARI,HURDALARI veya  KIYMIKLARI kendiliğinden  ısınmaya yatkın halde','4.2','S4','III','E','40','4.2','3','','E1'),
('2794','AKÜLER, SULU, ASİT  DOLDURULMUŞ, elektrik depolama','8','C11','','E','80','8','3','1 L','E0'),
('2795','AKÜLER, SULU, ALKALİ  DOLDURULMUŞ, elektrik depolama','8','C11','','E','80','8','3','1 L','E0'),
('2796','SÜLFÜRİK ASİT %51''den az asit  içeren veya AKÜ SUYU, ASİTLİ','8','C1','II','E','80','8','2','1 L','E2'),
('2797','AKÜ SUYU, ALKALİ','8','C5','II','E','80','8','2','1 L','E2'),
('2798','FENİLFOSFOR DİKLORÜR','8','C3','II','E','80','8','2','1 L','E0'),
('2799','FENİLFOSFOR TİYODİKLORÜR','8','C3','II','E','80','8','2','1 L','E0'),
('2800','AKÜLER, SULU, DÖKÜLMEYEN, elektrik depolama','8','C11','','E','80','8','3','1 L','E0'),
('2801','BOYA, SIVI, AŞINDIRICI, B.B.B. veya BOYA ARA ÜRÜN, SIVI, AŞINDIRICI, B.B.B.','8','C9','I','E','88','8','1','','E0'),
('2802','BAKIR KLORÜR','8','C2','III','E','80','8','3','5 kg','E1'),
('2803','GALYUM','8','C10','III','E','80','8','3','5 kg','E0'),
('2805','LİTYUM HİDRİT, ERGİTİLMİŞ  KATI','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('2806','LİTYUM NİTRİT','4.3','W2','I','E','','4.3','1','','E0'),
('2807','Manyetize edilmiş malzeme','9','M11','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('2809','CIVA','8','CT1','III','E','86','8
+6.1','3','5 kg','E0'),
('2810','ZEHİRLİ SIVI, ORGANİK, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E5'),
('2811','ZEHİRLİ KATI, ORGANİK, B.B.B.','6.1','T2','I','C/E','66','6.1','1','','E5'),
('2812','Sodyum alüminat, katı','8','C6','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('2813','SU İLE TEPKİMEYE GİREN, KATI, B.B.B.','4.3','W2','I','B/E','X423','4.3','0','','E0'),
('2814','BULAŞICI MADDE, İNSANLARI  ETKİLEYEN','6.2','I1','','','','6.2','0','','E0'),
('2815','N-AMİNOETİLPİPERAZİN','8','CT1','III','E','86','8
+6.1','3','5 L','E1'),
('2817','AMONYUM HİDROJENDİFLORÜR ÇÖZELTİSİ','8','CT1','II','E','86','8
+6.1','2','1 L','E2'),
('2818','AMONYUM POLİSÜLFÜR ÇÖZELTİSİ','8','CT1','II','E','86','8
+6.1','2','1 L','E2'),
('2819','AMİL ASİT FOSFAT','8','C3','III','E','80','8','3','5 L','E1'),
('2820','BÜTİRİK ASİT','8','C3','III','E','80','8','3','5 L','E1'),
('2821','FENOL ÇÖZELTİSİ','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2822','2-KLOROPİRİDİN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2823','KROTONİK ASİT, KATI','8','C4','III','E','80','8','3','5 kg','E1'),
('2826','ETİL KLOROOTİYOFORMAT','8','CF1','II','D/E','83','8
+3','2','','E0'),
('2829','KAPROİK ASİT','8','C3','III','E','80','8','3','5 L','E1'),
('2830','LİTYUM FERROSİLİKON','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('2831','1,1,1 -TRİKLOROETAN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2834','FOSFOR ASİT','8','C2','III','E','80','8','3','5 kg','E1'),
('2835','SODYUM ALÜMİNYUM HİDRİT','4.3','W2','II','D/E','423','4.3','2','500 g','E0'),
('2837','BİSÜLFATLAR, SULU ÇÖZELTİ','8','C1','II','E','80','8','2','1 L','E2'),
('2838','VİNİL BÜTİRAT, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('2839','ALDOL','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2840','BÜTİRALDOKSİM','3','F1','III','D/E','30','3','3','5 L','E1'),
('2841','Dİ-n-AMİLAMİN','3','FT1','III','D/E','36','3
+6.1','3','5 L','E1'),
('2842','NİTROETAN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2844','KALSİYUM MANGANEZ  SİLİKON','4.3','W2','III','E','423','4.3','3','1 kg','E1'),
('2845','PİROFORİK SIVI, ORGANİK, B.B.B.','4.2','S1','I','B/E','333','4.2','0','','E0'),
('2846','PİROFORİK KATI, ORGANİK, B.B.B.','4.2','S2','I','E','','4.2','0','','E0'),
('2849','3-KLOROPROPANOL-1','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2850','PROPİLEN TETRAMER','3','F1','III','D/E','30','3','3','5 L','E1'),
('2851','BOR TRİFLORÜR DİHİDRAT','8','C1','II','E','80','8','2','1 L','E2'),
('2852','DİPİKRİL SÜLFÜR, ISLATILMIŞ  kütlece %10''dan az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('2853','MAGNEZYUM FLOROSİLİKAT','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2854','AMONYUM FLOROSİLİKAT','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2855','ÇİNKO FLOROSİLİKAT','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2856','FLOROSİLİKATLAR, B.B.B.','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2857','SOĞUTUCU MAKİNELER, alevlenebilir olmayan, zehirli  olmayan gazlar veya amonyak  çözeltisi içeren (UN 2672)','2','6A','','E','','2.2','3','','E0'),
('2858','ZİRKONYUM, KURU, sarmallı tel, işlenmiş metal tabakalar, şerit (254  mikrondan ince fakat 18 mikrondan  ince olmayan)','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('2859','AMONYUM METAVANADAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('2861','AMONYUM POLİVANADAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('2862','VANADYUM PENTOKSİT, ergitilmemiş biçimde','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2863','SODYUM AMONYUM VANADAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('2864','POTASYUM METAVANADAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('2865','HİDROKSİLAMİN SÜLFAT','8','C2','III','E','80','8','3','5 kg','E1'),
('2869','TİTANYUM TRİKLORÜR  KARIŞIMI','8','C2','II','E','80','8','2','1 kg','E2'),
('2870','ALÜMİNYUM BOROHİDRİT','4.2','SW1','I','B/E','X333','4.2
+4.3','0','','E0'),
('2871','ANTİMON TOZU','6.1','T5','III','E','60','6.1','2','5 kg','E1'),
('2872','DİBROMOKLOROPROPANLAR','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2873','DİBÜTİLAMİNOETANOL','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2874','FURFURİL ALKOL','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2875','HEKZAKLOROFEN','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2876','RESORSİNOL','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('2878','TİTANYUM SÜNGER  GRANÜLLERİ veya TİTANYUM  SÜNGER TOZLARI','4.1','F3','III','E','40','4.1','3','5 kg','E1'),
('2879','SELENYUM OKSİKLORÜR','8','CT1','I','C/D','X886','8
+6.1','1','','E0'),
('2880','KALSİYUM HİPOKLORİT, HİDRATLANMIŞ veya  KALSİYUM HİPOKLORİT, HİDRATLANMIŞ KARIŞIM, %  5,5''ten az olmayan ancak % 16''dan  fazla su içermeyen','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('2881','METAL KATALİZÖR, KURU','4.2','S4','I','B/E','43','4.2','0','','E0'),
('2900','BULAŞICI MADDE, yalnızca  HAYVANLARI ETKİLEYEN','6.2','I2','','','','6.2','0','','E0'),
('2901','BROM KLORÜR','2','2TOC','','C/D','265','2.3
+5.1
+8','1','','E0'),
('2902','PESTİSİT, SIVI, ZEHİRLİ, B.B.B.','6.1','T6','I','C/E','66','6.1','1','','E5'),
('2903','PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR, B.B.B., parlama  noktası 23 °C''den düşük olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('2904','KLOROFENOLATLAR, SIVI veya  FENOLATLAR, SIVI','8','C9','III','E','80','8','3','5 L','E1'),
('2905','KLOROFENOLATLAR, KATI veya  FENOLATLAR, KATI','8','C10','III','E','80','8','3','5 kg','E1'),
('2907','İZOSORBİD DİNİTRAT KARIŞIMI  içerdiği laktoz, mannoz, nişasta veya  kalsiyum hidrojen fosfat miktarı  %60''tan az olmayan','4.1','D','II','B','','4.1','2','','E0'),
('2908','RADYOAKTİF MALZEME, ADİ  PAKET - BOŞ AMBALAJ','7','','','','','','4','','E0'),
('2909','RADYOAKTİF MALZEME, ADİ  PAKET - DOĞAL URANYUM veya  FAKİRLEŞTİRİLMİŞ URANYUM  veya DOĞAL TORYUMDAN  YAPILMIŞ NESNELER','7','','','','','','4','','E0'),
('2910','RADYOAKTİF MALZEME, ADİ  PAKET – SINIRLI MALZEME MİKTARI','7','','','','','','4','','E0'),
('2911','RADYOAKTİF MALZEME, ADİ  PAKET - ALETLER veya  NESNELER','7','','','','','','4','','E0'),
('2912','RADYOAKTİF MALZEME, DÜŞÜK ÖZGÜL AKTİVİTE (LSA- I), bölünebilir olmayan veya istisnai  bölünebilir','7','','','E','70','7X','0','','E0'),
('2913','RADYOAKTİF MALZEME, YÜZEYİ BULAŞMIŞ NESNELER  (SCO-I, SCO-II veya SCO-III), bölünebilir olmayan veya istisnai  bölünebilir','7','','','E','70','7X','0','','E0'),
('2915','RADYOAKTİF MALZEME, TİP A  AMBALAJ, özel hazırlanmamış, bölünebilir olmayan veya istisnai  bölünebilir','7','','','E','70','7X','0','','E0'),
('2916','RADYOAKTİF MALZEME, TİP  B(U) AMBALAJ, bölünebilir  olmayan veya istisnai bölünebilir','7','','','E','70','7X','0','','E0'),
('2917','RADYOAKTİF MALZEME, TİP  B(M) AMBALAJ, bölünebilir  olmayan veya istisnai bölünebilir','7','','','E','70','7X','0','','E0'),
('2919','RADYOAKTİF MALZEME, ÖZEL  DÜZENLEME İLE TAŞINAN, bölünebilir olmayan veya istisnai bölünebilir','7','','','','70','7X','0','','E0'),
('2920','AŞINDIRICI SIVI, ALEVLENEBİLİR, B.B.B.','8','CF1','I','D/E','883','8
+3','1','','E0'),
('2921','AŞINDIRICI KATI, ALEVLENEBİLİR, B.B.B.','8','CF2','I','E','884','8
+4.1','1','','E0'),
('2922','AŞINDIRICI SIVI, ZEHİRLİ, B.B.B.','8','CT1','I','C/D','886','8
+6.1','1','','E0'),
('2923','AŞINDIRICI KATI, ZEHİRLİ, B.B.B.','8','CT2','I','E','886','8
+6.1','1','','E0'),
('2924','ALEVLENEBİLİR SIVI, AŞINDIRICI, B.B.B.','3','FC','I','C/E','338','3
+8','1','','E0'),
('2925','ALEVLENEBİLİR KATI, AŞINDIRICI, ORGANİK, B.B.B.','4.1','FC1','II','E','48','4.1
+8','2','1 kg','E2'),
('2926','ALEVLENEBİLİR KATI, ZEHİRLİ, ORGANİK, B.B.B.','4.1','FT1','II','E','46','4.1
+6.1','2','1 kg','E2'),
('2927','ZEHİRLİ SIVI, AŞINDIRICI, ORGANİK, B.B.B.','6.1','TC1','I','C/E','668','6.1
+8','1','','E5'),
('2928','ZEHİRLİ KATI, AŞINDIRICI, ORGANİK, B.B.B.','6.1','TC2','I','C/E','668','6.1
+8','1','','E5'),
('2929','ZEHİRLİ SIVI, ALEVLENEBİLİR,  ORGANİK, B.B.B.','6.1','TF1','I','C/D','663','6.1
+3','1','','E5'),
('2930','ZEHİRLİ KATI, ALEVLENEBİLİR,  ORGANİK, B.B.B.','6.1','TF3','I','C/E','664','6.1
+4.1','1','','E5'),
('2931','VANADİL SÜLFAT','6.1','T5','II','D/E','60','6.1','2','500 g','E4'),
('2933','METİL 2-KLOROPROPİONAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2934','İZOPROPİL 2-KLOROPROPİONAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2935','ETİL 2-KLOROPROPİONAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2936','TİYOLAKTİK ASİT','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2937','alfa-METİLBENZİL ALKOL, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2940','9-FOSFABİSİKLONONANLAR  (SİKLOOKTADİEN FOSFİNLER)','4.2','S2','II','D/E','40','4.2','2','','E2'),
('2941','FLOROANİLİNLER','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2942','2-TRİFLOROMETİLANİLİN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2943','TETRAHİDROFURFURİLAMİN','3','F1','III','D/E','30','3','3','5 L','E1'),
('2945','N-METİLBÜTİLAMİN','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('2946','2-AMİNO-5- DİETİLAMİNOPENTAN','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('2947','İZOPROPİL KLOROASETAT','3','F1','III','D/E','30','3','3','5 L','E1'),
('2948','3-TRİFLOROMETİLANİLİN','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2949','SODYUM HİDROSÜLFÜR,  HİDRATLANMIŞ %25''ten az  olmayan kristalizasyon suyu içeren','8','C6','II','E','80','8','2','1 kg','E2'),
('2950','MAGNEZYUM GRANÜLLERİ, KAPLANMIŞ, tane boyutu 149  mikrondan az olmayan','4.3','W2','III','E','423','4.3','3','1 kg','E1'),
('2956','5-tert-BÜTİL-2,4,6-TRİNİTRO-m- KSİLEN (MİSK KSİLEN)','4.1','SR1','III','D','','4.1','3','5 kg','E0'),
('2965','BOR TRİFLORÜR DİMETİL  ETERAT','4.3','WFC','I','B/E','382','4.3
+3
+8','0','','E0'),
('2966','TİYOGLİKOL','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('2967','SÜLFAMİK ASİT','8','C2','III','E','80','8','3','5 kg','E1'),
('2968','MANEB, STABİLİZE veya MANEB  MÜSTAHZARI, STABİLİZE  kendiliğinden ısınmaya karşı','4.3','W2','III','E','423','4.3','0','1 kg','E1'),
('2969','HİNTYAĞI TOHUMU veya  HİNTYAĞI KÜSPESİ veya  HİNTYAĞI POSASI veya  HİNTYAĞI PULCUĞU','9','M11','II','E','90','9','2','5 kg','E2'),
('2977','RADYOAKTİF MALZEME, URANYUM HEKZAFLORÜR,  BÖLÜNEBİLİR','7','','','C','768','7X
+7E
+6.1
+8','0','','E0'),
('2978','RADYOAKTİF MALZEME, URANYUM HEKZAFLORÜR bölünebilir olmayan veya istisnai  bölünebilir','7','','','C','768','7X
+6.1
+8','0','','E0'),
('2983','ETİLEN OKSİT VE PROPİLEN  OKSİT KARIŞIMI %30''dan az etilen  oksit içeren','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('2984','HİDROJEN PEROKSİT, SULU  ÇÖZELTİ hidrojen peroksit oranı  %8''den fazla, ancak %20''den az  (gerektiği gibi stabilize)','5.1','O1','III','E','50','5.1','3','5 L','E1'),
('2985','KLOROSİLANLAR, ALEVLENEBİLİR, AŞINDIRICI, B.B.B.','3','FC','II','D/E','X338','3
+8','2','','E0'),
('2986','KLOROSİLANLAR, AŞINDIRICI, ALEVLENEBİLİR, B.B.B.','8','CF1','II','D/E','X83','8
+3','2','','E0'),
('2987','KLOROSİLANLAR, AŞINDIRICI, B.B.B.','8','C3','II','E','X80','8','2','','E0'),
('2988','KLOROSİLANLAR, SU İLE  TEPKİMEYE GİREN, ALEVLENEBİLİR, AŞINDIRICI, B.B.B.','4.3','WFC','I','B/E','X338','4.3
+3
+8','0','','E0'),
('2989','KURŞUN FOSFİT, DİBAZİK','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('2990','CAN KURTARICI ALETLER, KENDİLİĞİNDEN ŞİŞEN','9','M5','','E','','9','3','','E0'),
('2991','KARBAMAT PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('2992','KARBAMAT PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('2993','ARSENİKLİ PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('2994','ARSENİKLİ PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('2995','ORGANOKLORLU PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('2996','ORGANOKLORLU PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('2997','TRİAZİN PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('2998','TRİAZİN PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3005','TİYOKARBAMAT PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3006','TİYOKARBAMAT PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3009','BAKIR ESASLI PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3010','BAKIR ESASLI PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3011','CIVA ESASLI PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3012','CIVA ESASLI PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3013','İKAMELİ NİTROFENOL PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3014','İKAMELİ NİTROFENOL PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3015','BİPİRİDİLYUM PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3016','BİPİRİDİLYUM PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3017','ORGANOFOSFORLU PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3018','ORGANOFOSFOR PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3019','ORGANOTİN PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3020','ORGANOTİN PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3021','PESTİSİT, SIVI, ALEVLENEBİLİR,  ZEHİRLİ, B.B.B., parlama noktası 23  °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('3022','1,2-BÜTİLEN OKSİT, STABİLİZE','3','F1','II','D/E','339','3','2','1 L','E2'),
('3023','2-METİL-2-HEPTANETİYOL','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('3024','KUMARİN TÜREVLİ PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('3025','KUMARİN TÜREVLİ PESTİSİT, ALEVLENEBİLİR, SIVI, ZEHİRLİ, parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3026','KUMARİN TÜREVLİ PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3027','KUMARİN TÜREVLİ PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('3028','AKÜLER, KURU, POTASYUM  HİDROKSİT İÇEREN, KATI, elektrik depolama','8','C11','','E','80','8','3','2 kg','E0'),
('3048','ALÜMİNYUM FOSFÜR PESTİSİT','6.1','T7','I','C/E','642','6.1','1','','E0'),
('3054','SİKLOHEKZİL MERKAPTAN','3','F1','III','D/E','30','3','3','5 L','E1'),
('3055','2-(2-AMİNOETOKSİ) ETANOL','8','C7','III','E','80','8','3','5 L','E1'),
('3056','n-HEPTALDEHİT','3','F1','III','D/E','30','3','3','5 L','E1'),
('3057','TRİFLOROASETİL KLORÜR','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('3064','NİTROGLİSERİN ÇÖZELTİSİ  ALKOLDE %1''den fazla ama %5''ten  daha az nitrogliserin içeren','3','D','II','B','','3','2','','E0'),
('3065','ALKOLLÜ İÇKİLER, hacimce  %70''den fazla alkol içeren','3','F1','II','D/E','33','3','2','5 L','E2'),
('3066','BOYA (boya, vernik, emaye, renklendirici, lake, cila, parlatıcı, sıvı  dolgu ve sıvı vernik bazı dâhil) veya  BOYA İLE İLGİLİ MALZEME  (boya inceltici veya azaltıcı bileşiği  dâhil)','8','C9','II','E','80','8','2','1 L','E2'),
('3070','ETİLEN OKSİT VE  DİKLORODİFLOROMETAN  KARIŞIMI, %12,5''ten fazla olmayan  etilen oksit içeren','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3071','MERKAPTANLAR, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  B.B.B. veya MERKAPTAN  KARIŞIMI, SIVI, ZEHİRLİ, ALEVLENEBİLİR, B.B.B.','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E4'),
('3072','CAN KURTARICI ALETLER, KENDİLİĞİNDEN ŞİŞMEYEN  teçhizat olarak tehlikeli maddeler  içeren','9','M5','','E','','9','3','','E0'),
('3073','VİNİLPİRİDİNLER, STABİLİZE','6.1','TFC','II','D/E','638','6.1
+3
+8','2','100 ml','E4'),
('3077','ÇEVREYE ZARARLI MADDE, KATI, B.B.B.','9','M7','III','V13','90','9','3','5 kg','E1'),
('3078','SERYUM, talaş veya kumlu toz','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('3079','METAKRİLONİTRİL, STABİLİZE','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('3080','İZOSİYANATLAR, ZEHİRLİ, ALEVLENEBİLİR, B.B.B. veya  İZOSİYANAT ÇÖZELTİSİ, ZEHİRLİ, ALEVLENEBİLİR,  B.B.B.','6.1','TF1','II','D/E','63','6.1
+3','2','100 ml','E4'),
('3082','ÇEVREYE ZARARLI MADDE, SIVI, B.B.B.','9','M6','III','V12','90','9','3','5 L','E1'),
('3083','PERKLORİL FLORÜR','2','2TO','','C/D','265','2.3
+5.1','1','','E0'),
('3084','AŞINDIRICI KATI, YÜKSELTGEN, B.B.B.','8','CO2','I','E','885','8
+5.1','1','','E0'),
('3085','YÜKSELTGEN KATI, AŞINDIRICI, B.B.B.','5.1','OC2','I','E','','5.1
+8','1','','E0'),
('3086','ZEHİRLİ KATI, YÜKSELTGEN, B.B.B.','6.1','TO2','I','C/E','665','6.1
+5.1','1','','E5'),
('3087','YÜKSELTGEN KATI, ZEHİRLİ, B.B.B.','5.1','OT2','I','E','','5.1
+6.1','1','','E0'),
('3088','KENDİLİĞİNDEN ISINAN KATI, ORGANİK, B.B.B.','4.2','S2','II','D/E','40','4.2','2','','E2'),
('3089','METAL TOZU, ALEVLENEBİLİR,  B.B.B.','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('3090','LİTYUM METAL BATARYALAR  (lityum alaşımlı bataryalar dâhil)','9','M4','','E','','9A','2','','E0'),
('3091','LİTYUM METAL BATARYALAR  TEÇHİZAT İÇİNDE veya LİTYUM  METAL BATARYALAR  TEÇHİZATLA AMBALAJLANMIŞ  (lityum alaşımlı bataryalar dâhil)','9','M4','','E','','9A','2','','E0'),
('3092','1-METOKSİ-2-PROPANOL','3','F1','III','D/E','30','3','3','5 L','E1'),
('3093','AŞINDIRICI SIVI, YÜKSELTGEN, B.B.B.','8','CO1','I','E','885','8
+5.1','1','','E0'),
('3094','AŞINDIRICI SIVI, SU İLE  TEPKİMEYE GİREN, B.B.B.','8','CW1','I','D/E','823','8
+4.3','1','','E0'),
('3095','AŞINDIRICI KATI, KENDİLİĞİNDEN ISINAN, B.B.B.','8','CS2','I','E','884','8
+4.2','1','','E0'),
('3096','AŞINDIRICI KATI, SU İLE  TEPKİMEYE GİREN, B.B.B.','8','CW2','I','E','842','8
+4.3','1','','E0'),
('3097','ALEVLENEBİLİR KATI, YÜKSELTGEN, B.B.B.','4.1','FO','TAŞINMASI YASAKTIR','','','','','',''),
('3098','YÜKSELTGEN SIVI, AŞINDIRICI, B.B.B.','5.1','OC1','I','E','','5.1
+8','1','','E0'),
('3099','YÜKSELTGEN SIVI, ZEHİRLİ, B.B.B.','5.1','OT1','I','E','','5.1
+6.1','1','','E0'),
('3100','YÜKSELTGEN KATI, KENDİLİĞİNDEN ISINAN, B.B.B.','5.1','OS','TAŞINMASI YASAKTIR','','','','','',''),
('3101','ORGANİK PEROKSİT TİP B, SIVI','5.2','P1','','B','','5.2
+1','1','25 ml','E0'),
('3102','ORGANİK PEROKSİT TİP B, KATI','5.2','P1','','B','','5.2
+1','1','100 g','E0'),
('3103','ORGANİK PEROKSİT TİP C, SIVI','5.2','P1','','D','','5.2','1','25 ml','E0'),
('3104','ORGANİK PEROKSİT TİP C, KATI','5.2','P1','','D','','5.2','1','100 g','E0'),
('3105','ORGANİK PEROKSİT TİP D, SIVI','5.2','P1','','D','','5.2','2','125 ml','E0'),
('3106','ORGANİK PEROKSİT TİP D, KATI','5.2','P1','','D','','5.2','2','500 g','E0'),
('3107','ORGANİK PEROKSİT TİP E, SIVI','5.2','P1','','D','','5.2','2','125 ml','E0'),
('3108','ORGANİK PEROKSİT TİP E, KATI','5.2','P1','','D','','5.2','2','500 g','E0'),
('3109','ORGANİK PEROKSİT TİP F, SIVI','5.2','P1','','D','539','5.2','2','125 ml','E0'),
('3110','ORGANİK PEROKSİT TİP F, KATI','5.2','P1','','D','539','5.2','2','500 g','E0'),
('3111','ORGANİK PEROKSİT TİP B, SIVI, SICAKLIK KONTROLLÜ','5.2','P2','','B','','5.2
+1','1','','E0'),
('3112','ORGANİK PEROKSİT TİP B, KATI, SICAKLIK KONTROLLÜ','5.2','P2','','B','','5.2
+1','1','','E0'),
('3113','ORGANİK PEROKSİT TİP C, SIVI, SICAKLIK KONTROLLÜ','5.2','P2','','D','','5.2','1','','E0'),
('3114','ORGANİK PEROKSİT TİP C, KATI, SICAKLIK KONTROLLÜ','5.2','P2','','D','','5.2','1','','E0'),
('3115','ORGANİK PEROKSİT TİP D, SIVI, SICAKLIK KONTROLLÜ','5.2','P2','','D','','5.2','1','','E0'),
('3116','ORGANİK PEROKSİT TİP D, KATI, SICAKLIK KONTROLLÜ','5.2','P2','','D','','5.2','1','','E0'),
('3117','ORGANİK PEROKSİT TİP E, SIVI, SICAKLIK KONTROLLÜ','5.2','P2','','D','','5.2','1','','E0'),
('3118','ORGANİK PEROKSİT TİP E, KATI, SICAKLIK KONTROLLÜ','5.2','P2','','D','','5.2','1','','E0'),
('3119','ORGANİK PEROKSİT TİP F, SIVI, SICAKLIK KONTROLLÜ','5.2','P2','','D','539','5.2','1','','E0'),
('3120','ORGANİK PEROKSİT TİP F, KATI, SICAKLIK KONTROLLÜ','5.2','P2','','D','539','5.2','1','','E0'),
('3121','YÜKSELTGEN KATI, SU İLE  TEPKİMEYE GİREN, B.B.B.','5.1','OW','TAŞINMASI YASAKTIR','','','','','',''),
('3122','ZEHİRLİ SIVI, YÜKSELTGEN, B.B.B.','6.1','TO1','I','C/E','665','6.1
+5.1','1','','E0'),
('3123','ZEHİRLİ SIVI, SU İLE  TEPKİMEYE GİREN, B.B.B.','6.1','TW1','I','C/E','623','6.1
+4.3','1','','E0'),
('3124','ZEHİRLİ KATI, KENDİLİĞİNDEN  ISINAN, B.B.B.','6.1','TS','I','C/E','664','6.1
+4.2','1','','E5'),
('3125','ZEHİRLİ KATI, SU İLE  TEPKİMEYE GİREN, B.B.B.','6.1','TW2','I','C/E','642','6.1
+4.3','1','','E5'),
('3126','KENDİLİĞİNDEN ISINAN KATI, AŞINDIRICI, ORGANİK, B.B.B.','4.2','SC2','II','D/E','48','4.2
+8','2','','E2'),
('3127','KENDİLİĞİNDEN ISINAN KATI, YÜKSELTGEN, B.B.B.','4.2','SO','TAŞINMASI YASAKTIR','','','','','',''),
('3128','KENDİLİĞİNDEN ISINAN KATI, ZEHİRLİ, ORGANİK, B.B.B.','4.2','ST2','II','D/E','46','4.2
+6.1','2','','E2'),
('3129','SU İLE TEPKİMEYE GİREN SIVI, AŞINDIRICI, B.B.B.','4.3','WC1','I','B/E','X382','4.3
+8','0','','E0'),
('3130','SU İLE TEPKİMEYE GİREN SIVI, ZEHİRLİ, B.B.B.','4.3','WT1','I','B/E','X362','4.3
+6.1','0','','E0'),
('3131','SU İLE TEPKİMEYE GİREN KATI, AŞINDIRICI, B.B.B.','4.3','WC2','I','B/E','X482','4.3
+8','0','','E0'),
('3132','SU İLE TEPKİMEYE GİREN KATI, ALEVLENEBİLİR, B.B.B.','4.3','WF2','I','E','','4.3
+4.1','0','','E0'),
('3133','SU İLE TEPKİMEYE GİREN KATI, YÜKSELTGEN, B.B.B.','4.3','WO','TAŞINMASI YASAKTIR','','','','','',''),
('3134','SU İLE TEPKİMEYE GİREN KATI, ZEHİRLİ, B.B.B.','4.3','WT2','I','E','','4.3
+6.1','0','','E0'),
('3135','SU İLE TEPKİMEYE GİREN KATI, KENDİLİĞİNDEN ISINAN, B.B.B.','4.3','WS','I','E','','4.3
+4.2','1','','E0'),
('3136','TRİFLOROMETAN, SOĞUTULMUŞ SIVI','2','3A','','C/E','22','2.2','3','120 ml','E1'),
('3137','YÜKSELTGEN KATI, ALEVLENEBİLİR, B.B.B.','5.1','OF','TAŞINMASI YASAKTIR','','','','','',''),
('3138','ETİLEN, ASETİLEN VE  PROPİLEN KARIŞIMI, SOĞUTULMUŞ SIVI %6''dan az  propilen, %22,5''ten az asetilen ve en  az %71,5 etilen içeren','2','3F','','B/D','223','2.1','2','','E0'),
('3139','YÜKSELTGEN SIVI, B.B.B.','5.1','O1','I','E','','5.1','1','','E0'),
('3140','ALKALOİTLER, SIVI, B.B.B. veya  ALKALOİT TUZLARI, SIVI, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E5'),
('3141','ANTİMON BİLEŞİĞİ, İNORGANİK, SIVI, B.B.B.','6.1','T4','III','E','60','6.1','2','5 L','E1'),
('3142','DEZENFEKTAN, SIVI, ZEHİRLİ, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E5'),
('3143','BOYA, KATI, ZEHİRLİ, B.B.B. veya BOYA ARA ÜRÜN, KATI, ZEHİRLİ, B.B.B.','6.1','T2','I','C/E','66','6.1','1','','E5'),
('3144','NİKOTİN BİLEŞİĞİ, SIVI, B.B.B. veya NİKOTİN MÜSTAHZARI, SIVI, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E5'),
('3145','ALKİLFENOLLER, SIVI, B.B.B. (C2- C12 homologlar dâhil)','8','C3','I','E','88','8','1','','E0'),
('3146','ORGANOTİN BİLEŞİĞİ, KATI, B.B.B.','6.1','T3','I','C/E','66','6.1','1','','E5'),
('3147','BOYA, KATI, AŞINDIRICI, B.B.B. veya BOYA ARA ÜRÜN, KATI, AŞINDIRICI, B.B.B.','8','C10','I','E','88','8','1','','E0'),
('3148','SU İLE TEPKİMEYE GİREN SIVI, B.B.B.','4.3','W1','I','B/E','X323','4.3','0','','E0'),
('3149','HİDROJEN PEROKSİT VE  PEROKSİASETİK ASİT KARIŞIMI  asit(ler), su içeren ve içerdiği peroksiasetik asit oranı %5''ten fazla  olmayan; STABİLİZE','5.1','OC1','II','E','58','5.1
+8','2','1 L','E2'),
('3150','DÜZENEKLER, KÜÇÜK, HİDROKARBON GAZIYLA  ÇALIŞAN veya KÜÇÜK  DÜZENEKLER İÇİN  HİDROKARBON GAZ YEDEKLERİ, tahliye cihazı içeren','2','6F','','D','','2.1','2','','E0'),
('3151','POLİHALOJENLENMİŞ  BİFENİLLER, SIVI veya  HALOJENLENMİŞ  MONOMETİLDİFENİLMETANLAR, SIVI veya POLİHALOJENLENMİŞ  TERFENİLLER, SIVI','9','M2','II','D/E','90','9','0','1 L','E2'),
('3152','POLİHALOJENLENMİŞ  BİFENİLLER, KATI veya  HALOJENLENMİŞ  MONOMETİLDİFENİLMETANLAR, KATI veya POLİHALOJENLENMİŞ  TERFENİLLER, KATI','9','M2','II','D/E','90','9','0','1 kg','E2'),
('3153','PERFLORO(METİL VİNİL ETER)','2','2F','','B/D','23','2.1','2','','E0'),
('3154','PERFLORO(ETİL VİNİL ETER)','2','2F','','B/D','23','2.1','2','','E0'),
('3155','PENTAKLOROFENOL','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3156','SIKIŞTIRILMIŞ GAZ, YÜKSELTGEN, B.B.B.','2','1O','','E','25','2.2
+5.1','3','','E0'),
('3157','SIVILAŞTIRILMIŞ GAZ, YÜKSELTGEN, B.B.B.','2','2O','','C/E','25','2.2
+5.1','3','','E0'),
('3158','GAZ, SOĞUTULMUŞ SIVI, B.B.B.','2','3A','','C/E','22','2.2','3','120 ml','E1'),
('3159','1,1,1,2-TETRAFLOROETAN  (SOĞUTUCU GAZ R 134a)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3160','SIVILAŞTIRILMIŞ GAZ, ZEHİRLİ, ALEVLENEBİLİR, B.B.B.','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('3161','SIVILAŞTIRILMIŞ GAZ, ALEVLENEBİLİR, B.B.B.','2','2F','','B/D','23','2.1','2','','E0'),
('3162','SIVILAŞTIRILMIŞ GAZ, ZEHİRLİ, B.B.B.','2','2T','','C/D','26','2.3','1','','E0'),
('3163','SIVILAŞTIRILMIŞ GAZ, B.B.B.','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3164','NESNELER, BASINÇLI, PNÖMATİK veya HİDROLİK  (alevlenebilir olmayan gaz içeren)  veya','2','6A','','E','','2.2','3','120 ml','E0'),
('3165','HAVA ARACI HİDROLİK GÜÇ  BİRİMİ YAKIT TANKI (metil  hidrazin ve susuz hidrazin karışımı  içeren) (M86 yakıt)','3','FTC','','E','','3
+6.1
+8','1','','E0'),
('3166','ARAÇ, ALEVLENEBİLİR GAZLA  ÇALIŞAN veya ARAÇ, ALEVLENEBİLİR SIVIYLA  ÇALIŞAN veya ARAÇ, YAKIT PİLİ, ALEVLENEBİLİR GAZLA  ÇALIŞAN veya ARAÇ, YAKIT PİLİ, ALEVLENEBİLİR SIVIYLA  ÇALIŞAN','9','M11','','','','','','',''),
('3167','GAZ NUMUNESİ, BASINÇSIZ, ALEVLENEBİLİR, B.B.B., soğutulmamış sıvı','2','7F','','D','','2.1','2','','E0'),
('3168','GAZ NUMUNESİ, BASINÇSIZ, ZEHİRLİ, ALEVLENEBİLİR,  B.B.B., soğutulmamış sıvı','2','7TF','','D','','2.3
+2.1','1','','E0'),
('3169','GAZ NUMUNESİ, BASINÇSIZ, ZEHİRLİ, B.B.B., soğutulmamış sıvı','2','7T','','D','','2.3','1','','E0'),
('3170','ALÜMİNYUM İZABESİ YAN  ÜRÜNLERİ veya ALÜMİNYUM  YENİDEN ERİTME YAN  ÜRÜNLERİ','4.3','W2','II','D/E','423','4.3','2','500 g','E2'),
('3171','BATARYA İLE ÇALIŞAN ARAÇ  veya BATARYA İLE ÇALIŞAN  TEÇHİZAT','9','M11','','','','','','',''),
('3172','TOKSİNLER, CANLI  KAYNAKLARDAN  AYRIŞTIRILMIŞ, SIVI, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E5'),
('3174','TİTANYUM DİSÜLFÜR','4.2','S4','III','E','40','4.2','3','','E1'),
('3175','KATILAR veya katı karışımları  (müstahzar ve atıklar gibi), parlama  noktası 60 °C''ye kadar olan  ALEVLENEBİLİR SIVI, B.B.B. İÇEREN','4.1','F1','II','E','40','4.1','2','1 kg','E2'),
('3176','ALEVLENEBİLİR KATI, ORGANİK, ERİMİŞ, B.B.B.','4.1','F2','II','E','44','4.1','2','','E0'),
('3178','ALEVLENEBİLİR KATI, İNORGANİK, B.B.B.','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('3179','ALEVLENEBİLİR KATI, ZEHİRLİ, İNORGANİK, B.B.B.','4.1','FT2','II','E','46','4.1
+6.1','2','1 kg','E2'),
('3180','ALEVLENEBİLİR KATI, AŞINDIRICI, İNORGANİK, B.B.B.','4.1','FC2','II','E','48','4.1
+8','2','1 kg','E2'),
('3181','ORGANİK BİLEŞİKLERİN  METAL TUZLARI, ALEVLENEBİLİR, B.B.B.','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('3182','METAL HİDRİTLER, ALEVLENEBİLİR, B.B.B.','4.1','F3','II','E','40','4.1','2','1 kg','E2'),
('3183','KENDİLİĞİNDEN ISINAN SIVI, ORGANİK, B.B.B.','4.2','S1','II','D/E','30','4.2','2','','E2'),
('3184','KENDİLİĞİNDEN ISINAN SIVI, ZEHİRLİ, ORGANİK, B.B.B.','4.2','ST1','II','D/E','36','4.2
+6.1','2','','E2'),
('3185','KENDİLİĞİNDEN ISINAN SIVI, AŞINDIRICI, ORGANİK, B.B.B.','4.2','SC1','II','D/E','38','4.2
+8','2','','E2'),
('3186','KENDİLİĞİNDEN ISINAN SIVI, İNORGANİK, B.B.B.','4.2','S3','II','D/E','30','4.2','2','','E2'),
('3187','KENDİLİĞİNDEN ISINAN SIVI, ZEHİRLİ, İNORGANİK, B.B.B.','4.2','ST3','II','D/E','36','4.2
+6.1','2','','E2'),
('3188','KENDİLİĞİNDEN ISINAN SIVI, AŞINDIRICI, İNORGANİK, B.B.B.','4.2','SC3','II','D/E','38','4.2
+8','2','','E2'),
('3189','METAL TOZU, KENDİLİĞİNDEN  ISINAN, B.B.B.','4.2','S4','II','D/E','40','4.2','2','','E2'),
('3190','KENDİLİĞİNDEN ISINAN KATI, İNORGANİK, B.B.B.','4.2','S4','II','D/E','40','4.2','2','','E2'),
('3191','KENDİLİĞİNDEN ISINAN KATI, ZEHİRLİ, İNORGANİK, B.B.B.','4.2','ST4','II','D/E','46','4.2
+6.1','2','','E2'),
('3192','KENDİLİĞİNDEN ISINAN KATI, AŞINDIRICI, İNORGANİK, B.B.B.','4.2','SC4','II','D/E','48','4.2
+8','2','','E2'),
('3194','PİROFORİK SIVI, İNORGANİK, B.B.B.','4.2','S3','I','B/E','333','4.2','0','','E0'),
('3200','PİROFORİK KATI, İNORGANİK, B.B.B.','4.2','S4','I','B/E','43','4.2','0','','E0'),
('3205','ALKALİ TOPRAK METAL  ALKOLATLAR, B.B.B.','4.2','S4','II','D/E','40','4.2','2','','E2'),
('3206','ALKALİ METAL ALKOLATLAR, KENDİLİĞİNDEN ISINAN, AŞINDIRICI, B.B.B.','4.2','SC4','II','D/E','48','4.2
+8','2','','E2'),
('3208','METALİK MADDE, SU İLE  TEPKİMEYE GİREN, B.B.B.','4.3','W2','I','E','','4.3','1','','E0'),
('3209','METALİK MADDE, SU İLE  TEPKİMEYE GİREN, KENDİLİĞİNDEN ISINAN, B.B.B.','4.3','WS','I','E','','4.3
+4.2','1','','E0'),
('3210','KLORATLAR, İNORGANİK, SULU  ÇÖZELTİ, B.B.B.','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('3211','PERKLORATLAR, İNORGANİK, SULU ÇÖZELTİ, B.B.B.','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('3212','HİPOKLORİTLER, İNORGANİK, B.B.B.','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('3213','BROMATLAR, İNORGANİK, SULU ÇÖZELTİ, B.B.B.','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('3214','PERMANGANATLAR, İNORGANİK, SULU ÇÖZELTİ, B.B.B.','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('3215','PERSÜLFATLAR, İNORGANİK, B.B.B.','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('3216','PERSÜLFATLAR, İNORGANİK, SULU ÇÖZELTİ, B.B.B.','5.1','O1','III','E','50','5.1','3','5 L','E1'),
('3218','NİTRATLAR, İNORGANİK, SULU  ÇÖZELTİ, B.B.B.','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('3219','NİTRİTLER, İNORGANİK, SULU  ÇÖZELTİ, B.B.B.','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('3220','PENTAFLOROETAN (SOĞUTUCU  GAZ R 125)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3221','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP B','4.1','SR1','','B','','4.1
+1','1','25 ml','E0'),
('3222','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP B','4.1','SR1','','B','','4.1
+1','1','100 g','E0'),
('3223','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP C','4.1','SR1','','D','','4.1','1','25 ml','E0'),
('3224','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP C','4.1','SR1','','D','','4.1','1','100 g','E0'),
('3225','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP D','4.1','SR1','','D','','4.1','2','125 ml','E0'),
('3226','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP D','4.1','SR1','','D','','4.1','2','500 g','E0'),
('3227','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP E','4.1','SR1','','D','','4.1','2','125 ml','E0'),
('3228','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP E','4.1','SR1','','D','','4.1','2','500 g','E0'),
('3229','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP F','4.1','SR1','','D','40','4.1','2','125 ml','E0'),
('3230','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP F','4.1','SR1','','D','40','4.1','2','500 g','E0'),
('3231','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP B, SICAKLIK  KONTROLLÜ','4.1','SR2','','B','','4.1
+1','1','','E0'),
('3232','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP B, SICAKLIK  KONTROLLÜ','4.1','SR2','','B','','4.1
+1','1','','E0'),
('3233','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP C, SICAKLIK  KONTROLLÜ','4.1','SR2','','D','','4.1','1','','E0'),
('3234','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP C, SICAKLIK  KONTROLLÜ','4.1','SR2','','D','','4.1','1','','E0'),
('3235','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP D, SICAKLIK KONTROLLÜ','4.1','SR2','','D','','4.1','1','','E0'),
('3236','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP D, SICAKLIK  KONTROLLÜ','4.1','SR2','','D','','4.1','1','','E0'),
('3237','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP E, SICAKLIK  KONTROLLÜ','4.1','SR2','','D','','4.1','1','','E0'),
('3238','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP E, SICAKLIK  KONTROLLÜ','4.1','SR2','','D','','4.1','1','','E0'),
('3239','KENDİLİĞİNDEN TEPKİMEYE  GİREN SIVI, TİP F, SICAKLIK  KONTROLLÜ','4.1','SR2','','D','40','4.1','1','','E0'),
('3240','KENDİLİĞİNDEN TEPKİMEYE  GİREN KATI, TİP F, SICAKLIK  KONTROLLÜ','4.1','SR2','','D','40','4.1','1','','E0'),
('3241','2-BROMO-2-NİTROPROPAN-1,3- DİOL','4.1','SR1','III','D','','4.1','3','5 kg','E1'),
('3242','AZODİKARBONAMİD','4.1','SR1','II','D','40','4.1','2','1 kg','E0'),
('3243','ZEHİRLİ SIVI İÇEREN KATILAR, B.B.B.','6.1','T9','II','D/E','60','6.1','2','500 g','E4'),
('3244','AŞINDIRICI SIVI İÇEREN  KATILAR, B.B.B.','8','C10','II','E','80','8','2','1 kg','E2'),
('3245','GENETİĞİ DEĞİŞTİRİLMİŞ  MİKROORGANİZMALAR veya  GENETİĞİ DEĞİŞTİRİLMİŞ  ORGANİZMALAR','9','M8','','E','','9','2','','E0'),
('3246','METANSÜLFONİL KLORÜR','6.1','TC1','I','C/D','668','6.1
+8','1','','E0'),
('3247','SODYUM PEROKZOBORAT, SUSUZ','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('3248','İLAÇ, SIVI, ALEVLENEBİLİR,  ZEHİRLİ, B.B.B.','3','FT1','II','D/E','336','3
+6.1','2','1 L','E2'),
('3249','İLAÇ, KATI, ZEHİRLİ, B.B.B.','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3250','KLOROASETİK ASİT, ERİMİŞ','6.1','TC1','II','D/E','68','6.1
+8','0','','E0'),
('3251','İZOSORBİT-5-MONONİTRAT','4.1','SR1','III','D','','4.1','3','5 kg','E0'),
('3252','DİFLOROMETAN (SOĞUTUCU  GAZ R 32)','2','2F','','B/D','23','2.1','2','','E0'),
('3253','DİSODYUM TRİOKZOSİLİKAT','8','C6','III','E','80','8','3','5 kg','E1'),
('3254','TRİBÜTİLFOSFAN','4.2','S1','I','B/E','333','4.2','0','','E0'),
('3255','tert-BÜTİL HİPOKLORİT','4.2','SC1','TAŞINMASI YASAKTIR','','','','','',''),
('3256','YÜKSEK SICAKLIKLI SIVI, ALEVLENEBİLİR, B.B.B. parlama  noktası 60 °C''nin üstünde, parlama  noktasında veya üzerinde ve 100  °C''nin altında','3','F2','III','D/E','30','3','3','','E0'),
('3257','YÜKSEK SICAKLIKLI SIVI, B.B.B., 100 °C''de veya üzerinde ve  parlama noktasının altında (erimiş  metaller ve erimiş metal tuzları vb. dâhil), 190 °C''den yüksek sıcaklıkta  doldurulmuş','9','M9','III','D','99','9','3','','E0'),
('3258','YÜKSEK SICAKLIKLI KATI, B.B.B., 240 °C''de veya altında','9','M10','III','D','99','9','3','','E0'),
('3259','AMİNLER, KATI, AŞINDIRICI, B.B.B. veya POLİAMİNLER, KATI, AŞINDIRICI, B.B.B.','8','C8','I','E','88','8','1','','E0'),
('3260','AŞINDIRICI KATI, ASİDİK, İNORGANİK, B.B.B.','8','C2','I','E','88','8','1','','E0'),
('3261','AŞINDIRICI KATI, ASİDİK, ORGANİK, B.B.B.','8','C4','I','E','88','8','1','','E0'),
('3262','AŞINDIRICI KATI, BAZİK, İNORGANİK, B.B.B.','8','C6','I','E','88','8','1','','E0'),
('3263','AŞINDIRICI KATI, BAZİK, ORGANİK, B.B.B.','8','C8','I','E','88','8','1','','E0'),
('3264','AŞINDIRICI SIVI, ASİDİK, İNORGANİK, B.B.B.','8','C1','I','E','88','8','1','','E0'),
('3265','AŞINDIRICI SIVI, ASİDİK, ORGANİK, B.B.B.','8','C3','I','E','88','8','1','','E0'),
('3266','AŞINDIRICI SIVI, BAZİK, İNORGANİK, B.B.B.','8','C5','I','E','88','8','1','','E0'),
('3267','AŞINDIRICI SIVI, BAZİK, ORGANİK, B.B.B.','8','C7','I','E','88','8','1','','E0'),
('3268','EMNİYET CİHAZLARI, elektrikle  çalışan','9','M5','','E','','9','4','','E0'),
('3269','POLYESTER REÇİNE KİTİ, sıvı  taban malzemesi','3','F1','II','E','','3','2','5 L','Bkz. ÖH 340'),
('3270','NİTROSELÜLOZ MEMBRAN  FİLTRELER, kuru kütlece %12,6''dan  fazla azot içermeyen','4.1','F1','II','E','','4.1','2','1 kg','E2'),
('3271','ETERLER, B.B.B.','3','F1','II','D/E','33','3','2','1 L','E2'),
('3272','ESTERLER, B.B.B.','3','F1','II','D/E','33','3','2','1 L','E2'),
('3273','NİTRİLLER, ALEVLENEBİLİR,  ZEHİRLİ, B.B.B.','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('3274','ALKOLATLAR ÇÖZELTİ, B.B.B., alkolde','3','FC','II','D/E','338','3
+8','2','1 L','E2'),
('3275','NİTRİLLER, ZEHİRLİ, ALEVLENEBİLİR, B.B.B.','6.1','TF1','I','C/D','663','6.1
+3','1','','E5'),
('3276','NİTRİLLER, SIVI, ZEHİRLİ, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E5'),
('3277','KLOROFORMATLAR, ZEHİRLİ, AŞINDIRICI, B.B.B.','6.1','TC1','II','D/E','68','6.1
+8','2','100 ml','E4'),
('3278','ORGANOFOSFORLU BİLEŞİK, SIVI, ZEHİRLİ, B.B.B.','6.1','T1','I','C/E','66','6.1','1','','E5'),
('3279','ORGANOFOSFOR BİLEŞİĞİ,  ZEHİRLİ, ALEVLENEBİLİR,  B.B.B.','6.1','TF1','I','C/D','663','6.1
+3','1','','E5'),
('3280','ORGANOARSENİK BİLEŞİĞİ,  SIVI, B.B.B.','6.1','T3','I','C/E','66','6.1','1','','E5'),
('3281','METAL KARBONİLLER, SIVI, B.B.B.','6.1','T3','I','C/E','66','6.1','1','','E5'),
('3282','ORGANOMETALİK BİLEŞİK, SIVI, ZEHİRLİ, B.B.B.','6.1','T3','I','C/E','66','6.1','1','','E5'),
('3283','SELENYUM BİLEŞİĞİ, KATI, B.B.B.','6.1','T5','I','C/E','66','6.1','1','','E5'),
('3284','TELLÜR BİLEŞİĞİ, B.B.B.','6.1','T5','I','C/E','66','6.1','1','','E5'),
('3285','VANADYUM BİLEŞİĞİ, B.B.B.','6.1','T5','I','C/E','66','6.1','1','','E5'),
('3286','ALEVLENEBİLİR SIVI, ZEHİRLİ, AŞINDIRICI, B.B.B.','3','FTC','I','C/E','368','3
+6.1
+8','1','','E0'),
('3287','ZEHİRLİ SIVI, İNORGANİK, B.B.B.','6.1','T4','I','C/E','66','6.1','1','','E5'),
('3288','ZEHİRLİ KATI, İNORGANİK, B.B.B.','6.1','T5','I','C/E','66','6.1','1','','E5'),
('3289','ZEHİRLİ SIVI, AŞINDIRICI, İNORGANİK, B.B.B.','6.1','TC3','I','C/E','668','6.1
+8','1','','E5'),
('3290','ZEHİRLİ KATI, AŞINDIRICI, İNORGANİK, B.B.B.','6.1','TC4','I','C/E','668','6.1
+8','1','','E5'),
('3291','KLİNİK ATIK, TANIMLANMAMIŞ, B.B.B. veya  (BİYOLOJİK) TIBBİ ATIK, B.B.B. veya DÜZENLENMİŞ TIBBİ ATIK, B.B.B.','6.2','I3','','V1','606','6.2','2','','E0'),
('3292','BATARYALAR, METALİK  SODYUM VEYA SODYUM  ALAŞIMI İÇEREN veya PİLLER, METALİK SODYUM VEYA  SODYUM ALAŞIMI İÇEREN','4.3','W3','','E','','4.3','2','','E0'),
('3293','HİDRAZİN SULU ÇÖZELTİ, kütlece %37''den az hidrazin içeren','6.1','T4','III','E','60','6.1','2','5 L','E1'),
('3294','HİDROJEN SİYANÜR, ALKOLDE  ÇÖZELTİ %45''ten az hidrojen siyanür içeren','6.1','TF1','I','C/D','663','6.1
+3','0','','E0'),
('3295','HİDROKARBONLAR, SIVI, B.B.B.','3','F1','I','D/E','33','3','1','500 ml','E3'),
('3296','HEPTAFLOROPROPAN  (SOĞUTUCU GAZ R 227)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3297','ETİLEN OKSİT VE  KLOROTETRAFLORO-ETAN  KARIŞIMI, %8,8''den fazla olmayan  etilen oksit ile','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3298','ETİLEN OKSİT VE  PENTAFLOROETAN KARIŞIMI  %7,9''dan fazla olmayan etilen oksit  ile','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3299','ETİLEN OKSİT VE  TETRAFLOROETAN KARIŞIMI  %5,6''dan fazla olmayan etilen oksit  ile','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3300','ETİLEN OKSİT VE KARBON  DİOKSİT KARIŞIMI %87''den fazla  etilen oksit ile','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('3301','AŞINDIRICI SIVI, KENDİLİĞİNDEN ISINAN, B.B.B.','8','CS1','I','E','884','8
+4.2','1','','E0'),
('3302','2-DİMETİLAMİNOETİL-AKRİLAT, STABİLİZE','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('3303','SIKIŞTIRILMIŞ GAZ, ZEHİRLİ, YÜKSELTGEN, B.B.B.','2','1TO','','C/D','265','2.3
+5.1','1','','E0'),
('3304','SIKIŞTIRILMIŞ GAZ, ZEHİRLİ, AŞINDIRICI, B.B.B.','2','1TC','','C/D','268','2.3
+8','1','','E0'),
('3305','SIKIŞTIRILMIŞ GAZ, ZEHİRLİ, ALEVLENEBİLİR, AŞINDIRICI, B.B.B.','2','1TFC','','B/D','263','2.3
+2.1
+8','1','','E0'),
('3306','SIKIŞTIRILMIŞ GAZ, ZEHİRLİ, YÜKSELTGEN, AŞINDIRICI, B.B.B.','2','1TOC','','C/D','265','2.3
+5.1
+8','1','','E0'),
('3307','SIVILAŞTIRILMIŞ GAZ, ZEHİRLİ, YÜKSELTGEN, B.B.B.','2','2TO','','C/D','265','2.3
+5.1','1','','E0'),
('3308','SIVILAŞTIRILMIŞ GAZ, ZEHİRLİ, AŞINDIRICI, B.B.B.','2','2TC','','C/D','268','2.3
+8','1','','E0'),
('3309','SIVILAŞTIRILMIŞ GAZ, ZEHİRLİ, ALEVLENEBİLİR, AŞINDIRICI, B.B.B.','2','2TFC','','B/D','263','2.3
+2.1
+8','1','','E0'),
('3310','SIVILAŞTIRILMIŞ GAZ, ZEHİRLİ, YÜKSELTGEN, AŞINDIRICI, B.B.B.','2','2TOC','','C/D','265','2.3
+5.1
+8','1','','E0'),
('3311','GAZ, SOĞUTULMUŞ SIVI, YÜKSELTGEN, B.B.B.','2','3O','','C/E','225','2.2
+5.1','3','','E0'),
('3312','GAZ, SOĞUTULMUŞ SIVI, ALEVLENEBİLİR, B.B.B.','2','3F','','B/D','223','2.1','2','','E0'),
('3313','ORGANİK PİGMENTLER, KENDİLİĞİNDEN ISINAN','4.2','S2','II','D/E','40','4.2','2','','E2'),
('3314','PLASTİK KALIP BİLEŞİĞİ hamur, tabaka veya çekilmiş kordon  formunda olan, ALEVLENEBİLİR buhar açığa çıkartan','9','M3','III','D/E','90','Yok','3','5 kg','E1'),
('3315','KİMYASAL NUMUNE, ZEHİRLİ','6.1','T8','I','E','','6.1','1','','E0'),
('3316','KİMYASAL KİTİ veya İLK  YARDIM KİTİ','9','M11','','E','','9','','Bkz. ÖH 251','Bkz. ÖH 340'),
('3317','2-AMİNO-4,6-DİNİTROFENOL, ISLATILMIŞ kütlece %20''den az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('3318','AMONYAK ÇÖZELTİSİ, 15 °C''de  su içerisinde bağıl yoğunluğu  0,880''den az olan ve %50''den fazla  amonyak içeren','2','4TC','','C/D','268','2.3
+8','1','','E0'),
('3319','NİTROGLİSERİN KARIŞIMI, DUYARLILIĞI AZALTILMIŞ, KATI, B.B.B. nitrogliserin içeriği  kütlece %2''den fazla fakat %10''dan az  olan','4.1','D','II','B','','4.1','2','','E0'),
('3320','SODYUM BOROHİDRİT VE  SODYUM HİDROKSİT ÇÖZELTİSİ, kütlece %12''den az sodyum borohidrit  ve %40''dan az sodyum hidroksit  içeren','8','C5','II','E','80','8','2','1 L','E2'),
('3321','RADYOAKTİF MALZEME, DÜŞÜK ÖZGÜL AKTİVİTE (LSA- II), bölünebilir olmayan veya istisnai  bölünebilir','7','','','E','70','7X','0','','E0'),
('3322','RADYOAKTİF MALZEME, DÜŞÜK ÖZGÜL AKTİVİTE (LSA- III), bölünebilir olmayan veya istisnai  bölünebilir','7','','','E','70','7X','0','','E0'),
('3323','RADYOAKTİF MALZEME, TİP C  AMBALAJ, bölünebilir olmayan veya  istisnai bölünebilir','7','','','E','70','7X','0','','E0'),
('3324','RADYOAKTİF MALZEME, DÜŞÜK ÖZGÜL AKTİVİTE (LSA- II), BÖLÜNEBİLİR','7','','','E','70','7X
+7E','0','','E0'),
('3325','RADYOAKTİF MALZEME, DÜŞÜK ÖZGÜL AKTİVİTE (LSA- III), BÖLÜNEBİLİR','7','','','E','70','7X
+7E','0','','E0'),
('3326','RADYOAKTİF MALZEME, YÜZEYİ BULAŞMIŞ CİSİMLER (SCO-I veya SCO-II), BÖLÜNEBİLİR','7','','','E','70','7X
+7E','0','','E0'),
('3327','RADYOAKTİF MALZEME, TİP A  AMBALAJ, BÖLÜNEBİLİR, özel  hazırlanmamış','7','','','E','70','7X
+7E','0','','E0'),
('3328','RADYOAKTİF MALZEME, TİP  B(U) AMBALAJ, BÖLÜNEBİLİR','7','','','E','70','7X
+7E','0','','E0'),
('3329','RADYOAKTİF MALZEME, TİP  B(M) AMBALAJ, BÖLÜNEBİLİR','7','','','E','70','7X
+7E','0','','E0'),
('3330','RADYOAKTİF MALZEME, TİP C  AMBALAJ, BÖLÜNEBİLİR','7','','','E','70','7X
+7E','0','','E0'),
('3331','RADYOAKTİF MALZEME, ÖZEL  DÜZENLEME İLE TAŞINAN, BÖLÜNEBİLİR','7','','','','70','7X
+7E','0','','E0'),
('3332','RADYOAKTİF MALZEME, TİP A  AMBALAJ, ÖZEL HAZIRLANMIŞ, bölünebilir olmayan veya istisnai  bölünebilir','7','','','E','70','7X','0','','E0'),
('3333','RADYOAKTİF MALZEME, TİP A  AMBALAJ, ÖZEL HAZIRLANMIŞ, BÖLÜNEBİLİR','7','','','E','70','7X
+7E','0','','E0'),
('3334','Havacılık düzenlemelerine tabi sıvı, b.b.b.','9','M11','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('3335','Havacılık düzenlemelerine tabi katı, b.b.b.','9','M11','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('3336','MERKAPTANLAR, SIVI, ALEVLENEBİLİR, B.B.B. veya  MERKAPTAN KARIŞIMI, SIVI, ALEVLENEBİLİR, B.B.B.','3','F1','I','D/E','33','3','1','','E0'),
('3337','SOĞUTUCU GAZ R 404A (takriben  %44 pentafloroetan ve %52 1,1,1- trifloroetan içeren pentafloroetan, 1,1,1-trifloroetan ve 1,1,1,2- tetrafloroetan zeotropik karışımı)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3338','SOĞUTUCU GAZ R 407A (takriben  %40 pentafloroetan ve %20  diflorometan içeren diflorometan, pentafloroetan ve 1,1,1,2- tetrafloroetan zeotropik karışımı)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3339','SOĞUTUCU GAZ R 407B (takriben  %70 pentafloroetan ve %10  diflorometan içeren diflorometan, pentafloroetan ve 1,1,1,2- tetrafloroetan zeotropik karışımı)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3340','SOĞUTUCU GAZ R 407C (takriben  %25 pentafloroetan ve %23  diflorometan içeren diflorometan, pentafloroetan ve 1,1,1,2- tetrafloroetan zeotropik karışımı)','2','2A','','C/E','20','2.2','3','120 ml','E1'),
('3341','TİYOÜRE DİOKSİT','4.2','S2','II','D/E','40','4.2','2','','E2'),
('3342','KSANTATLAR','4.2','S2','II','D/E','40','4.2','2','','E2'),
('3343','NİTROGLİSERİN KARIŞIMI, DUYARLILIĞI AZALTILMIŞ, SIVI, ALEVLENEBİLİR, B.B.B. kütlece %30''dan az nitrogliserin  içeren','3','D','','B','','3','0','','E0'),
('3344','PENTAERİTRİT TETRANİTRAT  (PENTAERİTRİTOL  TETRANİTRAT; PETN) KARIŞIMI, DUYARLILIĞI AZALTILMIŞ, KATI, B.B.B., kütlece %10''dan fazla  fakat %20''den az PETN içeren','4.1','D','II','B','','4.1','2','','E0'),
('3345','FENOKSİASETİK ASİT TÜREVLİ  PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('3346','FENOKSİASETİK ASİT TÜREVLİ  PESTİSİT, SIVI, ALEVLENEBİLİR,  ZEHİRLİ, parlama noktası 23 °C''den  düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('3347','FENOKSİASETİK ASİT TÜREVLİ  PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR, parlama noktası  23 °C''den düşük olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3348','FENOKSİASETİK ASİT TÜREVLİ  PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3349','PİRETROİD PESTİSİT, KATI, ZEHİRLİ','6.1','T7','I','C/E','66','6.1','1','','E5'),
('3350','PİRETROİD PESTİSİT, SIVI, ALEVLENEBİLİR, ZEHİRLİ, parlama noktası 23 °C''den düşük olan','3','FT2','I','C/E','336','3
+6.1','1','','E0'),
('3351','PİRETROİD PESTİSİT, SIVI, ZEHİRLİ, ALEVLENEBİLİR,  parlama noktası 23 °C''den düşük  olmayan','6.1','TF2','I','C/E','663','6.1
+3','1','','E5'),
('3352','PİRETROİD PESTİSİT, SIVI, ZEHİRLİ','6.1','T6','I','C/E','66','6.1','1','','E5'),
('3354','İNSEKTİSİT GAZ, ALEVLENEBİLİR, B.B.B.','2','2F','','B/D','23','2.1','2','','E0'),
('3355','İNSEKTİSİT GAZ, ZEHİRLİ, ALEVLENEBİLİR, B.B.B.','2','2TF','','B/D','263','2.3
+2.1','1','','E0'),
('3356','OKSİJEN ÜRETECİ, KİMYASAL','5.1','O3','','E','','5.1','2','','E0'),
('3357','NİTROGLİSERİN KARIŞIMI, DUYARLILIĞI AZALTILMIŞ, SIVI, B.B.B. kütlece %30''dan az  nitrogliserin içeren','3','D','II','B','','3','2','','E0'),
('3358','SOĞUTUCU MAKİNELER  alevlenebilir, zehirli olmayan, sıvılaştırılmış gaz içeren','2','6F','','D','','2.1','2','','E0'),
('3359','FÜMİGE EDİLMİŞ KARGO  TAŞIMA ÜNİTESİ','9','M11','','','','','','',''),
('3360','Lifler, sebze, kuru','4.1','F1','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('3361','KLOROSİLANLAR, ZEHİRLİ, AŞINDIRICI, B.B.B.','6.1','TC1','II','D/E','68','6.1
+8','2','','E0'),
('3362','KLOROSİLANLAR, ZEHİRLİ, AŞINDIRICI, ALEVLENEBİLİR,  B.B.B.','6.1','TFC','II','D/E','638','6.1
+3
+8','2','','E0'),
('3363','NESNELER İÇİNDE TEHLİKELİ  MALLAR veya MAKİNE İÇİNDE  TEHLİKELİ MALLAR ya da  APARAT İÇİNDE TEHLİKELİ  MALLAR','9','M11','','','','9','','','E0'),
('3364','TRİNİTROFENOL (PİKRİK ASİT)  ISLATILMIŞ kütlece %10''dan az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('3365','TRİNİTROKLOROBENZEN  (PİKRİL KLORÜR), ISLATILMIŞ  kütlece %10''dan az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('3366','TRİNİTROTOLUEN (TNT), ISLATILMIŞ kütlece %10''dan az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('3367','TRİNİTROBENZEN, ISLATILMIŞ  kütlece %10''dan az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('3368','TRİNİTROBENZOİK ASİT, ISLATILMIŞ kütlece %10''dan az  olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('3369','SODYUM DİNİTRO-o-KRESOLAT, ISLATILMIŞ kütlece %10''dan az  olmayan su ile','4.1','DT','I','B','','4.1
+6.1','1','','E0'),
('3370','ÜRE NİTRAT, ISLATILMIŞ kütlece  %10''dan az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('3371','2-METİLBÜTANAL','3','F1','II','D/E','33','3','2','1 L','E2'),
('3373','BİYOLOJİK MADDE, KATEGORİ  B','6.2','I4','','','606','6.2','','','E0'),
('3374','ASETİLEN, ÇÖZÜCÜSÜZ','2','2F','','D','','2.1','2','','E0'),
('3375','AMONYUM NİTRAT  EMÜLSİYON veya SÜSPANSİYON  veya JEL, tahripli patlayıcılar için ara  ürün, sıvı','5.1','O1','II','E','50','5.1','2','','E2'),
('3376','4-NİTROFENİLHİDRAZİN, kütlece  %30''dan az olmayan su ile','4.1','D','I','B','','4.1','1','','E0'),
('3377','SODYUM PERBORAT  MONOHİDRAT','5.1','O2','III','E','50','5.1','3','5 kg','E1'),
('3378','SODYUM KARBONAT  PEROKSİHİDRAT','5.1','O2','II','E','50','5.1','2','1 kg','E2'),
('3379','DUYARLILIĞI AZALTILMIŞ  PATLAYICI, SIVI, B.B.B.','3','D','I','B','','3','1','','E0'),
('3380','DUYARLILIĞI AZALTILMIŞ  PATLAYICI, KATI, B.B.B.','4.1','D','I','B','','4.1','1','','E0'),
('3381','SOLUMA İLE ZEHİRLİ SIVI, B.B.B, 200 ml/m3''ten düşük veya eşit  LC50 değerine sahip olan ve doymuş  buhar konsantrasyonu 500 LC50''ye  eşit veya daha yüksek olan','6.1','T1 veya T4','I','C/D','66','6.1','1','','E0'),
('3382','SOLUMA İLE ZEHİRLİ SIVI, B.B.B, 1000 ml/m3''ten düşük veya  eşit LC50 değerine sahip olan ve doymuş buhar konsantrasyonu 10  LC50''ye eşit veya daha yüksek olan','6.1','T1 veya T4','I','C/D','66','6.1','1','','E0'),
('3383','SOLUMA İLE ZEHİRLİ SIVI, ALEVLENEBİLİR, B.B.B, 200  ml/m3''ten düşük veya eşit LC50 değerine sahip olan ve doymuş buhar  konsantrasyonu 500 LC50''ye eşit veya  daha yüksek olan','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('3384','SOLUMA İLE ZEHİRLİ SIVI, ALEVLENEBİLİR, B.B.B, 1000  ml/m3''ten düşük veya eşit LC50 değerine sahip olan ve doymuş buhar  konsantrasyonu 10 LC50''ye eşit veya  daha yüksek olan','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('3385','SOLUMA İLE ZEHİRLİ SIVI, SU  İLE TEPKİMEYE GİREN, B.B.B, 200 ml/m3''ten düşük veya eşit LC50 değerine sahip olan ve doymuş buhar  konsantrasyonu 500 LC50''ye eşit veya  daha yüksek olan','6.1','TW1','I','C/D','623','6.1
+4.3','1','','E0'),
('3386','SOLUMA İLE ZEHİRLİ SIVI, SU  İLE TEPKİMEYE GİREN, B.B.B, 1000 ml/m3''ten düşük veya eşit LC50 değerine sahip olan ve doymuş buhar  konsantrasyonu 10 LC50''ye eşit veya  daha yüksek olan','6.1','TW1','I','C/D','623','6.1
+4.3','1','','E0'),
('3387','SOLUMA İLE ZEHİRLİ SIVI, YÜKSELTGEN, B.B.B, 200  ml/m3''ten düşük veya eşit LC50 değerine sahip olan ve doymuş buhar  konsantrasyonu 500 LC50''ye eşit veya  daha yüksek olan','6.1','TO1','I','C/D','665','6.1
+5.1','1','','E0'),
('3388','SOLUMA İLE ZEHİRLİ SIVI, YÜKSELTGEN, B.B.B, 1000  ml/m3''ten düşük veya eşit LC50 değerine sahip olan ve doymuş buhar  konsantrasyonu 10 LC50''ye eşit veya  daha yüksek olan','6.1','TO1','I','C/D','665','6.1
+5.1','1','','E0'),
('3389','SOLUMA İLE ZEHİRLİ SIVI, AŞINDIRICI, B.B.B, 200 ml/m3''ten  düşük veya eşit LC50 değerine sahip  olan ve doymuş buhar  konsantrasyonu 500 LC50''ye eşit veya  daha yüksek olan','6.1','TC1 veya TC3','I','C/D','668','6.1
+8','1','','E0'),
('3390','SOLUMA İLE ZEHİRLİ SIVI, AŞINDIRICI, B.B.B, 1000 ml/m3''ten  düşük veya eşit LC50 değerine sahip  olan ve doymuş buhar  konsantrasyonu 10 LC50''ye eşit veya  daha yüksek olan','6.1','TC1 veya TC3','I','C/D','668','6.1
+8','1','','E0'),
('3391','ORGANOMETALİK MADDE, KATI, PİROFORİK','4.2','S5','I','B/E','43','4.2','0','','E0'),
('3392','ORGANOMETALİK MADDE, SIVI, PİROFORİK','4.2','S5','I','B/E','333','4.2','0','','E0'),
('3393','ORGANOMETALİK MADDE, KATI, PİROFORİK, SU İLE  TEPKİMEYE GİREN','4.2','SW1','I','B/E','X432','4.2
+4.3','0','','E0'),
('3394','ORGANOMETALİK MADDE, SIVI, PİROFORİK, SU İLE  TEPKİMEYE GİREN','4.2','SW1','I','B/E','X333','4.2
+4.3','0','','E0'),
('3395','ORGANOMETALİK MADDE, KATI, SU İLE TEPKİMEYE GİREN','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('3396','ORGANOMETALİK MADDE, KATI, SU İLE TEPKİMEYE  GİREN, ALEVLENEBİLİR','4.3','WF2','I','B/E','X423','4.3
+4.1','0','','E0'),
('3397','ORGANOMETALİK MADDE, KATI, SU İLE TEPKİMEYE  GİREN, KENDİLİĞİNDEN ISINAN','4.3','WS','I','B/E','X423','4.3
+4.2','1','','E0'),
('3398','ORGANOMETALİK MADDE, SIVI, SU İLE TEPKİMEYE GİREN','4.3','W1','I','B/E','X323','4.3','0','','E0'),
('3399','ORGANOMETALİK MADDE, SIVI, SU İLE TEPKİMEYE GİREN, ALEVLENEBİLİR','4.3','WF1','I','B/E','X323','4.3
+3','0','','E0'),
('3400','ORGANOMETALİK MADDE, KATI, KENDİLİĞİNDEN ISINAN','4.2','S5','II','D/E','40','4.2','2','500 g','E2'),
('3401','ALKALİ METAL AMALGAM, KATI','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('3402','ALKALİ TOPRAK METAL  AMALGAM, KATI','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('3403','POTASYUM METAL  ALAŞIMLARI, KATI','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('3404','POTASYUM SODYUM  ALAŞIMLARI, KATI','4.3','W2','I','B/E','X423','4.3','1','','E0'),
('3405','BARYUM KLORAT ÇÖZELTİSİ','5.1','OT1','II','E','56','5.1
+6.1','2','1 L','E2'),
('3406','BARYUM PERKLORAT  ÇÖZELTİSİ','5.1','OT1','II','E','56','5.1
+6.1','2','1 L','E2'),
('3407','KLORAT VE MAGNEZYUM  KLORÜR ÇÖZELTİSİ','5.1','O1','II','E','50','5.1','2','1 L','E2'),
('3408','KURŞUN PERKLORAT  ÇÖZELTİSİ','5.1','OT1','II','E','56','5.1
+6.1','2','1 L','E2'),
('3409','KLORONİTROBENZENLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('3410','4-KLORO-o-TOLUİDİN  HİDROKLORÜR ÇÖZELTİSİ','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('3411','beta-NAFTİLAMİN ÇÖZELTİSİ','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('3412','FORMİK ASİT, kütlece %10''dan  fazla ancak %85''ten az asit içeren','8','C3','II','E','80','8','2','1 L','E2'),
('3413','POTASYUM SİYANÜR  ÇÖZELTİSİ','6.1','T4','I','C/E','66','6.1','1','','E5'),
('3414','SODYUM SİYANÜR ÇÖZELTİSİ','6.1','T4','I','C/E','66','6.1','1','','E5'),
('3415','SODYUM FLORÜR ÇÖZELTİSİ','6.1','T4','III','E','60','6.1','2','5 L','E1'),
('3416','KLOROASETO-FENON, SIVI','6.1','T1','II','D/E','60','6.1','2','','E0'),
('3417','KSİLİL BROMÜR, KATI','6.1','T2','II','D/E','60','6.1','2','','E4'),
('3418','2,4-TOLUİLENDİAMİN  ÇÖZELTİSİ','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('3419','BOR TRİFLORÜR ASETİK ASİT  KOMPLEKSİ, KATI','8','C4','II','E','80','8','2','1 kg','E2'),
('3420','BOR TRİFLORÜR PROPİYONİK  ASİT KOMPLEKSİ, KATI','8','C4','II','E','80','8','2','1 kg','E2'),
('3421','POTASYUM  HİDROJENDİFLORÜR ÇÖZELTİSİ','8','CT1','II','E','86','8
+6.1','2','1 L','E2'),
('3422','POTASYUM FLORÜR ÇÖZELTİSİ','6.1','T4','III','E','60','6.1','2','5 L','E1'),
('3423','TETRAMETİLAMONYUM HİDROKSİT, KATI','6.1','TC2','I','C/E','668','6.1.+8','1','','E5'),
('3424','AMONYUM DİNİTRO-o- KRESOLAT ÇÖZELTİSİ','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('3425','BROMOASETİK ASİT, KATI','8','C4','II','E','80','8','2','1 kg','E2'),
('3426','AKRİLAMİD ÇÖZELTİSİ','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('3427','KLOROBENZİL KLORÜRLER, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('3428','3-KLORO-4-METİLFENİL  İZOSİYANAT, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3429','KLOROTOLUİDİNLER, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('3430','KSİLENOLLER, SIVI','6.1','T1','II','D/E','60','6.1','2','100 ml','E4'),
('3431','NİTROBENZO-TRİFLORÜRLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3432','POLİKLORLU BİFENİLLER, KATI','9','M2','II','D/E','90','9','0','1 kg','E2'),
('3434','NİTROKRESOLLER, SIVI','6.1','T1','III','E','60','6.1','2','5 L','E1'),
('3436','HEKZAFLOROASETON HİDRAT, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3437','KLOROKRESOLLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3438','alfa-METİLBENZİL ALKOL, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('3439','NİTRİLLER, KATI, ZEHİRLİ, B.B.B.','6.1','T2','I','C/E','66','6.1','1','','E5'),
('3440','SELENYUM BİLEŞİĞİ, SIVI, B.B.B.','6.1','T4','I','C/E','66','6.1','1','','E5'),
('3441','KLORODİNİTROBENZENLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3442','DİKLOROANİLİNLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3443','DİNİTROBENZENLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3444','NİKOTİN HİDROKLORÜR, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3445','NİKOTİN SÜLFAT, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3446','NİTROTOLUENLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3447','NİTROKSİLENLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3448','GÖZ YAŞARTICI GAZ MADDESİ, KATI, B.B.B.','6.1','T2','I','C/E','66','6.1','1','','E0'),
('3449','BROMOBENZİL SİYANÜRLER, KATI','6.1','T2','I','C/E','66','6.1','1','','E5'),
('3450','DİFENİLKLORO-ARSİN, KATI','6.1','T3','I','C/E','66','6.1','1','','E0'),
('3451','TOLUDİNLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3452','KSİLİDİNLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3453','FOSFORİK ASİT, KATI','8','C2','III','E','80','8','3','5 kg','E1'),
('3454','DİNİTROTOLUENLER, KATI','6.1','T2','II','D/E','60','6.1','2','500 g','E4'),
('3455','KRESOLLER, KATI','6.1','TC2','II','D/E','68','6.1
+8','2','500 g','E4'),
('3456','NİTROSİLSÜLFÜRİK ASİT, KATI','8','C2','II','E','X80','8','2','1 kg','E2'),
('3457','KLORONİTROTOLUENLER, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('3458','NİTROANİZOLLER, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('3459','NİTROBROMOBENZENLER, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('3460','N-ETİLBENZİLTOLUİDİNLER, KATI','6.1','T2','III','E','60','6.1','2','5 kg','E1'),
('3462','TOKSİNLER, CANLI  KAYNAKLARDAN  AYRIŞTIRILMIŞ, KATI, B.B.B','6.1','T2','I','C/E','66','6.1','1','','E5'),
('3463','PROPİYONİK ASİT kütlece  %90''dan az olmayan asit ile','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('3464','ORGANOFOSFORLU BİLEŞİK, KATI, ZEHİRLİ, B.B.B.','6.1','T2','I','C/E','66','6.1','1','','E5'),
('3465','ORGANOARSENİK BİLEŞİĞİ,  KATI, B.B.B.','6.1','T3','I','C/E','66','6.1','1','','E5'),
('3466','METAL KARBONİLLER, KATI, B.B.B.','6.1','T3','I','C/E','66','6.1','1','','E5'),
('3467','ORGANOMETALİK BİLEŞİK, KATI, ZEHİRLİ, B.B.B.','6.1','T3','I','C/E','66','6.1','1','','E5'),
('3468','METAL HİDRİT DEPOLAMA  SİSTEMİ İÇİNDE HİDROJEN veya  TEÇHİZAT İÇERİSİNDE  BULUNAN METAL HİDRİT  DEPOLAMA SİSTEMİ İÇİNDE  HİDROJEN veya TEÇHİZAT İLE  AMBALAJLANMIŞ METAL  HİDRİT DEPOLAMA SİSTEMİ  İÇİNDE HİDROJEN','2','1F','','D','','2.1','2','','E0'),
('3469','BOYA, ALEVLENEBİLİR,  AŞINDIRICI (boya, vernik, emaye, renklendirici, lake, cila, parlatıcı sıvı  dolgu ve sıvı vernik bazı dâhil) veya  BOYA İLE İLGİLİ MALZEME, ALEVLENEBİLİR, AŞINDIRICI  (boya inceltici veya azaltıcı bileşiği  dâhil)','3','FC','I','C/E','338','3
+8','1','','E0'),
('3470','BOYA, AŞINDIRICI, ALEVLENEBİLİR (boya, vernik, emaye, renklendirici, lake, cila, parlatıcı, sıvı dolgu ve sıvı vernik  bazı dâhil) veya BOYA İLE İLGİLİ  MALZEME, AŞINDIRICI, ALEVLENEBİLİR (boya inceltici  veya azaltıcı bileşiği dâhil)','8','CF1','II','D/E','83','8
+3','2','1 L','E2'),
('3471','HİDROJENDİFLORÜRLER  ÇÖZELTİSİ, B.B.B.','8','CT1','II','E','86','8
+6.1','2','1 L','E2'),
('3472','KROTONİK ASİT, SIVI','8','C3','III','E','80','8','3','5 L','E1'),
('3473','YAKIT PİLİ KARTUŞLARI veya TEÇHİZAT İÇİNDE BULUNAN YAKIT PİLİ KARTUŞLARI veya  TEÇHİZAT İLE  AMBALAJLANMIŞ YAKIT PİLİ  KARTUŞLARI alevlenebilir sıvılar  içeren','3','F3','','E','','3','3','1 L','E0'),
('3474','1-HİDROKSİBENZOTRİAZOL  MONOHİDRAT','4.1','D','I','B','','4.1','1','','E0'),
('3475','ETANOL VE BENZİN KARIŞIMI, %10''dan fazla etanol ile','3','F1','II','D/E','33','3','2','1 L','E2'),
('3476','YAKIT PİLİ KARTUŞLARI veya TEÇHİZAT İÇİNDE BULUNAN YAKIT PİLİ KARTUŞLARI veya  TEÇHİZAT İLE  AMBALAJLANMIŞ YAKIT PİLİ  KARTUŞLARI, su ile tepkimeye  giren maddeler içeren','4.3','W3','','E','','4.3','3','500 ml veya 
500 g','E0'),
('3477','YAKIT PİLİ KARTUŞLARI veya TEÇHİZAT İÇİNDE BULUNAN YAKIT PİLİ  KARTUŞLARI veya TEÇHİZAT  İLE AMBALAJLANMIŞ YAKIT  PİLİ KARTUŞLARI, aşındırıcı  maddeler içeren','8','C11','','E','','8','3','1 L veya 1 kg','E0'),
('3478','YAKIT PİLİ KARTUŞLARI veya  TEÇHİZAT İÇİNDE BULUNAN YAKIT PİLİ KARTUŞLARI veya  TEÇHİZAT İLE  AMBALAJLANMIŞ YAKIT PİLİ  KARTUŞLARI sıvılaştırılmış  alevlenebilir gaz içeren','2','6F','','D','','2.1','2','120 ml','E0'),
('3479','YAKIT PİLİ KARTUŞLARI veya TEÇHİZAT İÇİNDE BULUNAN  YAKIT PİLİ KARTUŞLARI veya  TEÇHİZAT İLE  AMBALAJLANMIŞ YAKIT PİLİ  KARTUŞLARI metal hidrit içinde  hidrojen içeren','2','6F','','D','','2.1','2','120 ml','E0'),
('3480','LİTYUM İYON BATARYALAR  (lityum iyon polimer bataryalar dâhil)','9','M4','','E','','9A','2','','E0'),
('3481','LİTYUM İYON BATARYALAR  TEÇHİZAT İÇİNDE BULUNAN veya LİTYUM İYON  BATARYALAR TEÇHİZATLA AMBALAJLANMIŞ (lityum iyon  polimer bataryalar dâhil)','9','M4','','E','','9A','2','','E0'),
('3482','ALKALİ METAL DAĞILIMI, ALEVLENEBİLİR veya ALKALİ  TOPRAK METAL DAĞILIMI, ALEVLENEBİLİR','4.3','WF1','I','B/E','X323','4.3
+3','1','','E0'),
('3483','MOTOR YAKITI VURUNTU  ÖNLEYİCİ KARIŞIM, ALEVLENEBİLİR','6.1','TF1','I','C/D','663','6.1
+3','1','','E0'),
('3484','HİDRAZİN SULU ÇÖZELTİ, ALEVLENEBİLİR kütlece %37''den  fazla hidrazin içeren','8','CFT','I','C/D','886','8
+3
+6.1','1','','E0'),
('3485','KALSİYUM HİPOKLORİT, KURU, AŞINDIRICI veya KALSİYUM  HİPOKLORİT KARIŞIMI, KURU, AŞINDIRICI % 39''dan fazla hazır klor  (%8,8 hazır oksijen) ile','5.1','OC2','II','E','58','5.1
+8','2','1 kg','E2'),
('3486','KALSİYUM HİPOKLORİT  KARIŞIMI, KURU, AŞINDIRICI  %10''dan fazla ancak %39''dan az hazır  klor içeren','5.1','OC2','III','E','58','5.1
+8','3','5 kg','E1'),
('3487','KALSİYUM HİPOKLORİT, HİDRATLANMIŞ, AŞINDIRICI veya  KALSİYUM HİPOKLORİT, HİDRATLANMIŞ KARIŞIM, AŞINDIRICI % 5,5''ten az olmayan  ancak % 16''dan fazla su içermeyen','5.1','OC2','II','E','58','5.1
+8','2','1 kg','E2'),
('3488','SOLUMAYLA ZEHİRLİ SIVI, ALEVLENEBİLİR AŞINDIRICI, B.B.B. 200 ml/m³''ten düşük veya eşit  LC50 değerine sahip olan ve doymuş  buhar konsantrasyonu 500 LC50''ye eşit  veya daha yüksek','6.1','TFC','I','C/D','663','6.1
+3
+8','1','','E0'),
('3489','SOLUMAYLA ZEHİRLİ SIVI, ALEVLENEBİLİR AŞINDIRICI, B.B.B. 1000 ml/m³''ten düşük veya eşit  LC50 değerine sahip olan ve doymuş  buhar konsantrasyonu 10 LC50''ye eşit  veya daha yüksek','6.1','TFC','I','C/D','663','6.1
+3
+8','1','','E0'),
('3490','SOLUMAYLA ZEHİRLİ SIVI, SU  İLE TEPKİMEYE GİREN, ALEVLENEBİLİR, B.B.B. 200 ml/m³ den düşük veya eşit LC50 değerine sahip  olan ve doymuş buhar konsantrasyonu  500 LC50''ye eşit veya daha yüksek','6.1','TFW','I','C/D','623','6.1
+3
+4.3','1','','E0'),
('3491','SOLUMAYLA ZEHİRLİ SIVI, SU  İLE TEPKİMEYE GİREN, ALEVLENEBİLİR, B.B.B. 1000 ml/m³ den düşük veya eşit LC50 değerine sahip  olan ve doymuş buhar konsantrasyonu  10 LC50''ye eşit veya daha yüksek','6.1','TFW','I','C/D','623','6.1
+3
+4.3','1','','E0'),
('3494','KÜKÜRTLÜ HAM PETROL, ALEVLENEBİLİR, ZEHİRLİ','3','FT1','I','C/E','336','3
+6.1','1','','E0'),
('3495','İYOT','8','CT2','III','E','86','8
+6.1','3','5 kg','E1'),
('3496','Bataryalar, nikel-metal hidrit','9','M11','ADR''YE TABİ DEĞİLDİR','','','','','',''),
('3497','KRİL KÜSPESİ','4.2','S2','II','D/E','40','4.2','2','','E2'),
('3498','İYOT MONOKLORÜR, SIVI','8','C1','II','E','80','8','2','1 L','E0'),
('3499','KAPASİTÖR, ELEKTRİKLİ ÇİFT  KATMANLI (0,3 Wh''den daha büyük  enerji depolama kapasitesine sahip)','9','M11','','E','','9','4','','E0'),
('3500','BASINÇ ALTINDA KİMYASAL, B.B.B.','2','8A','','C/E','20','2.2','3','','E0'),
('3501','BASINÇ ALTINDA KİMYASAL, ALEVLENEBİLİR, B.B.B.','2','8F','','B/D','23','2.1','2','','E0'),
('3502','BASINÇ ALTINDA KİMYASAL, ZEHİRLİ, B.B.B.','2','8T','','C/D','26','2.2
+6.1','1','','E0'),
('3503','BASINÇ ALTINDA KİMYASAL, AŞINDIRICI, B.B.B.','2','8C','','C/D','28','2.2
+8','1','','E0'),
('3504','BASINÇ ALTINDA KİMYASAL, ALEVLENEBİLİR, ZEHİRLİ, B.B.B.','2','8TF','','B/D','263','2.1
+6.1','1','','E0'),
('3505','BASINÇ ALTINDA KİMYASAL, ALEVLENEBİLİR, AŞINDIRICI, B.B.B.','2','8FC','','B/D','238','2.1
+8','1','','E0'),
('3506','CİVA, ÜRETİLMİŞ NESNELER İÇİNDE','8','CT3','','E','','8
+6.1','3','5 kg','E0'),
('3507','URANYUM HEKZAFLORÜR,  RADYOAKTİF MALZEME, ADİ  PAKET, ambalaj başına 0,1 kg''dan  daha az, bölünebilir olmayan ya da  istisnai bölünebilir','6.1','','I','D','','6.1
+8','1','','E0'),
('3508','KAPASİTÖR, ASİMETRİK (0,3  Wh''den yüksek enerji depolama  kapasitesine sahip)','9','M11','','E','','9','4','','E0'),
('3509','AMBALAJLAR, ISKARTA, BOŞ, TEMİZLENMEMİŞ','9','M11','','E','90','9','4','','E0'),
('3510','ADSORBE GAZ, ALEVLENEBİLİR, B.B.B.','2','9F','','D','','2.1','2','','E0'),
('3511','ADSORBE GAZ, B.B.B.','2','9A','','E','','2.2','3','','E0'),
('3512','ADSORBE GAZ, ZEHİRLİ, B.B.B.','2','9T','','D','','2.3','1','','E0'),
('3513','ADSORBE GAZ, YÜKSELTGEN, B.B.B.','2','9O','','E','','2.2
+5.1','3','','E0'),
('3514','ADSORBE GAZ, ZEHİRLİ, ALEVLENEBİLİR, B.B.B.','2','9TF','','D','','2.3
+2.1','1','','E0'),
('3515','ADSORBE GAZ, ZEHİRLİ, YÜKSELTGEN, B.B.B.','2','9TO','','D','','2.3
+5.1','1','','E0'),
('3516','ADSORBE GAZ, ZEHİRLİ, AŞINDIRICI, B.B.B.','2','9TC','','D','','2.3
+8','1','','E0'),
('3517','ADSORBE GAZ, ZEHİRLİ, ALEVLENEBİLİR, AŞINDIRICI, B.B.B.','2','9TFC','','D','','2.3
+2.1
+8','1','','E0'),
('3518','ADSORBE GAZ, ZEHİRLİ, YÜKSELTGEN, AŞINDIRICI, B.B.B.','2','9TOC','','D','','2.3
+5.1
+8','1','','E0'),
('3519','BOR TRİFLORÜR, ADSORBE','2','9TC','','D','','2.3
+8','1','','E0'),
('3520','KLOR, ADSORBE','2','9TOC','','D','','2.3
+5.1
+8','1','','E0'),
('3521','SİLİKON TETRAFLORÜR,  ADSORBE','2','9TC','','D','','2.3
+8','1','','E0'),
('3522','ARSİN, ADSORBE','2','9TF','','D','','2.3
+2.1','1','','E0'),
('3523','GERMAN, ADSORBE','2','9TF','','D','','2.3
+2.1','1','','E0'),
('3524','FOSFOR PENTAFLORÜR,  ADSORBE','2','9TC','','D','','2.3
+8','1','','E0'),
('3525','FOSFİN, ADSORBE','2','9TF','','D','','2.3
+2.1','1','','E0'),
('3526','HİDROJEN SELENÜR, ADSORBE','2','9TF','','D','','2.3
+2.1','1','','E0'),
('3527','POLİESTER REÇİNE KİTİ, katı  taban malzemesi','4.1','F1','II','E','','4.1','2','5 kg','bkz ÖH 340'),
('3528','MOTOR İÇTEN YANMALI, ALEVLENEBİLİR SIVIYLA  ÇALIŞAN veya MOTOR, YAKIT  PİLİ, ALEVLENEBİLİR SIVIYLA  ÇALIŞAN veya MAKİNE, İÇTEN  YANMALI, ALEVLENEBİLİR SIVIYLA ÇALIŞAN veya  MAKİNE, YAKIT PİLİ, ALEVLENEBİLİR SIVIYLA  ÇALIŞAN','3','F3','','D','','3','','','E0'),
('3529','MOTOR İÇTEN YANMALI, ALEVLENEBİLİR GAZLA  ÇALIŞAN veya MOTOR, YAKIT  PİLİ, ALEVLENEBİLİR GAZLA  ÇALIŞAN veya MAKİNE, İÇTEN  YANMALI, ALEVLENEBİLİR GAZLA ÇALIŞAN veya MAKİNE, YAKIT PİLİ, ALEVLENEBİLİR GAZLA ÇALIŞAN','2','6F','','B','','2.1','','','E0'),
('3530','MOTOR, İÇTEN YANMALI veya  MAKİNE, İÇTEN YANMALI','9','M11','','E','','9','','','E0'),
('3531','POLİMERLEŞTİRİCİ MADDE, KATI, STABİLİZE, B.B.B.','4.1','PM1','III','D','40','4.1','2','','E0'),
('3532','POLİMERLEŞTİRİCİ MADDE, SIVI, STABİLİZE, B.B.B.','4.1','PM1','III','D','40','4.1','2','','E0'),
('3533','POLİMERLEŞTİRİCİ MADDE, KATI, SICAKLIK KONTROLLÜ, B.B.B.','4.1','PM2','III','D','40','4.1','1','','E0'),
('3534','POLİMERLEŞTİRİCİ MADDE, SIVI, SICAKLIK KONTROLLÜ, B.B.B.','4.1','PM2','III','D','40','4.1','1','','E0'),
('3535','ZEHİRLİ KATI, ALEVLENEBİLİR,  İNORGANİK, B.B.B.','6.1','TF3','I','C/E','664','6.1
+4.1','1','','E5'),
('3536','LİTYUM BATARYALAR, KARGO  TAŞIMA ÜNİTESİNE MONTE  EDİLEN, lityum iyon bataryalar veya  lityum metal bataryalar','9','M4','','E','','9','2','','E0'),
('3537','NESNELER, ALEVLENEBİLİR GAZ İÇEREN, B.B.B.','2','6F','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3538','NESNELER, ALEVLENEBİLİR OLMAYAN, ZEHİRLİ OLMAYAN  GAZ İÇEREN, B.B.B.','2','6A','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3539','NESNELER, ZEHİRLİ GAZ  İÇEREN, B.B.B.','2','6T','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3540','NESNELER, ALEVLENEBİLİR SIVI İÇEREN, B.B.B.','3','F3','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3541','NESNELER, ALEVLENEBİLİR KATI İÇEREN, B.B.B.','4.1','F4','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3542','NESNELER, KENDİLİĞİNDEN  YANMAYA YATKIN MADDE  İÇEREN, B.B.B.','4.2','S6','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3543','NESNELER, SU İLE TEMAS  ETTİĞİNDE ALEVLENEBİLİR GAZLAR AÇIĞA ÇIKARAN  MADDE İÇEREN, B.B.B.','4.3','W3','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3544','NESNELER, YÜKSELTGEN  MADDE İÇEREN, B.B.B.','5.1','O3','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3545','NESNELER, ORGANİK PEROKSİT  İÇEREN, B.B.B.','5.2','P1 veya P2','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3546','NESNELER, ZEHİRLİ MADDE  İÇEREN, B.B.B.','6.1','T10','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3547','NESNELER, AŞINDIRICI MADDE  İÇEREN, B.B.B.','8','C11','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3548','NESNELER, MUHTELİF TEHLİKELİ MALLAR İÇEREN, B.B.B.','9','M11','','E','','Bkz.
5.2.2.1.
12','4','','E0'),
('3549','TIBBİ ATIK, KATEGORİ A, İNSANLARI ETKİLEYEN, katı" veya "TIBBİ ATIK, KATEGORİ A, yalnızca HAYVANLARI  ETKİLEYEN, katı','6.2','I3','','V1','','6.2','0','','E0'),
('3550','KOBALT DİHİDROKSİT TOZU %10’dan az olmayan solunabilir  parçacıklar içeren','6.1','T5','I','C/E','66','6.1','1','','E5'),
('3551','SODYUM İYON BATARYALAR,  organik elektrolitli','9','M4','','E','','9A','2','','E0'),
('3552','TEÇHİZAT İÇERİSİNDE  BULUNAN SODYUM İYON  BATARYALAR ya da  TEÇHİZATLA BİRLİKTE  AMBALAJLANMIŞ SODYUM  İYON BATARYALAR, organik  elektrolitli','9','M4','','E','','9A','2','','E0'),
('3553','DİSİLAN','2','2F','','B/D','23','2.1','2','','E0'),
('3554','ÜRETİLMİŞ NESNELERDE  BULUNAN GALYUM','8','C11','','E','','8','3','5 kg','E0'),
('3555','ASETON İÇİNDE TRİFLUOROMETİLTETRAZOL- SODYUM TUZU, kütlece en az %68 aseton içeren','3','D','II','B','','3','2','','E0'),
('3556','ARAÇ, LİTYUM IYON BATARYA  İLE ÇALIŞAN','9','M11','','','','9A','','','E0'),
('3557','ARAÇ, LİTYUM METAL  BATARYA İLE ÇALIŞAN','9','M11','','','','9A','','','E0'),
('3558','ARAÇ, SODYUM İYON  BATARYA İLE ÇALIŞAN','9','M11','','','','9A','','','E0'),
('3559','YANGIN SÖNDÜRÜCÜ DAĞITICI  CİHAZLAR','9','M5','','E','','9','4','','E0'),
('3560','TETRAMETİLAMONYUM HİDROKSİT SULU ÇÖZELTİSİ, en az %25 tetrametilamonyum hidroksit içeren','6.1','TC1','I','C/E','668','6.1
+8','1','','E5')
on conflict (un_number) do update set
  proper_shipping_name=excluded.proper_shipping_name,
  class=excluded.class, classification_code=excluded.classification_code,
  packing_group=excluded.packing_group, tunnel_code=excluded.tunnel_code,
  hazard_no=excluded.hazard_no, labels=excluded.labels,
  transport_category=excluded.transport_category,
  limited_quantity=excluded.limited_quantity,
  excepted_quantity=excluded.excepted_quantity;
