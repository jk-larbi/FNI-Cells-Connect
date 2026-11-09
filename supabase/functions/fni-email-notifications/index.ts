import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!resendKey || !from) return json({ error: "Email provider is not configured. Set RESEND_API_KEY and EMAIL_FROM." }, 503);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Invalid session" }, 401);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile } = await db.from("profiles").select("id,role,is_active,full_name").eq("supabase_user_id", user.id).maybeSingle();
  if (!profile?.is_active) return json({ error: "Active account required" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = body?.action;
  let subject = "";
  let heading = "";
  let details = "";
  let recipients: string[] = [];

  if (action === "report_submitted") {
    const table = body.reportType === "meeting" ? "cell_meeting_reports" : body.reportType === "evangelism" ? "evangelism_reports" : null;
    if (!table || !body.reportId) return json({ error: "Invalid report reference" }, 400);
    const { data: report, error } = await db.from(table).select("id,tutor_uid,tutor_name,cell_name,submitted_at,status").eq("id", body.reportId).maybeSingle();
    if (error || !report || report.tutor_uid !== user.id && report.tutor_uid !== profile.id) return json({ error: "Report not found or not owned by this account" }, 403);
    const { data: destination } = await db.from("admin_notification_settings").select("notification_email").eq("id", 1).maybeSingle();
    if (!destination?.notification_email) return json({ error: "Administrator notification email has not been configured yet" }, 409);
    recipients = [destination.notification_email];
    subject = body.reportType === "meeting" ? "New cell meeting report submitted" : "New evangelism report submitted";
    heading = "A new report needs your attention";
    details = `<p><b>Cell:</b> ${escapeHtml(report.cell_name)}</p><p><b>Tutor:</b> ${escapeHtml(report.tutor_name)}</p><p><b>Submitted:</b> ${escapeHtml(report.submitted_at)}</p><p><b>Report status:</b> ${escapeHtml(report.status)}</p>`;
  } else if (action === "material_published" || action === "announcement") {
    if (!["admin", "super_admin", "national_admin"].includes(profile.role)) return json({ error: "Administrator access required" }, 403);
    if (action === "material_published") {
      if (!body.materialId) return json({ error: "Material reference required" }, 400);
      const { data: material, error } = await db.from("teaching_materials").select("id,title,description,week_label,document_url,uploaded_by,status").eq("id", body.materialId).maybeSingle();
      if (error || !material || material.status !== "published" || material.uploaded_by !== profile.id && material.uploaded_by !== user.id) return json({ error: "Published material not found or not owned by this administrator" }, 403);
      subject = `New FNI teaching material: ${material.title}`;
      heading = "New teaching material is available";
      details = `<p><b>${escapeHtml(material.title)}</b></p><p>${escapeHtml(material.week_label)}</p><p>${escapeHtml(material.description)}</p>${material.document_url ? `<p><a href="${escapeHtml(material.document_url)}">Open teaching material</a></p>` : ""}`;
    } else {
      if (!body.messageId) return json({ error: "Announcement reference required" }, 400);
      const { data: announcement, error } = await db.from("community_messages").select("id,sender_uid,content,category").eq("id", body.messageId).maybeSingle();
      if (error || !announcement || announcement.sender_uid !== user.id && announcement.sender_uid !== profile.id || announcement.category !== "announcement") return json({ error: "Announcement not found or not owned by this administrator" }, 403);
      subject = "FNI Cells Connect: New announcement";
      heading = "A new announcement from FNI leadership";
      details = `<p>${escapeHtml(announcement.content).replace(/\n/g, "<br>")}</p>`;
    }
    const { data: tutors, error: tutorError } = await db.from("profiles").select("email").eq("is_active", true).in("role", ["tutor", "cell_leader", "regional_leader"]).not("email", "is", null);
    if (tutorError) return json({ error: "Could not load tutor email recipients" }, 500);
    recipients = [...new Set((tutors || []).map((x: any) => String(x.email || "").trim()).filter((x: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))];
  } else {
    return json({ error: "Unsupported notification action" }, 400);
  }

  if (!recipients.length) return json({ sent: 0, message: "No configured recipients" });
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#142B4A;line-height:1.6"><div style="max-width:620px;margin:auto;padding:28px"><h2>${escapeHtml(heading)}</h2>${details}<hr><p style="color:#667085;font-size:12px">Forerunners Network International · FNI Cells Connect</p></div></body></html>`;
  let sent = 0;
  const failures: string[] = [];
  for (let i = 0; i < recipients.length; i += 20) {
    const batch = recipients.slice(i, i + 20);
    const results = await Promise.all(batch.map(async (to) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html }),
      });
      if (!response.ok) {
        const message = await response.text();
        failures.push(`${to}: ${message.slice(0, 180)}`);
      } else sent += 1;
    }));
  }
  return json({ sent, failed: failures.length, failures: failures.slice(0, 5) }, failures.length ? 207 : 200);
});
