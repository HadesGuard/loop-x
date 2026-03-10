# Loop Backend API

Backend API for Loop - A video social media platform similar to TikTok.

> 🚀 **New to this project?** Start with [QUICK_START.md](./QUICK_START.md) - Simple 5-step setup guide!

## Overview

Loop is a short-form video sharing platform where users can:
- Upload and share short videos
- Discover trending content
- Follow creators
- Interact through likes, comments, and shares
- Message other users
- Build their creator profile with analytics

## Tech Stack (Recommended for ~1000 Users)

### Core Backend
- **Language**: **Node.js (TypeScript)**
  - ✅ Type safety với TypeScript
  - ✅ Large ecosystem
  - ✅ Easy integration với Shelby SDK
  - ✅ Good performance cho I/O operations

- **Framework**: **Express.js**
  - ✅ Simple, lightweight
  - ✅ Large community
  - ✅ Easy to learn
  - ✅ Good middleware ecosystem

- **Database**: **PostgreSQL**
  - ✅ Reliable, ACID compliant
  - ✅ Good performance
  - ✅ Full-text search built-in
  - ✅ Free (self-hosted hoặc managed như Supabase/Neon)

- **Cache**: **Redis**
  - ✅ Fast in-memory cache
  - ✅ Session storage
  - ✅ Rate limiting
  - ✅ Message queue (simple use cases)

### Storage & Processing
- **File Storage**: **Shelby Network**
  - ✅ Decentralized storage
  - ✅ Blockchain-based verification
  - ✅ Cost-effective
  - ✅ Integrated với Aptos ecosystem

- **Video Processing**: **FFmpeg** (self-hosted)
  - ✅ Free, open-source
  - ✅ Powerful transcoding
  - ✅ Run on same server hoặc separate worker

- **CDN**: **Cloudflare** (Free tier)
  - ✅ Free CDN
  - ✅ DDoS protection
  - ✅ Good performance

### Real-time
- **WebSocket**: **Socket.io**
  - ✅ Easy to use
  - ✅ Auto fallback to polling
  - ✅ Room/channel support
  - ✅ Good documentation

### Authentication
- **JWT**: **jsonwebtoken** package
- **Password Hashing**: **bcrypt**
- **OAuth**: **passport.js** (Google, Apple)
- **Wallet Auth**: **@shelby-protocol/sdk** + **@aptos-labs/ts-sdk**

### Infrastructure (VPS Self-Hosted)
- **Hosting**: **VPS** (DigitalOcean, Hetzner, Vultr - $10-15/month)
- **Database**: **PostgreSQL** (Docker container hoặc local)
- **Redis**: **Redis** (Docker container hoặc local)
- **Process Manager**: **PM2**
- **Reverse Proxy**: **Nginx**
- **SSL**: **Let's Encrypt** (free)

### Monitoring & Logging
- **Error Tracking**: **Sentry** (free tier)
- **Logging**: **Winston** + **Console** (simple)
- **Monitoring**: **Uptime Robot** (free) hoặc **Better Uptime**
- **Analytics**: Custom analytics trong database

### Message Queue (Simple)
- **Redis** (for simple queues)
  - ✅ No additional service needed
  - ✅ Good enough for 1000 users
  - ✅ Can upgrade to BullMQ later if needed

### Search
- **PostgreSQL Full-Text Search**
  - ✅ Built-in, no extra service
  - ✅ Good enough for 1000 users
  - ✅ Can upgrade to Elasticsearch later if needed

## Project Structure

```
loop-backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts   # PostgreSQL connection
│   │   ├── redis.ts      # Redis connection
│   │   ├── shelby.ts     # Shelby client setup
│   │   └── jwt.ts        # JWT config
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── video.controller.ts
│   │   ├── user.controller.ts
│   │   └── ...
│   ├── services/         # Business logic
│   │   ├── auth.service.ts
│   │   ├── video.service.ts
│   │   ├── shelby.service.ts  # Shelby upload/download
│   │   └── ...
│   ├── models/           # Database models (Prisma/TypeORM)
│   │   ├── User.ts
│   │   ├── Video.ts
│   │   └── ...
│   ├── middleware/       # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/           # API routes
│   │   ├── auth.routes.ts
│   │   ├── video.routes.ts
│   │   └── ...
│   ├── utils/           # Helper functions
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── ...
│   ├── validators/       # Input validation (Zod)
│   ├── types/            # TypeScript types
│   ├── workers/          # Background workers
│   │   ├── video-processor.worker.ts
│   │   └── notification.worker.ts
│   └── server.ts         # Express app entry point
├── tests/                # Test files
├── migrations/           # Database migrations
├── docker/               # Docker files
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/                 # Documentation
├── .env.example          # Environment variables template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js 20+** (LTS version)
- **PostgreSQL 14+** (or use Supabase/Neon free tier)
- **Redis 6+** (or use Upstash/Redis Cloud free tier)
- **FFmpeg** (for video processing)
- **pnpm** (package manager)
- **Docker** (optional, for containerization)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/loop-backend.git
cd loop-backend
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:

**Option 1: Auto-generate (Recommended)**
```bash
pnpm run setup:env
# Hoặc
./scripts/generate-env.sh
```

**Option 2: Manual**
```bash
cp .env.example .env
# Edit .env with your configuration
# Generate JWT secrets: openssl rand -hex 32
```

📝 See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for all variables

4. Set up database:
```bash
# Option 1: Use Supabase (free tier)
# - Create account at https://supabase.com
# - Create new project
# - Copy connection string to .env

# Option 2: Use Neon (free tier)
# - Create account at https://neon.tech
# - Create new project
# - Copy connection string to .env

# Option 3: Local PostgreSQL
# - Install PostgreSQL
# - Create database: createdb loop_db

# Run migrations
pnpm run migrate
```

5. Set up Redis:
```bash
# Option 1: Use Upstash (free tier)
# - Create account at https://upstash.com
# - Create Redis database
# - Copy connection string to .env

# Option 2: Local Redis
# - Install Redis: brew install redis (Mac) or apt install redis (Linux)
# - Start Redis: redis-server
```

6. Install FFmpeg:
```bash
# Mac
brew install ffmpeg

# Linux
sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

7. Start the server:
```bash
# Development
pnpm run dev

# Production
pnpm run build
pnpm start
```

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/loop_db
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# File Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=loop-videos
S3_BUCKET_URL=https://s3.amazonaws.com/loop-videos

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your.apple.client.id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key

# Video Processing
FFMPEG_PATH=/usr/bin/ffmpeg
VIDEO_MAX_SIZE=524288000  # 500MB in bytes
VIDEO_ALLOWED_FORMATS=mp4,mov,avi

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket
WS_PORT=3001
```

## Documentation

**Quick Start**: [QUICK_START.md](./QUICK_START.md) ⭐  
**Implementation Roadmap**: [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) 🚀

**Core Docs**:
- [api-specs.md](./docs/api-specs.md) - API reference
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database schema
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Config reference

**Setup**:
- [VPS_SETUP_GUIDE.md](./VPS_SETUP_GUIDE.md) - VPS setup guide

**Features**:
- [shelby-integration.md](./docs/shelby-integration.md) - Video storage, upload/download flow, payment
- [video-processing.md](./docs/video-processing.md) - Video processing
- [WALLET_AUTH_INTEGRATION.md](./WALLET_AUTH_INTEGRATION.md) - Wallet auth
- [sound-music-api.md](./docs/sound-music-api.md) - Sounds API
- [duet-stitch-api.md](./docs/duet-stitch-api.md) - Duet/Stitch
- [websocket-specs.md](./docs/websocket-specs.md) - Real-time

**Index**: [DOCS_INDEX.md](./DOCS_INDEX.md) - All docs navigation

## Key Features

### 1. Authentication
- **Email/Password** - Primary method (users không cần wallet)
- **OAuth (Google, Apple)** - Quick login
- **Wallet Auth** - Optional feature (advanced users)
- JWT-based authentication
- Refresh tokens
- Password reset

**Note**: Users KHÔNG cần wallet vì backend trả tiền cho uploads. Wallet auth là optional feature.

### 2. Video Management
- Video upload with multipart/form-data
- Video processing pipeline
- Thumbnail generation
- Multiple privacy levels
- Video metadata management

### 3. Feed System
- Personalized "For You" feed
- Following feed
- Infinite scroll pagination
- Algorithm-based recommendations

### 4. Social Features
- Follow/Unfollow users
- Like/Save videos
- Comments and replies
- Share videos
- Direct messaging

### 5. Discovery
- Search (users, videos, hashtags)
- Trending videos
- Top creators
- Hashtag pages

### 6. Analytics
- User analytics
- Video analytics
- Engagement metrics
- Growth tracking

### 7. Real-time
- WebSocket for messages
- Real-time notifications
- Typing indicators
- Presence updates

## Development

### Running Tests

```bash
pnpm test              # Run all tests
pnpm run test:watch    # Watch mode
```

### Code Style

```bash
pnpm run lint          # Check code style
pnpm run format        # Format code
pnpm run type-check    # TypeScript type checking
```

### Database Migrations

```bash
pnpm run migrate:create  # Create new migration
pnpm run migrate        # Run migrations
```

## Deployment (Self-Hosted VPS)

### Prerequisites

- VPS với Ubuntu 22.04 LTS (hoặc Debian 12)
- SSH access
- Domain name (optional, for HTTPS)
- Root hoặc sudo access

### Step 1: Initial VPS Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install FFmpeg
sudo apt install -y ffmpeg

# Logout and login again for Docker group to take effect
```

### Step 2: Clone Repository

```bash
# Clone your repository
git clone https://github.com/your-org/loop-backend.git
cd loop-backend

# Install dependencies
pnpm install
```

### Step 3: Set Up Database & Redis

**Option A: Using Docker Compose (Recommended)**

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready
sleep 10

# Run migrations
pnpm run migrate
```

**Option B: Install Locally**

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Create database
sudo -u postgres psql -c "CREATE DATABASE loop_db;"
sudo -u postgres psql -c "CREATE USER loop_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE loop_db TO loop_user;"

# Install Redis
sudo apt install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Step 4: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit environment variables
nano .env
```

**Required variables:**
```env
# Server
PORT=3000
NODE_ENV=production
BASE_URL=https://api.yourdomain.com

# Database (if using Docker Compose)
DATABASE_URL=postgresql://loop_user:loop_password@localhost:5432/loop_db

# Redis (if using Docker Compose)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-random
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# Shelby
SHELBY_API_KEY=your-shelby-api-key
SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY=your-service-account-private-key
SHELBY_SERVICE_ACCOUNT_ADDRESS=your-service-account-address

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg
```

### Step 5: Build & Start Application

```bash
# Build TypeScript
pnpm run build

# Start with PM2 (recommended for production)
npm install -g pm2
pm2 start dist/server.js --name loop-backend

# Or start with systemd (see below)
```

### Step 6: Set Up Systemd Service (Optional but Recommended)

```bash
# Create systemd service file
sudo nano /etc/systemd/system/loop-backend.service
```

**Service file content:**
```ini
[Unit]
Description=Loop Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/loop-backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable loop-backend
sudo systemctl start loop-backend

# Check status
sudo systemctl status loop-backend

# View logs
sudo journalctl -u loop-backend -f
```

### Step 7: Set Up Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/loop-backend
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/loop-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is set up automatically
```

### Step 9: Set Up Firewall

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 10: Set Up Automatic Backups

```bash
# Create backup script
nano ~/backup-loop.sh
```

**Backup script:**
```bash
#!/bin/bash
BACKUP_DIR="/backups/loop"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec loop-postgres pg_dump -U loop_user loop_db > $BACKUP_DIR/db_$DATE.sql

# Backup .env file
cp /path/to/loop-backend/.env $BACKUP_DIR/env_$DATE

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x ~/backup-loop.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/your-username/backup-loop.sh
```

### Step 11: Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop

# Monitor logs
pm2 logs loop-backend
# or
sudo journalctl -u loop-backend -f

# Monitor resources
htop
```

---

## Docker Compose Setup (Alternative)

Nếu muốn chạy tất cả trong Docker:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

## VPS Requirements

### Minimum (1000 users)
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Bandwidth**: 1TB/month
- **Cost**: ~$10-15/month (DigitalOcean, Hetzner, Vultr)

### Recommended
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Bandwidth**: 2TB/month
- **Cost**: ~$20-30/month

---

## Maintenance

### Update Application

```bash
cd /path/to/loop-backend
git pull
pnpm install
pnpm run build
pm2 restart loop-backend
# or
sudo systemctl restart loop-backend
```

### Update Dependencies

```bash
pnpm update
pnpm run build
pm2 restart loop-backend
```

### Database Migrations

```bash
cd /path/to/loop-backend
pnpm run migrate
```

### View Logs

```bash
# PM2
pm2 logs loop-backend

# Systemd
sudo journalctl -u loop-backend -f

# Docker
docker-compose logs -f
```

---

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs loop-backend
# or
sudo journalctl -u loop-backend -n 50

# Check if port is in use
sudo lsof -i :3000

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Database connection issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U loop_user -d loop_db -h localhost
```

### Redis connection issues
```bash
# Check Redis is running
sudo systemctl status redis-server
# or
docker ps | grep redis

# Test connection
redis-cli ping
```

### High memory usage
```bash
# Check memory
free -h

# Restart services
pm2 restart loop-backend
# or
sudo systemctl restart loop-backend
```

---

## Security Checklist

- [x] Firewall configured (UFW)
- [x] SSH key authentication (disable password)
- [x] SSL certificate (Let's Encrypt)
- [x] Strong JWT secrets
- [x] Database password secured
- [x] Regular backups
- [x] System updates enabled
- [x] Nginx security headers
- [x] Rate limiting enabled
- [x] CORS configured properly

### Docker Compose (For Database & Redis Only)

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.db.yml up -d

# View logs
docker-compose -f docker-compose.db.yml logs -f

# Stop services
docker-compose -f docker-compose.db.yml down
```

> **Note**: Application runs directly with Node.js/PM2, not in Docker. Only DB/Redis use Docker for easier management.

### Production Checklist (VPS)

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secret (min 32 chars, random): `openssl rand -hex 32`
- [ ] Enable HTTPS with Let's Encrypt
- [ ] Set up database backups (cron job)
- [ ] Configure CORS properly (only allow frontend domain)
- [ ] Set up monitoring (PM2 monit)
- [ ] Configure rate limiting
- [ ] Set up CDN (Cloudflare free tier, optional)
- [ ] Enable compression (Express compression middleware)
- [ ] Set up error tracking (Sentry free tier)
- [ ] Configure firewall (UFW)
- [ ] Configure Shelby API key
- [ ] Set up service account for Shelby uploads
- [ ] Set up Nginx reverse proxy
- [ ] Configure PM2 auto-restart
- [ ] Set up log rotation

## Security Considerations

1. **Authentication**
   - Use bcrypt for password hashing (10+ rounds)
   - Implement rate limiting on auth endpoints
   - Use secure, httpOnly cookies for refresh tokens
   - Validate and sanitize all inputs

2. **Authorization**
   - Verify JWT tokens on protected routes
   - Check user permissions before operations
   - Implement row-level security in database

3. **File Upload**
   - Validate file types and sizes
   - Scan files for malware
   - Store files outside web root
   - Use signed URLs for private content

4. **API Security**
   - Implement rate limiting
   - Use HTTPS only
   - Validate and sanitize inputs
   - Protect against SQL injection
   - Use parameterized queries

5. **Data Privacy**
   - Encrypt sensitive data at rest
   - Use TLS for data in transit
   - Implement GDPR compliance
   - Allow users to delete their data

## Performance Optimization

1. **Database**
   - Use indexes strategically
   - Implement connection pooling
   - Use read replicas for read-heavy operations
   - Cache frequently accessed data

2. **Caching**
   - Cache user profiles
   - Cache video metadata
   - Cache feed data
   - Use Redis for session storage

3. **Video Processing**
   - Process videos asynchronously
   - Generate multiple quality versions
   - Use CDN for video delivery
   - Implement progressive loading

4. **API**
   - Implement pagination
   - Use cursor-based pagination for feeds
   - Compress responses
   - Minimize payload sizes

## Monitoring & Logging

### Metrics to Track
- API response times
- Error rates
- Database query performance
- Video processing times
- Active users
- Request rates

### Logging
- Log all API requests
- Log errors with stack traces
- Log authentication attempts
- Log video processing events

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@loop.com or join our Discord server.

## Scaling Considerations (When > 1000 Users)

### When to Scale

**Current Stack (1000 users):**
- ✅ Single server is fine
- ✅ PostgreSQL on same server or managed
- ✅ Redis on same server or managed
- ✅ FFmpeg on same server

**When reaching 5000+ users:**
- Consider separate video processing worker
- Consider read replicas for PostgreSQL
- Consider Redis cluster
- Consider CDN for video delivery

**When reaching 10,000+ users:**
- Consider microservices architecture
- Consider message queue (RabbitMQ/BullMQ)
- Consider Elasticsearch for search
- Consider Kubernetes (if needed)

### Cost Estimate (1000 Users)

- **Hosting**: $5-10/month (Railway/Render)
- **Database**: Free tier (Supabase/Neon) or $5/month
- **Redis**: Free tier (Upstash) or $5/month
- **CDN**: Free (Cloudflare)
- **Shelby Storage**: Pay per upload (very cheap)
- **Total**: ~$10-20/month

## Roadmap

- [ ] Video editing features
- [ ] Live streaming
- [ ] Stories feature
- [ ] Advanced analytics
- [ ] Creator monetization
- [ ] Multi-language support
- [ ] Mobile app APIs
- [ ] Admin dashboard APIs

