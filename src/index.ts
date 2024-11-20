import { loadWasm } from './utils/wasm-loader';

export let wasmInstance: WebAssembly.Instance | null = null;

export async function initializeWasm(): Promise<void> {
    wasmInstance = await loadWasm('../wasm/pkg/issuer_bg.wasm');
}

export type { 
    SDKOptions,
    SignCredentialOptions,
    ProveOnChainOptions,
    VerifyOnChainOptions
} from './interfaces';
export { HashAlgorithm } from '../wasm/pkg/issuer';
export { SDKError } from './errors';
export type { TransactionModel, Output } from './core/sdk';
export { OfflineQuery, Account } from './core/sdk';
export { ZPassSDK } from './core/sdk';
