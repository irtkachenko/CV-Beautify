import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, supabaseServerClient } from "@lib/supabase-server";

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
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return { response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const {
    data: { user },
    error,
  } = await supabaseServerClient.auth.getUser(token);

  if (error || !user) {
    return { response: NextResponse.json({ message: "Invalid token" }, { status: 401 }) };
  }

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    supabase: createSupabaseServerClient(token),
  };
}
