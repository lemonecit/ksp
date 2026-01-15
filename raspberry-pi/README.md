# 🍓 Raspberry Pi Database Server

This folder contains the setup for running the KSP database on a Raspberry Pi, exposed securely via Cloudflare Tunnel.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Vercel         │     │  Railway        │     │  Raspberry Pi   │
│  (Web Frontend) │────▶│  (API Server)   │────▶│  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                    ▲
                                                    │ Cloudflare Tunnel
                                                    │ (Secure, no port forwarding)
                                                    ▼
                                              ┌─────────────────┐
                                              │  Internet       │
                                              └─────────────────┘
```

## Setup

### 1. Copy files to Raspberry Pi

```bash
scp -r raspberry-pi/* pi@raspberrypi.local:~/ksp-db/
```

### 2. Run setup script

```bash
ssh pi@raspberrypi.local
cd ~/ksp-db
chmod +x setup.sh
./setup.sh
```

### 3. Configure Cloudflare Tunnel

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. Navigate to **Access → Tunnels**
3. Click **Create a tunnel**
4. Name it `ksp-db`
5. Copy the tunnel token to `.env` file
6. Add a **Public Hostname**:
   - Subdomain: `db` (or your choice)
   - Domain: Your domain
   - Service: `tcp://postgres:5432`

### 4. Start services

```bash
docker-compose up -d
```

### 5. Verify

```bash
# Check all containers are running
docker-compose ps

# Check logs
docker-compose logs -f postgres
docker-compose logs -f cloudflared
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Main database |
| pgAdmin | 5050 | Database admin UI |
| Cloudflared | - | Tunnel to Cloudflare |
| Scraper | - | Runs every 6 hours |

## Environment Variables

After setup, you'll need these in Railway/Vercel:

```env
DATABASE_URL=postgresql://ksp:YOUR_PASSWORD@db.yourdomain.com:5432/ksp_affiliate
```

## Maintenance

### Backup database

```bash
docker-compose exec postgres pg_dump -U ksp ksp_affiliate > backup.sql
```

### Restore database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U ksp ksp_affiliate
```

### Update containers

```bash
docker-compose pull
docker-compose up -d
```

### View scraper logs

```bash
docker-compose logs -f scraper
```

## Troubleshooting

### Tunnel not connecting

1. Check tunnel token is correct in `.env`
2. Verify tunnel is active in Cloudflare dashboard
3. Check logs: `docker-compose logs cloudflared`

### Database connection refused

1. Check PostgreSQL is healthy: `docker-compose ps`
2. Test locally: `docker-compose exec postgres psql -U ksp -d ksp_affiliate`

### Scraper failing

1. Check logs: `docker-compose logs scraper`
2. Ensure DATABASE_URL is correct
3. Try running manually: `docker-compose run scraper npm run scrape`
