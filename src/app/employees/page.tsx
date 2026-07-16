"use client";

import FirmScopedCrud from "@/components/FirmScopedCrud";
import { EMPLOYEE_FIELDS } from "@/lib/firmScopedFields";

export default function EmployeesPage() {
  return (
    <FirmScopedCrud
      table="employees"
      title="Personeller"
      fields={EMPLOYEE_FIELDS}
      searchKeys={["first_name", "last_name", "department", "position"]}
    />
  );
}
