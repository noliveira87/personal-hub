# Personal Hub - Monorepo

Unified monorepo for personal management applications built with React, TypeScript and Vite.

## 📦 Packages

- **warranties** - Home Warranty Hub (warranty management)
- **portfolio** - Portfolio Tracker (investment tracking)
- **home-contracts** - Contract management (renewals + alerts + Telegram test)
- **libs/ui** - Shared UI, theme logic and hub launcher

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18

### Installation

```bash
# Install workspace dependencies
npm install
```

### Development

```bash
# Run warranties app (port 8081)
npm run dev:warranties

# Run portfolio (port 8080)
npm run dev:portfolio

# Run home-contracts (port 8083)
npm run dev:home-contracts

# Run both in parallel (requires separate terminals)
npm run dev:warranties
npm run dev:portfolio
```

### Build

```bash
# Build warranties app
npm run build:warranties

# Build portfolio
npm run build:portfolio

# Build home-contracts
npm run build:home-contracts

# Build all packages
npm run build
```

### Testing

```bash
# Test specific package
npm run test:warranties
npm run test:portfolio
npm run test:home-contracts
```

### Linting

```bash
# Lint all packages
npm run lint:warranties
npm run lint:portfolio
npm run lint:home-contracts
```

## 📂 Project Structure

```
personal-hub/
├── packages/
│   ├── warranties/         # Warranty management
│   │   ├── src/
│   │   ├── package.json
│   │   └── ...
│   │
│   └── portfolio/          # Investment tracking
│       ├── src/
│       ├── package.json
│       └── ...
│
│   └── home-contracts/     # Contracts + alerts
│       ├── src/
│       ├── package.json
│       └── ...
│
│   └── libs/ui/            # Shared UI + hub launcher
│       ├── src/
│       └── ...
│
├── package.json            # Workspace root
├── README.md
└── bun.lock
```

## 🔗 App Navigation

- **Warranties** (http://localhost:8081)
  - Home Warranty Vault
  - Portfolio Tracker → redirects to http://localhost:8080
  - Home Contracts (redirects to http://localhost:8083)
  - Home Expenses (placeholder)

- **Portfolio** (http://localhost:8080)
  - Investment tracking
  - Back button → redirects to http://localhost:8081

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

Each package should have its own `.env.local`. Check individual package READMEs.

### Warranties (.env.local)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Portfolio (.env.local)
```
# Currently uses localStorage, can be extended with Supabase
```

## 🚢 Deployment

Each package can be built and deployed independently.

```bash
# Build outputs
packages/warranties/dist/
packages/portfolio/dist/
```

Deploy to your preferred hosting (Vercel, Netlify, etc.)

## 📖 Individual Package Documentation

- [Warranties README](packages/warranties/README.md)
- [Portfolio README](packages/portfolio/README.md)
- [Home Contracts README](packages/home-contracts/README.md)

## 🔄 Future Enhancements

- [ ] Shared UI component library (`packages/libs/ui`)
- [ ] Home Contracts implementation
- [ ] Home Expenses implementation
- [ ] Supabase integration for portfolio
- [ ] Multi-device sync
- [ ] Dark mode persistence
