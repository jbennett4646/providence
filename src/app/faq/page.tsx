import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Questions families ask" };

const CONTACT = "mailto:josh@joshwbennett.com";

type Group = { label: string; items: { q: string; a: ReactNode }[] };

const groups: Group[] = [
  {
    label: "Joining",
    items: [
      {
        q: "Can we join in the middle of the year?",
        a: "Yes. Your school year begins the day you start, and the calendar lays out 36 weeks from there. If you are switching from another program, enter the days you have already taught and your 180-day count carries over.",
      },
      {
        q: "Where will my child start?",
        a: "A short placement check in each subject shows where your child stands. A child who is ahead begins at a later term; one who needs a firmer footing begins at the start. Each subject is placed on its own.",
      },
      {
        q: "What if my child is ahead in one subject and behind in another?",
        a: "That is normal, and the program is built for it. Each subject keeps its own place, so a child can be in Term 4 of Arithmetic and Term 2 of Latin. A grade is certified only when every required subject for it is finished.",
      },
      {
        q: "Do I need teaching experience?",
        a: "No. Every lesson from kindergarten through Grade 5 comes with a short script you can read aloud at the table. Answer keys and reference pages are in each course manual. The program is written for parents, not teachers.",
      },
    ],
  },
  {
    label: "The school day",
    items: [
      {
        q: "How long is a school day?",
        a: "About four and a half hours, with breaks. A short daily core keeps facts fresh; the rest of the week’s work rotates through the days.",
      },
      {
        q: "Does my child need a login?",
        a: "Not through Grade 5. The early years are taught by a parent, so the parent holds the account. Students receive their own login beginning in Grade 6.",
      },
      {
        q: "Can we teach from paper instead of a screen?",
        a: "Yes. Print the year plan once, then each term’s manual as it comes due. Once a week you check off what was done with one tap.",
      },
      {
        q: "What if we travel or miss days?",
        a: "Add the break to your calendar and the plan moves with you. Only days you actually teach count toward your 180.",
      },
    ],
  },
  {
    label: "Records & Georgia law",
    items: [
      {
        q: "Does this meet Georgia’s home study law?",
        a: "Yes. Your records track 180 school days, four and a half hours a day, and the five required subjects: reading, language arts, mathematics, social studies and science.",
      },
      {
        q: "Who handles the Declaration of Intent and the annual report?",
        a: "We do nearly all of it. We prepare your Declaration of Intent and annual progress report, filled in and ready to sign. You sign them, file the declaration (online, or by mail with your own stamp), and keep the progress report with your records. The Declaration is due within 30 days of starting and by September 1 each year after.",
      },
      {
        q: "Why no letter grades?",
        a: "Our records show what a child has mastered and what is finished, so the record reflects real learning rather than a grade that overstates it.",
      },
    ],
  },
  {
    label: "Other states",
    items: [
      {
        q: "We don’t live in Georgia. Can we join?",
        a: "Yes. We teach entirely at home and online, so families anywhere are welcome. We began with Georgia because it is home: our founder lives here and was homeschooled here himself, so he knows the Declaration of Intent and the annual report firsthand. We are learning other states’ requirements and forms so we can prepare them for you as well.",
      },
      {
        q: "How do we get our state added?",
        a: (
          <>
            <a href={CONTACT} className={styles.answerLink}>
              Write to us
            </a>{" "}
            and tell us where you live. Each request moves that state up our list.
          </>
        ),
      },
    ],
  },
  {
    label: "Tuition",
    items: [
      {
        q: "What does the household plan cover?",
        a: "$100 a month covers your whole household, not each child.",
      },
      {
        q: "What does the parish or co-op plan cover?",
        a: "$500 a month covers a group of unrelated families who learn together: a parish, a neighborhood, a co-op.",
      },
      {
        q: "Are the electives required?",
        a: "No. Workshop and Hearth are optional for each child. They do not count toward grades or hold back a grade level.",
      },
      { q: "Is tutoring available?", a: "Tutoring is coming. Pricing will be announced." },
      { q: "Can we cancel?", a: "Yes, at any time." },
    ],
  },
];

export default function FaqPage() {
  return (
    <main data-screen-label="FAQ">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.kicker}>Questions</div>
          <h1 className={styles.title}>What families ask before they begin.</h1>
          <p className={styles.lede}>
            If yours isn’t here,{" "}
            <a href={CONTACT} className={styles.ledeLink}>
              write to us
            </a>
            .
          </p>
        </div>
      </section>
      <div className={styles.body}>
        {groups.map((g) => (
          <section key={g.label} className={styles.group}>
            <h2 className={styles.groupLabel}>{g.label}</h2>
            <div className={styles.items}>
              {g.items.map((it) => (
                <div key={it.q} className={styles.item}>
                  <h3 className={styles.question}>{it.q}</h3>
                  <p className={styles.answer}>{it.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <MarketingFooter>
        <span>providence-home.academy</span>
      </MarketingFooter>
    </main>
  );
}
