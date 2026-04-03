import * as Linking from "expo-linking";

/** Site origin only — strips paths like `/dashboard` so `{origin}/support` is correct. */
function webAppOrigin(): string {
  const raw = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim().replace(/\/$/, "") ?? "";
  if (!raw) return "https://example.com";
  try {
    return new URL(raw).origin;
  } catch {
    return raw;
  }
}

const base = webAppOrigin();

export function supportWebUrl(): string {
  return `${base}/support`;
}

export async function openSupportOnWeb(): Promise<void> {
  const url = supportWebUrl();
  const can = await Linking.canOpenURL(url);
  if (can) await Linking.openURL(url);
}
