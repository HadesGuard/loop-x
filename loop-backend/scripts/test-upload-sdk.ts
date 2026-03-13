// Test using SDK's high-level upload() method with WASM warmup
// @ts-ignore
import { ShelbyNodeClient, generateCommitments, ClayErasureCodingProvider, defaultErasureCodingConfig } from '@shelby-protocol/sdk/node';
import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const client = new ShelbyNodeClient({
    network: Network.TESTNET,
    apiKey: process.env.SHELBY_API_KEY!,
  });
  const signer = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(process.env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY!),
  });

  // WASM warmup — first generateCommitments call produces incorrect results
  console.log('Warming up WASM provider...');
  const provider = await ClayErasureCodingProvider.create(defaultErasureCodingConfig());
  await generateCommitments(provider, new Uint8Array(16));
  console.log('WASM warmed up.');

  const testData = new Uint8Array(Buffer.from('SDK upload test'));
  const blobName = `sdk_test_${Date.now()}.txt`;
  const expirationMicros = BigInt((Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000);

  console.log(`Account: ${signer.accountAddress.toString()}`);
  console.log(`Blob: ${blobName} (${testData.length} bytes)`);

  try {
    await client.upload({
      signer,
      blobData: testData,
      blobName,
      expirationMicros,
      onProgress: (progress: any) => {
        console.log(`Progress: ${progress.phase} part=${progress.partIdx}/${progress.totalParts}`);
      },
    });
    console.log('Upload SUCCESS!');

    // Verify download
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
    console.log(`Downloaded: ${Buffer.concat(chunks).toString()}`);
  } catch (e: any) {
    console.error('FAILED:', e.message);
    if (e.cause) console.error('Cause:', e.cause);
  }
}

main().catch(console.error);
