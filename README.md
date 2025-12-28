# Remote Days

**Cross-Border Remote Work Compliance Tracking for Luxembourg-Based Companies**

Remote Days is a comprehensive full-stack application designed to help Luxembourg-based companies track and manage cross-border remote work compliance for their employees working from France, Belgium, and Germany.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## ✨ Features

### Core Functionality
- **Daily Work Location Tracking** - Employees log their work location (home/office/travel/sick)
- **Compliance Monitoring** - Real-time tracking against country-specific thresholds (FR: 34 days, BE: 34 days, DE: 34 days)
- **Traffic Light System** - Visual alerts when approaching or exceeding limits (Green/Orange/Red)
- **Automated Email Prompts** - Daily reminders at 8:00 AM CET with one-click status updates
- **Request Management** - Employee-initiated change requests with HR/Admin approval workflow
- **Audit Trail** - Immutable logging of all entry changes with actor tracking

### User Roles
- **Employee** - Submit entries, view personal stats, request changes
- **HR** - View all employee summaries, approve/reject requests, override entries
- **Admin** - Full access including user management, threshold configuration, audit logs

### Additional Features
- **Bulk User Import** - CSV import with automatic email activation
- **GDPR Compliance** - Data export and account deletion
- **Email Notifications** - Threshold warnings, request status updates
- **Holiday Management** - Skip email prompts on national holidays
- **Multi-Country Support** - Configurable thresholds per country

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Cloudflare    │      │   AWS EC2 +      │      │  Neon PostgreSQL│
│     Pages       │◄────►│   PM2            │◄────►│   (Serverless)  │
│   (Frontend)    │      │   (Backend)      │      │   (Database)    │
└─────────────────┘      └──────────────────┘      └─────────────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │   Mailpit/SMTP   │
         │               │   (Email)        │
         │               └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Vercel/CF      │
│  (Landing)      │
└─────────────────┘
```

### Monorepo Structure
```
remote-days/
├── apps/
│   ├── api/         # Fastify backend API (@remotedays/api)
│   ├── web/         # React frontend (@remotedays/web)
│   └── mobile/      # React Native/Expo app (@remotedays/mobile)
├── packages/
│   ├── types/       # Shared TypeScript types (@remotedays/types)
│   └── shared/      # Shared business logic (@remotedays/shared)
└── landing/         # Marketing landing page
```

## 🛠️ Tech Stack

### Backend
- **Framework:** Fastify 4.21 (high-performance Node.js)
- **Database:** PostgreSQL 15 (via Neon serverless)
- **ORM:** Direct SQL with pg driver + repository pattern
- **Authentication:** JWT with httpOnly cookies
- **Email:** Nodemailer with SMTP
- **Scheduler:** node-cron for daily workers
- **Process Manager:** PM2 for production
- **Testing:** Vitest + Testcontainers

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 7
- **Routing:** React Router v7
- **State Management:** TanStack Query v5 (React Query)
- **Forms:** React Hook Form + Zod validation
- **UI Components:** Radix UI + Tailwind CSS
- **Icons:** Lucide React
- **Testing:** Playwright E2E

### Mobile
- **Framework:** React Native 0.76.5 + Expo 52
- **Routing:** Expo Router 4 (file-based)
- **State Management:** TanStack Query v5
- **Storage:** Expo SecureStore (auth tokens)
- **Offline Support:** AsyncStorage queue with sync
- **UI Components:** Custom components with Expo Vector Icons

### Infrastructure
- **Backend Hosting:** AWS EC2 (Amazon Linux 2023)
- **Frontend Hosting:** Cloudflare Pages
- **Landing Hosting:** Vercel
- **Database:** Neon PostgreSQL (us-east-1)
- **CI/CD:** GitHub Actions
- **Email Testing:** Mailpit (local development)

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for local development)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/teletravail-tracker.git
   cd teletravail-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env file
   cp .env.example .env

   # Edit .env with your configuration
   nano .env
   ```

4. **Start with Docker Compose**
   ```bash
   docker-compose up
   ```

   This will start:
   - PostgreSQL database (port 5432)
   - API server (port 3000)
   - Web frontend (port 5173)
   - Mailpit email testing (port 8025)
   - Database seeder (runs once)

5. **Access the application**
   - Frontend: http://localhost:5173
   - API: http://localhost:3000
   - API Docs (Swagger): http://localhost:3000/documentation
   - Mailpit (email testing): http://localhost:8025

### Default Test Accounts

After seeding, you can log in with:

- **Admin:** admin@remotedays.app / password123
- **HR:** hr@remotedays.app / password123
- **Employee:** employee1@remotedays.app / password123

The demo seed creates 103 users total: 1 admin, 1 HR, and 101 employees with varied compliance statuses (safe, warning, critical, exceeded).

## 💻 Development

### Project Structure

```
apps/api/
├── src/
│   ├── auth/           # Authentication routes & logic
│   ├── entries/        # Entry management
│   ├── requests/       # Change requests
│   ├── admin/          # Admin-only features
│   ├── hr/             # HR features
│   ├── services/       # Business logic
│   ├── repositories/   # Data access layer
│   ├── errors/         # Error handling
│   ├── plugins/        # Fastify plugins
│   ├── worker/         # Cron jobs & background tasks
│   └── config/         # Configuration
└── __tests__/          # Unit & integration tests

apps/web/
├── src/
│   ├── pages/          # Route components
│   ├── components/     # Reusable UI components
│   ├── layouts/        # Page layouts
│   ├── context/        # React context providers
│   ├── lib/            # Utilities & API client
│   └── hooks/          # Custom React hooks
└── e2e/                # Playwright E2E tests

apps/mobile/
├── app/                # Expo Router file-based routing
│   ├── (auth)/         # Authentication screens
│   ├── (tabs)/         # Tab navigation screens
│   └── _layout.tsx     # Root layout
├── components/         # Reusable UI components
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── services/           # API client & offline sync
└── constants/          # Theme & configuration
```

### Available Scripts

#### Root Level
```bash
npm run dev:api       # Start API in dev mode
npm run dev:web       # Start web in dev mode
npm run build         # Build all workspaces
npm test              # Run all tests
```

#### API Workspace
```bash
npm run dev --workspace=apps/api         # Start with hot reload
npm run build --workspace=apps/api       # Build for production
npm run test --workspace=apps/api        # Run unit tests
npm run db:seed --workspace=apps/api     # Seed database
```

#### Web Workspace
```bash
npm run dev --workspace=apps/web         # Start dev server
npm run build --workspace=apps/web       # Build for production
npm run test:e2e --workspace=apps/web    # Run E2E tests
```

#### Mobile Workspace
```bash
npm run dev:mobile                       # Start Expo dev server
npx expo start --ios                     # Start with iOS simulator
npx expo start --android                 # Start with Android emulator
npx eas build --platform ios             # Build for iOS (production)
npx eas build --platform android         # Build for Android (production)
```

### Database Migrations

Currently using manual SQL migrations in `docker/postgres/init.sql`.

**TODO:** Implement automated migration system (node-pg-migrate or Knex).

### Testing Strategy

**Backend:**
- Unit tests: Services and repositories (Vitest)
- Integration tests: API endpoints with Testcontainers
- Coverage target: 80%

**Frontend:**
- E2E tests: User workflows (Playwright)
- Test scenarios: Auth, Admin features, Employee features, CSV import

**Run tests:**
```bash
# Backend unit tests
npm run test --workspace=apps/api

# Frontend E2E tests
npm run test:e2e --workspace=apps/web
```

## 🚢 Deployment

### Backend (EC2)

Automated via GitHub Actions on push to `main` branch:

1. **Build Step:**
   - Install dependencies
   - Run `scripts/prepare-ec2.sh`
   - Bundle with tsup
   - Create deployment artifact

2. **Deploy Step:**
   - SCP artifact to EC2
   - Extract to `~/tracker/api-standalone`
   - Run `npm install --production`
   - Restart via PM2: `pm2 startOrRestart ecosystem.config.js`

**Manual deployment:**
```bash
bash scripts/deploy.sh
```

### Frontend (Cloudflare Pages)

1. Connect GitHub repository to Cloudflare Pages
2. **Build settings:**
   - Build command: `npm run build --workspace=apps/web`
   - Build output: `apps/web/dist`
   - Environment variable: `VITE_API_URL=https://api.remotedays.app`

### Mobile (EAS Build)

1. **Development:** Use Expo Go app for rapid development
   ```bash
   npx expo start
   ```

2. **Production builds:** Use EAS Build
   ```bash
   # Install EAS CLI
   npm install -g eas-cli

   # Configure project (first time)
   eas build:configure

   # Build for iOS
   eas build --platform ios --profile production

   # Build for Android
   eas build --platform android --profile production
   ```

3. **Environment:** Set `EXPO_PUBLIC_API_URL` in `eas.json` or `apps/mobile/.env`

### Environment Variables

**Backend (.env on EC2):**
```env
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=your-secret-key-min-32-chars
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-pass
SMTP_FROM="Remote Days" <noreply@remotedays.app>
APP_URL=https://app.remotedays.app
EMAIL_FROM=noreply@remotedays.app
MAX_HOME_DAYS=104
```

**Frontend (Cloudflare Pages):**
```env
VITE_API_URL=https://api.remotedays.app
```

**Mobile (apps/mobile/.env):**
```env
EXPO_PUBLIC_API_URL=https://api.remotedays.app
```

## 📚 API Documentation

Interactive API documentation (Swagger) available at:
- Local: http://localhost:3000/documentation
- Production: https://api.remotedays.app/documentation

### Key Endpoints

**Authentication:**
- `POST /auth/login` - Login with email/password
- `POST /auth/logout` - Logout and clear cookie
- `GET /auth/me` - Get current user info
- `POST /auth/password-reset-request` - Request password reset
- `POST /auth/password-reset` - Reset password with token

**Entries:**
- `GET /entries` - Get entries for a month
- `POST /entries` - Create or update entry
- `POST /entries/override` - HR/Admin override entry
- `GET /entries/stats` - Get user statistics

**Requests:**
- `GET /requests/me` - Get my change requests
- `POST /requests` - Create change request
- `PATCH /requests/:id` - Approve/reject request (HR/Admin)

**Admin:**
- `GET /admin/users` - List users (pagination, filters)
- `POST /admin/users` - Create user
- `POST /admin/users/import` - Bulk CSV import
- `PUT /admin/users/:id` - Update user
- `GET /admin/audit` - View audit logs
- `PUT /admin/countries/:code` - Update country threshold

## 🤝 Contributing

### Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test locally with Docker Compose
3. Run tests: `npm test`
4. Run linting: `npm run lint` (TODO: Add this script)
5. Commit changes following conventional commits
6. Push and create a Pull Request

### Code Style

- **Backend:** Follow existing patterns (Repository → Service → Controller)
- **Frontend:** Use functional components with hooks
- **Type Safety:** No `any` types; use proper TypeScript
- **Error Handling:** Use custom error classes with error codes
- **Logging:** Use Fastify's Pino logger (not console.log)

### Testing Requirements

- Add unit tests for new services
- Add E2E tests for new user workflows
- Ensure existing tests pass before PR

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- Production: https://app.remotedays.app
- Landing: https://remotedays.app
- API: https://api.remotedays.app

## 📞 Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/teletravail-tracker/issues
- Email: support@remotedays.app

---

Made with ❤️ by the Remote Days team
