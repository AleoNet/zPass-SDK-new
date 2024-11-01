import { HashAlgorithm } from '../../wasm/pkg/issuer';
import { OfflineQuery } from '@provablehq/wasm';

export { HashAlgorithm };

export interface SDKOptions {
    privateKey: string;
    host?: string;
}

export interface SignCredentialOptions {
    subject: string;
    data: { [key: string]: any };
    hashType: HashAlgorithm;
}

export interface ProveOnChainOptions {
    programName: string;
    functionName: string;
    privateFee: boolean;
    inputs: string[];
    feeRecord?: string;
}

export interface ProveOffChainOptions {
    localProgram: string;
    functionName: string;
    inputs: string[];
    offlineQuery: OfflineQuery;
}

export interface VerifyOnChainOptions {
    transactionId: string;
    url?: string;
} 

export interface VerifyOffChainOptions {
    execution: string;
    program: string;
    functionName: string;
    verifyingKey: string;
}

export interface GetRecordsOptions {
    program: string;
    functionName: string;
    inputs: string[];
}