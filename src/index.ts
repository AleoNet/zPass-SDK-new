export type { 
    SDKOptions,
    SignCredentialOptions,
    OnChainOptions,
    VerifyOnChainOptions
} from './interfaces';
export { HashAlgorithm } from './interfaces';
export { SDKError } from './errors';
export { createAleoWorker } from './core/createAleoWorker';
export { expose } from 'comlink';
export { ZPassSDK } from './core/sdk';
export type { OutputJSON } from './core/sdk';