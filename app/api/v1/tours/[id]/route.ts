import {
  handleTourRequest,
  type DynamicIdRouteContext,
} from "../../../../../lib/server/handlers.ts";

export function GET(
  request: Request,
  context: DynamicIdRouteContext,
): Promise<Response> {
  return handleTourRequest(request, context);
}
