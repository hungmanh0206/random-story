import { NextResponse } from "next/server";
import { adminFirestore } from "../../../../lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const type = body.type;
    const sessionId = String(body.sessionId ?? "").slice(0, 80);
    if (!sessionId || !["view", "presence"].includes(String(type))) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    const db = adminFirestore();
    const now = new Date();

    if (type === "presence") {
      await db.collection("analytics_presence").doc(sessionId).set({ userId: body.userId ? String(body.userId).slice(0, 128) : null, lastSeen: now.toISOString() }, { merge: true });
    } else {
      const postId = String(body.postId ?? "").slice(0, 128);
      if (!postId) return NextResponse.json({ error: "Missing post" }, { status: 400 });
      const eventId = `${sessionId}_${postId}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 240);
      await db.collection("analytics_views").doc(eventId).set({ postId, title: String(body.title ?? "").slice(0, 300), category: String(body.category ?? "").slice(0, 100), viewedAt: now.toISOString(), date: now.toISOString().slice(0, 10), hour: now.getHours() }, { merge: false });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to record analytics" }, { status: 500 });
  }
}
