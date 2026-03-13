// @ts-ignore
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import { Network, AccountAddress, Aptos, AptosConfig } from '@aptos-labs/ts-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const address = AccountAddress.fromString(process.env.SHELBY_SERVICE_ACCOUNT_ADDRESS!);
  console.log(`Checking balance for: ${address.toString()}`);

  const config = new AptosConfig({ network: Network.SHELBYNET });
  const aptos = new Aptos(config);

  try {
    const resources = await aptos.getAccountResources({ accountAddress: address });
    for (const r of resources) {
      if (r.type.includes('CoinStore') || r.type.includes('balance') || r.type.includes('fungible')) {
        console.log(`${r.type}:`, JSON.stringify(r.data, null, 2));
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
