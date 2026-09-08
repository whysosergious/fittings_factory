# AGENTS.md

Static one-page site (Russian landing page for «Завод Металлист»). Plain HTML/CSS — **no package.json, no build system, no tests, no CI, no linter**.

## Run / verify

- Open `index.html` directly in a browser, or serve statically: `python3 -m http.server` from repo root.
- Verification = load the page and eyeball it. There is no test/lint/typecheck command.

## Structure

- All markup lives in the single `index.html`; all styles in `src/styles.css`. Local images/icons go in `public/`.
- There is **no JavaScript anywhere yet** — burger button and hero pagination dots are inert markup. Any interactivity means adding new JS.
- Only a mobile layout exists (`styles.css` has zero media queries). Desktop/tablet breakpoints, burger-menu expansion, and the hero carousel are pending work — see `TODO.md`.

## Conventions

- Use the CSS custom properties from `:root` (`--brand-red`, `--brand-yellow`, …) instead of hardcoded colors. Note some colors are duplicated (`--brand-red` vs `--primary-red`) from mixed sources; prefer the `--brand-*` set for brand colors.
- HTML is Prettier-formatted (alphabetized attributes) and sections are wrapped in `<!-- BEGIN: Name -->` / `<!-- END: Name -->` comments — keep both when editing.
- Page content is Russian; keep `lang="ru"` and write UI copy in Russian.
- Footer placeholders (`[[address]]`, `[[email@email.em]]`, `+7 (000) 000-00-00`) are unfilled on purpose; real contact data is in the contact card higher up the page.
- Large photos reference remote `googleusercontent.com` URLs (AI-generated stand-ins); treat them as temporary placeholders, not assets to preserve.
