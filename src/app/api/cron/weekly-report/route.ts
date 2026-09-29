import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyTelegram, tg } from "@/lib/telegram";

/** Monday 10am MYT: sends the newest unsent improvement report (written by the weekly Claude routine) to Telegram. */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data: report } = await supabase
    .from("site_reports")
    .select("id, body")
    .is("sent_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) {
    await notifyTelegram("🛠 <b>Weekly website report</b>\nNo report this week: the Claude routine didn't write one. Check it at claude.ai/code/routines.");
    return NextResponse.json({ sent: false });
  }
  // The routine writes plain text; escape it so Telegram's HTML mode shows it as-is.
  await notifyTelegram(`🛠 <b>Weekly website report</b>\n\n${tg(report.body)}`);
  await supabase.from("site_reports").update({ sent_at: new Date().toISOString() }).eq("id", report.id);
  return NextResponse.json({ sent: true });
}
