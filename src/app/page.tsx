import { MarketingHeader } from "@/components/MarketingHeader";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <main data-screen-label="Landing">
      <div className={styles.hero}>
        <div className={styles.wrap}>
          <MarketingHeader />
          <div className={styles.body}>
            <div className={styles.kicker}>Classical · Christian · Kindergarten through Grade Twelve</div>
            <h1 className={styles.headline}>Providence Home Academy</h1>
            <p className={styles.lede}>
              A classical, parent-led homeschool program. Families teach from daily scripts, on screen or on paper,
              and the platform keeps their home-study records.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
