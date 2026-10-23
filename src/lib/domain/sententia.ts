import { daysBetween, type DateKey } from "./dates";

export type Sententia = { la: string; en: string; note: string };

/** The fixed list. One line a day, the same for every household. */
export const SENTENTIAE: Sententia[] = [
  { la: "Multum non multa", en: "Much, not many", note: "Pliny the Younger — depth over breadth" },
  { la: "Repetitio mater studiorum est", en: "Repetition is the mother of learning", note: "Medieval maxim — the basis of memory work" },
  { la: "Festina lente", en: "Make haste slowly", note: "" },
  { la: "Ad fontes", en: "To the sources", note: "Renaissance humanist motto — read the original" },
  { la: "Vincit qui se vincit", en: "He conquers who conquers himself", note: "On temperance" },
  { la: "Labor omnia vincit", en: "Work conquers all", note: "Virgil" },
  { la: "Per aspera ad astra", en: "Through hardships to the stars", note: "" },
  { la: "Nosce te ipsum", en: "Know thyself", note: "Latin form of the Delphic maxim" },
  { la: "Docendo discimus", en: "By teaching, we learn", note: "Attributed to Seneca" },
  { la: "Age quod agis", en: "Do what you are doing", note: "Attend fully to the task at hand" },
  { la: "Dum spiro spero", en: "While I breathe, I hope", note: "On hope" },
  { la: "Initium sapientiae timor Domini", en: "The fear of the Lord is the beginning of wisdom", note: "Vulgate, Psalm 110:10" },
  { la: "Veritas liberabit vos", en: "The truth shall set you free", note: "Vulgate, John 8:32" },
  { la: "Verbum Domini manet in aeternum", en: "The word of the Lord endures forever", note: "" },
  { la: "Soli Deo gloria", en: "Glory to God alone", note: "" },
  { la: "Sapientia et virtus", en: "Wisdom and virtue", note: "" },
  { la: "Fortiter, fideliter, feliciter", en: "Bravely, faithfully, successfully", note: "Traditional school motto" },
];

/** The line for a date: days since 1970-01-01, modulo the list (as the prototype did). */
export function sententiaFor(date: DateKey): Sententia {
  const n = daysBetween("1970-01-01", date);
  return SENTENTIAE[((n % SENTENTIAE.length) + SENTENTIAE.length) % SENTENTIAE.length];
}
