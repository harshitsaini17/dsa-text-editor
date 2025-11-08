# Deployment Guide

This guide covers deploying the Collaborative Text Editor to various platforms.

## Table of Contents
- [Local Development](#local-development)
- [Production Build](#production-build)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Environment Variables](#environment-variables)
- [Monitoring](#monitoring)

## Local Development

### Server Development Mode
```bash
cd server
npm install
npm run dev
# Server runs on ws://localhost:8080
```

### Client Development Mode
```bash
cd client
npm install
npm run dev
# Client runs on http://localhost:5173
```

### Running Tests
```bash
# Server tests
cd server
npm test

# Client tests
cd client
npm test

# All tests with coverage
npm run test:coverage
```

## Production Build

### Server Production Build
```bash
cd server
npm install --production
npm run build
# Compiled output in dist/

# Run production build
NODE_ENV=production node dist/index.js
```

### Client Production Build
```bash
cd client
npm install
npm run build
# Static files in dist/

# Preview production build
npm run preview
```

### Build Optimizations
- TypeScript compiled to ES2020 target
- Client assets minified and bundled
- Code splitting for optimal loading
- Source maps generated for debugging

## Docker Deployment

### Dockerfile - Server
```dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### Dockerfile - Client
```dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - server
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Running with Docker
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Cloud Deployment

### AWS Elastic Beanstalk

**1. Install EB CLI:**
```bash
pip install awsebcli
```

**2. Initialize EB:**
```bash
eb init -p node.js-18 collab-editor
```

**3. Create environment:**
```bash
eb create production-env
```

**4. Deploy:**
```bash
eb deploy
```

**5. Configuration (.ebextensions/nodecommand.config):**
```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "node dist/index.js"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
```

### Heroku

**1. Install Heroku CLI:**
```bash
npm install -g heroku
```

**2. Login and create app:**
```bash
heroku login
heroku create collab-editor-app
```

**3. Add Procfile:**
```
web: node dist/index.js
```

**4. Deploy:**
```bash
git push heroku main
```

**5. Scale dynos:**
```bash
heroku ps:scale web=1
```

### Digital Ocean App Platform

**1. Connect GitHub repository**

**2. Configure build command:**
```bash
npm install && npm run build
```

**3. Configure run command:**
```bash
node dist/index.js
```

**4. Set environment variables:**
- `NODE_ENV=production`
- `PORT=8080`

**5. Deploy from dashboard**

### Vercel (Client only)

**1. Install Vercel CLI:**
```bash
npm install -g vercel
```

**2. Deploy client:**
```bash
cd client
vercel --prod
```

**3. Configure vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

### Netlify (Client only)

**1. Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

**2. Deploy:**
```bash
cd client
netlify deploy --prod
```

**3. Configure netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Environment Variables

### Server (.env)
```bash
# Server Configuration
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# WebSocket Configuration
WS_PING_INTERVAL=30000
WS_PING_TIMEOUT=5000

# Document Configuration
MAX_DOCUMENT_SIZE=10485760  # 10MB
MAX_CLIENTS_PER_DOCUMENT=50

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Client (.env)
```bash
# API Configuration
VITE_WS_URL=ws://localhost:8080
VITE_API_URL=http://localhost:8080

# Feature Flags
VITE_ENABLE_PRESENCE=true
VITE_ENABLE_CURSORS=true
VITE_DEBUG_MODE=false

# Performance
VITE_RECONNECT_DELAY=3000
VITE_MAX_RECONNECT_ATTEMPTS=5
```

## Monitoring

### Health Check Endpoint
Add to server/src/index.ts:
```typescript
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    memory: process.memoryUsage(),
  });
});

app.listen(8081, () => {
  console.log('Health check on port 8081');
});
```

### Prometheus Metrics
```typescript
import { register, Counter, Histogram } from 'prom-client';

const opsCounter = new Counter({
  name: 'collab_operations_total',
  help: 'Total operations processed',
  labelNames: ['type', 'clientId'],
});

const latencyHistogram = new Histogram({
  name: 'collab_operation_latency_seconds',
  help: 'Operation processing latency',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Logging with Winston
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

## Performance Tuning

### Node.js Optimization
```bash
# Increase memory limit
node --max-old-space-size=4096 dist/index.js

# Enable ES modules
node --experimental-modules dist/index.js

# CPU profiling
node --prof dist/index.js
node --prof-process isolate-*.log > processed.txt
```

### Nginx Configuration
```nginx
upstream backend {
    server localhost:8080;
    keepalive 64;
}

server {
    listen 80;
    server_name example.com;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

### Load Balancing
```nginx
upstream websocket_backend {
    ip_hash;  # Sticky sessions for WebSocket
    server backend1:8080;
    server backend2:8080;
    server backend3:8080;
}
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d example.com -d www.example.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Nginx SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... rest of configuration
}
```

## Backup and Recovery

### Database Backup (Future)
```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/collab" --out=/backup

# PostgreSQL backup
pg_dump collab > backup.sql
```

### Document Export
```typescript
export async function exportDocuments() {
  const documents = await getAllDocuments();
  const backup = {
    timestamp: new Date().toISOString(),
    documents,
  };
  fs.writeFileSync('backup.json', JSON.stringify(backup, null, 2));
}
```

## Troubleshooting

### Common Issues

**WebSocket Connection Failed:**
- Check firewall rules allow port 8080
- Verify CORS settings
- Check nginx proxy configuration

**High Memory Usage:**
- Monitor with `node --inspect`
- Check for memory leaks with heap snapshots
- Implement document size limits

**Slow Performance:**
- Enable Node.js clustering
- Add Redis for shared state
- Implement operation batching

### Debug Mode
```bash
# Server debug
DEBUG=* npm run dev

# Client debug
VITE_DEBUG_MODE=true npm run dev
```

## Security Checklist

- [ ] Enable HTTPS/WSS in production
- [ ] Implement rate limiting
- [ ] Validate all input operations
- [ ] Sanitize user data
- [ ] Enable CORS properly
- [ ] Use environment variables for secrets
- [ ] Implement authentication/authorization
- [ ] Regular security audits with `npm audit`
- [ ] Keep dependencies updated

## Scaling Considerations

### Horizontal Scaling
- Use Redis for session storage
- Implement sticky sessions for WebSocket
- Add load balancer (Nginx/HAProxy)
- Use message queue (RabbitMQ/Kafka) for ops

### Vertical Scaling
- Increase server resources (CPU/RAM)
- Optimize data structures
- Enable Node.js clustering
- Use PM2 for process management

---

**Need Help?** Check [ARCHITECTURE.md](./ARCHITECTURE.md) or open an issue on GitHub.
