import { handleOpenApiRequest } from "../../../../lib/server/handlers.ts";

export function GET(request: Request): Promise<Response> {
  return handleOpenApiRequest(request);
}
