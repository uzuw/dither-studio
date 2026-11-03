import { Generator } from "../components/generator";
import { Header, Footer } from "../components/chrome";
import {
  normalizeUsername,
  parseOptions,
  type CardOptions,
} from "../lib/recipe";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  let options: CardOptions = { layout: "calendar", theme: "paper" },
    username = "",
    error: string | undefined;
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "username") continue;
      if (Array.isArray(value))
        value.forEach((item) => params.append(key, item));
      else if (value !== undefined) params.set(key, value);
    }
    options = parseOptions(params);
    if (query.username)
      username = normalizeUsername(
        Array.isArray(query.username) ? "" : query.username,
      );
  } catch (cause) {
    error = (cause as Error).message;
  }
  return (
    <div className="site-shell">
      <Header />
      <main id="main">
        <Generator
          initialUsername={username}
          initialOptions={options}
          initialError={error}
        />
      </main>
      <Footer />
    </div>
  );
}
