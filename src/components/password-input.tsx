"use client";

import { useState, type InputHTMLAttributes } from "react";

// Drop-in replacement for <input type="password"> that adds a show/hide
// toggle. Takes the exact same props (name, required, pattern, className,
// etc.) -- callers don't pass `type` themselves, this owns that.
export function PasswordInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-text-3 transition hover:text-foreground"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.5 0-9.5-4-11-8a18.4 18.4 0 0 1 3.66-5.3M9.9 4.24A10.6 10.6 0 0 1 12 4c5.5 0 9.5 4 11 8a18.4 18.4 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <path d="M2 2l20 20" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
