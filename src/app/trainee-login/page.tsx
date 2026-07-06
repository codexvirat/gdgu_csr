import { TraineeLoginForm } from "./login-form";

export default function TraineeLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Trainee Login</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to take your assessment or give feedback</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <TraineeLoginForm />
        </div>
      </div>
    </div>
  );
}
