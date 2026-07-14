"use client";

import FirmScopedCrud from "@/components/FirmScopedCrud";
import { DRIVER_FIELDS } from "@/lib/firmScopedFields";

export default function DriversPage() {
  return (
    <FirmScopedCrud
      table="drivers"
      title="Sürücüler"
      fields={DRIVER_FIELDS}
      searchKeys={["first_name", "last_name", "phone", "national_id"]}
      requireActivity="tasimaci"
    />
  );
}
