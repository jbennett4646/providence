import { getGuide } from "@/lib/content/guide";
import { gradeLabel } from "@/lib/domain/grades";
import { renderPdf } from "@/server/forms/pdf";
import { GuideDoc } from "@/server/guides/pdf";
import { getSession } from "@/server/session";

/** A grade guide as a printable PDF, for signed-in parents. */
export async function GET(_req: Request, ctx: { params: Promise<{ grade: string; guideId: string }> }) {
  const s = await getSession();
  if (!s || s.user.role !== "parent") return new Response("Sign in first", { status: 401 });
  const { grade: slug, guideId } = await ctx.params;
  const grade = /^grade-(\d{1,2})$/.exec(slug)?.[1];
  const guide = grade ? getGuide(Number(grade), guideId) : null;
  if (!guide) return new Response("No such guide", { status: 404 });
  const pdf = await renderPdf(<GuideDoc guide={guide} forLine={`${gradeLabel(Number(grade))} · for the parent`} />);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}-${guideId}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
