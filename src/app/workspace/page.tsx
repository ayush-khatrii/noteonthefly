import { redirect } from "next/navigation";
import { getWorkspaceIdFromCookie } from "@/lib/session";
import { WorkspaceEditor } from "@/components/workspace/workspace-editor";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const workspaceId = await getWorkspaceIdFromCookie();

  if (!workspaceId) {
    redirect("/");
  }

  return (
    <div className="h-dvh w-full overflow-hidden bg-background">
      <WorkspaceEditor />
    </div>
  );
}
