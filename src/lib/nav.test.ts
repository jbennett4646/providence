import { describe, expect, it } from "vitest";
import { isActive, parentNav, topNav } from "./nav";

const top = (label: string) => topNav.find((i) => i.label.startsWith(label))!;

describe("isActive", () => {
  it("lights Home only on the root path", () => {
    expect(isActive(top("Home"), "/")).toBe(true);
    expect(isActive(top("Home"), "/faq")).toBe(false);
  });

  it("matches a section and its sub-paths, not look-alike prefixes", () => {
    expect(isActive(top("Teaching"), "/teaching")).toBe(true);
    expect(isActive(top("Teaching"), "/teaching/latin")).toBe(true);
    expect(isActive(top("Teaching"), "/teachings")).toBe(false);
  });

  it("lights Parent for the parent sub-areas", () => {
    for (const p of ["/parent", "/parent/students", "/course/latin", "/calendar", "/settings"]) {
      expect(isActive(top("Parent"), p)).toBe(true);
    }
    expect(isActive(top("Parent"), "/records")).toBe(false);
  });

  it("uses exact matching for the sidebar", () => {
    const dashboard = parentNav.find((i) => i.label === "Dashboard")!;
    expect(isActive(dashboard, "/parent", true)).toBe(true);
    expect(isActive(dashboard, "/parent/students", true)).toBe(false);
  });
});
