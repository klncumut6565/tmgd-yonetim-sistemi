"use client";

import FirmScopedCrud, { FieldDef } from "@/components/FirmScopedCrud";

const fields: FieldDef[] = [
  { key: "visit_date", label: "Ziyaret Tarihi", type: "date", required: true },
  {
    key: "visit_type",
    label: "Ziyaret Tipi",
    type: "select",
    options: [
      { value: "periyodik", label: "Periyodik" },
      { value: "denetim", label: "Denetim" },
      { value: "egitim", label: "Eğitim" },
      { value: "olay", label: "Olay/Kaza" },
      { value: "diger", label: "Diğer" },
    ],
  },
  { key: "summary", label: "Özet", type: "text" },
  { key: "next_visit_date", label: "Sonraki Ziyaret", type: "date" },
];

export default function VisitsPage() {
  return (
    <FirmScopedCrud
      table="visits"
      title="Ziyaretler"
      fields={fields}
      searchKeys={["visit_type", "summary"]}
      orderBy="visit_date"
    />
  );
}
