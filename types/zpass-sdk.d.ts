declare module 'zpass-sdk' {
  export enum HashAlgorithm {
    POSEIDON2 = 'POSEIDON2'
  }

  interface SignatureResult {
    signature: string;
    hash: string;
  }

  export default class ZPassSDK {
    constructor(privateKey: string);
    
    signCredential(
      subject: string,
      data: Record<string, any>,
      algorithm: HashAlgorithm
    ): Promise<SignatureResult>;

    static verifyOnChain(transactionId: string): Promise<any>;
  }
} 