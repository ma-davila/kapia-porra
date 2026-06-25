import { requireUser } from "@/lib/guard";
import { getUserById } from "@/lib/auth";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireUser();
  const user = await getUserById(session.uid);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card p-4">
        <h1 className="text-lg font-bold text-pitch">Settings</h1>
        <p className="text-sm text-slate-500">
          Add your Slack member ID to get @-mentioned in the daily results digest.
        </p>
      </div>
      <div className="card p-6">
        <SettingsForm current={user?.slackId ?? null} />
      </div>
    </div>
  );
}
