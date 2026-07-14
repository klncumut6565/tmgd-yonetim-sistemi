"use client";

import FirmScopedCrud from "@/components/FirmScopedCrud";
import { VISIT_FIELDS } from "@/lib/firmScopedFields";

export default function VisitsPage() {
  return (
    <FirmScopedCrud
      table="visits"
      title="Ziyaretler"
      fields={VISIT_FIELDS}
      searchKeys={["visit_type", "summary"]}
      orderBy="visit_date"
    />
  );
}
