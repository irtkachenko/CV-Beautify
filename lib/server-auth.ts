import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getSupabaseServerClient } from "@lib/supabase-server";

type AuthContext =
  | {
      userId: string;
      userEmail: string | null;
      supabase: ReturnType<typeof createSupabaseServerClient>;
    }
  | {
      response: NextResponse;
    };

export async function authenticateRequest(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable");
    return { response: NextResponse.json({ message: "Server configuration error" }, { status: 500 }) };
  }

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    console.error("Could not extract project ref from Supabase URL:", supabaseUrl);
    return { response: NextResponse.json({ message: "Invalid Supabase URL configuration" }, { status: 500 }) };
  }

  if (!token) {
    const cookieName = `sb-${projectRef}-auth-token`;
    const rawCookie = request.cookies.get(cookieName)?.value;

    if (rawCookie) {
      const decoded = decodeURIComponent(rawCookie);
      try {
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed) && typeof parsed[0] === "string") {
          token = parsed[0];
        } else if (typeof parsed === "object" && parsed !== null && typeof (parsed as { access_token?: unknown }).access_token === "string") {
          token = (parsed as { access_token: string }).access_token;
        }
      } catch {
        if (decoded.split(".").length === 3) {
          token = decoded;
        }
      }
    }
  }

  if (!token) {
    return { response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const {
    data: { user },
    error,
  } = await getSupabaseServerClient().auth.getUser(token);

  if (error || !user) {
    return { response: NextResponse.json({ message: "Invalid token" }, { status: 401 }) };
  }

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    supabase: createSupabaseServerClient(token),
  };
}
