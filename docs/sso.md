# Вхід через VTG (OpenID Connect)

API працює як провайдер OpenID Connect: інші сайти можуть пропонувати кнопку
«Увійти через VTG». Логін, 2FA, бани і ролі лишаються на VTG; додатки
отримують лише те, що дозволив користувач, і завжди в актуальному стані.

## Як це влаштовано

- Провайдер — [`oidc-provider`](https://github.com/panva/node-oidc-provider),
  змонтований на `/api/oidc` (`src/modules/oidc`).
- Єдиний вхід — сесія VTG (`UserSession`). Кожен грант пам'ятає сесію, з
  якої його видано: вихід з VTG, завершення сесії в профілі, зміна пароля,
  перманентний бан чи видалення акаунта миттєво анулюють коди й токени та
  надсилають додаткам back-channel logout.
- Тимчасовий бан вхід не блокує: додаток бачить `game_access: false` і
  `banned_until` та сам вирішує, що обмежити. Перманентний бан = акаунт
  видалено: вхід неможливий, `userinfo` відповідає 401.
- Сторінки входу й дозволу — `asp-web` (`/oauth/[uid]`), список підключених
  додатків — у профілі. Сторінки помилки й виходу рендерить сам провайдер
  (`oidc-views.ts`).

## Налаштування сервера

```bash
npm run oidc:keys   # друкує OIDC_JWKS, OIDC_COOKIE_KEYS, OIDC_CLIENT_SECRET_KEY
```

| Змінна | Що це |
|---|---|
| `OIDC_ISSUER` | Публічна адреса `/api/oidc`, напр. `https://api.example.com/api/oidc`. Порожня — провайдер вимкнено. Після першої інтеграції не змінюється. |
| `OIDC_JWKS` | Приватні ключі підпису (RS256). Ротація: новий ключ першим у масиві, старий лишити, доки не сплинуть видані ним токени. |
| `OIDC_COOKIE_KEYS` | Ключі підпису cookie провайдера, через кому. |
| `OIDC_CLIENT_SECRET_KEY` | Ключ шифрування секретів клієнтів у БД. |
| `OIDC_ALLOW_PRIVATE_NETWORK_FETCH` | Лише для локальної розробки: дозволяє back-channel logout на `localhost`/приватні адреси. У продакшні не вмикати. |

Cookie сесії VTG має доходити до issuer: віддавайте `/api/oidc` з хоста API
або задайте `SESSION_COOKIE_DOMAIN`. Сторінки входу живуть на першій адресі з
`FRONTEND_URL`.

## Реєстрація додатка

Клієнтів реєструють `OWNER` або `SERVER_ADMIN`: в адмінці (вкладка «Додатки»)
або через API (Swagger, тег `sso`):

```http
POST /api/sso/clients
{
  "name": "Squad Stats",
  "redirectUris": ["https://stats.example.org/callback"],
  "postLogoutRedirectUris": ["https://stats.example.org/"],
  "backchannelLogoutUri": "https://stats.example.org/backchannel-logout",
  "allowedScopes": ["profile", "roles", "game"],
  "firstParty": false
}
```

Відповідь містить `clientId` і `clientSecret`; секрет показується лише раз
(новий — `POST /api/sso/clients/:id/rotate-secret`). `firstParty: true` — наші
власні додатки: без екрана дозволу і з тихим виходом. `"confidential": false`
— для браузерних/мобільних додатків без секрету (лише PKCE). `PATCH` з
`"disabled": true` вимикає додаток і завершує всі його сесії.

Адреси: тільки `https`, точний збіг, без `*` і `#`; `http` — лише для
`localhost`/`127.0.0.1`.

## Для розробників додатків

Discovery: `<OIDC_ISSUER>/.well-known/openid-configuration`. Підходить будь-яка
бібліотека OpenID Connect без додаткового коду: перевірено з `openid-client`
(на ній же побудований Auth.js); Grafana, Discourse, passport, Socialite
налаштовуються звичайним «generic OIDC» з issuer, client ID і секретом.

- Потік — Authorization Code. PKCE (`S256`) обов'язковий для браузерних і
  мобільних додатків (без секрету) і рекомендований для серверних.
- Секрет можна передавати і в заголовку (`client_secret_basic`), і в тілі
  запиту (`client_secret_post`) — як зручніше бібліотеці.
- Скоупи, яких додатку не дозволено, просто не видаються (бібліотеки часто
  просять `openid profile email` за замовчуванням) — фактичні скоупи є в полі
  `scope` відповіді токен-ендпоінта.
- **Ідентифікуйте користувача лише за `sub`.** Нікнейм і email змінюються.
- `id_token` містить профіль на момент входу (`name`, `email`,
  `asp_roles`…) — цього досить бібліотекам, які будують користувача з нього.
  Актуальні дані — у `userinfo`: не кешуйте його довше хвилини, тоді ролі,
  нікнейм і бан завжди свіжі.
- Refresh-токен: скоуп `offline_access` разом із `prompt=consent` (так вимагає
  OpenID Connect).
- Реалізуйте back-channel logout: на `logout_token` завершуйте всі сесії
  цього `sub`. Він приходить при виході з VTG, бані, зміні пароля,
  відкликанні доступу користувачем.
- Вихід: перенаправте на `end_session_endpoint` з `id_token_hint` і
  `post_logout_redirect_uri`.

| Скоуп | Claims з `userinfo` |
|---|---|
| `openid` | `sub` |
| `profile` | `name` (= нікнейм), `nickname`, `preferred_username`, `picture`, `updated_at` |
| `email` | `email`, `email_verified` |
| `roles` | `asp_roles` |
| `squad` | `squad {id, name, tag}`, `squad_role`, `side` |
| `game` | `steam_id`, `game_access`, `banned_until`, `muted` |
| `offline_access` | refresh-токен (до 30 днів, не довше за сесію VTG) |

Access-токен живе 10 хвилин; коди, токени й refresh-токени діють, лише доки
жива сесія VTG, з якої їх видано.

Приклад для Auth.js (Next.js):

```ts
{
  id: 'vtg',
  name: 'VTG',
  type: 'oidc',
  issuer: process.env.VTG_ISSUER, // https://…/api/oidc
  clientId: process.env.VTG_CLIENT_ID,
  clientSecret: process.env.VTG_CLIENT_SECRET,
  authorization: { params: { scope: 'openid profile roles' } },
}
```

Ролі приходять у `profile.asp_roles` (на момент входу).

## Якщо колись з'явиться зміна email

Зараз email змінити не можна, тож `email_verified` завжди правдивий. Потік
зміни email мусить скидати підтвердження (`isEmailVerified = false`) до
перевірки нової адреси: додатки, що зв'язують акаунти за підтвердженим email,
інакше можна захопити, вписавши чужу адресу.

## Тести

```bash
npx jest src/modules/oidc                     # юніт-тести
OIDC_E2E_DATABASE_URL=postgresql://user:pass@localhost:5432/asp_oidc_e2e \
  npm run test:e2e:oidc                       # повні потоки проти зібраного API
```

e2e створює в базі `*_e2e` нову схему на кожен запуск і видаляє її після.
