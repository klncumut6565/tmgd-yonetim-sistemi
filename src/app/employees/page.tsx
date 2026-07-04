"use client";

import FirmScopedCrud, { FieldDef } from "@/components/FirmScopedCrud";

const fields: FieldDef[] = [
  { key: "first_name", label: "Ad", type: "text", required: true },
  { key: "last_name", label: "Soyad", type: "text", required: true },
  { key: "department", label: "Departman", type: "text" },
  { key: "position", label: "Pozisyon", type: "text" },
  { key: "phone", label: "Telefon", type: "text" },
  { key: "email", label: "E-posta", type: "text", inTable: false },
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

export default function EmployeesPage() {
  return (
    <FirmScopedCrud
      table="employees"
      title="Personeller"
      fields={fields}
      searchKeys={["first_name", "last_name", "department", "position"]}
    />
  );
}
