import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase, userId, userEmail } = auth;

    // Fetch user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, first_name, last_name, profile_image_url, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (profileError) {
      // If profile doesn't exist, create it
      if (profileError.code === "PGRST116") {
        if (!userEmail) {
          return NextResponse.json({ message: "User email is missing" }, { status: 500 });
        }

        const { data: newProfile, error: insertError } = await supabase
          .from("users")
          .insert({
            id: userId,
            email: userEmail,
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
