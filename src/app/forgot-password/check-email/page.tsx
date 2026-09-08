export default function ForgotPasswordCheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          If an account exists for that email, we&apos;ve sent a link to reset your password.
        </p>
      </div>
    </div>
  );
}
