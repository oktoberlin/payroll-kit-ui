import { describe, expect, it } from "vitest";

import { ApiError, parseErrors } from "@/lib/api";

describe("parseErrors", () => {
  it("separates general and per-field DRF errors", () => {
    const errors = parseErrors({
      employee_number: ["E002 is already used by Ben Carter"],
      non_field_errors: ["Pay period overlaps an existing period."],
    });
    expect(errors.fields.employee_number).toEqual(["E002 is already used by Ben Carter"]);
    expect(errors.form).toEqual(["Pay period overlaps an existing period."]);
  });
  it("handles list errors from the services and detail messages", () => {
    expect(parseErrors(["net pay would be negative (-100.00)"]).form[0]).toContain("negative");
    expect(parseErrors({ detail: "Cannot delete: it is still referenced by other records." }).form).toHaveLength(1);
  });
  it("nested errors (tax brackets) are flattened", () => {
    expect(parseErrors({ brackets: [{ rate: ["Ensure this value is less than or equal to 1."] }] }).fields.brackets[0])
      .toContain("less than");
  });
  it("falls back to a generic message", () => {
    expect(parseErrors(null).form[0]).toBe("Something went wrong.");
  });
  it("ApiError message prefers the form message, then the first field message", () => {
    expect(new ApiError(400, { form: ["Boom"], fields: {} }).message).toBe("Boom");
    expect(new ApiError(400, { form: [], fields: { code: ["Taken"] } }).message).toBe("Taken");
  });
});
