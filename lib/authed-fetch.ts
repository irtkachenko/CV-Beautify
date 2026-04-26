import { supabase } from "./supabase";

type HeaderInput = HeadersInit | undefined;

function withAuthHeader(headers: HeaderInput, accessToken: string | null): Headers {
  const normalized = new Headers(headers);
  if (accessToken) {
    normalized.set("Authorization", `Bearer ${accessToken}`);
  } else {
    normalized.delete("Authorization");
  }
  return normalized;
}

async function getAccessToken(): Promise<string | null> {
  // Always try to refresh the session to get fresh token
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed.session?.access_token) {
    return refreshed.session.access_token;
  }

  // Fallback to current session
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function authedFetch(url: string, options?: RequestInit): Promise<Response> {
  const method = (options?.method || "GET").toUpperCase();
  const isReadRequest = method === "GET" || method === "HEAD";
  const token = await getAccessToken();

  const makeRequest = (accessToken: string | null) =>
    fetch(url, {
      ...options,
      cache: options?.cache ?? (isReadRequest ? "no-store" : undefined),
      headers: (() => {
        const prepared = withAuthHeader(options?.headers, accessToken);
        if (isReadRequest) {
          prepared.set("Cache-Control", "no-cache");
          prepared.set("Pragma", "no-cache");
        }
        return prepared;
      })(),
    });

  let response = await makeRequest(token);

  if (response.status !== 401) {
    return response;
  }

  const { data: refreshed } = await supabase.auth.refreshSession();
  const refreshedToken = refreshed.session?.access_token ?? null;
  if (refreshedToken && refreshedToken !== token) {
    response = await makeRequest(refreshedToken);
  }

  return response;
}
