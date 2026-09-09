import { BrandMark } from "@/components/brand-mark";

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <BrandMark size={56} />
        </div>
        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-[20px] font-bold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="mt-2 text-[13.5px] text-text-2">
            We sent a confirmation link to finish creating your account. Once you click it, come
            back and log in to set up your practice.
          </p>
        </div>
      </div>
    </div>
  );
}
