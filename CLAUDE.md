# Repository workflow

- After completing every user task, commit all current repository changes, push the current branch to its upstream remote, and dispatch `.github/workflows/deploy-pages.yml` for that branch.
- Report the commit, push, and GitHub Pages workflow result in the final response.

## Layout

- Front page route: `app/page.tsx` → renders `app/MandelbrotSkipping.tsx` (whole game shell).
- Opening overlay / loading screen: `app/BuddhabrotIntro.tsx`.
- Styles: `app/globals.css`. Copy and paper text: `lib/buddhabrot/explain.ts`.
