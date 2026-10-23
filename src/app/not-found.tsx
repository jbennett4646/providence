import Link from "next/link";
import { Screen } from "@/components/Screen";
import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default function NotFound() {
  return (
    <Screen label="Not found">
      <ScreenPlaceholder kicker="Not found" title="This page is not in the catalogue.">
        <Link href="/">Return home</Link>
      </ScreenPlaceholder>
    </Screen>
  );
}
