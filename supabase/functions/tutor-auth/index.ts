import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const normalizeUsername = (value: string) => value.trim().toLowerCase();
const internalEmail = (username: string) => `${username}@users.fni.invalid`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return json({ error: "Authentication service is not configured." }, 500);

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const body = await req.json();
    const action = String(body.action || "");

    // This directory deliberately returns only public cell labels and tutor display names.
    if (action === "directory") {
      const cellId = String(body.cellId || "").trim();
      if (!cellId) {
        const { data, error } = await admin.from("cells")
          .select("id,name").eq("is_active", true).eq("is_archived", false).order("name");
        if (error) throw error;
        return json({ cells: data || [] });
      }
      const { data: cell, error: cellError } = await admin.from("cells")
        .select("id").eq("id", cellId).eq("is_active", true).eq("is_archived", false).maybeSingle();
      if (cellError) throw cellError;
      if (!cell) return json({ tutors: [] });
      const { data, error } = await admin.from("profiles")
        .select("id,full_name").eq("cell_id", cellId).eq("role", "tutor")
        .eq("is_active", true).order("full_name");
      if (error) throw error;
      return json({ tutors: data || [] });
    }

    const password = String(body.password || "");
    if (password.length < 6 || password.length > 128) {
      return json({ error: "Password must be between 6 and 128 characters." }, 400);
    }

    if (action === "register") {
      const fullName = String(body.fullName || "").trim().replace(/\\s+/g, " ");
      const cellId = String(body.cellId || "").trim();
      if (!fullName || fullName.length > 120 || !cellId) {
        return json({ error: "Select an official cell and enter your full name." }, 400);
      }

      const { data: cell, error: cellError } = await admin.from("cells")
        .select("id,name").eq("id", cellId).eq("is_active", true).eq("is_archived", false).maybeSingle();
      if (cellError) throw cellError;
      if (!cell) return json({ error: "That cell is not available for registration. Select an active cell from the list." }, 404);

      const { data: existing, error: duplicateError } = await admin.from("profiles")
        .select("id").eq("cell_id", cellId).eq("role", "tutor").eq("is_active", true)
        .ilike("full_name", fullName).limit(1);
      if (duplicateError) throw duplicateError;
      if (existing?.length) return json({ error: "A tutor with that name is already registered under this cell. Please contact the administrator." }, 409);

      // Generate a private, non-user-facing Auth identifier. Tutors sign in with cell + display name + password.
      const username = `t${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
      const email = internalEmail(username);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, email_confirm: true, password,
        user_metadata: { full_name: fullName, cell_id: cellId, cell_name: cell.name, username, role: "tutor" },
      });
      if (createError || !created.user) {
        console.error("Tutor account creation failed:", createError);
        return json({ error: "Could not create the account. Please try again." }, 400);
      }

      const userId = created.user.id;
      const { error: profileError } = await admin.from("profiles").upsert({
        id: userId, supabase_user_id: userId, email: "", username,
        full_name: fullName, cell_id: cellId, cell_name: cell.name,
        role: "tutor", is_active: true, is_onboarded: true,
        must_change_password: false, auth_provider: "credentials",
      }, { onConflict: "id" });

      if (profileError) {
        await admin.auth.admin.deleteUser(userId);
        console.error("Tutor profile upsert failed:", profileError);
        return json({ error: "Your profile could not be created. Please try again." }, 500);
      }

      const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email, password });
      if (signInError || !signedIn.session || !signedIn.user) {
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
        console.error("New tutor automatic sign-in failed:", signInError);
        return json({ error: "Account creation succeeded, but automatic sign-in failed. Please try logging in." }, 503);
      }
      return json({ user: signedIn.user, session: signedIn.session, cell: { id: cell.id, name: cell.name } });
    }

    if (action === "admin-login") {
      const identifier = normalizeUsername(String(body.username || body.identifier || ""));
      if (!identifier || identifier.length > 254) {
        return json({ error: "Enter your administrator username and password." }, 400);
      }

      let lookup = admin.from("profiles").select("id,supabase_user_id,email,is_active,role,username");
      lookup = identifier.includes("@") ? lookup.eq("email", identifier) : lookup.eq("username", identifier);
      const { data: profile, error: profileError } = await lookup.maybeSingle();
      if (profileError) return json({ error: "Could not verify this administrator account. Please try again." }, 500);
      if (!profile || profile.is_active === false || !["admin", "super_admin", "national_admin"].includes(profile.role)) {
        return json({ error: "Invalid administrator username or password." }, 401);
      }

      const email = String(profile.email || "").trim().toLowerCase();
      if (!email) return json({ error: "This administrator account has no sign-in email configured. Contact FNI support." }, 403);
      const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email, password });
      if (signInError || !signedIn.session || !signedIn.user || signedIn.user.id !== String(profile.supabase_user_id || profile.id)) {
        return json({ error: "Invalid administrator username or password." }, 401);
      }
      return json({ user: signedIn.user, session: signedIn.session });
    }

    if (action === "login") {
      const cellId = String(body.cellId || "").trim();
      const fullName = String(body.fullName || "").trim().replace(/\\s+/g, " ");
      if (!cellId || !fullName || fullName.length > 120) {
        return json({ error: "Select your cell, your registered name, and enter your password." }, 400);
      }
      const { data: matches, error: profileError } = await admin.from("profiles")
        .select("id,supabase_user_id,username,is_active,role,cell_id,full_name")
        .eq("cell_id", cellId).eq("role", "tutor").eq("is_active", true).ilike("full_name", fullName);
      if (profileError) throw profileError;
      if (!matches?.length) return json({ error: "That name is not registered under the selected cell." }, 401);
      if (matches.length > 1) return json({ error: "More than one tutor has that name in this cell. Contact the administrator to distinguish the accounts." }, 409);

      const profile = matches[0];
      const username = String(profile.username || "");
      if (!username) return json({ error: "This tutor account needs to be updated before it can sign in. Contact the administrator." }, 403);
      const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email: internalEmail(username), password });
      if (signInError || !signedIn.session || !signedIn.user || signedIn.user.id !== String(profile.supabase_user_id || profile.id)) {
        return json({ error: "Incorrect password. Please try again." }, 401);
      }
      return json({ user: signedIn.user, session: signedIn.session });
    }

    return json({ error: "Unsupported authentication action." }, 400);
  } catch (error) {
    console.error("Tutor authentication error:", error);
    return json({ error: "Authentication could not be completed. Please try again." }, 500);
  }
});
