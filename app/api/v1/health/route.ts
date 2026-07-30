import { handleHealthRequest } from "../../../../lib/server/handlers.ts";

export function GET(request: Request): Promise<Response> {
  return handleHealthRequest(request);
}
