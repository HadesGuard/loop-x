// @ts-ignore - Shelby SDK subpath exports not resolved with moduleResolution: "node"
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import { Network, AccountAddress } from '@aptos-labs/ts-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const address = AccountAddress.fromString(process.env.SHELBY_SERVICE_ACCOUNT_ADDRESS!);
  console.log(`Funding account ${address.toString()}...`);

  const network = process.env.SHELBY_NETWORK === 'testnet' ? Network.TESTNET
    : process.env.SHELBY_NETWORK === 'mainnet' ? Network.MAINNET
    : Network.SHELBYNET;

  const client = new ShelbyNodeClient({
    network,
    apiKey: process.env.SHELBY_API_KEY!,
  });

  console.log(`Network: ${process.env.SHELBY_NETWORK}`);

  // Fund with APT (for gas fees)
  console.log('Funding with APT (for gas fees)...');
  try {
    const result = await client.fundAccountWithAPT({ address, amount: 100_000_000 });
    console.log('APT fund result:', result);
  } catch (e) {
    console.log('APT fund error:', (e as Error).message);
  }

  // Fund with ShelbyUSD (for storage fees)
  console.log('Funding with ShelbyUSD (for storage fees)...');
  try {
    const result = await client.fundAccountWithShelbyUSD({ address, amount: 1_000_000_000 });
    console.log('ShelbyUSD fund result:', result);
  } catch (e) {
    console.log('ShelbyUSD fund error:', (e as Error).message);
  }

  console.log('Done!');
}

main().catch(console.error);
