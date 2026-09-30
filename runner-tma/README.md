# Heist Run — Endless Runner para Telegram Mini Apps

Un ladrón escapa de la policía por la ciudad con el botín. Tres carriles, swipes, velocidad
creciente, monedas, tienda y **Rewarded Ads (Adsgram)** en los dos momentos clave:

| Momento | Anuncio | Recompensa |
|---|---|---|
| Antes de jugar (menú / fin de partida / tienda) | **Multiplier Ad** | x2 monedas en la próxima partida |
| Al chocar (pantalla de 5 s) | **Revive Ad** | Seguir desde donde chocaste (máx. 3 por partida) |

**Stack:** Canvas 2D puro (sin Phaser: ~90 KB en total, ~28 KB con gzip, carga instantánea en el WebView de Telegram) ·
Node.js 20+ · Express 5 · SQLite (better-sqlite3) · Adsgram SDK.

---

## Paso 1 — Estructura y setup

```
runner-tma/
├── server/
│   ├── index.js         # punto de entrada (lee .env, abre DB, levanta Express)
│   ├── app.js           # Express: helmet, rate-limit, estáticos, API
│   ├── config.js        # variables de entorno + validación (falla si falta algo en prod)
│   ├── db.js            # esquema SQLite (users, inventory, runs, ad_views, coin_ledger)
│   ├── auth.js          # validación HMAC del initData de Telegram
│   ├── antiCheat.js     # validación de partidas (tiempo real + monedas existentes)
│   ├── ads.js           # flujo de anuncios recompensados + callback S2S de Adsgram
│   ├── errors.js
│   └── routes/api.js    # endpoints
├── shared/              # código usado por CLIENTE y SERVIDOR
│   ├── gameConfig.js    # física (velocidad, aceleración) + fórmulas de límite
│   ├── track.js         # generador de pista determinístico por seed
│   └── catalog.js       # skins, mejoras, boosts y precios
├── public/              # frontend (servido por Express)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── main.js      # flujo: menú, partida, revive, tienda, ranking
│       ├── telegram.js  # wrapper de window.Telegram.WebApp
│       ├── api.js       # cliente HTTP
│       ├── ads.js       # Adsgram + anuncio mock
│       ├── audio.js     # efectos WebAudio (sin archivos)
│       ├── ui.js        # DOM: tienda, ranking, HUD
│       └── game/
│           ├── engine.js    # física, colisiones, power-ups
│           ├── renderer.js  # pseudo-3D en Canvas (ciudad, vehículos, personaje)
│           └── input.js     # swipes + teclado
├── test/                # tests (node:test) — 23 casos
├── deploy/              # nginx.conf, backup.sh
├── Dockerfile · docker-compose.yml · ecosystem.config.cjs (PM2)
└── .env.example
```

### Correrlo en tu PC (sin Telegram)

```bash
cd runner-tma
npm install
cp .env.example .env
# Editá .env para desarrollo:
#   NODE_ENV=development
#   DEV_AUTH=true
#   ADS_PROVIDER=mock
npm run dev          # http://localhost:3000
npm test             # corre los tests
```

Con `DEV_AUTH=true` podés abrir `http://localhost:3000/?uid=123` en el navegador (cada `uid` es un
jugador distinto). Controles en PC: flechas o WASD. El anuncio "mock" dura 5 s y permite probar
todo el flujo de recompensas.

> `DEV_AUTH` y `ADS_PROVIDER=mock` se **bloquean automáticamente** con `NODE_ENV=production`.

---

## Paso 2 — Backend (API)

Todas las rutas (salvo `/api/config` y el callback de Adsgram) exigen el header
`Authorization: tma <initData>`, que el servidor valida con HMAC-SHA256 usando tu `BOT_TOKEN`
([algoritmo oficial](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)).
Nadie puede hacerse pasar por otro Telegram ID.

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/config` | Config pública (proveedor de ads, catálogo) |
| GET | `/api/me` | Perfil: monedas, récord, inventario, x2 pendiente |
| POST | `/api/runs/start` | Crea partida → devuelve `runId` + `seed`; descuenta boosts; aplica x2 |
| POST | `/api/runs/:id/finish` | Recibe distancia/monedas → valida → acredita |
| POST | `/api/ads/request` | Registra un anuncio pendiente (`multiplier` o `revive`) |
| POST | `/api/ads/claim` | Entrega la recompensa si el anuncio se verificó |
| GET | `/api/ads/adsgram/reward` | Callback server-to-server de Adsgram |
| POST | `/api/shop/buy` | Compra `skin:<id>`, `upgrade:<id>`, `consumable:<id>` |
| POST | `/api/shop/equip` | Equipa una skin propia |
| GET | `/api/leaderboard` | Top 50 + tu posición |

### Anti-cheat (qué protege y qué no)

- **Monedas:** el servidor genera la `seed` de la pista. Como el generador es el mismo código en
  cliente y servidor (`shared/track.js`), el servidor sabe cuántas monedas **existían** hasta la
  distancia reportada. Nadie puede cobrar más de esas.
- **Distancia:** el servidor mide el tiempo real desde `runs/start`. Con la fórmula de aceleración
  (`shared/gameConfig.js`) calcula la distancia máxima posible en ese tiempo.
- **Revives:** máximo 3 por partida, controlado en DB; cada uno exige un anuncio verificado.
- **Anuncios:** con `ADSGRAM_REWARD_SECRET`, la recompensa sólo se entrega si Adsgram confirma
  server-to-server. Además: cooldown entre anuncios y tope diario por usuario.
- **Economía:** transacciones SQLite + libro contable (`coin_ledger`) de cada movimiento.
- **Lo que NO se puede evitar:** un bot que juegue "perfecto" (pasa en cualquier juego con lógica en
  el cliente). Como las monedas no tienen valor real, el daño se limita al ranking. Las partidas
  sospechosas quedan marcadas en `runs.flagged` y `users.suspicious_count`.

---

## Paso 3 — Frontend (juego)

- Render pseudo-3D con proyección en perspectiva sobre Canvas 2D, todo dibujado con primitivas
  (sin imágenes para descargar). DPR limitado a 2 para mantener 60 FPS en celulares medios.
- Obstáculos: **valla** (saltar ↑), **cinta POLICE LINE** (rodar ↓), **furgón/camión** (cambiar de
  carril). Chocar de costado contra un vehículo te rebota en vez de matarte.
- Power-ups en pista: **imán** y **escudo** (su duración sube con las mejoras de la tienda).
- Integración Telegram: `ready()`, `expand()`, `disableVerticalSwipes()` (clave para que el swipe
  hacia abajo no cierre la app), colores de header, `HapticFeedback`, `BackButton`,
  confirmación de cierre durante la partida y pausa automática al minimizar.

---

## Paso 4 — Anuncios (Adsgram)

1. Entrá a **https://partner.adsgram.ai**, iniciá sesión con Telegram.
2. Agregá tu app (link `https://t.me/TuBot/tuapp`) y creá un **bloque de tipo Reward**.
   Copiá el **Block ID** → `ADSGRAM_BLOCK_ID` en `.env`.
3. En la configuración del bloque, poné la **Reward URL**:
   ```
   https://juego.tudominio.com/api/ads/adsgram/reward?userid=[userId]&secret=TU_SECRETO
   ```
   (`TU_SECRETO` = `ADSGRAM_REWARD_SECRET`, generalo con `openssl rand -hex 24`.)
   Revisá en el panel que el placeholder del usuario sea exactamente `[userId]`; si Adsgram lo
   cambia, ajustalo — el servidor acepta `userid` o `userId`.
4. Mientras tu app está en moderación usá `ADSGRAM_DEBUG=true` (anuncios de prueba).
5. `ADS_PROVIDER=adsgram` y reiniciá.

El código del cliente está en `public/js/ads.js`: carga el SDK `https://sad.adsgram.ai/js/sad.min.js`,
`Adsgram.init({ blockId })` y `controller.show()`. Para agregar otra red (Monetag, etc.) sólo hay que
sumar un caso en `playAd()`.

---

## Paso 5 — Despliegue en VPS Ubuntu (22.04 / 24.04)

**Necesitás:** un VPS (1 vCPU / 1 GB alcanza para empezar), un dominio (o subdominio) y el token del bot.
Telegram **exige HTTPS** para Mini Apps.

### 5.1 DNS
Creá un registro **A** `juego.tudominio.com → IP_DEL_VPS` y esperá a que propague.

### 5.2 Preparar el servidor
```bash
ssh root@IP_DEL_VPS
apt update && apt upgrade -y
apt install -y git nginx sqlite3 ufw
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

### 5.3 Subir el código
```bash
git clone https://github.com/TU_USUARIO/TU_REPO.git /opt/src
cp -r /opt/src/runner-tma /opt/heist-runner
cd /opt/heist-runner
cp .env.example .env
nano .env        # BOT_TOKEN, ADSGRAM_*, PUBLIC_URL, NODE_ENV=production
```

### 5.4a Opción A — Docker (recomendada)
```bash
curl -fsSL https://get.docker.com | sh
cd /opt/heist-runner
docker compose up -d --build
docker compose logs -f          # verificar "Escuchando en http://0.0.0.0:3000"
```

### 5.4b Opción B — PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
cd /opt/heist-runner
npm ci --omit=dev
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup         # ejecutá el comando que imprime para arrancar al bootear
```

### 5.5 Nginx + HTTPS
```bash
cp /opt/heist-runner/deploy/nginx.conf /etc/nginx/sites-available/heist-runner
sed -i 's/juego.tudominio.com/TU_DOMINIO_REAL/' /etc/nginx/sites-available/heist-runner
ln -s /etc/nginx/sites-available/heist-runner /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d TU_DOMINIO_REAL          # SSL gratis + renovación automática
curl https://TU_DOMINIO_REAL/healthz        # {"ok":true}
```

### 5.6 Vincular con BotFather
1. En Telegram abrí **@BotFather** → `/newbot` → nombre y usuario → copiá el **token** a `BOT_TOKEN`.
2. `/newapp` → elegí tu bot → título, descripción, foto 640×360 → **URL**: `https://TU_DOMINIO_REAL`
   → short name (ej. `heist`). Tu juego queda en `https://t.me/TuBot/heist` (este link es el que
   compartís y el que registrás en Adsgram).
3. Opcional: `/mybots` → tu bot → **Bot Settings → Menu Button** → misma URL, texto "🎮 Jugar".
4. Reiniciá la app después de cambiar `.env`: `docker compose up -d` o `pm2 reload heist-runner`.

### 5.7 Actualizar y respaldar
```bash
# Actualizar
cd /opt/src && git pull && rsync -a --exclude data --exclude .env runner-tma/ /opt/heist-runner/
cd /opt/heist-runner && docker compose up -d --build      # o: npm ci --omit=dev && pm2 reload heist-runner

# Backup diario de la base de datos (cron)
crontab -e
0 4 * * * APP_DIR=/opt/heist-runner /opt/heist-runner/deploy/backup.sh >> /var/log/heist-backup.log 2>&1
```

---

## Ajustes rápidos

- **Precios / skins / mejoras:** `shared/catalog.js`.
- **Dificultad y velocidad:** `shared/gameConfig.js` (el anti-cheat se ajusta solo).
- **Frecuencia de obstáculos:** `generateRow()` en `shared/track.js`.
- **Tope diario de anuncios:** `ADS_DAILY_CAP`.
