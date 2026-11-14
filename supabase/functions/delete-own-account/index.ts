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
    const { data: callerProfile, error: callerProfileError } = await admin.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
    if (callerProfileError) { console.error("Caller profile lookup failed:", callerProfileError); return json({ error: "Your account could not be verified." }, 500); }
    const callerIsAdmin = ["admin", "super_admin", "national_admin"].includes(String(callerProfile?.role || "").toLowerCase())
      || user.email?.toLowerCase() === "fniadmin@gmail.com";
    const targetUserId = typeof body?.targetUserId === "string" && body.targetUserId.trim() ? body.targetUserId.trim() : user.id;
    if (targetUserId !== user.id && !callerIsAdmin) return json({ error: "Only an administrator can delete another account." }, 403);
    const { data: profile, error: profileError } = await admin.from("profiles").select("id, role, avatar_url").eq("id", targetUserId).maybeSingle();
    if (profileError) { console.error("Target profile lookup failed:", profileError); return json({ error: "The selected account could not be verified." }, 500); }
    if (!profile) return json({ error: "No FNI profile was found for this account." }, 404);
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
      .select("id, name").eq("tutor_uid", targetUserId).maybeSingle();
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
      admin.from("device_tokens").delete().eq("user_id", targetUserId),
      admin.from("group_chat_members").delete().eq("user_id", targetUserId),
      admin.from("location_share_sessions").update({ trashed_by: null }).eq("trashed_by", targetUserId),
      admin.from("audit_logs").update({ user_id: null, user_name: "Deleted account" }).eq("user_id", targetUserId),
    ]);
    const failed = cleanup.find(item => item.error)?.error;
    if (failed) { console.error("Cleanup failed:", failed); return json({ error: "Account data could not be prepared for deletion. Nothing has been deleted; contact FNI support." }, 500); }
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(targetUserId, false);
    if (authDeleteError) { console.error("Auth deletion failed:", authDeleteError); return json({ error: "Your account could not be deleted. Contact FNI support." }, 500); }
    const { error: profileDeleteError } = await admin.from("profiles").delete().eq("id", targetUserId);
    if (profileDeleteError) { console.error("Profile cleanup failed:", profileDeleteError); return json({ error: "Your login was deleted, but profile cleanup needs administrator attention." }, 500); }
    return json({ success: true, message: targetUserId === user.id ? "Your account and profile have been deleted. You may register again with the same credentials." : "The selected account and profile have been deleted." });
  } catch (error) { console.error("Delete account failed:", error); return json({ error: "Account deletion could not be completed. Please try again." }, 500); }
});