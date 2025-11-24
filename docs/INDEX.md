# WritArcade Documentation Index

**Last Updated:** November 24, 2025  
**Status:** Documentation consolidated to 4 key documents

---

## Quick Navigation

### 📋 [README.md](../README.md) - Project Overview
- Project vision, quick start instructions, current status
- Tech stack overview, architecture principles
- Writer coin information and success metrics

### 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) - System Design
- Unified architecture for web app + mini-app
- Database schema and payment tracking
- Smart contracts and writer coin economics
- Wallet abstraction layer and shared components

### 🛠️ [DEVELOPMENT.md](./DEVELOPMENT.md) - Development Guide
- Local setup and configuration
- Mini App SDK integration and wallet setup
- Payment flow implementation
- Common issues and testing procedures

### 🗺️ [ROADMAP.md](./ROADMAP.md) - Project Timeline & Status
- Complete implementation phases (5-week MVP)
- Current status and next steps
- Go-to-market strategy and success metrics
- Future vision and competitive advantages

---

## Document Purpose

### README.md
**Audience:** Everyone  
**Purpose:** Project entry point with vision and quick start  
**Contains:**
- Project overview and vision statement
- Quick start instructions
- Current development status
- Tech stack and architecture overview
- Success metrics and deployment status

### ARCHITECTURE.md
**Audience:** Architects, backend developers  
**Purpose:** Technical system design reference  
**Contains:**
- Unified system architecture (web + mini-app)
- Database schema and payment tracking
- Smart contracts (Base blockchain)
- Wallet abstraction and shared components
- Writer coin economics and revenue distribution

### DEVELOPMENT.md
**Audience:** Frontend and full-stack developers  
**Purpose:** Development setup and implementation guide  
**Contains:**
- Local development setup
- Mini App SDK integration (Frames v2 → Mini Apps)
- Browser wallet integration (MetaMask, Coinbase, WalletConnect)
- Payment flow implementation
- Common issues and testing procedures

### ROADMAP.md
**Audience:** Product managers, stakeholders, team leads  
**Purpose:** Project timeline and strategic planning  
**Contains:**
- Implementation phases and timeline
- Current status and achievements
- Go-to-market strategy
- Success metrics and future vision
- Competitive advantages and business model

---

## Key Concepts Quick Reference

### Unified Architecture
See: [ARCHITECTURE.md](./ARCHITECTURE.md#unified-system-architecture)
- **Wallet Abstraction**: Runtime detection between Farcaster + browser wallets
- **Shared Components**: GenreSelector, DifficultySelector, PaymentFlow
- **Unified Endpoints**: Same API for both environments
- **Payment Service**: Single source of truth for cost calculations

### Development Workflow
See: [DEVELOPMENT.md](./DEVELOPMENT.md#development-tools)
- **Local Setup**: `npm install --legacy-peer-deps && npm run dev`
- **Database**: `npm run db:studio` (Prisma Studio)
- **Wallet Testing**: MetaMask (web) + Farcaster Wallet (mini-app)
- **Payment Testing**: Complete flow in both environments

### Current Status
See: [ROADMAP.md](./ROADMAP.md#current-status-summary)
- **Phase 5 Complete**: Browser wallet support, feature parity achieved
- **95% Code Sharing**: Web app + mini-app unified architecture
- **Production Ready**: Smart contracts deployed, testing in progress
- **Launch Ready**: Go/no-go decision target EOW

---

## Getting Help

- **Setup Issues**: See [DEVELOPMENT.md](./DEVELOPMENT.md#common-issues--solutions)
- **Architecture Questions**: See [ARCHITECTURE.md](./ARCHITECTURE.md#unified-system-architecture)
- **Feature Status**: See [ROADMAP.md](./ROADMAP.md#current-status-summary)
- **Code Design**: See [ARCHITECTURE.md](./ARCHITECTURE.md#unified-system-architecture)

---

## Current Phase Status

### ✅ Phase 1-5 Complete (MVP)
- Mini app foundation and integration
- Game generation and customization
- Writer coin payments and smart contracts
- Feature parity and unified architecture
- Browser wallet support

### ⏳ Phase 5b In Progress
- Database migrations and payment tracking
- End-to-end testing across both platforms
- Production deployment preparation
- Launch readiness assessment

---

**Status: Documentation consolidated for Phase 5b launch preparation**
