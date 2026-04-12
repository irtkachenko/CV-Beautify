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
  // Try Authorization header first
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.replace("Bearer ", "");
  
  // Extract project_ref from Supabase URL to construct cookie name
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    console.error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable");
    return { response: NextResponse.json({ message: "Server configuration error" }, { status: 500 }) };
  }
  
  const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  console.log("Debug - Supabase URL:", supabaseUrl);
  console.log("Debug - Project Ref:", projectRef);
  console.log("Debug - Available cookies:", request.cookies.getAll().map(c => c.name));
  
  if (!projectRef) {
    console.error("Could not extract project ref from Supabase URL:", supabaseUrl);
    return { response: NextResponse.json({ message: "Invalid Supabase URL configuration" }, { status: 500 }) };
  }
  
  // If no header, try Supabase SSR cookie
  if (!token && projectRef) {
    const cookieName = `sb-${projectRef}-auth-token`;
    console.log("Debug - Looking for cookie:", cookieName);
    token = request.cookies.get(cookieName)?.value;
    console.log("Debug - Cookie value found:", !!token);
  }
  
  // If still no token, try refresh token
  if (!token && projectRef) {
    const refreshToken = request.cookies.get(`sb-${projectRef}-auth-token`)?.value;
    if (refreshToken) {
      try {
        const { data } = await getSupabaseServerClient().auth.refreshSession({ refresh_token: refreshToken });
        token = data.session?.access_token;
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
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
