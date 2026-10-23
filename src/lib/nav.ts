export type NavItem = {
  label: string;
  href: string;
  /** Extra path prefixes that also light this item (sub-areas of a section). */
  also?: string[];
  /** Rendered dimmed, as in the prototype (the Grade 6+ student module). */
  muted?: boolean;
};

export const topNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Parent", href: "/parent", also: ["/course", "/calendar", "/settings"] },
  { label: "Teaching", href: "/teaching" },
  { label: "Student · 6–12", href: "/student", muted: true },
  { label: "Records", href: "/records" },
  { label: "FAQ", href: "/faq" },
];

export const parentNav: NavItem[] = [
  { label: "Dashboard", href: "/parent" },
  { label: "Teaching today", href: "/teaching" },
  { label: "Students", href: "/settings#children" },
  { label: "Course manuals", href: "/course" },
  { label: "Calendar", href: "/calendar" },
  { label: "Records", href: "/records" },
  { label: "Attendance", href: "/records#attendance" },
  { label: "Settings", href: "/settings" },
];

function matches(pathname: string, prefix: string): boolean {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** Whether a nav item should show as active for the current path. */
export function isActive(item: NavItem, pathname: string, exact = false): boolean {
  const href = item.href.split("#")[0];
  if (exact) return pathname === href;
  return [href, ...(item.also ?? [])].some((p) => matches(pathname, p));
}
