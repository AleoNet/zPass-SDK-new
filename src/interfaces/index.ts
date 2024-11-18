import { HashAlgorithm } from '../../wasm/pkg/issuer';
import { OfflineQuery } from '@provablehq/wasm';

export { HashAlgorithm };

export interface SDKOptions {
    privateKey: string;
    host?: string;
}

export interface SignCredentialOptions {
    data: { [key: string]: any };
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
} 

export interface VerifyOffChainOptions {
    execution: string;
    program: string;
    functionName: string;
    inputs?: string[];
    verifyingKey?: string;
    url?: string;
}

export interface GetRecordsOptions {
    program: string;
    functionName: string;
    inputs: string[];
}

export interface BaseChainOptions {
    programName: string;
    functionName: string;
    privateFee: boolean;
    inputs: string[];
    fee: number;
    feeRecord?: string;
}

export interface IssueZPassOptions extends BaseChainOptions {}
export interface ProveOnChainOptions extends BaseChainOptions {}
export interface OnChainInteractOptions extends BaseChainOptions {}