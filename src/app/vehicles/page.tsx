"use client";

import FirmScopedCrud, { FieldDef } from "@/components/FirmScopedCrud";

const fields: FieldDef[] = [
  { key: "plate_number", label: "Plaka", type: "text", required: true },
  { key: "brand", label: "Marka", type: "text" },
  { key: "model", label: "Model", type: "text" },
  { key: "model_year", label: "Model Yılı", type: "number" },
  { key: "vehicle_type", label: "Araç Tipi", type: "text" },
  { key: "adr_certificate_no", label: "ADR Belge No", type: "text", inTable: false },
  { key: "adr_valid_until", label: "ADR Geçerlilik", type: "date" },
  { key: "inspection_valid_until", label: "Muayene Geçerlilik", type: "date", inTable: false },
  {
    key: "status",
    label: "Durum",
    type: "select",
    options: [
      { value: "active", label: "Aktif" },
      { value: "inactive", label: "Pasif" },
      { value: "sold", label: "Satıldı" },
    ],
  },
];

export default function VehiclesPage() {
  return (
    <FirmScopedCrud
      table="vehicles"
      title="Araçlar"
      fields={fields}
      searchKeys={["plate_number", "brand", "model", "vehicle_type"]}
    />
  );
}
