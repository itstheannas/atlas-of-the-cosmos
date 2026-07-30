import { handleCatalogueRequest } from "../../../../lib/server/handlers.ts";

export function GET(request: Request): Promise<Response> {
  return handleCatalogueRequest(request);
}
