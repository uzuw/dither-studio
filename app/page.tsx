import Link from "next/link";
import { Header, Footer } from "../components/chrome";
import { Icon } from "../components/icon";
import { CARD_TYPES, cards, cardRecipe, sampleImagePath } from "../lib/cards";
import { cardHeight } from "../lib/charts";

export default function Home() {
  return (
    <div className="site-shell">
      <Header />
      <main id="main">
        <section
          className="intro catalog-intro"
          aria-labelledby="catalog-title"
        >
          <div className="intro-copy">
            <h1 id="catalog-title">
              Your GitHub.
              <br />
              Pick a print.
            </h1>
            <p>
              PRs, stars, streaks, and the shape of your work.
              <br className="desktop-break" /> Choose a card, make it yours, and
              add it to your README.
            </p>
          </div>
        </section>
        <section className="card-catalog" aria-label="Choose a card type">
          {CARD_TYPES.map((type) => (
            <Link className="card-choice" href={`/cards/${type}`} key={type}>
              <div className="catalog-artwork">
                {/* The gallery uses the same SVG renderer as exported cards. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sampleImagePath(type, {
                    layout: cards[type].layout,
                    theme: "paper",
                  })}
                  width="960"
                  height={cardHeight(cards[type].layout, cardRecipe(type))}
                  alt={`Sample ${cards[type].title.toLowerCase()} card with example data`}
                  loading="lazy"
                />
              </div>
              <div className="card-choice-copy">
                <h2>{cards[type].title}</h2>
                <p>{cards[type].description}</p>
                <span>
                  Customize this card <Icon name="arrow" size={16} />
                </span>
              </div>
            </Link>
          ))}
        </section>
        <p className="catalog-note">
          Gallery previews use labeled sample data. Enter your username in a
          card editor to generate your real GitHub stats.
        </p>
      </main>
      <Footer />
    </div>
  );
}
