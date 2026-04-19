[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/rsksmart/rsk-privy-starter-kit/badge)](https://scorecard.dev/viewer/?uri=github.com/rsksmart/rsk-privy-starter-kit)
[![CodeQL](https://github.com/rsksmart/rsk-privy-starter-kit/workflows/CodeQL/badge.svg)](https://github.com/rsksmart/rsk-privy-starter-kit/actions?query=workflow%3ACodeQL)
<img src="rootstock-logo.jpg" alt="RSK Logo" style="width:100%; height: auto;" />

## Rootstock Wagmi & Privy

This starter kit provides a foundation for building decentralized applications (dApps) on the Rootstock blockchain using [React](https://react.dev/learn), [Wagmi](https://wagmi.sh/) and [Shadcn](https://ui.shadcn.com/) libraries. It includes features such as:

- Integration with [Privy](https://www.privy.io/user-guide) for wallet connection and interacting with smart contracts
- Sample integrations of interactions with tokens like ERC20, ERC721, and ERC1155.
- Prettier and eslint configured for project files.
- Tailwindcss and Shadcn configured for style customization.

Check the live demo here: https://rsk-privy-starter-kit.vercel.app/

## Project Structure

```text
.
├── public
├── src
│   ├── App.tsx
│   ├── assets
│   ├── components
│   ├── config
│   │   ├── providers.tsx  // Privy setup file
│   │   └── wagmiProviderConfig.ts
│   ├── lib
│   │   └── utils
│   ├── main.tsx
│   ├── pages
├── package.json
```

## Supported Networks

- Rootstock Mainnet
- Rootstock Testnet

## Usage

### Setup

#### 1. Clone Repository

```shell
git clone https://github.com/rsksmart/rsk-privy-starter-kit
cd rsk-privy-starter-kit
```

#### 2. Configure Project

Copy the `.env.example` file and rename it to `.env`, and add a variables:

```shell
VITE_PRIVY_APP_ID='your Privy App ID'
VITE_BUNDLER_API_KEY='etherspot_public_key'
VITE_CUSTOM_BUNDLER_URL=https://rootstocktestnet-bundler.etherspot.io/
VITE_CONTENT_PAYWALL_ADDRESS=0xb5C7ED1CEd1098974FDf2a9060948F13138e9dC6
VITE_API_URL=http://localhost:3001
```
> **Note**: Go to [Privy Dashboard](https://dashboard.privy.io/) and create a project, copy the project ID and paste it on `VITE_PRIVY_APP_ID`.

#### 3. Install Dependencies

> **Note**: We recommend using yarn package manager given that there are some conflicts when installing some packages with npm.

For the variables `VITE_BUNDLER_API_KEY` and `VITE_CUSTOM_BUNDLER_URL`, these are used for the etherspot gasless demo part, and these variables (for testnet) are public. For production use, please obtain bundler api key and bundler url from [Etherspot](https://etherspot.io/)

```shell
yarn
```

#### 4. Run Project

```shell
yarn dev
```

---

## ContentPaywall Example — SocialFi Paywall Demo

This starter kit includes **ContentPaywall** example demonstrating how to gate premium content behind on-chain payments on Rootstock. Navigate to `/dashboard` to explore it.

### Architecture

```
User pays rBTC  →  tx confirmed on-chain
      ↓
Frontend calls   POST /api/content/verify-access  { address, contentId }
      ↓
Backend verifies hasAccess(address, contentId) ON-CHAIN via viem
      ↓  (access confirmed)
Backend issues   JWT { address, contentId, exp: 24h }
      ↓
Frontend calls   GET /api/content/:id/full
                 Authorization: Bearer <JWT>
      ↓
Backend returns  { fullContent }  ← never in the JS bundle
```

**Premium content strings never exist in the JavaScript bundle.** They live exclusively on the backend and are only served after server-side on-chain verification.

### Running the Backend Server

The paywall backend is a standalone Express server in the `server/` directory.

**1. Configure server environment** — create `server/.env` (see `server/.env.example`):

```shell
JWT_SECRET=$(openssl rand -hex 64)
CONTENT_PAYWALL_ADDRESS=0xb5C7ED1CEd1098974FDf2a9060948F13138e9dC6
RSK_RPC_URL=https://public-node.testnet.rsk.co
PORT=3001
CORS_ORIGINS=http://localhost:5173
```

**2. Install server dependencies:**

```shell
cd server && npm install
```

For production or CI, prefer `npm ci` in `server/` when `server/package-lock.json` is present for deterministic installs.

**3. Start the server** (in a separate terminal):

```shell
cd server && npm run dev
```

### Running Tests

```shell
# Frontend unit tests (contract utilities, PaymentModal, ContentCard)
yarn test

# Backend integration tests (verify-access flow, JWT gating; supertest + mocked chain)
cd server && npm install && npm test
```

From the repository root you can run both suites:

```shell
yarn test && cd server && npm test
```

### Production deployment (server)

- Set `NODE_ENV=production` and use a long random `JWT_SECRET` (the server refuses secrets shorter than 32 characters in production).
- Set `TRUST_PROXY=1` when the API sits behind nginx, Fly.io, Render, or similar so per-IP rate limits remain accurate.
- Restrict `CORS_ORIGINS` to your real frontend origin(s); keep `server/.env` out of version control.

### Contract

The `ContentPaywall` Solidity source is included at [`contracts/ContentPaywall.sol`](contracts/ContentPaywall.sol).
See [`contracts/README.md`](contracts/README.md) for deployment instructions and admin trust assumptions (including the `revokeAccess` no-refund disclosure).

> **Security note**: The contract enforces `require(msg.value == price)` — exact-match payment validation. Clients cannot submit incorrect amounts.
