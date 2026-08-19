# Learnings

Full historical record: `.claude/LEARNINGS_ARCHIVE.md` — consult only when debugging a similar recurring issue, not loaded automatically.

Standing rules that should govern every future session in this project. Condensed from full incident write-ups now archived.

## Content pipeline & data integrity
- **Verify externally-sourced data (even from the product owner) against its live target before publishing anything on the money path; never delete an unverified record — move it to a field the code doesn't read** (e.g. `asinDelisted`), so the safe/skipped behavior is the default rather than something a branch has to remember to check.
- **Never give an LLM a field it can fabricate (a URL, file path, ID) — derive that value from verified/catalog input instead**, and gate on-disk existence (`existsSync`) rather than trusting a model-supplied flag. A hallucinated Amazon link would silently route revenue to a competitor's listing.
- **Structured data (JSON-LD) must only encode what's actually visible on the page, derived from the same source as the rendered HTML.** A hand-maintained schema field with no on-page counterpart is a silent Google/AI-crawler structured-data violation.

## Content quality gates
- **Fold Turkish text to ASCII before applying `\b` word-boundary regex.** JS's `\b` treats Turkish letters (ı/ö/ü/ş/ğ/ç) as non-word characters, so it silently matches mid-word (e.g. "yönleri" contains a false "önler" hit) unless the text is folded first.
- **In substring-based banned-word lists, list the conjugated positive form of a verb, never the bare root** — otherwise the negation of a claim (e.g. "garanti etmez") gets banned right along with the claim itself.
- **Continuously calibrate automated content gates against known-good, already-published content, and treat a false positive as more dangerous than a missed sabotage case.** A gate that silently rejects correct content (e.g. confusing a verified packaging volume in ml with a banned dosage number) erodes trust invisibly — nobody notices good content being blocked.

## Infrastructure & CI
- **A scheduled job that must write files back into the repo needs GitHub Actions, not Vercel Cron** — Vercel functions have a read-only filesystem and can't commit; the daily content engine needs a real checkout + commit + push.
- **A GitHub Actions step's `if:` condition cannot see that same step's own `env:` block** (env isn't bound yet when `if:` evaluates). Move the check into the shell instead (`if [ -z "$VAR" ]; then echo "::warning::..."; exit 0; fi`) and always emit a warning so a silently-skipped step doesn't go unnoticed for months.
- **Local `npm run build` is broken on this Mac (AMFI blocks native binaries like lightningcss/SWC), and on top of that this repo lives under iCloud-synced `~/Desktop`, so full-project scans stall on I/O** — measured `tsc --noEmit` at `1% cpu 8:52 total` and `eslint .` unfinished after 50 min, while the same commit built on Vercel in 7s. Verify on the native-free layer (`tsc --noEmit` + `npm run css:check`), keep lint file-scoped or skip it, and treat the CI build as the real gate.
- **No tool in this repo's local gate looks at CSS** — `tsc` sees TypeScript, `eslint` sees JS, and Tailwind v4 *silently skips* a utility it doesn't recognise instead of erroring. `npm run css:check` (`scripts/check-css.mjs`) compiles `globals.css` through Tailwind's pure-JS `compile()` API, bypassing lightningcss, and asserts the tokens exist in the output. Run it after any change to `globals.css` or the type scale.

## AI image generation
- **FLUX models have no negative-prompt support — writing "no capsules" puts "capsules" in the model's context and summons it into the image.** Describe the desired scene completely instead of listing exclusions, and verify any model's negative-prompt support against its actual API schema before relying on it.

## Agent methodology
- **Only write "we measured/verified X" after actually running the command that proves it.** Before claiming a code path is fragile or dangerous, break it and confirm it actually breaks — an unverified claim becomes a false map that a future session will trust.

## Typography & front-end
- **Any web font on this site MUST include the `latin-ext` subset.** `latin` alone does not contain `ı İ ğ Ğ ş Ş`; without it the browser fills those glyphs from a system font and Turkish words change typeface *mid-word*. It is invisible to anyone testing with English text, so it will not be caught by looking at the page.
- **A rule that uses a font-relative unit (`ch`, `ex`, `em`) must declare the font itself.** `ch` resolves against the element's own `font-size`/`font-family`, not an inherited one — so the measure cap, the reading font and the font size belong in the *same* CSS rule (`.reading-column`). Split them and the measure is silently wrong while the page still looks plausible.
- **Reading measure is capped at ~68ch, not a pixel width**, and body type is deliberately fixed (only headings are fluid `clamp()`): body size that shifts with viewport breaks reading rhythm.
