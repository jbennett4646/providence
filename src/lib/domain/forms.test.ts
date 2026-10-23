import { describe, expect, it } from "vitest";
import { ageOn, declarationDue, declarationMissing, schoolYearLabel, schoolYearPeriod } from "./forms";

describe("state form rules", () => {
  it("works out ages on a date", () => {
    expect(ageOn("2017-10-23", "2026-10-22")).toBe(8);
    expect(ageOn("2017-10-23", "2026-10-23")).toBe(9);
    expect(ageOn("2016-02-29", "2026-02-28")).toBe(9);
    expect(ageOn("2016-02-29", "2026-03-01")).toBe(10);
  });

  it("states the 12-month school year", () => {
    expect(schoolYearPeriod("2026-08-10")).toEqual({ from: "2026-08-10", to: "2027-08-09" });
    expect(schoolYearPeriod("2026-01-01")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(schoolYearLabel("2026-08-10")).toBe("2026–27");
  });

  it("is due 30 days after starting the first year, then by September 1", () => {
    expect(declarationDue("2026-08-10", true)).toBe("2026-09-09");
    expect(declarationDue("2026-08-10", false)).toBe("2026-09-01");
    // A year starting after September 1 gets its 30 days.
    expect(declarationDue("2026-10-05", false)).toBe("2026-11-04");
  });

  it("lists what the declaration still needs", () => {
    const full = { parentName: "Anne Hartwell", addressLine1: "1 Main St", city: "Athens", county: "Clarke", postalCode: "30601", children: [{ name: "Thomas", birthDate: "2017-05-01" }] };
    expect(declarationMissing(full)).toEqual([]);
    expect(declarationMissing({ ...full, county: " ", children: [{ name: "Thomas", birthDate: null }] })).toEqual(["your county", "Thomas’s date of birth"]);
    expect(declarationMissing({ ...full, parentName: null, city: null, children: [] })).toEqual([
      "the instructing parent’s name",
      "the address where home study takes place",
      "at least one child",
    ]);
  });
});
