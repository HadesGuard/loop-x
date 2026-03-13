// @ts-ignore
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const client = new ShelbyNodeClient({
    network: Network.SHELBYNET,
    apiKey: process.env.SHELBY_API_KEY!,
  });

  const signer = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(process.env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY!),
  });

  console.log(`Account: ${signer.accountAddress.toString()}`);

  const testData = new Uint8Array(Buffer.from('Hello Shelby World! This is a test blob upload.'));
  const blobName = `test_${Date.now()}.txt`;

  console.log(`Uploading blob: ${blobName} (${testData.length} bytes)`);

  try {
    await client.upload({
      signer,
      blobData: testData,
      blobName,
      expirationMicros: BigInt((Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000),
    });
    console.log('Upload succeeded!');

    // Try downloading
    const { readable } = await client.download({
      account: signer.accountAddress,
      blobName,
    });

    const reader = readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const downloaded = Buffer.concat(chunks).toString();
    console.log(`Downloaded: ${downloaded}`);
    console.log(`Match: ${downloaded === 'Hello Shelby World! This is a test blob upload.'}`);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

main();
