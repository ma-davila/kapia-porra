import { redirect } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/session";
import logo from "@/public/logo.png";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-4 flex justify-center">
        <Image src={logo} alt="Kapia World Cup Porra" width={180} height={180} priority className="h-44 w-44" />
      </div>
      <div className="card p-6">
        <p className="mb-6 text-center text-sm text-slate-500">
          Predict the 2026 World Cup. Earn points. Win bragging rights.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
