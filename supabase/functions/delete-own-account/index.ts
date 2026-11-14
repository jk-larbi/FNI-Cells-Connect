import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return json({ error: "Account service is not configured." }, 500);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Please sign in before deleting your account." }, 401);
  const caller = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const body = await req.json();
    if (body?.confirmation !== "DELETE") return json({ error: "Deletion confirmation is required." }, 400);
    const { data: authData, error: authError } = await caller.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return json({ error: "Your session could not be verified. Sign in again." }, 401);
    const { data: profile, error: profileError } = await admin.from("profiles").select("id, role, avatar_url").eq("id", user.id).maybeSingle();
    if (profileError) { console.error("Profile lookup failed:", profileError); return json({ error: "Your account could not be verified." }, 500); }
    if (!profile) return json({ error: "No FNI profile was found for this account." }, 404);
    if (profile.role !== "tutor") return json({ error: "Administrator accounts cannot be deleted here. Contact a system administrator." }, 403);
    const avatarUrl = String(profile.avatar_url || ""), marker = "/storage/v1/object/public/", markerIndex = avatarUrl.indexOf(marker);
    if (markerIndex >= 0) {
      const objectPath = avatarUrl.slice(markerIndex + marker.length), slash = objectPath.indexOf("/");
      if (slash > 0) {
        const { error } = await admin.storage.from(objectPath.slice(0, slash)).remove([decodeURIComponent(objectPath.slice(slash + 1))]);
        if (error) console.warn("Avatar cleanup warning:", error.message);
      }
    }
    // Archive the old cell under a new normalized name so the same cell name can be
    // registered again during testing, while preserving the historical cell record.
    const { data: ownedCell, error: cellLookupError } = await admin.from("cells")
      .select("id, name").eq("tutor_uid", user.id).maybeSingle();
    if (cellLookupError) return json({ error: "Your cell association could not be checked. Please try again." }, 500);
    if (ownedCell) {
      const archivedName = `Archived - ${String(ownedCell.name || "Cell")}`;
      const normalizedArchivedName = archivedName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const { error: archiveError } = await admin.from("cells").update({
        name: archivedName, normalized_name: normalizedArchivedName, is_active: false, is_archived: true,
        tutor_uid: null, leader_id: null, leader_name: "Unassigned",
      }).eq("id", ownedCell.id);
      if (archiveError) return json({ error: "Your cell could not be safely archived. Please contact FNI support." }, 500);
    }

    const cleanup = await Promise.all([
      admin.from("device_tokens").delete().eq("user_id", user.id),
      admin.from("group_chat_members").delete().eq("user_id", user.id),
      admin.from("location_share_sessions").update({ trashed_by: null }).eq("trashed_by", user.id),
      admin.from("audit_logs").update({ user_id: null, user_name: "Deleted account" }).eq("user_id", user.id),
    ]);
    const failed = cleanup.find(item => item.error)?.error;
    if (failed) { console.error("Cleanup failed:", failed); return json({ error: "Account data could not be prepared for deletion. Nothing has been deleted; contact FNI support." }, 500); }
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id, false);
    if (authDeleteError) { console.error("Auth deletion failed:", authDeleteError); return json({ error: "Your account could not be deleted. Contact FNI support." }, 500); }
    const { error: profileDeleteError } = await admin.from("profiles").delete().eq("id", user.id);
    if (profileDeleteError) { console.error("Profile cleanup failed:", profileDeleteError); return json({ error: "Your login was deleted, but profile cleanup needs administrator attention." }, 500); }
    return json({ success: true, message: "Your tutor account and profile have been deleted. You may register again using the same name and username." });
  } catch (error) { console.error("Delete account failed:", error); return json({ error: "Account deletion could not be completed. Please try again." }, 500); }
});