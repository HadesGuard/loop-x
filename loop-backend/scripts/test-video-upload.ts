/**
 * Test uploading the actual video file directly via SDK (bypassing the backend).
 * Tests whether the WASM warmup + larger file upload works.
 */
// @ts-ignore
import { ShelbyNodeClient, generateCommitments, ClayErasureCodingProvider, defaultErasureCodingConfig } from '@shelby-protocol/sdk/node';
import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function main() {
  const client = new ShelbyNodeClient({
    network: Network.TESTNET,
    apiKey: process.env.SHELBY_API_KEY!,
  });
  const signer = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(process.env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY!),
  });

  // WASM warmup
  console.log('Warming up WASM...');
  const provider = await ClayErasureCodingProvider.create(defaultErasureCodingConfig());
  await generateCommitments(provider, new Uint8Array(16));
  console.log('Warmed up.');

  // Upload the actual video file
  const videoData = new Uint8Array(fs.readFileSync('/tmp/test-loop-video.mp4'));
  const blobName = `video_e2e_test_${Date.now()}.mp4`;
  console.log(`Uploading ${videoData.length} bytes as ${blobName}...`);

  try {
    await client.upload({
      signer,
      blobData: videoData,
      blobName,
      expirationMicros: BigInt((Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000),
      onProgress: (progress: any) => {
        console.log(`  Progress: ${progress.phase} part=${progress.partIdx}/${progress.totalParts} uploaded=${progress.uploadedBytes}/${progress.totalBytes}`);
      },
    });
    console.log('UPLOAD SUCCESS!');

    // Verify download
    console.log('Downloading...');
    const { readable } = await client.download({
      account: signer.accountAddress,
      blobName,
    });
    const reader = readable.getReader();
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
    }
    console.log(`Downloaded ${totalBytes} bytes`);
    console.log(`Size match: ${totalBytes === videoData.length}`);
  } catch (e: any) {
    console.error('FAILED:', e.message);
  }
}

main();
