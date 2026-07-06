import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">CSR & Corporate Training ERP</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm from={from && from.startsWith("/") ? from : "/dashboard"} />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Demo: admin@gdgucsr.local / Passw0rd!
        </p>
      </div>
    </div>
  );
}
