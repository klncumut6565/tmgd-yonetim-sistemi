"use client";

import FirmScopedCrud from "@/components/FirmScopedCrud";
import { VISIT_FIELDS, VISIT_REPORT_TEMPLATE } from "@/lib/firmScopedFields";

export default function VisitsPage() {
  return (
    <FirmScopedCrud
      table="visits"
      title="Ziyaretler"
      fields={VISIT_FIELDS}
      searchKeys={["visit_type", "summary"]}
      orderBy="visit_date"
      notepadField="report_content"
      notepadLabel="Rapor İçeriği (Planlanan / Gerçekleşen Faaliyet)"
      notepadTemplate={VISIT_REPORT_TEMPLATE}
    />
  );
}
