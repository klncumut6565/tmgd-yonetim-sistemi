"use client";

// YÖNETİM PANELİ (sadece super_admin).
// İki sekme:
//  1) Kullanıcılar: onayla / reddet / pasife al / aktif et / sil
//  2) Firma Atamaları: hangi kullanıcı hangi firmaya bağlı — ekle/kaldır
//
// Güvenlik: Sayfa kendini de korur (super_admin değilse uyarı gösterir).
// Asıl koruma veritabanı RLS'inde (sadece super_admin yazabilir).

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { authFetch } from "@/lib/supabase/authFetch";
import { useUser } from "@/hooks/useUser";
import { hataCevir } from "@/lib/hataCevir";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  approval_status: string;
  is_active: boolean;
  olusturma_yontemi: string | null;
  created_at: string;
};

type Firm = { id: string; name: string };
type Assignment = {
  id: string;
  user_id: string;
  firm_id: string;
  permission: string;
};

export default function AdminPage() {
  const { loading: userLoading, isSuperAdmin, profile } = useUser();
  const isAdmin = profile?.role === 'admin';
  const [tab, setTab] = useState<"users" | "assignments">("users");

  if (userLoading) {
    return <div className="p-6 text-gray-500">Yükleniyor...</div>;
  }

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="p-6">
        <div className="max-w-md p-4 rounded bg-amber-50 text-amber-800">
          Bu sayfa yalnızca yöneticiler içindir.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Yönetim</h1>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setTab("users")}
          className={
            "px-4 py-2 -mb-px border-b-2 " +
            (tab === "users"
              ? "border-black font-medium"
              : "border-transparent text-gray-500")
          }
        >
          Kullanıcılar
        </button>
        <button
          onClick={() => setTab("assignments")}
          className={
            "px-4 py-2 -mb-px border-b-2 " +
            (tab === "assignments"
              ? "border-black font-medium"
              : "border-transparent text-gray-500")
          }
        >
          Firma Atamaları
        </button>
      </div>

      {tab === "users" ? <UsersTab /> : <AssignmentsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------
// SEKME 1 — Kullanıcılar
// ---------------------------------------------------------------------
function UsersTab() {
  const { profile: benimProfilim, isSuperAdmin } = useUser();
  const isAdmin = benimProfilim?.role === "admin";
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Yeni kullanıcı ekleme formu
  const [ekleAcik, setEkleAcik] = useState(false);
  const [yeniEmail, setYeniEmail] = useState("");
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniAd, setYeniAd] = useState("");
  const [yeniRolSecim, setYeniRolSecim] = useState("viewer");
  const [ekleniyor, setEkleniyor] = useState(false);
  const [ekleHata, setEkleHata] = useState("");
  const [ekleBasari, setEkleBasari] = useState("");

  const ROLE_TR: Record<string, string> = {
    super_admin: "Süper Yönetici",
    admin: "Yönetici",
    tmgd: "TMGD",
    assistant: "Asistan",
    viewer: "İzleyici",
    company: "Firma Kullanıcısı",
  };

  // Şemadaki role check kısıtlamasıyla birebir aynı liste
  const ROLLER: { value: string; label: string }[] = [
    { value: "super_admin", label: "Süper Yönetici" },
    { value: "admin", label: "Yönetici" },
    { value: "tmgd", label: "TMGD" },
    { value: "assistant", label: "Asistan" },
    { value: "viewer", label: "İzleyici" },
    { value: "company", label: "Firma Kullanıcısı" },
  ];

  async function kullaniciEkle() {
    setEkleHata("");
    setEkleBasari("");

    if (!yeniEmail.trim()) { setEkleHata("E-posta zorunlu."); return; }
    if (yeniSifre.length < 8) { setEkleHata("Şifre en az 8 karakter olmalı."); return; }

    setEkleniyor(true);
    try {
      const res = await authFetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: yeniEmail.trim(),
          password: yeniSifre,
          full_name: yeniAd.trim(),
          role: yeniRolSecim,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEkleHata(json.error || "Kullanıcı oluşturulamadı.");
        return;
      }
      setEkleBasari(`✓ ${yeniEmail.trim()} oluşturuldu (${ROLE_TR[yeniRolSecim] || yeniRolSecim}).`);
      setYeniEmail(""); setYeniSifre(""); setYeniAd(""); setYeniRolSecim("viewer");
      load();
    } catch (e) {
      setEkleHata("Bağlantı hatası: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setEkleniyor(false);
    }
  }

  async function setRole(u: Profile, yeniRol: string) {
    if (yeniRol === u.role) return;
    setError("");

    // Kendi süper yönetici yetkini düşürmeye çalışıyorsan uyar:
    // sistemde başka super_admin yoksa Yönetim sayfasına bir daha giremezsin.
    if (u.id === benimProfilim?.id && u.role === "super_admin" && yeniRol !== "super_admin") {
      const digerAdminVar = users.some(
        (x) => x.id !== u.id && x.role === "super_admin" && x.is_active
      );
      const mesaj = digerAdminVar
        ? "Kendi rolünü Süper Yönetici'den düşürmek üzeresin. Devam edilsin mi?"
        : "DİKKAT: Sistemdeki TEK süper yönetici sensin. Rolünü düşürürsen " +
          "Yönetim sayfasına bir daha giremezsin ve geri almak için SQL gerekir. " +
          "Yine de devam edilsin mi?";
      if (!window.confirm(mesaj)) {
        load(); // seçim kutusunu eski değerine döndür
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: yeniRol })
      .eq("id", u.id);
    if (error) setError(hataCevir(error));
    else load();
  }

  async function load() {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // super_admin profilleri sadece super_admin görebilir
    if (!isSuperAdmin) {
      query = query.neq("role", "super_admin");
    }

    const { data, error } = await query;
    if (error) setError(hataCevir(error));
    else setUsers((data as Profile[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setApproval(u: Profile, status: string) {
    setError("");
    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status: status,
        approved_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", u.id);
    if (error) setError(hataCevir(error));
    else load();
  }

  async function setActive(u: Profile, active: boolean) {
    setError("");
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: active })
      .eq("id", u.id);
    if (error) setError(hataCevir(error));
    else load();
  }

  async function removeUser(u: Profile) {
    if (
      !window.confirm(
        `${u.email} kullanıcısının profilini KALICI olarak silmek istiyor musun?\n\n` +
          "ÖNEMLİ: Bu işlem yalnızca profili siler. Kullanıcının giriş hesabı " +
          "(e-posta/şifre) Supabase Auth'ta kalmaya devam eder — o e-posta ile " +
          "tekrar kayıt olamaz. Giriş hesabını tamamen kaldırmak veya şifresini " +
          "sıfırlamak için Supabase Dashboard → Authentication → Users ekranını " +
          "kullanman gerekir."
      )
    )
      return;
    setError("");
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) setError(hataCevir(error));
    else load();
  }

  const statusLabel: Record<string, string> = {
    pending: "Onay Bekliyor",
    approved: "Onaylı",
    rejected: "Reddedildi",
  };

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Yeni kullanıcı ekleme — yönetici ve süper yönetici.
          NOT: Yönetici rolündeki bir hesap, süper yönetici veya yönetici
          hesabı AÇAMAZ (yetki yükseltmeyi önlemek için); bu kısıtlama hem
          aşağıdaki rol listesinde hem sunucu tarafında uygulanır. */}
      {(isSuperAdmin || isAdmin) && (
        <div className="mb-4">
          {!ekleAcik ? (
            <button
              onClick={() => { setEkleAcik(true); setEkleBasari(""); setEkleHata(""); }}
              className="px-4 py-2 bg-black text-white rounded text-sm"
            >
              + Kullanıcı Ekle
            </button>
          ) : (
            <div className="border rounded-xl p-4 bg-gray-50">
              <h3 className="font-semibold text-sm mb-3">Yeni Kullanıcı</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-600">E-posta *</span>
                  <input
                    type="email"
                    className="border p-2 w-full rounded mt-1 text-sm"
                    placeholder="ornek@firma.com"
                    value={yeniEmail}
                    onChange={(e) => setYeniEmail(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">Ad Soyad</span>
                  <input
                    className="border p-2 w-full rounded mt-1 text-sm"
                    value={yeniAd}
                    onChange={(e) => setYeniAd(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">Şifre * (en az 8 karakter)</span>
                  <input
                    type="text"
                    className="border p-2 w-full rounded mt-1 text-sm font-mono"
                    placeholder="Kullanıcıya iletilecek şifre"
                    value={yeniSifre}
                    onChange={(e) => setYeniSifre(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">Rol *</span>
                  <select
                    className="border p-2 w-full rounded mt-1 text-sm"
                    value={yeniRolSecim}
                    onChange={(e) => setYeniRolSecim(e.target.value)}
                  >
                    {ROLLER.filter(
                      // Yönetici, kendi seviyesinde veya üstünde hesap açamaz
                      (r) => isSuperAdmin || (r.value !== "super_admin" && r.value !== "admin")
                    ).map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {ekleHata && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-3">
                  {ekleHata}
                </p>
              )}

              <p className="text-xs text-gray-500 mt-3">
                Kullanıcı doğrudan onaylı ve aktif olarak oluşturulur; e-posta doğrulaması
                beklemeden giriş yapabilir. Şifreyi kendisine güvenli bir kanaldan ilet.
              </p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={kullaniciEkle}
                  disabled={ekleniyor}
                  className="px-4 py-2 bg-black text-white rounded text-sm disabled:opacity-50"
                >
                  {ekleniyor ? "Oluşturuluyor..." : "Oluştur"}
                </button>
                <button
                  onClick={() => { setEkleAcik(false); setEkleHata(""); }}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
          {ekleBasari && (
            <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded p-2 mt-2">
              {ekleBasari}
            </p>
          )}
        </div>
      )}

      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3">Ad Soyad</th>
              <th className="text-left p-3">E-posta</th>
              <th className="text-left p-3">Rol</th>
              <th className="text-left p-3">Durum</th>
              <th className="text-left p-3">Aktif</th>
              <th className="text-right p-3">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              // Yönetim panelinden AÇILMAYAN hesaplar (kişi kendi kayıt
              // olmuş) altın sarısı gösterilir — yöneticinin denetimli
              // eklenenlerle dışarıdan kayıt olanları bir bakışta ayırması
              // için. Eski kayıtların tamamı 'kayit' sayılır (bkz. migration 039).
              const kendiKayit = u.olusturma_yontemi !== "yonetici";
              return (
              <tr
                key={u.id}
                className={"border-b last:border-0 " + (kendiKayit ? "bg-amber-50" : "")}
              >
                <td className="p-3">
                  <span className={kendiKayit ? "text-amber-700 font-medium" : ""}>
                    {u.full_name || "—"}
                  </span>
                  {kendiKayit && (
                    <span
                      className="ml-2 text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded"
                      title="Bu hesap yönetim panelinden açılmadı; kişi kendisi kayıt oldu."
                    >
                      kendi kaydı
                    </span>
                  )}
                </td>
                <td className={"p-3 " + (kendiKayit ? "text-amber-700" : "")}>{u.email}</td>
                <td className="p-3">
                  {isSuperAdmin ? (
                    <select
                      value={u.role}
                      onChange={(e) => setRole(u, e.target.value)}
                      className="border rounded p-1.5 text-sm bg-white"
                    >
                      {ROLLER.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-gray-600">
                      {ROLE_TR[u.role] || u.role}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={
                      "px-2 py-0.5 rounded text-xs " +
                      (u.approval_status === "approved"
                        ? "bg-green-100 text-green-700"
                        : u.approval_status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700")
                    }
                  >
                    {statusLabel[u.approval_status] || u.approval_status}
                  </span>
                </td>
                <td className="p-3">{u.is_active ? "Evet" : "Hayır"}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {u.approval_status !== "approved" && (
                    <button
                      onClick={() => setApproval(u, "approved")}
                      className="text-green-600 hover:underline mr-3"
                    >
                      Onayla
                    </button>
                  )}
                  {u.approval_status === "pending" && (
                    <button
                      onClick={() => setApproval(u, "rejected")}
                      className="text-orange-600 hover:underline mr-3"
                    >
                      Reddet
                    </button>
                  )}
                  {u.is_active ? (
                    <button
                      onClick={() => setActive(u, false)}
                      className="text-gray-600 hover:underline mr-3"
                    >
                      Pasife Al
                    </button>
                  ) : (
                    <button
                      onClick={() => setActive(u, true)}
                      className="text-blue-600 hover:underline mr-3"
                    >
                      Aktif Et
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => removeUser(u)}
                      className="text-red-600 hover:underline"
                    >
                      Sil
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-gray-500">
                  Henüz kullanıcı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// SEKME 2 — Firma Atamaları
// ---------------------------------------------------------------------
function AssignmentsTab() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedFirm, setSelectedFirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [u, f, a] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("approval_status", "approved")
        .neq("role", "super_admin")
        .order("full_name"),
      supabase.from("firms").select("id, name").order("name"),
      supabase.from("user_firms").select("*"),
    ]);
    setUsers((u.data as Profile[]) || []);
    setFirms((f.data as Firm[]) || []);
    setAssignments((a.data as Assignment[]) || []);
    if (u.data && u.data.length > 0) setSelectedUser((p) => p || u.data[0].id);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addAssignment() {
    setError("");
    if (!selectedUser || !selectedFirm) {
      setError("Kullanıcı ve firma seç.");
      return;
    }
    const { error } = await supabase.from("user_firms").insert({
      user_id: selectedUser,
      firm_id: selectedFirm,
      permission: "owner",
    });
    if (error) setError(hataCevir(error));
    else {
      setSelectedFirm("");
      load();
    }
  }

  async function removeAssignment(id: string) {
    setError("");
    const { error } = await supabase.from("user_firms").delete().eq("id", id);
    if (error) setError(hataCevir(error));
    else load();
  }

  function firmName(id: string) {
    return firms.find((f) => f.id === id)?.name || "—";
  }

  const userAssignments = assignments.filter(
    (a) => a.user_id === selectedUser
  );

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Kullanıcı</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border p-2 rounded min-w-[280px]"
        >
          {users.length === 0 && <option value="">Onaylı kullanıcı yok</option>}
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email}{" "}
              {u.role === "super_admin" ? "(Yönetici)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex items-end gap-2">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Firma ekle
          </label>
          <select
            value={selectedFirm}
            onChange={(e) => setSelectedFirm(e.target.value)}
            className="border p-2 rounded min-w-[280px]"
          >
            <option value="">Firma seç...</option>
            {firms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={addAssignment}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Ata
        </button>
      </div>

      <h3 className="font-medium mb-2">Bu kullanıcıya atalı firmalar</h3>
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3">Firma</th>
              <th className="text-right p-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {userAssignments.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="p-3">{firmName(a.firm_id)}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => removeAssignment(a.id)}
                    className="text-red-600 hover:underline"
                  >
                    Kaldır
                  </button>
                </td>
              </tr>
            ))}
            {userAssignments.length === 0 && (
              <tr>
                <td colSpan={2} className="p-4 text-gray-500">
                  Bu kullanıcıya henüz firma atanmamış.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
