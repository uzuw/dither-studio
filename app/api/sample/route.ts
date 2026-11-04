import { cardResponse } from "../../../lib/card-response";

export async function GET(request: Request) {
  return cardResponse(request);
}
