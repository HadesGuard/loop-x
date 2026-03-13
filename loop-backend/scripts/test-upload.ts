/**
 * Test upload: register on-chain via SDK (merkle root), then upload via SDK putBlob (multipart).
 * Simple PUT to /v1/blobs/... fails with "Merkle Root does not match" (RPC computes merkle differently).
 * If "Failed to complete multipart upload! status: 400" persists, may be RPC/server-side.
 */
// @ts-ignore
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
// @ts-ignore
import { generateCommitments } from '@shelby-protocol/sdk/node';
import { Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

async function main() {
  const client = new ShelbyNodeClient({
    network: Network.TESTNET,
    apiKey: process.env.SHELBY_API_KEY!,
  });
  const signer = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(process.env.SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY!),
  });
  const coordination = (client as any).coordination;

  console.log(`Network: testnet`);
  console.log(`Account: ${signer.accountAddress.toString()}`);

  // Create a real file to upload
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
  const localFileName = `test-upload-${Date.now()}.txt`;
  const localFilePath = path.join(scriptsDir, localFileName);
  const fileContent = `Hello Shelby World!\nCreated at: ${new Date().toISOString()}\nThis is a real file upload test.`;
  fs.writeFileSync(localFilePath, fileContent, 'utf-8');
  console.log(`Created local file: ${localFilePath}`);

  const data = new Uint8Array(fs.readFileSync(localFilePath));
  const blobName = localFileName;
  const expirationMicros = BigInt((Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000);

  console.log(`Uploading blob: ${blobName} (${data.length} bytes)`);

  try {
    // Step 1: Generate commitments (merkle root) then register on-chain via SDK
    console.log('Step 1: Generate commitments + register on-chain...');
    const provider = await (client as any).getProvider();
    const commitments = await generateCommitments(provider, data);
    const { transaction } = await coordination.registerBlob({
      account: signer,
      blobName,
      blobMerkleRoot: commitments.blob_merkle_root,
      size: data.length,
      expirationMicros,
      config: provider.config,
    });
    await coordination.aptos.waitForTransaction({ transactionHash: transaction.hash });
    console.log('Registered. Txn:', transaction.hash);

    // Step 2: Upload blob via SDK RPC (multipart) so merkle root matches on-chain
    console.log('Step 2: PUT blob via SDK (multipart)...');
    await (client as any).rpc.putBlob({
      account: signer.accountAddress,
      blobName,
      blobData: data,
    });
    console.log('Upload succeeded!');

    // Step 3: Download and verify via SDK
    console.log('Step 3: Download and verify...');
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
    const downloaded = Buffer.concat(chunks).toString('utf-8');
    console.log(`Downloaded: ${downloaded}`);
    console.log(`Match: ${downloaded === fileContent}`);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
