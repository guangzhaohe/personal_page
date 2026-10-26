/* Static blog: add Markdown in posts/ and its metadata to posts.json. */
(() => {
  'use strict';

  const get = (id) => document.getElementById(id);
  const dateFormat = new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  const formatDate = (value) => dateFormat.format(new Date(`${value}T00:00:00Z`));
  const livePreview = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  let lastContent = null;
  let refreshing = false;
  let refreshTimer;
  let lastError = '';
  let twitterReady;
  let tweetRevision = 0;

  function loadTwitter() {
    if (window.twttr?.widgets?.createTweet) return Promise.resolve(window.twttr);
    if (!twitterReady) {
      twitterReady = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        const timeout = window.setTimeout(() => reject(new Error('X embed timed out')), 15000);
        script.onload = () => {
          clearTimeout(timeout);
          if (window.twttr?.widgets?.createTweet) resolve(window.twttr);
          else reject(new Error('X embed unavailable'));
        };
        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('X embed unavailable'));
        };
        document.head.append(script);
      });
    }
    return twitterReady;
  }

  async function renderTweets() {
    const revision = ++tweetRevision;
    const embeds = [...get('article-body').querySelectorAll('.tweet-embed[data-tweet-id]')]
      .filter(embed => /^\d{15,25}$/.test(embed.dataset.tweetId));
    if (!embeds.length) return;
    try {
      const twitter = await loadTwitter();
      if (revision !== tweetRevision) return;
      const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      await Promise.all(embeds.map(async embed => {
        // Keep the current embed or fallback visible until its replacement is ready.
        const pending = element('div', 'tweet-pending');
        pending.setAttribute('aria-hidden', 'true');
        embed.append(pending);
        try {
          const widget = await twitter.widgets.createTweet(embed.dataset.tweetId, pending, {
            theme, dnt: true, conversation: 'none', align: 'center',
          });
          if (!widget || revision !== tweetRevision || !embed.isConnected) return;
          embed.querySelector('.tweet-rendered')?.remove();
          pending.className = 'tweet-rendered';
          pending.removeAttribute('aria-hidden');
          for (const fallback of embed.querySelectorAll('.tweet-fallback')) fallback.hidden = true;
        } finally {
          if (pending.classList.contains('tweet-pending')) pending.remove();
        }
      }));
    } catch {
      // Public X content can be blocked by browsers or extensions. Keep the link readable.
    }
  }

  // Wait until the theme wave has finished before replacing third-party frames.
  new MutationObserver(() => {
    if (!document.documentElement.classList.contains('theme-tide') &&
        !document.documentElement.classList.contains('theme-fade')) renderTweets();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  async function fetchFile(path, json = false) {
    // Posts are edited independently of the page assets; always load current content.
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
    return json ? response.json() : response.text();
  }

  function showError(title, message) {
    get('blog-index').hidden = true;
    get('blog-article').hidden = true;
    get('error-state').hidden = false;
    get('error-title').textContent = title;
    get('error-message').textContent = message;
  }

  function renderIndex(posts) {
    const list = get('post-list');
    list.replaceChildren();
    if (!posts.length) {
      list.append(element('p', 'state-message', 'No posts yet. A little more soon.'));
    }
    for (const post of posts) {
      const card = element('a', 'post-card');
      card.href = `?post=${encodeURIComponent(post.slug)}`;
      const meta = element('div', 'post-meta');
      const date = element('time', '', formatDate(post.date));
      date.dateTime = post.date;
      meta.append(element('span', 'post-tag', post.category || 'Notes'), date);
      const arrow = element('span', 'post-arrow', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      card.append(meta, element('h3', '', post.title), element('p', '', post.description), arrow);
      list.append(card);
    }
    get('error-state').hidden = true;
    get('blog-article').hidden = true;
    get('blog-index').hidden = false;
  }

  function renderArticle(post, markdown) {
    const words = markdown.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 220));
    get('article-title').textContent = post.title;
    get('article-description').textContent = post.description;
    const date = element('time', '', formatDate(post.date));
    date.dateTime = post.date;
    get('article-meta').replaceChildren(date, element('span', '', `${minutes} min read`));
    document.querySelector('meta[name="description"]').content = post.description;
    const body = get('article-body');
    body.innerHTML = DOMPurify.sanitize(marked.parse(markdown, { gfm: true }), {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['style', 'form', 'button'],
      FORBID_ATTR: ['style'],
    });
    for (const table of body.querySelectorAll('table')) {
      const wrapper = element('div', 'table-scroll');
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', 'Scrollable table');
      table.replaceWith(wrapper);
      wrapper.append(table);
    }
    for (const pre of body.querySelectorAll('pre')) {
      pre.tabIndex = 0;
      pre.setAttribute('aria-label', 'Code block');
    }
    get('blog-index').hidden = true;
    get('error-state').hidden = true;
    get('blog-article').hidden = false;
    renderTweets();
  }

  get('copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      get('copy-status').textContent = 'Link copied';
    } catch {
      get('copy-status').textContent = 'Copy the link from your browser’s address bar.';
    }
  });

  async function init() {
    if (refreshing) return;
    clearTimeout(refreshTimer);
    refreshing = true;
    const slug = new URLSearchParams(window.location.search).get('post');
    try {
      const posts = await fetchFile('posts.json', true);
      // An editor may briefly write incomplete metadata while saving. Validate before
      // touching the visible page so the last good preview stays readable.
      if (!Array.isArray(posts) || posts.some(post =>
        !post || ['slug', 'title', 'description', 'date'].some(key => typeof post[key] !== 'string') ||
        !Number.isFinite(Date.parse(`${post.date}T00:00:00Z`)))) {
        throw new Error('Invalid post metadata');
      }
      posts.sort((a, b) => b.date.localeCompare(a.date));
      let content;
      let render;
      if (slug !== null) {
        // Only load known posts; query parameters never become arbitrary file paths.
        const post = posts.find((item) => item.slug === slug);
        if (!post) {
          showError('Post not found.', 'This article may have moved. You can find all available posts on the blog.');
          lastContent = null;
          return;
        }
        const markdown = await fetchFile(`posts/${encodeURIComponent(post.slug)}.md`);
        content = JSON.stringify([post, markdown]);
        render = () => renderArticle(post, markdown);
      } else {
        content = JSON.stringify(posts);
        render = () => renderIndex(posts);
      }
      // Skip unchanged content, including during theme animations. Update in place
      // so reading position and theme survive a save without a full-page reload.
      if (content !== lastContent && (lastContent === null ||
          !document.documentElement.classList.contains('theme-tide'))) {
        const position = { left: window.scrollX, top: window.scrollY, behavior: 'instant' };
        const updating = lastContent !== null;
        render();
        lastContent = content;
        if (updating) window.scrollTo(position);
      }
      lastError = '';
    } catch (error) {
      if (error.message !== lastError) console.error(error);
      lastError = error.message;
      if (lastContent === null) {
        showError('Unable to load the blog.', 'Please refresh to try again, or come back in a moment.');
      }
    } finally {
      refreshing = false;
      if (livePreview && !document.hidden) refreshTimer = window.setTimeout(init, 1000);
    }
  }

  if (livePreview) {
    document.addEventListener('visibilitychange', () => {
      clearTimeout(refreshTimer);
      if (!document.hidden) init();
    });
    window.addEventListener('pagehide', () => clearTimeout(refreshTimer));
    window.addEventListener('pageshow', event => { if (event.persisted) init(); });
  }

  init();
})();
