# Database Migrations

Bu klasördeki dosyalar, `database/schema.sql` baseline'ının üzerine **sıralı olarak** uygulanan artımlı şema değişiklikleridir.

## Konvansiyon

- **Adlandırma:** `NNN_kisa_aciklama.sql` (örn. `024_audit_log.sql`)
- **Numaralandırma:** Üç haneli, sıralı, boşluksuz. Yeni migration eklerken son numaranın bir fazlasını kullan.
- **Up-only:** Down migration yazılmaz. Prod'da yanlışlıkla rollback riskini önlemek için — hata varsa yeni bir migration ile telafi edilir.
- **Idempotent değil:** Migration bir kez çalışır. `CREATE TABLE IF NOT EXISTS` kullanmak yerine tablo gerçekten yoksa yaratıldığını varsay. (Sadece bir migration'ın parçası olarak tekrar tetiklenebilir yardımcı objeler `IF NOT EXISTS` kullanabilir.)
- **Atomiklik:** Her migration bir işi yapar. "Yeni özellik + eski bug fix" aynı migration'da olmaz.
- **SECURITY DEFINER dikkat:** RLS'yi bypass eden trigger fonksiyonları eklerken `SET search_path = public, auth` mutlaka olmalı.

## Nasıl Uygulanır

### Yeni bir Supabase projesi

1. Önce `database/schema.sql` — baseline (70+ tablo)
2. Sonra `database/migrations/*.sql` — numeric order

### Mevcut projeye ek migration

Sadece o migration'ı Supabase SQL Editor'de çalıştır.

### İzleme

Uygulanan migration'ları takip etmek için:

```sql
CREATE TABLE IF NOT EXISTS public._migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
);
```

Her migration'ın en sonuna eklenir:

```sql
INSERT INTO public._migrations (id) VALUES ('024_audit_log');
```

Böylece `SELECT * FROM _migrations ORDER BY id;` ile hangi migration'ların uygulandığı görülür.

## Baseline (`database/schema.sql`)

`schema.sql` sıfırdan kurulumda bir kez çalıştırılır ve bir daha dokunulmaz. Şema değişiklikleri buradan sonra yalnızca migration dosyaları ile yapılır.
