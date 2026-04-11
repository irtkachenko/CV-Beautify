import { NextRequest, NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabase-server";
import DOMPurify from "dompurify";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseServerClient;
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const cvId = parseInt(params.id, 10);
    if (isNaN(cvId)) {
      return NextResponse.json({ message: "Invalid CV id" }, { status: 400 });
    }

    const { data: cv, error } = await supabase
      .from("generated_cvs")
      .select("html_content, user_id")
      .eq("id", cvId)
      .single();

    if (error || !cv) {
      return NextResponse.json({ message: "CV not found" }, { status: 404 });
    }

    if (cv.user_id !== user.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (!cv.html_content) {
      return NextResponse.json({ message: "Generated CV HTML not found" }, { status: 404 });
    }

    // Sanitize HTML
    const safeHtml = DOMPurify.sanitize(cv.html_content, {
      ALLOWED_TAGS: ["div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "strong", "em", "u", "br", "hr", "img", "table", "thead", "tbody", "tr", "td", "th"],
      ALLOWED_ATTR: ["href", "src", "alt", "class", "style", "id"],
    });

    return new NextResponse(safeHtml, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("CV render error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
