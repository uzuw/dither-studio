import { cardResponse } from "../../../../lib/card-response";

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  return cardResponse(request, undefined, (await context.params).type);
}
