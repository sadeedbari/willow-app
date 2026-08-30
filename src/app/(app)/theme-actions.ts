"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function toggleTheme(formData: FormData) {
  const current = formData.get("current") as string;
  const next = current === "dark" ? "light" : "dark";
  (await cookies()).set("theme", next, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  redirect((formData.get("returnTo") as string) || "/dashboard");
}
