import { supabase } from "./supabase";

export async function authedFetch(url: string, options?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    ...options?.headers,
    Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
