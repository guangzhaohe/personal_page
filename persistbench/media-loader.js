// Download complete MP4s before revealing or starting a synchronized group.
// The comparison viewer separately preloads its packed image-frame archives.
export function prepareVideoGroup(area, videos, label) {
  area.dataset.mediaState = 'loading';
  area.setAttribute('aria-busy', 'true');
  const panel = document.createElement('div');
  panel.className = 'video-loading-panel';
  const heading = document.createElement('div');
  heading.className = 'comparison-loading-label';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  const percentage = document.createElement('span');
  percentage.setAttribute('aria-hidden', 'true');
  heading.append(status, percentage);
  const progress = document.createElement('progress');
  progress.className = 'comparison-loading';
  progress.max = 100;
  progress.setAttribute('aria-label', `Loading ${label}`);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'comparison-retry';
  retry.textContent = 'Try again';
  retry.hidden = true;
  panel.append(heading, progress, retry);
  area.append(panel);

  const entries = videos.map(video => {
    video.pause();
    video.autoplay = false;
    return {
      video,
      source: video.querySelector('source')?.src || video.src,
      received: 0,
      total: 0,
      blob: null,
      objectURL: null,
    };
  });

  function updateProgress() {
    const total = entries.reduce((sum, entry) => sum + entry.total, 0);
    const received = entries.reduce((sum, entry) => sum + entry.received, 0);
    if (total && entries.every(entry => entry.total > 0)) {
      const value = Math.min(99, Math.floor(received / total * 100));
      progress.value = value;
      percentage.textContent = `${value}%`;
    } else {
      progress.removeAttribute('value');
      percentage.textContent = '';
    }
  }

  async function download(entry, signal) {
    if (entry.blob) return;
    const response = await fetch(entry.source, {signal});
    if (!response.ok) throw new Error(`Video request failed: ${response.status}`);
    entry.total = Number(response.headers.get('Content-Length')) || 0;
    entry.received = 0;
    updateProgress();
    if (response.body) {
      const reader = response.body.getReader();
      const chunks = [];
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        entry.received += value.byteLength;
        updateProgress();
      }
      entry.blob = new Blob(chunks, {type: 'video/mp4'});
    } else {
      entry.blob = await response.blob();
    }
    entry.received = entry.total = entry.blob.size;
    updateProgress();
  }

  function decode(entry, signal) {
    return new Promise((resolve, reject) => {
      const video = entry.video;
      let timer;
      const finish = error => {
        clearTimeout(timer);
        video.removeEventListener('loadeddata', ready);
        video.removeEventListener('error', failed);
        signal.removeEventListener('abort', aborted);
        if (error) reject(error); else resolve();
      };
      const ready = () => finish();
      const failed = () => finish(new Error('The video could not be decoded.'));
      const aborted = () => finish(new DOMException('Loading cancelled', 'AbortError'));
      if (signal.aborted) {aborted(); return;}
      video.addEventListener('loadeddata', ready, {once: true});
      video.addEventListener('error', failed, {once: true});
      signal.addEventListener('abort', aborted, {once: true});
      timer = setTimeout(failed, 30000);
      if (entry.objectURL) URL.revokeObjectURL(entry.objectURL);
      entry.objectURL = URL.createObjectURL(entry.blob);
      video.src = entry.objectURL;
      video.preload = 'auto';
      video.load();
    });
  }

  return new Promise(resolve => {
    let running = false;
    async function load() {
      if (running) return;
      running = true;
      retry.hidden = true;
      status.textContent = `Loading ${label}`;
      area.setAttribute('aria-busy', 'true');
      updateProgress();
      const controller = new AbortController();
      try {
        await Promise.all(entries.map(entry => download(entry, controller.signal)));
        status.textContent = 'Preparing playback';
        await Promise.all(entries.map(entry => decode(entry, controller.signal)));
        area.dataset.mediaState = 'ready';
        area.setAttribute('aria-busy', 'false');
        panel.remove();
        resolve();
      } catch {
        controller.abort();
        entries.forEach(({video}) => video.pause());
        area.setAttribute('aria-busy', 'false');
        status.textContent = 'Videos could not finish loading.';
        percentage.textContent = '';
        progress.hidden = true;
        retry.hidden = false;
      } finally {
        running = false;
      }
    }
    retry.addEventListener('click', () => {progress.hidden = false; void load();});
    void load();
  });
}
