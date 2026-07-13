"use client";

import FirmScopedCrud, { FieldDef } from "@/components/FirmScopedCrud";

const fields: FieldDef[] = [
  { key: "first_name", label: "Ad", type: "text", required: true },
  { key: "last_name", label: "Soyad", type: "text", required: true },
  { key: "national_id", label: "T.C. Kimlik No", type: "text", inTable: false },
  { key: "phone", label: "Telefon", type: "text" },
  { key: "email", label: "E-posta", type: "text", inTable: false },
  { key: "adr_certificate_no", label: "ADR Belge No", type: "text", inTable: false },
  { key: "adr_valid_until", label: "ADR Geçerlilik", type: "date" },
  { key: "driving_license_class", label: "Ehliyet Sınıfı", type: "text" },
  {
    key: "status",
    label: "Durum",
    type: "select",
    options: [
      { value: "active", label: "Aktif" },
      { value: "inactive", label: "Pasif" },
    ],
  },
];

export default function DriversPage() {
  return (
    <FirmScopedCrud
      table="drivers"
      title="Sürücüler"
      fields={fields}
      searchKeys={["first_name", "last_name", "phone", "national_id"]}
      requireActivity="tasimaci"
    />
  );
}
