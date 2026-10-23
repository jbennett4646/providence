import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

/*
 * The academy's type for PDFs: EB Garamond ("Garamond") and Libre Franklin
 * ("Franklin"), embedded from assets/fonts (SIL Open Font License), plus a
 * fractions-only subset of DejaVu Serif (see LICENSE-DejaVu.txt).
 */

/** Characters drawn from the Fractions font. */
export const FRACTIONS = /([\u00BC-\u00BE\u2150-\u215E])/;

let done = false;

export function registerFonts() {
  if (done) return;
  done = true;
  const FONTS = path.join(process.cwd(), "assets", "fonts");
  Font.register({
    family: "Garamond",
    fonts: [
      { src: path.join(FONTS, "EBGaramond-Regular.ttf") },
      { src: path.join(FONTS, "EBGaramond-Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONTS, "EBGaramond-Italic.ttf"), fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "Franklin",
    fonts: [
      { src: path.join(FONTS, "LibreFranklin-Regular.ttf") },
      { src: path.join(FONTS, "LibreFranklin-Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONTS, "LibreFranklin-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  // Vulgar fractions (EB Garamond lacks ⅕): a subset of DejaVu Serif, used for all of them so they match.
  Font.register({ family: "Fractions", src: path.join(FONTS, "DejaVuSerif-Fractions.ttf") });
  // Keep words whole; the forms never need hyphenation.
  Font.registerHyphenationCallback((word) => [word]);
}
