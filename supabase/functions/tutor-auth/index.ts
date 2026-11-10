import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[ ().-]/g, "").replaceAll("\t", "");
  if (/^0[0-9]{9}$/.test(compact)) return "+233" + compact.slice(1);
  if (/^233[0-9]{9}$/.test(compact)) return "+" + compact;
  if (/^\+[1-9][0-9]{7,14}$/.test(compact)) return compact;
  return null;
}

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
    if (password.length < 6 || password.length > 128) return json({ error: "Password must be between 6 and 128 characters." }, 400);

    if (action === "register") {
      const fullName = String(body.fullName || "").trim();
      const username = String(body.username || "").trim().toLowerCase();
      const phone = normalizePhone(String(body.phoneNumber || ""));
      const cellName = String(body.cellName || "").trim();
      if (!fullName || !cellName || !phone || !/^[a-z0-9_]{3,24}$/.test(username)) {
        return json({ error: "Enter your name, cell name, valid phone number, and a username of 3–24 letters, numbers or underscores." }, 400);
      }
      const { data: duplicate, error: duplicateError } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
      if (duplicateError) return json({ error: "Could not validate username. Please try again." }, 500);
      if (duplicate) return json({ error: "That username is already taken. Please choose another." }, 409);

      // This avoids SMS delivery; the phone number is NOT verified as belonging to the registrant.
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        phone, password, phone_confirm: true,
        user_metadata: { full_name: fullName, cell_name: cellName, username, role: "tutor" },
      });
      if (createError || !created.user) {
        const message = createError?.message || "Could not create the tutor account.";
        if (/phone.*(already|registered|exists)/i.test(message)) return json({ error: "That phone number is already linked to an account." }, 409);
        return json({ error: message }, 400);
      }

      const userId = created.user.id;
      const { error: profileError } = await admin.from("profiles").insert({
        id: userId, supabase_user_id: userId, email: "", username,
        full_name: fullName, phone_number: phone, cell_name: cellName,
        role: "tutor", is_active: true, is_onboarded: true,
        must_change_password: false, auth_provider: "credentials",
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(userId);
        if (profileError.code === "23505") return json({ error: "That username is already taken. Please choose another." }, 409);
        return json({ error: "Your profile could not be created. Please try again." }, 500);
      }

      const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ phone, password });
      if (signInError || !signedIn.session) {
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
        return json({ error: "Account creation succeeded, but automatic sign-in failed. Please contact FNI support." }, 503);
      }
      return json({ user: signedIn.user, session: signedIn.session });
    }

    if (action === "login") {
      const identifier = String(body.username || body.identifier || "").trim().toLowerCase();
      if (!identifier || identifier.length > 254) return json({ error: "Enter your username and password." }, 400);

      // Backward compatibility: existing tutor accounts can still use their old email
      // or phone login. New registrations use usernames and never send confirmation email.
      let signedIn: any;
      if (identifier.includes("@")) {
        const result = await auth.auth.signInWithPassword({ email: identifier, password });
        if (result.error || !result.data.session || !result.data.user) {
          return json({ error: "Invalid username/email or password." }, 401);
        }
        signedIn = result.data;
      } else {
        let profile: any = null;
        if (/^[a-z0-9_]{3,24}$/.test(identifier)) {
          const lookup = await admin.from("profiles")
            .select("phone_number,is_active,role").eq("username", identifier).maybeSingle();
          if (lookup.error) return json({ error: "Could not verify this account. Please try again." }, 500);
          profile = lookup.data;
        }
        if (!profile) {
          const phone = normalizePhone(identifier);
          if (phone) {
            const lookup = await admin.from("profiles")
              .select("phone_number,is_active,role").eq("phone_number", phone).maybeSingle();
            if (lookup.error) return json({ error: "Could not verify this account. Please try again." }, 500);
            profile = lookup.data;
          }
        }
        if (!profile?.phone_number || profile.is_active === false || profile.role !== "tutor") {
          return json({ error: "Invalid username or password." }, 401);
        }
        const phone = normalizePhone(profile.phone_number);
        if (!phone) return json({ error: "This account needs administrator assistance." }, 400);
        const result = await auth.auth.signInWithPassword({ phone, password });
        if (result.error || !result.data.session || !result.data.user) {
          return json({ error: "Invalid username or password." }, 401);
        }
        signedIn = result.data;
      }

      const { data: account, error: accountError } = await admin.from("profiles")
        .select("role,is_active").or(`id.eq.${signedIn.user.id},supabase_user_id.eq.${signedIn.user.id}`).maybeSingle();
      if (accountError || !account || account.role !== "tutor" || account.is_active === false) {
        await auth.auth.signOut();
        return json({ error: "This account is not authorized for tutor access." }, 403);
      }
      return json({ user: signedIn.user, session: signedIn.session });
    }
    return json({ error: "Unsupported authentication action." }, 400);
  } catch (error) {
    console.error("Tutor authentication error:", error);
    return json({ error: "Authentication could not be completed. Please try again." }, 500);
  }
});
