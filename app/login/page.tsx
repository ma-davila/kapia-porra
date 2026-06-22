import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6">
        <h1 className="mb-1 text-center text-xl font-bold text-pitch">
          Kapia&apos;s World Cup Porra
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Predict the 2026 World Cup. Earn points. Win bragging rights.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
