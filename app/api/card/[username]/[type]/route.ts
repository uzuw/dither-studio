import { cardResponse } from "../../../../../lib/card-response";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string; type: string }> },
) {
  const { username, type } = await context.params;
  return cardResponse(request, username, type);
}
