// @ts-ignore - Shelby SDK subpath exports not resolved with moduleResolution: "node"
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import { Network, AccountAddress, Aptos, AptosConfig } from '@aptos-labs/ts-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const address = AccountAddress.fromString(process.env.SHELBY_SERVICE_ACCOUNT_ADDRESS!);
  console.log(`Funding account ${address.toString()}...`);

  // Use Aptos SDK directly for faucet
  const config = new AptosConfig({
    network: Network.SHELBYNET,
  });
  const aptos = new Aptos(config);

  console.log('Funding with APT (for gas fees)...');
  try {
    const txn = await aptos.fundAccount({
      accountAddress: address,
      amount: 100_000_000, // 1 APT
      options: { waitForIndexer: false },
    });
    console.log('APT fund txn:', txn);
  } catch (e) {
    console.log('APT fund error (may still have succeeded):', (e as Error).message);
  }

  // Fund with ShelbyUSD via SDK
  const client = new ShelbyNodeClient({
    network: Network.SHELBYNET,
    apiKey: process.env.SHELBY_API_KEY!,
  });

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
