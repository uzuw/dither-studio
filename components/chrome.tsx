import Link from "next/link";
import { Icon } from "./icon";

export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label="Dither home">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        dither<span className="wordmark-period">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/" className="nav-studio">
          Choose a card
        </Link>
        <Link href="/guide">
          Made for agents <Icon name="code" size={16} />
        </Link>
      </nav>
      <a
        className="open-source-tag"
        href="https://github.com/uzuw/dither-studio"
      >
        Open source. Open canvas.
      </a>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <span>Dither. Made of small contributions.</span>
      <div>
        <a href="https://github.com/uzuw/dither-studio">Source</a>
        <a href="/guide#open-source">MIT licensed</a>
        <a href="/skill">
          Agent skill <Icon name="arrow" size={13} />
        </a>
      </div>
      <span>Good things take a few dots.</span>
    </footer>
  );
}
