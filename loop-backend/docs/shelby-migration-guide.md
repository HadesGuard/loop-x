# Shelby Network Migration Guide: Shelbynet → Testnet

## Overview

The Loop backend uses [Shelby Protocol](https://docs.shelby.xyz) for decentralized video storage. Currently, the application is configured to use **Shelbynet** — a single developer prototype network that gets wiped roughly once a week.

As the Shelby ecosystem matures, the recommended path is to migrate to **Testnet** for more stable pre-production usage, and eventually to **Mainnet** for production.

### Network Comparison

| Feature | Shelbynet | Testnet | Mainnet |
|---------|-----------|---------|---------|
| **Purpose** | Development / prototyping | Pre-production / staging | Production |
| **Stability** | Wiped ~weekly | Stable | Permanent |
| **Data persistence** | Temporary | Long-lived | Permanent |
| **Tokens** | Free (faucet) | Free (faucet) | Paid |
| **RPC URL** | `https://api.shelbynet.shelby.xyz/shelby` | TBD | TBD |
| **Faucet** | `https://faucet.shelbynet.shelby.xyz` | TBD | TBD |

> **Note:** Testnet URLs will be published at [docs.shelby.xyz](https://docs.shelby.xyz) when the network launches. Update this table accordingly.

## Prerequisites

Before migrating, ensure you have:

1. **Shelby SDK** `@shelby-protocol/sdk` version that supports testnet (check for updates with `pnpm outdated @shelby-protocol/sdk`)
2. **API key** for the testnet network (generated at [geomi.dev](https://geomi.dev))
3. **Service account** with private key and address on the testnet network
4. **Funded account** with APT (gas fees) and ShelbyUSD (storage fees) from testnet faucets

## Migration Steps

### Step 1: Update the Shelby SDK

Check if a newer SDK version is required for testnet support:

```bash
cd loop-backend
pnpm outdated @shelby-protocol/sdk
pnpm update @shelby-protocol/sdk
```

Verify that `Network.TESTNET` is exported from `@aptos-labs/ts-sdk`. If not, update the Aptos SDK as well:

```bash
pnpm update @aptos-labs/ts-sdk
```

### Step 2: Generate a Testnet API Key

1. Go to [geomi.dev](https://geomi.dev)
2. Navigate to [Create API Key](https://geomi.dev/manage/create-api-resource)
3. Select **testnet** as the network
4. Copy the generated API key

### Step 3: Create a Testnet Service Account

Generate a new Ed25519 keypair for the testnet network. You can use the Shelby CLI or the Aptos SDK:

```bash
# Using Shelby CLI
shelby account create --network testnet

# Or generate programmatically
node -e "
const { Account } = require('@aptos-labs/ts-sdk');
const account = Account.generate();
console.log('Address:', account.accountAddress.toString());
console.log('Private Key:', account.privateKey.toString());
"
```

Save the private key and address securely.

### Step 4: Fund the Account

Fund your testnet service account with both token types:

1. **APT tokens** (for gas fees) — Use the testnet APT faucet
2. **ShelbyUSD tokens** (for storage operations) — Use the testnet ShelbyUSD faucet

Faucet URLs will be available at [docs.shelby.xyz/apis/faucet](https://docs.shelby.xyz/apis/faucet) when testnet launches.

### Step 5: Update Environment Variables

Edit your `.env` file:

```env
# Before (shelbynet)
SHELBY_NETWORK=shelbynet
SHELBY_API_KEY=aptoslabs_QjMCun...old_shelbynet_key
SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY=ed25519-priv-0x...old_shelbynet_key
SHELBY_SERVICE_ACCOUNT_ADDRESS=0x...old_shelbynet_address

# After (testnet)
SHELBY_NETWORK=testnet
SHELBY_API_KEY=your-new-testnet-api-key
SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY=ed25519-priv-0x...new_testnet_key
SHELBY_SERVICE_ACCOUNT_ADDRESS=0x...new_testnet_address
```

The `SHELBY_NETWORK` variable controls which Shelby network the SDK connects to. Valid values: `shelbynet`, `testnet`, `mainnet`.

### Step 6: Restart the Backend

```bash
cd loop-backend
pnpm dev
```

Check the logs for confirmation:

```
Shelby client initialized with network: testnet
Shelby service account initialized: 0x...your_testnet_address
```

### Step 7: Verify Upload/Download

Test that video upload and download work on the new network:

1. Upload a test video through the API or Studio UI
2. Verify the video plays back correctly
3. Check database records have valid `shelbyAccount` and `shelbyBlobName` values

## Data Migration

**Existing blobs on shelbynet are NOT transferable to testnet.** The networks are completely isolated — they run separate Aptos validators and separate storage providers.

If you have videos stored on shelbynet that need to be preserved:

1. Download the video files from shelbynet before it wipes
2. After switching to testnet, re-upload the videos
3. Update the database records (`shelbyAccount`, `shelbyBlobName`, `shelbyMerkleRoot`, etc.) with the new testnet values

For a fresh start (recommended for dev/staging), simply switch networks and let users upload new content.

## Rollback

To revert to shelbynet, change the environment variables back:

```env
SHELBY_NETWORK=shelbynet
SHELBY_API_KEY=your-shelbynet-api-key
SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY=your-shelbynet-private-key
SHELBY_SERVICE_ACCOUNT_ADDRESS=your-shelbynet-address
```

Restart the backend. Note that any data uploaded to testnet will not be accessible when connected to shelbynet.

## Future: Testnet → Mainnet

The same process applies when migrating from testnet to mainnet:

1. Update SDK if needed
2. Generate mainnet API key and service account
3. Fund with real APT and ShelbyUSD tokens
4. Set `SHELBY_NETWORK=mainnet` with mainnet credentials
5. Re-upload any content that needs to persist

**Important for mainnet:** Storage on mainnet requires real tokens with actual cost. Plan your blob expiration strategy and renewal budget accordingly. See [shelby-integration.md](./shelby-integration.md) for expiration management details.
