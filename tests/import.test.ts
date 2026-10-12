import { describe, expect, it } from "vitest";

import { countDataRows, fixHint, formatBytes } from "@/lib/import";

describe("import helpers", () => {
  it("explains each row error the API can return", () => {
    expect(fixHint("duplicate employee_number A1")).toContain("A1 is already used");
    expect(fixHint("hourly_rate must be > 0 for hourly employees")).toContain("hourly_rate");
    expect(fixHint("annual_salary must be > 0 for salary employees")).toContain("annual_salary");
    expect(fixHint("pay_type must be salary or hourly")).toContain("salary or hourly");
    expect(fixHint("missing columns: email")).toContain("header");
    expect(fixHint("something odd")).toContain("upload the file again");
  });
  it("counts data rows and formats sizes", () => {
    expect(countDataRows("a,b\n1,2\n3,4\n")).toBe(2);
    expect(countDataRows("a,b\n")).toBe(0);
    expect(countDataRows("")).toBe(0);
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(1229)).toBe("1.2 KB");
  });
});
