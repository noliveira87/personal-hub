# Personal Hub

A unified personal management dashboard built with React, TypeScript and Vite. Consolidates warranty management, investment tracking, and contract management into a single SPA with Telegram notifications and dark mode support.

## 🎯 Features

- **Warranty Vault** - Manage product warranties with expiry alerts and Telegram notifications
- **Portfolio Tracker** - Track investments and monitor performance
- **Contracts Manager** - Manage contracts with calendar view, alerts, and performance insights
- **Global Settings** - Centralized Telegram bot configuration and per-feature alert toggles
- **Dark Mode** - System-wide dark/light theme toggle
- **Telegram Alerts** - Real-time notifications for warranty expiry and contract events

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- npm or bun

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (http://localhost:5173)
npm run dev
```

### Build

```bash
# Build for production
npm run build
```

### Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## 📂 Project Structure

```
personal-hub/
├── packages/warranties/         # Main SPA application
│   ├── src/
│   │   ├── App.tsx              # Router config
│   │   ├── components/          # Warranty components
│   │   ├── features/            # Portfolio + Contracts features
│   │   ├── lib/                 # Utilities (Telegram, Supabase, etc.)
│   │   └── pages/               # Top-level pages
│   ├── public/
│   │   ├── favicon.png          # Custom favicon
│   │   └── robots.txt
│   ├── dist/                    # Build output
│   └── package.json
│
├── packages/libs/ui/            # Shared UI components & hub page
│   └── src/
│
├── package.json                 # Workspace root
└── README.md
```

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

Create `.env` file in `packages/warranties/`:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For local development, create `.env.local` with the same variables.

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
- **Portfolio**: localStorage (future: Supabase)
- **Settings**: localStorage (Telegram config, alert preferences)

## 🔄 Future Enhancements

- [ ] Portfolio Telegram alerts
- [ ] Home Expenses implementation
- [ ] Code-splitting for bundle optimization
- [ ] Contract Telegram notifications on renewal dates
- [ ] Dark mode persistence in DB
