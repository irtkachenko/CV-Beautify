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
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    return data.session.access_token;
  }

  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? null;
}

export async function authedFetch(url: string, options?: RequestInit): Promise<Response> {
  const method = (options?.method || "GET").toUpperCase();
  const isReadRequest = method === "GET" || method === "HEAD";
  const token = await getAccessToken();

  const makeRequest = (accessToken: string | null) =>
    fetch(url, {
      ...options,
      cache: options?.cache ?? (isReadRequest ? "no-store" : undefined),
      headers: withAuthHeader(options?.headers, accessToken),
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
