import { requestPasswordReset } from "./actions";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            We&apos;ll email you a link to set a new one.
          </p>
        </div>

        <form action={requestPasswordReset} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Send reset link
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          <Link href="/login" className="font-medium text-neutral-900 underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
