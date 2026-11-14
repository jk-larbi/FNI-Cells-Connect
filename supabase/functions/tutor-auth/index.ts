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
    const password = String(body.password || "");
    if (password.length < 6 || password.length > 128) {
      return json({ error: "Password must be between 6 and 128 characters." }, 400);
    }

    if (action === "register") {
      const fullName = String(body.fullName || "").trim();
      const username = normalizeUsername(String(body.username || ""));
      const cellName = String(body.cellName || "").trim();
      if (!fullName || fullName.length > 120 || !cellName || cellName.length > 120 || !/^[a-z0-9_]{3,20}$/.test(username)) {
        return json({ error: "Enter your full name, cell name, and a username of 3–20 letters, numbers or underscores." }, 400);
      }

      const { data: duplicate, error: duplicateError } = await admin
        .from("profiles").select("id").eq("username", username).maybeSingle();
      if (duplicateError) return json({ error: "Could not validate username. Please try again." }, 500);
      if (duplicate) return json({ error: "That username is already taken. Please choose another." }, 409);

      const email = internalEmail(username);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { full_name: fullName, cell_name: cellName, username, role: "tutor" },
      });
      if (createError || !created.user) {
        const message = createError?.message || "Could not create the tutor account.";
        if (/already|registered|exists|duplicate/i.test(message)) {
          return json({ error: "That username is already taken. Please choose another." }, 409);
        }
        console.error("Tutor account creation failed:", createError);
        return json({ error: "Could not create the account. Please try again." }, 400);
      }

      const userId = created.user.id;
      const { error: profileError } = await admin.from("profiles").upsert({
        id: userId,
        supabase_user_id: userId,
        email: "",
        username,
        full_name: fullName,
        cell_name: cellName,
        role: "tutor",
        is_active: true,
        is_onboarded: true,
        must_change_password: false,
        auth_provider: "credentials",
      }, { onConflict: "id" });

      if (profileError) {
        await admin.auth.admin.deleteUser(userId);
        if (profileError.code === "23505") return json({ error: "That username is already taken. Please choose another." }, 409);
        console.error("Tutor profile upsert failed:", profileError);
        return json({ error: "Your profile could not be created. Please try again." }, 500);
      }

      const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email, password });
      if (signInError || !signedIn.session || !signedIn.user) {
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
        console.error("New tutor automatic sign-in failed:", signInError);
        return json({ error: "Account creation succeeded, but automatic sign-in failed. Please try again." }, 503);
      }
      return json({ user: signedIn.user, session: signedIn.session });
    }

    if (action === "admin-login") {
      const identifier = normalizeUsername(String(body.username || body.identifier || ""));
      if (!identifier || identifier.length > 254) {
        return json({ error: "Enter your administrator username and password." }, 400);
      }

      let lookup = admin.from("profiles").select("id,supabase_user_id,email,is_active,role,username");
      lookup = identifier.includes("@")
        ? lookup.eq("email", identifier)
        : lookup.eq("username", identifier);
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
      const username = normalizeUsername(String(body.username || body.identifier || ""));
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return json({ error: "Enter a valid username and password." }, 400);
      }

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id,email,phone_number,is_active,role")
        .eq("username", username)
        .maybeSingle();
      if (profileError) return json({ error: "Could not verify this account. Please try again." }, 500);
      if (!profile || profile.is_active === false || profile.role !== "tutor") {
        return json({ error: "Invalid username or password." }, 401);
      }

      const savedEmail = String(profile.email || "").trim().toLowerCase();
      let signedIn: any;
      if (savedEmail && !savedEmail.endsWith("@users.fni.invalid")) {
        const result = await auth.auth.signInWithPassword({ email: savedEmail, password });
        if (result.error || !result.data.session || !result.data.user) {
          return json({ error: "Invalid username or password." }, 401);
        }
        signedIn = result.data;
      } else if (profile.phone_number) {
        const result = await auth.auth.signInWithPassword({ phone: String(profile.phone_number), password });
        if (result.error || !result.data.session || !result.data.user) {
          return json({ error: "Invalid username or password." }, 401);
        }
        signedIn = result.data;
      } else {
        const result = await auth.auth.signInWithPassword({ email: internalEmail(username), password });
        if (result.error || !result.data.session || !result.data.user) {
          return json({ error: "Invalid username or password." }, 401);
        }
        signedIn = result.data;
      }

      if (signedIn.user.id !== profile.id) {
        await auth.auth.signOut();
        return json({ error: "This account could not be verified." }, 401);
      }
      return json({ user: signedIn.user, session: signedIn.session });
    }

    return json({ error: "Unsupported authentication action." }, 400);
  } catch (error) {
    console.error("Tutor authentication error:", error);
    return json({ error: "Authentication could not be completed. Please try again." }, 500);
  }
});
