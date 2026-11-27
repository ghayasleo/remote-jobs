"use client";

// Job alerts in the browser: permission, the push subscription, and the
// /api/alerts calls. The subscription endpoint identifies this device.

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type DeviceAlert = { id: string; query: string; label: string; frequency: "daily" | "hourly"; createdAt: string };

export type PushSupport = "supported" | "unsupported" | "ios-install" | "denied";

/** Whether this browser can get alerts, and what's in the way if not. */
export function pushSupport(): PushSupport {
  if (!PUBLIC_KEY) return "unsupported";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  // iPhones and iPads only allow web notifications for apps added to the Home Screen.
  if (ios && !standalone) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "supported";
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** This device's existing subscription, without asking for anything. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported" && pushSupport() !== "denied") return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/alerts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as { alerts?: DeviceAlert[]; error?: string };
  if (!response.ok) throw new Error(json.error ?? "That didn't work. Please try again.");
  return json.alerts ?? [];
}

/** Asks for permission if needed, subscribes this device, and saves the alert. */
export async function createAlert(query: string, label: string, frequency: DeviceAlert["frequency"]) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked for this site. Allow them in your browser's settings to get alerts.");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  return post({ action: "create", subscription: subscription.toJSON(), query, label, frequency });
}

export async function listAlerts() {
  const subscription = await currentSubscription();
  return subscription ? post({ action: "list", endpoint: subscription.endpoint }) : [];
}

export async function deleteAlert(id: string) {
  const subscription = await currentSubscription();
  return subscription ? post({ action: "delete", endpoint: subscription.endpoint, id }) : [];
}

/** Removes every alert and stops notifications on this device. */
export async function turnOffAlerts() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await post({ action: "delete-all", endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}
