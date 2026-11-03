import Link from "next/link";
import { Header, Footer } from "../../components/chrome";

export const metadata = { title: "Make it yours — Dither agent guide" };
export default function Guide() {
  return (
    <div className="site-shell">
      <Header />
      <main id="main" className="guide">
        <Link href="/" className="back-link">
          Back to the studio
        </Link>
        <h1>
          Your README.
          <br />
          Your rules.
        </h1>
        <p className="guide-lead">
          The studio is a starting point. The skill gives your coding agent the
          recipe, renderer, and export workflow to make something unmistakably
          yours.
        </p>
        <section>
          <h2>Start with a prompt</h2>
          <blockquote>
            Read the Dither skill and make a README for @uzuw. Use a blue and
            white dithered landscape, monospace type, my introduction, a
            contribution calendar, and social panels. Generate the SVG files and
            show me a preview.
          </blockquote>
          <p>
            Use it with Codex, Claude, Hermes, or another agent that can read
            Markdown and run Node.js. The skill is ordinary Markdown; it needs
            no proprietary API or model key.
          </p>
          <a className="button primary" href="/skill" download="SKILL.md">
            Download SKILL.md
          </a>
        </section>
        <section>
          <h2>Two ways to make it yours</h2>
          <p>
            <strong>In the studio:</strong> edit colors, texture, type, and the
            JSON recipe. Copy the generated URL into your README. The hosted
            image fetches your activity with cached updates.
          </p>
          <p>
            <strong>In your own checkout:</strong> give your agent{" "}
            <code>skills/dither-readme/SKILL.md</code>. Ask it to edit a recipe
            or the renderer. The CLI generates profile, calendar, stats, social
            panels, and a README you can host directly in your profile
            repository.
          </p>
          <pre>
            <code>{`npm ci\nnpm run render -- --username YOUR_USERNAME --recipe examples/blueprint.json --out output/profile\n\n# No credential yet? Preview an explicitly labeled sample:\nnpm run render -- --sample --recipe examples/blueprint.json --out output/sample`}</code>
          </pre>
          <p>
            Live exports need a server-side <code>GITHUB_TOKEN</code> with
            public read access. The CLI also supports an explicitly provided
            profile-data file. Credentials never belong in a recipe, image URL,
            or README.
          </p>
        </section>
        <section>
          <h2>Install where your agent looks</h2>
          <p>
            Copy the <code>dither-readme</code> skill folder into your agent’s
            supported skills directory, or ask it to read the file directly from
            your checkout. For Codex, use{" "}
            <code>~/.codex/skills/dither-readme/</code>; for Claude Code, use{" "}
            <code>~/.claude/skills/dither-readme/</code>. For Hermes and other
            agents, use their configured skill location or the direct-file
            prompt.
          </p>
          <p>
            The skill needs a Dither source checkout to render locally.
            Installing the skill alone does not install the app. It explains the
            files to change, how to export, and how to check the result.
          </p>
        </section>
        <section id="open-source">
          <h2>Open source, all the way down.</h2>
          <a className="guide-link" href="https://github.com/uzuw/dither-studio">
            View source and fork Dither
          </a>
          <p>
            Dither is MIT licensed. Fork it, change the renderer, add a layout,
            or host a version of your own. Recipes cover the common changes;
            editable TypeScript is there when your idea needs more room.
          </p>
          <p>
            Built with Next.js, React, and portable SVG. Website typography uses
            Bricolage Grotesque and IBM Plex Mono; exports use portable
            system-font stacks. This is a community tool, unaffiliated with
            GitHub.
          </p>
          <p>
            Hosted cards depend on GitHub API quotas and image caching. Locally
            generated files work without our server; a scheduled workflow can
            refresh those files in your own repository.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
