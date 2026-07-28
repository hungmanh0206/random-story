import { supabaseServerFetch } from "../../../../lib/supabase";

export async function GET() {
  try {
    const response = await supabaseServerFetch("/rest/v1/");
    return Response.json({ connected: response.ok }, { status: response.ok ? 200 : 503 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Không thể kết nối.";
    return Response.json({ connected: false, reason }, { status: 503 });
  }
}
