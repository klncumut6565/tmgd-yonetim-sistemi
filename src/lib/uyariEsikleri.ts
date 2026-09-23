// src/lib/uyariEsikleri.ts
//
// Gösterge paneli ve bildirim zilinin ORTAK kullandığı geçerlilik uyarı
// eşiği. Önceden panel sabit 30 gün, zil ise kullanıcı başına ayarlanan
// (varsayılan 45) eşik kullanıyordu; bu yüzden aynı belge bir yerde
// görünüp diğerinde görünmüyordu. Artık tek ve ortak bir sınır var.
//
// Özel eşikler (TMFB 150 gün, TMGD Sertifikası 120 gün) bu değerden
// bağımsızdır ve kendi dosyalarında tanımlıdır.

export const BELGE_UYARI_GUN = 45;
