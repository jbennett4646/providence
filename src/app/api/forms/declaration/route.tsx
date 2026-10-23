import { DeclarationDoc, renderPdf } from "@/server/forms/pdf";
import { declarationModel } from "@/server/forms/model";
import { getSession } from "@/server/session";
import { householdContext } from "@/server/state";

/** The household's Declaration of Intent for the current school year, as a PDF. */
export async function GET() {
  const s = await getSession();
  if (!s || s.user.role !== "parent") return new Response("Sign in first", { status: 401 });
  const m = await declarationModel(s.household, householdContext(s.household));
  if (m.missing.length) return new Response(`Add ${m.missing.join(", ")} first, on Records · State forms.`, { status: 409 });
  const pdf = await renderPdf(<DeclarationDoc m={m} />);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="declaration-of-intent-${m.schoolYear.replace("–", "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
