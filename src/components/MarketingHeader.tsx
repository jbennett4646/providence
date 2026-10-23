import Link from "next/link";
import { Crest } from "./Crest";
import styles from "./MarketingHeader.module.css";

/** The crest, name and links at the top of the public pages. */
export function MarketingHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <Crest />
        <div>
          <div className={styles.name}>Providence Home Academy</div>
          <div className={styles.motto}>Est. for the Family</div>
        </div>
      </Link>
      <nav className={styles.links} aria-label="Site">
        <Link href="/#curriculum" className={styles.link}>
          Curriculum
        </Link>
        <Link href="/#tuition" className={styles.link}>
          Tuition
        </Link>
        <Link href="/sign-in" className={styles.link}>
          Sign in
        </Link>
        <Link href="/start" className={styles.cta}>
          Begin enrollment
        </Link>
      </nav>
    </header>
  );
}
