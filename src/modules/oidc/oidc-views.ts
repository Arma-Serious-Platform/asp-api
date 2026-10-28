// Pages the provider renders itself: the error page and the logout
// confirmation. They follow the look of the site's own pages and load its
// background, logo and font from the frontend.

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ICONS = {
  warning:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path>',
};

function icon(name: keyof typeof ICONS, color: string) {
  return `<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

function page(frontendUrl: string, title: string, card: string) {
  const assets = escapeHtml(frontendUrl);

  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} | Virtual Tactical Games</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;600;700&amp;display=swap">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;font-family:'Roboto Condensed',sans-serif;color:#fff;background:#111 url('${assets}/images/bg.jpeg') no-repeat center center fixed;background-size:cover}
header{display:flex;align-items:center;gap:12px;padding:20px 32px}
header img{width:40px;height:40px}
header span{font-size:18px;font-weight:700;letter-spacing:.02em}
main{flex-grow:1;display:flex;align-items:center;justify-content:center;padding:24px 16px 48px}
.card{width:100%;max-width:440px;padding:32px;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.45);border-radius:12px;backdrop-filter:blur(8px)}
.badge{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.badge.warning{background:rgba(217,119,6,.14);border:1px solid rgba(245,158,11,.55)}
.badge.neutral{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15)}
h1{margin:0;font-size:26px;font-weight:700}
p{margin:0;font-size:15px;line-height:1.5;color:#d4d4d8}
p.muted{font-size:14px;color:#a1a1aa}
.code{width:100%;padding:10px 12px;border-radius:6px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);font-family:ui-monospace,Consolas,monospace;font-size:13px;color:#a1a1aa;text-align:left;overflow-wrap:anywhere}
.account{width:100%;display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);text-align:left}
.avatar{width:40px;height:40px;border-radius:50%;background:#3f6212;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0}
.account b{display:block;font-size:15px}
.account small{display:block;font-size:13px;color:#a1a1aa}
form{width:100%;display:flex;flex-direction:column;gap:12px;margin:0}
.button{width:100%;min-height:44px;padding:8px 16px;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:16px;font-family:inherit;text-decoration:none;cursor:pointer}
.button.primary{border:1px solid #65a30d;background:#4d7c0f;color:#fff;font-weight:600}
.button.primary:hover{background:#65a30d}
.button.secondary{border:1px solid #525252;background:#262626;color:#f4f4f5;font-weight:500}
.button.secondary:hover{background:#3f3f46}
a.link{font-size:14px;color:#a1a1aa;text-decoration:none}
a.link:hover{color:#bef264}
</style>
</head>
<body>
<header><img src="${assets}/images/logo.webp" alt=""><span>Virtual Tactical Games</span></header>
<main><section class="card">${card}</section></main>
</body>
</html>`;
}

export function renderErrorPage(params: { frontendUrl: string; code: string }) {
  return page(
    params.frontendUrl,
    'Не вдалося обробити запит на вхід',
    `<div class="badge warning">${icon('warning', '#fbbf24')}</div>
<h1>Не вдалося обробити запит на вхід</h1>
<p>Посилання для входу недійсне або застаріло. Поверніться на сайт, з якого прийшли, і спробуйте ще раз.</p>
<p class="muted">Якщо помилка повторюється, повідомте адміністрацію цього сайту.</p>
<div class="code">Код помилки: ${escapeHtml(params.code)}</div>
<a class="button primary" href="${escapeHtml(params.frontendUrl)}/">На головну VTG</a>`,
  );
}

function initials(nickname: string) {
  return nickname.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?';
}

export function renderLogoutPage(params: {
  frontendUrl: string;
  action: string;
  xsrf: string;
  clientName?: string;
  account?: { nickname: string; email: string };
}) {
  const { account, clientName } = params;
  const hidden = `<input type="hidden" name="xsrf" value="${escapeHtml(params.xsrf)}">`;
  const appName = clientName ? escapeHtml(clientName) : undefined;

  return page(
    params.frontendUrl,
    'Вихід з VTG',
    `<div class="badge neutral">${icon('logout', '#e4e4e7')}</div>
<h1>Вийти з VTG?</h1>
<p>${appName ? `${appName} просить завершити ваш сеанс.` : 'Сайт просить завершити ваш сеанс.'} Ви можете вийти лише з цього додатка або з VTG і всіх підключених додатків у цьому браузері.</p>
${
  account
    ? `<div class="account"><div class="avatar">${escapeHtml(initials(account.nickname))}</div><div><b>${escapeHtml(account.nickname)}</b><small>${escapeHtml(account.email)}</small></div></div>`
    : ''
}
<form method="post" action="${escapeHtml(params.action)}">
${hidden}
${appName ? `<button class="button secondary" type="submit">Вийти лише з ${appName}</button>` : ''}
<button class="button primary" type="submit" name="logout" value="yes">Вийти з VTG і всіх додатків</button>
</form>
<a class="link" href="${escapeHtml(params.frontendUrl)}/">Залишитися</a>`,
  );
}

/** First-party logout with a valid id_token_hint: no question asked. */
export function renderAutoLogoutPage(params: {
  frontendUrl: string;
  action: string;
  xsrf: string;
}) {
  return page(
    params.frontendUrl,
    'Вихід з VTG',
    `<div class="badge neutral">${icon('logout', '#e4e4e7')}</div>
<h1>Виходимо з VTG…</h1>
<form id="logout" method="post" action="${escapeHtml(params.action)}">
<input type="hidden" name="xsrf" value="${escapeHtml(params.xsrf)}">
<input type="hidden" name="logout" value="yes">
<noscript><button class="button primary" type="submit">Продовжити</button></noscript>
</form>
<script>document.getElementById('logout').submit()</script>`,
  );
}
