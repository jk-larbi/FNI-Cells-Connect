import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidKeysJson = Deno.env.get("VAPID_KEYS_JSON") || "";
const subject = Deno.env.get("VAPID_SUBJECT") || "https://jk-larbi.github.io/FNI-Cells-Connect/";

const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let pushServerPromise: Promise<{ server: webpush.ApplicationServer; publicKey: string }> | null = null;
async function getPushServer() {
  if (!vapidKeysJson) throw new Error("Push server keys are not configured. Add VAPID_KEYS_JSON to Supabase Edge Function secrets.");
  if (!pushServerPromise) {
    pushServerPromise = (async () => {
      const exportedKeys = JSON.parse(vapidKeysJson);
      const vapidKeys = await webpush.importVapidKeys(exportedKeys);
      const server = await webpush.ApplicationServer.new({
        contactInformation: subject,
        vapidKeys,
      });
      const publicKey = await webpush.exportApplicationServerKey(vapidKeys);
      return { server, publicKey };
    })();
  }
  return pushServerPromise;
}

async function authenticatedUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return { user: null, profile: null, error: "Authentication required" };
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { user: null, profile: null, error: "Invalid session" };
  const { data: profile } = await db.from("profiles")
    .select("id,role,is_active,full_name,supabase_user_id")
    .eq("supabase_user_id", user.id).maybeSingle();
  if (!profile?.is_active) return { user, profile: null, error: "Active FNI account required" };
  return { user, profile, error: null };
}

async function deviceId(profileId: string, endpoint: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  const hex = Array.from(new Uint8Array(hash)).map(x => x.toString(16).padStart(2, "0")).join("");
  return `webpush_${profileId}_${hex.slice(0, 24)}`;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await authenticatedUser(req);
  if (auth.error || !auth.user || !auth.profile) return json({ error: auth.error || "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = body?.action;

  if (action === "get_public_key") {
    try {
      const { publicKey } = await getPushServer();
      return json({ publicKey });
    } catch (error: any) {
      console.error("VAPID configuration error:", error);
      return json({ error: error?.message || "Push server is not configured" }, 503);
    }
  }

  if (action === "register") {
    const subscription = body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return json({ error: "Invalid browser push subscription" }, 400);
    }
    try {
      await getPushServer();
      const id = await deviceId(auth.profile.id, subscription.endpoint);
      const { error } = await db.from("device_tokens").upsert({
        id,
        user_id: auth.profile.id,
        token: JSON.stringify(subscription),
        role: auth.profile.role,
        device: String(body.device || "Browser").slice(0, 500),
        platform: String(body.platform || "Web").slice(0, 120),
        legacy_data: { kind: "web_push", endpoint: subscription.endpoint },
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (error) throw error;
      return json({ success: true, deviceId: id });
    } catch (error: any) {
      console.error("Push subscription registration failed:", error);
      return json({ error: error?.message || "Could not save this device subscription" }, 500);
    }
  }

  if (action === "unregister") {
    const endpoint = String(body?.endpoint || "");
    if (!endpoint) return json({ error: "Subscription endpoint required" }, 400);
    const { data: rows, error } = await db.from("device_tokens")
      .select("id,token").eq("user_id", auth.profile.id);
    if (error) return json({ error: "Could not find this device subscription" }, 500);
    const match = (rows || []).find((row: any) => {
      try { return JSON.parse(row.token)?.endpoint === endpoint; } catch { return false; }
    });
    if (match) {
      const { error: deleteError } = await db.from("device_tokens").delete().eq("id", match.id);
      if (deleteError) return json({ error: "Could not remove this device subscription" }, 500);
    }
    return json({ success: true });
  }

  if (action === "test_push") {
    const { data: devices, error } = await db.from("device_tokens")
      .select("id,token").eq("user_id", auth.profile.id);
    if (error) return json({ error: "Could not load this device's push subscription" }, 500);
    if (!devices?.length) return json({ sent: 0, failed: 0, message: "Enable browser push on this device first." });
    const { server } = await getPushServer();
    const payload = JSON.stringify({
      title: "FNI CELLS CONNECT Test Alert",
      body: "Background browser push is working on this device.",
      tag: `fni-test-${Date.now()}`,
      data: { targetTab: "notifications" },
      timestamp: new Date().toISOString(),
    });
    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];
    await Promise.all(devices.map(async (device: any) => {
      let subscription: webpush.PushSubscription;
      try { subscription = JSON.parse(device.token); } catch { return; }
      if (!subscription?.endpoint || !subscription?.keys) return;
      try {
        await server.subscribe(subscription).pushTextMessage(payload, {
          ttl: 300,
          urgency: webpush.Urgency.High,
        });
        sent += 1;
      } catch (error: any) {
        const status = Number(error?.response?.status || 0);
        if (status === 404 || status === 410) staleIds.push(device.id);
        else console.error("Test web push delivery failed:", status, error?.message || error);
        failed += 1;
      }
    }));
    if (staleIds.length) await db.from("device_tokens").delete().in("id", staleIds);
    return json({ sent, failed, staleRemoved: staleIds.length });
  }

  if (action === "send_notification") {
    const notification = body?.notification;
    if (!notification?.id || !notification?.title || !notification?.message || !notification?.user_id) {
      return json({ error: "Notification payload is incomplete" }, 400);
    }

    const actorRole = String(auth.profile.role || "");
    const actorIsAdmin = ["admin", "super_admin", "national_admin"].includes(actorRole);
    const target = String(notification.user_id);
    let recipientQuery = db.from("profiles").select("id").eq("is_active", true);

    if (target === "all") {
      if (!actorIsAdmin) return json({ error: "Only FNI administrators can send all-member alerts" }, 403);
    } else if (target === "admin") {
      recipientQuery = recipientQuery.in("role", ["admin", "super_admin", "national_admin"]);
    } else if (target === "tutor_community") {
      recipientQuery = recipientQuery.in("role", ["tutor", "cell_leader", "regional_leader"]);
    } else {
      recipientQuery = recipientQuery.eq("id", target);
    }

    const { data: recipients, error: recipientError } = await recipientQuery;
    if (recipientError) return json({ error: "Could not resolve notification recipients" }, 500);
    const recipientIds = (recipients || [])
      .map((row: any) => String(row.id))
      .filter((id: string) => id !== auth.profile.id);
    if (!recipientIds.length) return json({ sent: 0, failed: 0, message: "No other active recipients" });

    const { data: devices, error: deviceError } = await db.from("device_tokens")
      .select("id,user_id,token").in("user_id", recipientIds);
    if (deviceError) return json({ error: "Could not load registered browser devices" }, 500);

    const { server } = await getPushServer();
    const payload = JSON.stringify({
      title: String(notification.title).slice(0, 140),
      body: String(notification.message).slice(0, 500),
      tag: String(notification.id).slice(0, 120),
      data: notification.metadata || {},
      timestamp: notification.created_at || new Date().toISOString(),
    });

    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];
    await Promise.all((devices || []).map(async (device: any) => {
      let subscription: webpush.PushSubscription;
      try { subscription = JSON.parse(device.token); } catch { return; }
      if (!subscription?.endpoint || !subscription?.keys) return;
      try {
        const subscriber = server.subscribe(subscription);
        await subscriber.pushTextMessage(payload, { ttl: 2419200, urgency: webpush.Urgency.High });
        sent += 1;
      } catch (error: any) {
        const status = Number(error?.response?.status || 0);
        if (status === 404 || status === 410) staleIds.push(device.id);
        else console.error("Web push delivery failed:", status, error?.message || error);
        failed += 1;
      }
    }));
    if (staleIds.length) await db.from("device_tokens").delete().in("id", staleIds);
    return json({ sent, failed, staleRemoved: staleIds.length });
  }

  return json({ error: "Unsupported action" }, 400);
});
