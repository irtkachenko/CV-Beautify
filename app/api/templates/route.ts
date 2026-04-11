import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "@lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseServerClient;
    const { data: templates, error } = await supabase
      .from("cv_templates")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Templates fetch error:", error);
      return NextResponse.json({ message: "Failed to fetch templates" }, { status: 500 });
    }

    return NextResponse.json(templates || []);
  } catch (error) {
    console.error("Templates route error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
