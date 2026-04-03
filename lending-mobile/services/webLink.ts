import * as Linking from "expo-linking";

const base =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/$/, "") ?? "https://example.com";

export function supportWebUrl(): string {
  return `${base}/support`;
}

export async function openSupportOnWeb(): Promise<void> {
  const url = supportWebUrl();
  const can = await Linking.canOpenURL(url);
  if (can) await Linking.openURL(url);
}
