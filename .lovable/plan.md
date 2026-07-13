Update all project GitHub repository references to point to the new URL: https://github.com/gpavan1992/nota-health.

Files to change:
- `src/components/site-footer.tsx`: change `GITHUB_URL` constant from `https://github.com/gpavan1992/nota` to `https://github.com/gpavan1992/nota-health`.
- `src/routes/compliance.tsx`: change `GITHUB_URL` constant and the visible anchor text from `github.com/gpavan1992/nota` to `github.com/gpavan1992/nota-health`.
- `src/routes/index.tsx`: change the placeholder `GITHUB_URL = "https://github.com"` to `https://github.com/gpavan1992/nota-health` so the landing-page GitHub CTA links to the correct repository.
- `README.md`: the repository links already point to `https://github.com/gpavan1992/nota-health`; leave the personal profile link on line 381 unchanged.

After the edits, run a build check to confirm no broken imports or syntax issues.