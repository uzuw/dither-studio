import { notFound } from "next/navigation";
import { Generator } from "../../../components/generator";
import { Header, Footer } from "../../../components/chrome";
import {
  CARD_TYPES,
  cards,
  parseCardType,
  parseCardOptions,
} from "../../../lib/cards";
import { normalizeUsername, type CardOptions } from "../../../lib/recipe";

export function generateStaticParams() {
  return CARD_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const type = (await params).type;
  return {
    title: `${CARD_TYPES.includes(type as (typeof CARD_TYPES)[number]) ? cards[type as (typeof CARD_TYPES)[number]].title : "Card not found"} — Dither`,
  };
}

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawType = (await params).type;
  if (!CARD_TYPES.includes(rawType as (typeof CARD_TYPES)[number])) notFound();
  const type = parseCardType(rawType),
    query = await searchParams;
  let options: CardOptions = { layout: cards[type].layout, theme: "paper" },
    username = "",
    error: string | undefined;
  try {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === "username") continue;
      if (Array.isArray(value))
        value.forEach((item) => values.append(key, item));
      else if (value !== undefined) values.set(key, value);
    }
    options = parseCardOptions(type, values);
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
          key={type}
          cardType={type}
          initialUsername={username}
          initialOptions={options}
          initialError={error}
        />
      </main>
      <Footer />
    </div>
  );
}
