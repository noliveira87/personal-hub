# Personal Hub - Monorepo

Unified monorepo for personal management applications built with React, TypeScript and Vite.

## 📦 Packages

- **warranties** - Home Warranty Hub (warranty management + app launcher)
- **portfolio** - Portfolio Tracker (investment tracking)

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

# Build all packages
npm run build
```

### Testing

```bash
# Test specific package
npm run test:warranties
npm run test:portfolio
```

### Linting

```bash
# Lint all packages
npm run lint:warranties
npm run lint:portfolio
```

## 📂 Project Structure

```
personal-hub/
├── packages/
│   ├── warranties/         # Warranty management + launcher
│   │   ├── src/
│   │   ├── package.json
│   │   └── ...
│   │
│   └── portfolio/          # Investment tracking
│       ├── src/
│       ├── package.json
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
  - Contract Manager (placeholder)
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

## 🔄 Future Enhancements

- [ ] Shared UI component library (`packages/libs/ui`)
- [ ] Contract Manager implementation
- [ ] Home Expenses implementation
- [ ] Supabase integration for portfolio
- [ ] Multi-device sync
- [ ] Dark mode persistence
