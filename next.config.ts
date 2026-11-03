import type { NextConfig } from "next";

const config: NextConfig = {
  // SVG export needs the Node renderer, not React's Server Component export.
  serverExternalPackages: ["react-dom"],
  outputFileTracingIncludes: { "/skill": ["./skills/dither-readme/SKILL.md"] },
};
export default config;
