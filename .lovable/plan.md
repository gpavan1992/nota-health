## Plan

Fix the PubMed source link issue by removing the in-app intermediate source page from normal article links.

1. **Return direct PubMed URLs from the API**
   - Change PubMed search results so each article `url` is `https://pubmed.ncbi.nlm.nih.gov/{PMID}/` instead of `/api/tools/pubmed?source={PMID}`.
   - Keep the existing `/api/tools/pubmed?source=` fallback route available, but it will no longer be used as the primary article link.

2. **Make the frontend link behavior explicit**
   - Update article title links to open the direct PubMed URL in a new top-level tab.
   - Add a safe click handler using a temporary anchor/open call so the browser treats it as a user-initiated external navigation rather than an embedded iframe navigation.

3. **Avoid the blocked embedded-preview path**
   - Do not redirect through the app page first.
   - Do not attempt to render PubMed inside the app or preview iframe, since PubMed blocks iframe embedding.

4. **Verify with the exact failing PMID**
   - Test search/link data for PMID `42037893` and confirm the returned URL is the direct PubMed URL.
   - Confirm clicking the article no longer lands on `/api/tools/pubmed?source=...`.