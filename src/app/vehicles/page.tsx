"use client";

import FirmScopedCrud from "@/components/FirmScopedCrud";
import { VEHICLE_FIELDS } from "@/lib/firmScopedFields";

export default function VehiclesPage() {
  return (
    <FirmScopedCrud
      table="vehicles"
      title="Araçlar"
      fields={VEHICLE_FIELDS}
      searchKeys={["plate_number", "brand", "model", "vehicle_type"]}
      requireActivity="tasimaci"
    />
  );
}
