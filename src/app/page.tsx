import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter, MarketingFooterLink } from "@/components/marketing/MarketingFooter";
import {
  hero,
  heroRows,
  pacingRows,
  pillars,
  plans,
  transparencyHeadline,
  unitRows,
  virtues,
} from "@/components/marketing/content";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <main data-screen-label="Landing">
      <section className={styles.hero}>
        <div className={styles.wrap}>
          <MarketingHeader />
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.kicker}>{hero.kicker}</div>
              <h1 className={styles.headline}>{hero.headline}</h1>
              <p className={styles.lede}>{hero.body}</p>
              <div className={styles.ctas}>
                <Link href="/parent" className={styles.ctaPrimary}>
                  {hero.ctaPrimary}
                </Link>
                <Link href="/course" className={styles.ctaGhost}>
                  Read every lesson first
                </Link>
              </div>
            </div>
            <div className={styles.week}>
              <div className={styles.weekHead}>One nine-year-old, this week</div>
              <div>
                {heroRows.map((row) => (
                  <div key={row.subject} className={styles.weekRow}>
                    <div>
                      <div className={styles.weekSubject}>{row.subject}</div>
                      <div className={styles.weekDetail}>{row.detail}</div>
                    </div>
                    <div className={styles.weekMark}>{row.mark}</div>
                  </div>
                ))}
              </div>
              <div className={styles.weekFoot}>
                <span>Certified through Grade 3</span>
                <span>Days logged 5 / 5</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.paideia}>
        <div className={styles.paideiaInner}>
          <div className={styles.paideiaCol}>
            <div className={styles.paideiaWord}>παιδεία · paideia</div>
            <p className={styles.paideiaLead}>
              Paideia was the Greek word for the complete formation of a person — intellect, character, and taste
              shaped together into someone fit for civic and moral life.
            </p>
            <p className={styles.paideiaBody}>
              It is the word behind pedagogy, encyclopedia, and pediatric. It assumed that education produces a kind
              of person, and that the only real question is which kind. We are not inventing this. We are returning to
              it.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.virtues}>
        <div className={styles.virtuesInner}>
          <div className={styles.virtuesHead}>
            <h2 className={styles.virtuesTitle}>The seven virtues, and how each one is taught.</h2>
            <span className={styles.virtuesAside}>
              Every school forms character through what it rewards, what it repeats, and what it leaves out. Ours is
              written down.
            </span>
          </div>
          <div className={styles.virtueGrid}>
            {virtues.map((v) => (
              <div key={v.name} className={styles.virtue}>
                <div className={styles.virtueNumeral}>{v.numeral}</div>
                <div className={styles.virtueName}>{v.name}</div>
                <div className={styles.virtueHow}>{v.how}</div>
              </div>
            ))}
            <div className={styles.verify}>
              <div className={styles.verifyKicker}>Verify it yourself</div>
              <div className={styles.verifyBody}>
                Every lesson, question and answer key is open to parents before a child enrolls. Nothing here is
                asserted that cannot be read.
              </div>
              <Link href="/course" className={styles.verifyLink}>
                Read the curriculum →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.quote}>
        <div className={styles.quoteInner}>
          <p className={styles.quoteText}>A curriculum is never neutral. It is always producing someone.</p>
        </div>
      </section>

      <section className={styles.band}>
        <div className={styles.about}>
          <div>
            <div className={styles.sectionKicker}>About the Academy</div>
            <h2 className={styles.aboutTitle}>Recovering an older idea of school.</h2>
          </div>
          <div>
            <p className={styles.aboutLead}>
              Providence Home Academy exists because education makes a kind of person, and we think a parent deserves
              to know which kind. The classical tradition answered that question openly for two thousand years. It
              taught Latin, because a child who can parse a sentence can parse an argument. It taught history in a
              four-year cycle, so that the same story returns three times and lands deeper each time. It taught memory
              work, because a mind furnished with good things has something to think with. And it taught the seven
              virtues by name, in the plain expectation that character is formed on purpose or by accident.
            </p>
            <p className={styles.aboutBody}>
              We have put that tradition into a form a family can actually run at the kitchen table. Every lesson is
              open to read before a child is enrolled. What we are aiming at is a young person who reasons carefully,
              writes clearly, keeps their word, and can still be moved by a poem.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.band}>
        <div className={styles.pillars}>
          {pillars.map((p) => (
            <div key={p.numeral} className={styles.pillar}>
              <div className={styles.pillarNumeral}>{p.numeral}</div>
              <h3 className={styles.pillarTitle}>{p.title}</h3>
              <p className={styles.pillarBody}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="curriculum" className={styles.transparency}>
        <div className={styles.transparencyInner}>
          <div>
            <h2 className={styles.transparencyTitle}>{transparencyHeadline}</h2>
            <p className={styles.transparencyBody}>
              Every lesson, reading, question and mark is visible before your child ever sees it. Approve a unit,
              substitute a text, or set the pace for the term.
            </p>
            <Link href="/records" className={styles.inkLink}>
              See records &amp; transcripts →
            </Link>
          </div>
          <div className={styles.card}>
            <div className={styles.unitHead}>
              <span className={styles.unitTitle}>Unit III · The Age of Exploration</span>
              <span className={styles.approved}>Approved</span>
            </div>
            {unitRows.map((u) => (
              <div key={u.n} className={styles.unitRow}>
                <span className={styles.unitN}>{u.n}</span>
                <span className={styles.unitName}>{u.title}</span>
                <span className={styles.unitKind}>{u.kind}</span>
              </div>
            ))}
            <div className={styles.unitFoot}>Source texts and answer keys available to parents at all times.</div>
          </div>
        </div>
      </section>

      <section className={styles.band}>
        <div className={styles.pacing}>
          <div>
            <div className={styles.sectionKicker}>Pacing</div>
            <h2 className={styles.pacingTitle}>No child waits. No record overstates.</h2>
            <p className={styles.pacingBody}>
              Each subject moves at the speed the child actually reads, writes and reasons. A strong arithmetic student
              is not held to the pace of their history, and a hard week in one subject does not slow the others.
            </p>
            <p className={`${styles.pacingBody} ${styles.last}`}>
              The record stays honest about it. A grade level is certified only when every required subject for that
              level is finished — the slowest one, not the average.
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.pacingHead}>
              <span className={styles.pacingCardTitle}>One nine-year-old, six of thirteen courses</span>
              <span className={styles.pacingCertified}>Certified through Grade 3</span>
            </div>
            {pacingRows.map((p) => (
              <div key={p.name} className={styles.pacingRow}>
                <span className={styles.pacingName}>{p.name}</span>
                <span className={styles.pacingGrade}>{p.grade}</span>
                <span className={styles.pacingLesson}>{p.lesson}</span>
              </div>
            ))}
            <div className={styles.pacingFoot}>
              Thirteen courses are required at Grade 4. Science is furthest behind, so Science is what stands between
              them and the grade. Nothing else is waiting on it.
            </div>
          </div>
        </div>
      </section>

      <section id="tuition" className={styles.tuition}>
        <div className={styles.tuitionInner}>
          <h2 className={styles.tuitionTitle}>Tuition, plainly stated</h2>
          <p className={styles.tuitionNote}>Per household, not per child. Cancel in any month.</p>
          <div className={styles.plans}>
            {plans.map((pl) =>
              pl.live ? (
                <div key={pl.name} className={styles.plan}>
                  <div className={styles.planName}>{pl.name}</div>
                  <div className={styles.planPrice}>
                    {pl.price}
                    <span className={styles.planPer}> / mo</span>
                  </div>
                  <p className={styles.planBlurb}>{pl.blurb}</p>
                  <div className={styles.planItems}>
                    {pl.items.map((it) => (
                      <div key={it} className={styles.planItem}>
                        <span className={styles.planDot}>·</span>
                        {it}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={pl.name} className={styles.planSoon} aria-disabled="true">
                  <div className={styles.soonHead}>
                    <span className={styles.soonName}>{pl.name}</span>
                    <span className={styles.soonBadge}>Coming soon</span>
                  </div>
                  <div className={styles.soonPrice}>Pricing to come</div>
                  <p className={styles.soonBlurb}>{pl.blurb}</p>
                  <div className={styles.soonItems}>
                    {pl.items.map((it) => (
                      <div key={it} className={styles.soonItem}>
                        <span>·</span>
                        {it}
                      </div>
                    ))}
                    <div className={styles.soonNote}>Not available yet.</div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <MarketingFooter>
        <MarketingFooterLink href="/faq">Curriculum · Community · Tuition · Questions</MarketingFooterLink>
      </MarketingFooter>
    </main>
  );
}
