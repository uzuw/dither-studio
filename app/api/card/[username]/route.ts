import { cardResponse } from "../../../../lib/card-response";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  return cardResponse(request, (await context.params).username);
}
