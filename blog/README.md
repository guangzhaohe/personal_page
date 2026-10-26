# Personal blog

The blog lives at `/blog/`, separate from the Publications homepage. It works on the existing static hosting with no build step. Each article has a shareable URL such as `/blog/?post=a-new-era-for-agentic-vision-and-robotics-research`.

## Write a post

1. Create `blog/posts/your-post-slug.md`. Use a lowercase, hyphenated filename.
2. Add an entry to `blog/posts.json`:

   ```json
   {
     "slug": "your-post-slug",
     "title": "Your article title",
     "description": "A short introduction shown in the list and article header.",
     "date": "2026-10-25",
     "category": "Notes"
   }
   ```

3. Write the body in Markdown. The title comes from the JSON, so start the body with a paragraph or `##` heading. Posts are sorted newest first; reading time is calculated from the Markdown.
4. Commit and deploy along with the rest of the site. An empty `[]` manifest shows an empty state.

Supported formatting includes headings, emphasis, links, images, lists, blockquotes, fenced code blocks, tables, task lists, and horizontal rules. Images and links resolve relative to `/blog/`; for an image in `blog/images/`, use `![Description](images/photo.jpg)`. Tables and code scroll horizontally on small screens. Raw HTML is sanitized before display.

## Local preview

From the repository root, run `python3 -m http.server 8000`, then visit `http://localhost:8000/blog/`. Opening the HTML directly as a `file://` URL will not work because the page fetches its Markdown and metadata. JavaScript is required for the blog reader.

While previewing on localhost, saving a post's Markdown or `posts.json` updates the visible page automatically within about a second. The preview preserves your scroll position and day/night theme. It pauses checks in background tabs, catches up when you return, and keeps the last good content if a save briefly produces invalid JSON or a failed request. This automatic preview is local only; the public website still updates through deployment.

## Bundled dependencies

The local scripts and stylesheet in `index.html` use `?v=` content hashes so browsers fetch the matching version after markup changes. After editing one of these assets, update its `?v=` value to the first 12 characters of its SHA-256 hash (for example, `shasum -a 256 blog/blog.js`).

The Markdown parser and HTML sanitizer are served locally:

- [Marked](https://marked.js.org/) 18.1.1, MIT (`vendor/marked.umd.js`, `vendor/marked-LICENSE.md`).
- [DOMPurify](https://github.com/cure53/DOMPurify) 3.4.17, Apache-2.0 OR MPL-2.0 (`vendor/purify.min.js`, `vendor/DOMPurify-LICENSE`).

When updating these bundles, download the corresponding files from the published npm packages and preserve their licenses.

## Citations and X posts

Use `[[1]](#ref-1)` for an inline citation and `1. <span id="ref-1"></span> Author. [Title](https://example.com). Year.` in a References section. Keep the numbers and anchor IDs in sync when adding references.

To embed an X post, add a `<div class="tweet-embed" data-tweet-id="POST_ID">` with a nested `<div class="tweet-fallback">` containing a short excerpt or description and a link to the original post. The reader loads X's official widget script only when such an embed exists, uses the selected day/night theme, and keeps the fallback visible if X is unavailable. Raw Markdown scripts and iframes remain blocked by the sanitizer.
