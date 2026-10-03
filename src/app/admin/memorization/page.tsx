import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/features/auth/permissions";

export default async function LegacyMemorizationRequestsPage() {
    await requirePlatformAdmin();
    redirect("/admin/users");
}
