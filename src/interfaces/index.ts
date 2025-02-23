import { HashAlgorithm } from 'zpass-credential-signer';
import { OfflineQuery } from '@provablehq/wasm';

export { HashAlgorithm };

export interface SDKOptions {
    privateKey: string;
    host?: string;
    network: 'mainnet' | 'testnet';
}

export interface SignCredentialOptions {
    data: { [key: string]: string };
    hashType: HashAlgorithm;
    privateKey?: string;
}

export interface ProveOffChainOptions {
    localProgram: string;
    functionName: string;
    inputs: string[];
    offlineQuery?: OfflineQuery;
}

export interface VerifyOnChainOptions {
    transactionId: string;
    url?: string;
    network: 'mainnet' | 'testnet';
} 

export interface VerifyOffChainOptions {
    execution: string;
    program: string;
    functionName: string;
    inputs?: string[];
    verifyingKey?: string;
    url?: string;
    network: 'mainnet' | 'testnet';
}

export interface OnChainOptions {
    programName: string;
    functionName: string;
    privateFee: boolean;
    inputs: string[];
    fee: number;
    feeRecord?: string;
}
