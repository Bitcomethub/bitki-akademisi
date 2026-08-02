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
- **Local `npm run build` is broken on this Mac (AMFI blocks native binaries like lightningcss/SWC).** Don't skip verification — drop to the native-free layer (`tsc --noEmit` + `eslint` + a WASM harness) locally, and always run the real build in CI before a commit is considered safe.

## AI image generation
- **FLUX models have no negative-prompt support — writing "no capsules" puts "capsules" in the model's context and summons it into the image.** Describe the desired scene completely instead of listing exclusions, and verify any model's negative-prompt support against its actual API schema before relying on it.

## Agent methodology
- **Only write "we measured/verified X" after actually running the command that proves it.** Before claiming a code path is fragile or dangerous, break it and confirm it actually breaks — an unverified claim becomes a false map that a future session will trust.
