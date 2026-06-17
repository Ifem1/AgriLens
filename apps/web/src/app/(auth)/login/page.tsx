"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleLogin(formData: FormData) {
    setLoading(true);
    try {
      const result = await loginAction(formData);
      if (result?.error) {
        toast.error(result.error);
        setLoading(false);
      }
    } catch {
      // redirect() throws a NEXT_REDIRECT error — this is expected
      // The page will navigate to /dashboard
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--al-text)" }}>Welcome back</h1>
      <p className="text-sm mb-8" style={{ color: "var(--al-sec)" }}>Sign in to your AgriLens account</p>

      <form action={handleLogin} className="space-y-4">
        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          required
        />
        <Input
          id="password"
          name="password"
          label="Password"
          type="password"
          placeholder="Your password"
          required
        />
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: "var(--al-sec)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/register" className="hover:underline" style={{ color: "#8686AC" }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
