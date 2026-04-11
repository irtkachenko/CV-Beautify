"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (data.session) {
          router.replace("/gallery");
          return;
        }

        router.replace("/");
      } catch {
        if (!isMounted) return;
        router.replace("/");
      }
    }

    void handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
