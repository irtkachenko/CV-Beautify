import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "@lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseServerClient;
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    // Fetch user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, profile_image_url, created_at, updated_at")
      .eq("id", user.id)
      .single();

    if (profileError) {
      // If profile doesn't exist, create it
      if (profileError.code === "PGRST116") {
        const { data: newProfile, error: insertError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            email: user.email,
          })
          .select("id, email, first_name, last_name, profile_image_url, created_at, updated_at")
          .single();

        if (insertError) {
          return NextResponse.json({ message: "Failed to create user profile" }, { status: 500 });
        }

        return NextResponse.json({
          id: newProfile.id,
          email: newProfile.email,
          firstName: newProfile.first_name,
          lastName: newProfile.last_name,
          profileImageUrl: newProfile.profile_image_url,
          createdAt: newProfile.created_at,
          updatedAt: newProfile.updated_at,
        });
      }

      return NextResponse.json({ message: "Failed to fetch user profile" }, { status: 500 });
    }

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      profileImageUrl: profile.profile_image_url,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (error) {
    console.error("Auth user error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
