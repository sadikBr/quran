import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/features/auth/auth";
import getPracticeAssignment from "@/features/practice/server/get-practice-assignment";

export default async function PracticeReaderPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");

    const assignment = await getPracticeAssignment(session.user.id);
    if (!assignment) redirect("/practice");
    redirect(`/practice/${assignment.id}/read`);
}
