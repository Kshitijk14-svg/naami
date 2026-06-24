# NAAMI — OVHcloud VPS Deployment Runbook

Target: **OVH VPS, Singapore region, 2 vCPU / 4 GB, Ubuntu 22.04/24.04 LTS.**
Stack on the box: Next.js (PM2 cluster) + self-hosted PostgreSQL + Nginx + Certbot.
Redis stays external on **Upstash** (no install needed).

> Latency note: Supabase is gone — the DB is on localhost (<1 ms). If you want
> the absolute lowest external-Redis latency, create the Upstash database in its
> **Singapore** region too.

---

## 0. Local development first

```bash
cp .env.example .env.local          # then edit values
docker compose up -d                # Postgres on localhost:5432
npm install
npm run db:generate                 # generate SQL from src/db/schema.ts
npm run db:migrate                  # apply to local Postgres
npm run db:seed                     # 4 categories, 14 products, 2 collections
npm run dev                         # http://localhost:3000
```

Edit `.env.local` so `DATABASE_URL=postgres://naami:CHANGEME@localhost:5432/naami`
and `DATABASE_SSL=false`. Fill the Upstash URL/token (or leave blank — the app
fails open without Redis).

---

## 1. Provision & harden the VPS

```bash
ssh root@<VPS_IP>
adduser naami && usermod -aG sudo naami      # non-root sudo user
rsync --archive ~/.ssh/authorized_keys /home/naami/.ssh/   # copy your key
# Edit /etc/ssh/sshd_config -> PasswordAuthentication no, PermitRootLogin no
systemctl restart ssh

apt update && apt -y upgrade
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

### Add 2 GB swap (safety net so a traffic/build spike degrades, not OOM-kills)
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 2. Install the stack (as user `naami`)

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# PostgreSQL 16, Nginx, Certbot
sudo apt install -y postgresql postgresql-contrib nginx certbot python3-certbot-nginx
```

---

## 3. PostgreSQL setup & tuning

```bash
sudo -u postgres psql <<'SQL'
CREATE USER naami WITH PASSWORD 'STRONG_PASSWORD_HERE';
CREATE DATABASE naami OWNER naami;
SQL
```

Tune `/etc/postgresql/16/main/postgresql.conf` for a 4 GB box:
```
listen_addresses = 'localhost'     # never expose the DB publicly
shared_buffers = 1GB
effective_cache_size = 2GB
work_mem = 16MB
maintenance_work_mem = 256MB
max_connections = 50
```
Confirm `/etc/postgresql/16/main/pg_hba.conf` uses `scram-sha-256` (or `md5`)
for local connections, then `sudo systemctl restart postgresql`.

---

## 4. Deploy the app

```bash
git clone <REPO_URL> /home/naami/naami && cd /home/naami/naami
npm ci

# Production env
cp .env.example .env.production
#   DATABASE_URL=postgres://naami:STRONG_PASSWORD_HERE@localhost:5432/naami
#   DATABASE_SSL=false
#   SUPER_ADMIN_EMAIL + UPSTASH_* filled in

set -a; . ./.env.production; set +a    # export for the CLI steps below
npm run db:migrate
npm run db:seed

npm run build      # build script caps heap at 2048MB; swap covers spikes
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # run the command it prints (enables boot autostart)
```

> If `npm run build` still struggles on 4 GB, build locally and `rsync` the
> `.next/` directory + `package.json` + `node_modules` to the VPS instead.

PM2 reads env from the shell — start it in the same session where you sourced
`.env.production` (or use `pm2 start ecosystem.config.js --update-env`).

---

## 5. Nginx + SSL

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/naami
# edit server_name -> your domain
sudo ln -s /etc/nginx/sites-available/naami /etc/nginx/sites-enabled/naami
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d naami.example.com -d www.naami.example.com
```
Point your domain's **A record** at the VPS IP before running Certbot.

---

## 6. Nightly database backups

```bash
sudo mkdir -p /backups && sudo chown naami:naami /backups
crontab -e
```
Add:
```
0 3 * * * pg_dump naami | gzip > /backups/naami_$(date +\%F).sql.gz && find /backups -name 'naami_*.sql.gz' -mtime +7 -delete
```
(Optional: `rclone`/`scp` the dump offsite so a VPS loss isn't total.)

---

## 7. Verify

- `pm2 status` → **2 workers online**.
- `curl -s localhost:3000/api/products` → seeded JSON; log timing shows DB <5 ms.
- `https://your-domain` loads with a valid Let's Encrypt cert.
- Lighthouse on `/` → LCP < 2.5 s; hero image served as AVIF/WebP.
- `sudo reboot` → after boot, `pm2 status` shows the app back automatically.
- Next morning: a `naami_YYYY-MM-DD.sql.gz` exists in `/backups`.

---

## Optional future hardening
- **Self-host Redis** on the box (`apt install redis`) to drop the Upstash
  dependency — requires rewriting `src/lib/redis.ts` off the `@upstash/*`
  clients (e.g. to `ioredis`). Not needed at launch.
- **Cloudflare** (free) in front for edge caching of static assets + DDoS.
- **PgBackRest** or a managed snapshot for point-in-time recovery beyond nightly dumps.
