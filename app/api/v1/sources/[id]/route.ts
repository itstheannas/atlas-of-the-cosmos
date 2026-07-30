import {
  handleSourceRequest,
  type DynamicIdRouteContext,
} from "../../../../../lib/server/handlers.ts";

export function GET(
  request: Request,
  context: DynamicIdRouteContext,
): Promise<Response> {
  return handleSourceRequest(request, context);
}
