import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const skill = await readFile(
    path.join(process.cwd(), "skills/dither-readme/SKILL.md"),
    "utf8",
  );
  return new Response(skill, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="SKILL.md"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}
