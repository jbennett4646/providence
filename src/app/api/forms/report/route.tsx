import type { NextRequest } from "next/server";
import { reportModel } from "@/server/forms/model";
import { renderPdf, ReportDoc } from "@/server/forms/pdf";
import { getSession } from "@/server/session";

/** A child's annual progress report for the current school year, as a PDF. */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || s.user.role !== "parent") return new Response("Sign in first", { status: 401 });
  const child = s.household.children.find((c) => c.id === req.nextUrl.searchParams.get("child"));
  if (!child) return new Response("No such child", { status: 404 });
  const m = await reportModel(s.household, child);
  const pdf = await renderPdf(<ReportDoc m={m} />);
  const slug = child.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "student";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="progress-report-${slug}-${m.schoolYear.replace("–", "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
