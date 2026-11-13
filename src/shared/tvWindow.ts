const TV_WINDOW_NAME = 'painel-senhas-tv';

export function tvPageUrl(): string {
  const url = new URL(window.location.href);
  const path = url.pathname;
  const dir = path.endsWith('/') ? path : path.replace(/[^/]*$/, '');
  url.pathname = `${dir}tv.html`.replace(/\/{2,}/g, '/');
  url.search = '';
  url.hash = '';
  return url.href;
}

export function openTvWindow(): Window | null {
  const opened = window.open(tvPageUrl(), TV_WINDOW_NAME);
  if (opened) opened.focus();
  return opened;
}
