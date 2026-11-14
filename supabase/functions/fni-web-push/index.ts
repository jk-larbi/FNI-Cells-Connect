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

const fcmServiceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") || "";
let fcmAccessTokenCache: { token: string; expiresAt: number } | null = null;
const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
  .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const textBase64Url = (value: string) => base64Url(new TextEncoder().encode(value));
function pemToBytes(pem: string): Uint8Array {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(clean);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
async function getFcmAccessToken(): Promise<{ token: string; projectId: string }> {
  if (!fcmServiceAccountJson) throw new Error("Firebase server credentials are not configured. Add FCM_SERVICE_ACCOUNT_JSON to Supabase Edge Function secrets.");
  const account = JSON.parse(fcmServiceAccountJson);
  if (!account.project_id || !account.client_email || !account.private_key) throw new Error("Firebase service account JSON is missing project_id, client_email or private_key.");
  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAt > Date.now() + 60000) {
    return { token: fcmAccessTokenCache.token, projectId: account.project_id };
  }
  const now = Math.floor(Date.now() / 1000);
  const header = textBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = textBase64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + "." + claims;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = unsigned + "." + base64Url(signature);
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const tokenData = await response.json();
  if (!response.ok || !tokenData.access_token) throw new Error(tokenData.error_description || tokenData.error || "Could not authenticate with Firebase Cloud Messaging.");
  fcmAccessTokenCache = { token: tokenData.access_token, expiresAt: Date.now() + Number(tokenData.expires_in || 3600) * 1000 };
  return { token: tokenData.access_token, projectId: account.project_id };
}
async function sendFcm(token: string, payload: { title: string; body: string; data?: Record<string, unknown> }) {
  const credentials = await getFcmAccessToken();
  const data = Object.fromEntries(Object.entries(payload.data || {}).map(([key, value]) => [
    key, typeof value === "string" ? value : JSON.stringify(value ?? ""),
  ]));
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credentials.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: payload.title.slice(0, 140), body: payload.body.slice(0, 500) },
        data,
        android: {
          priority: "HIGH",
          notification: { channel_id: "fni_updates", sound: "default" },
        },
      },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(result?.error?.details?.[0]?.errorCode || result?.error?.status || "");
    const error: any = new Error(result?.error?.message || "Firebase push delivery failed.");
    error.status = response.status;
    error.fcmCode = code;
    throw error;
  }
  return result;
}
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

async function deviceId(profileId: string, endpoint: string, kind = "webpush") {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  const hex = Array.from(new Uint8Array(hash)).map(x => x.toString(16).padStart(2, "0")).join("");
  return `${kind}_${profileId}_${hex.slice(0, 24)}`;
}

async function getActiveTutorMapsSnapshot(): Promise<{ url: string | null; count: number }> {
  const { data: sessions, error } = await db.from("location_share_sessions")
    .select("id").is("ended_at", null).order("started_at", { ascending: false }).limit(100);
  if (error || !sessions?.length) return { url: null, count: 0 };

  const locations = await Promise.all(sessions.map(async (session: any) => {
    const { data: point } = await db.from("location_share_points")
      .select("latitude,longitude,captured_at")
      .eq("session_id", session.id)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!point || !Number.isFinite(Number(point.latitude)) || !Number.isFinite(Number(point.longitude))) return null;
    return { latitude: Number(point.latitude), longitude: Number(point.longitude) };
  }));
  const valid = locations.filter((point): point is { latitude: number; longitude: number } => Boolean(point));
  if (valid.length !== 1) {
    // A Google Maps directions URL would falsely imply that separate tutors
    // travelled together. Multi-tutor alerts therefore open the FNI dashboard.
    return { url: null, count: valid.length };
  }
  const coordinate = `${valid[0].latitude},${valid[0].longitude}`;
  return {
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinate)}`,
    count: 1,
  };
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
    const nativeToken = String(body?.token || "");
    const isFcm = body?.kind === "fcm" && nativeToken.length >= 40;
    const subscription = body?.subscription;
    if (!isFcm && (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth)) {
      return json({ error: "A valid FCM token or browser push subscription is required" }, 400);
    }
    try {
      if (!isFcm) await getPushServer();
      const identity = isFcm ? nativeToken : subscription.endpoint;
      const kind = isFcm ? "fcm" : "webpush";
      const id = await deviceId(auth.profile.id, identity, kind);
      const { error } = await db.from("device_tokens").upsert({
        id,
        user_id: auth.profile.id,
        token: isFcm ? nativeToken : JSON.stringify(subscription),
        role: auth.profile.role,
        device: String(body.device || (isFcm ? "Android" : "Browser")).slice(0, 500),
        platform: String(body.platform || (isFcm ? "Android" : "Web")).slice(0, 120),
        legacy_data: isFcm ? { kind: "fcm" } : { kind: "web_push", endpoint: subscription.endpoint },
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (error) throw error;
      return json({ success: true, deviceId: id, kind });
    } catch (error: any) {
      console.error("Push device registration failed:", error);
      return json({ error: error?.message || "Could not save this device registration" }, 500);
    }
  }

  if (action === "unregister") {
    const token = String(body?.token || "");
    const endpoint = String(body?.endpoint || "");
    if (!token && !endpoint) return json({ error: "Device token or subscription endpoint required" }, 400);
    const { data: rows, error } = await db.from("device_tokens")
      .select("id,token,legacy_data").eq("user_id", auth.profile.id);
    if (error) return json({ error: "Could not find this device registration" }, 500);
    const match = (rows || []).find((row: any) => {
      if (token) return row.token === token && row.legacy_data?.kind === "fcm";
      try { return JSON.parse(row.token)?.endpoint === endpoint; } catch { return false; }
    });
    if (match) {
      const { error: deleteError } = await db.from("device_tokens").delete().eq("id", match.id);
      if (deleteError) return json({ error: "Could not remove this device registration" }, 500);
    }
    return json({ success: true });
  }

  if (action === "test_push") {
    const { data: devices, error } = await db.from("device_tokens")
      .select("id,token,legacy_data").eq("user_id", auth.profile.id);
    if (error) return json({ error: "Could not load this device's push registration" }, 500);
    if (!devices?.length) return json({ sent: 0, failed: 0, message: "Enable push notifications on this device first." });
    const webDevices = devices.filter((device: any) => device.legacy_data?.kind !== "fcm");
    const fcmDevices = devices.filter((device: any) => device.legacy_data?.kind === "fcm");
    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];
    if (webDevices.length) {
      const { server } = await getPushServer();
      const payload = JSON.stringify({
        title: "FNI CELLS CONNECT Test Alert",
        body: "Background push notifications are working on this device.",
        tag: `fni-test-${Date.now()}`,
        data: { targetTab: "notifications" },
        timestamp: new Date().toISOString(),
      });
      await Promise.all(webDevices.map(async (device: any) => {
        let subscription: webpush.PushSubscription;
        try { subscription = JSON.parse(device.token); } catch { return; }
        if (!subscription?.endpoint || !subscription?.keys) return;
        try {
          await server.subscribe(subscription).pushTextMessage(payload, { ttl: 300, urgency: webpush.Urgency.High });
          sent += 1;
        } catch (error: any) {
          const status = Number(error?.response?.status || 0);
          if (status === 404 || status === 410) staleIds.push(device.id);
          else console.error("Test web push delivery failed:", status, error?.message || error);
          failed += 1;
        }
      }));
    }
    if (fcmDevices.length) {
      await Promise.all(fcmDevices.map(async (device: any) => {
        try {
          await sendFcm(device.token, {
            title: "FNI CELLS CONNECT Test Alert",
            body: "Android push notifications are working on this device.",
            data: { targetTab: "notifications" },
          });
          sent += 1;
        } catch (error: any) {
          console.error("Test FCM delivery failed:", error?.status, error?.message || error);
          if (error?.fcmCode === "UNREGISTERED" || error?.status === 404) staleIds.push(device.id);
          failed += 1;
        }
      }));
    }
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
      .select("id,user_id,token,legacy_data").in("user_id", recipientIds);
    if (deviceError) return json({ error: "Could not load registered browser devices" }, 500);

    let deliveryMetadata = notification.metadata || {};
    if (deliveryMetadata.category === "location") {
      const sessionId = String(deliveryMetadata.sessionId || "");
      const { data: ownedSession, error: sessionError } = await db.from("location_share_sessions")
        .select("id,tutor_user_id,ended_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (sessionError) return json({ error: "Could not verify the location-sharing session" }, 500);
      if (!ownedSession || ownedSession.tutor_user_id !== auth.user.id || ownedSession.ended_at) {
        return json({ error: "Only the tutor who owns an active sharing session can send its location alert" }, 403);
      }
      const snapshot = await getActiveTutorMapsSnapshot();
      if (snapshot.url) {
        deliveryMetadata = {
          ...deliveryMetadata,
          targetTab: "dashboard",
          actionUrl: snapshot.url,
          mapSnapshot: true,
          activeTutorCount: snapshot.count,
        };
        const { error: updateError } = await db.from("notifications")
          .update({ metadata: deliveryMetadata, action_url: snapshot.url, target_tab: "dashboard" })
          .eq("id", notification.id);
        if (updateError) console.warn("Could not attach Maps link to the in-app location alert:", updateError.message);
      }
    }

    const webDevices = (devices || []).filter((device: any) => device.legacy_data?.kind !== "fcm");
    const fcmDevices = (devices || []).filter((device: any) => device.legacy_data?.kind === "fcm");
    let sent = 0;
    let failed = 0;
    const staleIds: string[] = [];
    if (webDevices.length) {
      const { server } = await getPushServer();
      const payload = JSON.stringify({
        title: String(notification.title).slice(0, 140),
        body: String(notification.message).slice(0, 500),
        tag: String(notification.id).slice(0, 120),
        data: deliveryMetadata,
        timestamp: notification.created_at || new Date().toISOString(),
      });
      await Promise.all(webDevices.map(async (device: any) => {
        let subscription: webpush.PushSubscription;
        try { subscription = JSON.parse(device.token); } catch { return; }
        if (!subscription?.endpoint || !subscription?.keys) return;
        try {
          await server.subscribe(subscription).pushTextMessage(payload, { ttl: 2419200, urgency: webpush.Urgency.High });
          sent += 1;
        } catch (error: any) {
          const status = Number(error?.response?.status || 0);
          if (status === 404 || status === 410) staleIds.push(device.id);
          else console.error("Web push delivery failed:", status, error?.message || error);
          failed += 1;
        }
      }));
    }
    if (fcmDevices.length) {
      await Promise.all(fcmDevices.map(async (device: any) => {
        try {
          await sendFcm(device.token, {
            title: String(notification.title).slice(0, 140),
            body: String(notification.message).slice(0, 500),
            data: deliveryMetadata,
          });
          sent += 1;
        } catch (error: any) {
          console.error("FCM delivery failed:", error?.status, error?.message || error);
          if (error?.fcmCode === "UNREGISTERED" || error?.status === 404) staleIds.push(device.id);
          failed += 1;
        }
      }));
    }
    if (staleIds.length) await db.from("device_tokens").delete().in("id", staleIds);
    return json({ sent, failed, staleRemoved: staleIds.length });
  }

  return json({ error: "Unsupported action" }, 400);
});
