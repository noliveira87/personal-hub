# Personal Hub

A unified personal management dashboard built with React, TypeScript and Vite. Single SPA with 4 main sections: Dashboard, Contracts, Portfolio, and Warranties. Features Supabase integration, price history tracking, and Telegram notifications.

## 🎯 Features

- **Dashboard** - Central hub with overview and statistics
- **Contracts** - CRUD management with calendar view, alerts, and performance insights
- **Portfolio** - Investment tracking (coming soon)
- **Warranties** - Warranty management (coming soon)
- **Price History** - Track price changes over time for contracts
- **Telegram Alerts** - Real-time notifications for contract events
- **Dark Mode** - System-wide dark/light theme toggle

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- npm or bun
- Supabase account (for backend)

### Installation

```bash
# Install dependencies
npm install
```

### Environment Setup

Create `.env.local` in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### Development

```bash
# Start development server (http://localhost:3000)
npm run dev
```

### Build

```bash
# Build for production
npm run build
```

## 📂 Project Structure

```
personal-hub/
├── packages/
│   ├── hub/                     # Main app with 4 sections
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── hub/             # Dashboard section
│   │   │   │   ├── contracts/       # Contracts section (CRUD, calendar, alerts, insights)
│   │   │   │   ├── portfolio/       # Portfolio section
│   │   │   │   └── warranties/      # Warranties section
│   │   │   ├── components/          # Shared components
│   │   │   ├── context/             # State management
│   │   │   └── lib/                 # Utils and API layer
│   │   └── package.json
│   │
│   └── libs/ui/                 # Shared UI components
│       └── src/
│
├── .env.example                 # Environment variables template
├── .env.local                   # Shared environment (not in git)
├── package.json                 # Workspace root
└── README.md
```

## 🗄️ Database

Supabase PostgreSQL schema includes:

- `contracts` - Contract data with price tracking
- `contract_price_history` - Historical price entries for contracts

See [SUPABASE_SETUP.md](packages/hub/SUPABASE_SETUP.md) for detailed schema.

## 📦 Deployment

Single build command deploys the app to production:

```bash
deploy-hub
```

This runs:
1. Git pull from origin/main
2. npm run build
3. PM2 restart

## 🏷️ Versioning

This repository uses a simple release flow:

- `main` contains the latest production-ready code
- changes are documented in [CHANGELOG.md](CHANGELOG.md)
- stable deployments can be tagged with semantic-style versions such as `hub-v0.2.1`
- each tag should have a matching GitHub Release note summarizing the version

Recommended workflow:

1. Merge validated work into `main`
2. Deploy and confirm production is stable
3. Update [CHANGELOG.md](CHANGELOG.md)
4. Create a new tag
5. Publish the GitHub Release


## 🔗 App Routes

- `/` - Hub home page with project launcher
- `/warranties` - Warranty Vault with management features
- `/portfolio` - Investment tracking and performance
- `/contracts` - Contracts dashboard
  - `/contracts/list` - All contracts
  - `/contracts/calendar` - Calendar view
  - `/contracts/alerts` - Alerts overview
  - `/contracts/insights` - Performance insights
- `/settings` - Global Telegram & alert configuration

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite 5.4
- **Package Manager**: npm
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage)
- **State Management**: React Hooks
- **Routing**: React Router v6

## 📝 Environment Variables

All packages (warranties, portfolio, home-contracts) share a single `.env` file in the root:

```bash
# In the root of personal-hub/, create .env.local
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase (shared by all packages)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note**: This `.env.local` is automatically discovered by all Vite applications in the monorepo. Do not create separate `.env` files in individual packages.

## 🚢 Deployment

Currently deployed on a personal NAS server via PM2.

```bash
# Build for production
npm run build

# Output: packages/warranties/dist/
# Served via PM2: pm2 serve ~/projects/personal-hub/packages/warranties/dist 8081 --name hub --spa
```

**Domain**: `hub.cafofo12.ddns.net` (via Nginx Proxy Manager)

## 🔒 Features

### Telegram Notifications
- Configure bot token and chat ID in Settings
- Per-feature alert toggles (Warranties, Contracts, Portfolio)
- Customizable warranty expiry alert threshold (7/14/30/60/90 days)
- Auto-sends alerts once per day on app load

### Data Persistence
- **Warranties**: Supabase PostgreSQL + Storage (for receipts)
- **Contracts**: Supabase PostgreSQL
- **Portfolio**: Supabase PostgreSQL
- **Settings**: localStorage (Telegram config, alert preferences)

## 🔄 Future Enhancements

- [ ] Portfolio Telegram alerts
- [ ] Home Expenses implementation
- [ ] Code-splitting for bundle optimization
- [ ] Contract Telegram notifications on renewal dates
- [ ] Dark mode persistence in DB
