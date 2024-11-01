import { HashAlgorithm } from '../../wasm/pkg/issuer';

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
