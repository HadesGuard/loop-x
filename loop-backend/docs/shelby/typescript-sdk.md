# Getting Started (/sdks/typescript)

# TypeScript SDK

The Shelby Protocol TypeScript SDK provides both Node.js and browser support for interacting
with the Shelby Protocol. This comprehensive reference covers all available types, functions,
and classes.

## Installation

<CodeBlockTabs defaultValue="npm">
  <CodeBlockTabsList>
    <CodeBlockTabsTrigger value="npm">
      npm
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="pnpm">
      pnpm
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="yarn">
      yarn
    </CodeBlockTabsTrigger>

    <CodeBlockTabsTrigger value="bun">
      bun
    </CodeBlockTabsTrigger>
  </CodeBlockTabsList>

  <CodeBlockTab value="npm">
    ```bash
    npm install @shelby-protocol/sdk @aptos-labs/ts-sdk
    ```
  </CodeBlockTab>

  <CodeBlockTab value="pnpm">
    ```bash
    pnpm add @shelby-protocol/sdk @aptos-labs/ts-sdk
    ```
  </CodeBlockTab>

  <CodeBlockTab value="yarn">
    ```bash
    yarn add @shelby-protocol/sdk @aptos-labs/ts-sdk
    ```
  </CodeBlockTab>

  <CodeBlockTab value="bun">
    ```bash
    bun add @shelby-protocol/sdk @aptos-labs/ts-sdk
    ```
  </CodeBlockTab>
</CodeBlockTabs>

## Quick Start

### Node.js Environment

```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { Network } from "@aptos-labs/ts-sdk";

// Create client configuration
const config = {
  network: Network.SHELBYNET,
  apiKey: "aptoslabs_***",
};

// Initialize the Shelby client
const shelbyClient = new ShelbyNodeClient(config);
```

Explore the complete [Node.js client](/sdks/typescript/node) usage

### Browser Environment

```typescript
import { ShelbyClient } from '@shelby-protocol/sdk/browser'
import { Network } from '@aptos-labs/ts-sdk'

// Create client configuration
const config = {
  network: Network.SHELBYNET
  apiKey: "aptoslabs_***",
}

// Initialize the Shelby client
const shelbyClient = new ShelbyClient(config)
```

Explore the complete [Browser client](/sdks/typescript/browser) usage

## Examples

Explore all of the Shelby examples provided in the examples repo, which demonstrate how to build on Shelby

* [Shelby Examples](https://github.com/shelby/examples/tree/main/apps)

## API Reference

Explore the complete TypeScript API documentation:

* [Core Types & Functions](/sdks/typescript/core) - Shared functionality for both environments
