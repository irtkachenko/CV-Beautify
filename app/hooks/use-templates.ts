import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { authedFetch } from "@lib/authed-fetch";
import { parseWithLogging } from "@lib/validation";

export function useTemplates() {
  return useQuery({
    queryKey: [api.templates.list.path],
    queryFn: async () => {
      const res = await authedFetch(api.templates.list.path);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized");
        throw new Error("Failed to fetch templates");
      }
      const data = await res.json();
      return parseWithLogging(api.templates.list.responses[200], data, "templates.list");
    },
  });
}
