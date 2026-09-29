import { permanentRedirect } from "next/navigation";

export default function LegacyWeeklyPage() {
    permanentRedirect("/assignments");
}
