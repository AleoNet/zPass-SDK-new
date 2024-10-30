import * as aleo from '@provablehq/sdk';
import * as wasm from '../wasm/pkg/issuer';

export { HashAlgorithm } from '../wasm/pkg/issuer';
export { TransactionModel } from '@provablehq/sdk';

export default class ZPassSDK {
    private programManager: aleo.ProgramManager;
    private keyProvider: aleo.AleoKeyProvider;
    private recordProvider: aleo.NetworkRecordProvider;
    private lastProgram: string | null;

    /**
     * Initialize the SDK
     * @param privateKey - The private key of the account
     * @param host - The host of the network client
     */
    constructor(
        privateKey: string,
        host?: string,
    ) {
        const account = new aleo.Account({privateKey});
        if (!host) {
            this.programManager = new aleo.ProgramManager();
        } else {
            this.programManager = new aleo.ProgramManager(host);
        }
        this.keyProvider = new aleo.AleoKeyProvider();
        this.recordProvider = new aleo.NetworkRecordProvider(account, this.programManager.networkClient);
        this.programManager.setAccount(account);
        this.programManager.setKeyProvider(this.keyProvider);
        this.programManager.setRecordProvider(this.recordProvider);
        this.lastProgram = null;
    }

    /**
     * Sign an arbitrary credential
     * @param subject - The subject of the credential
     * @param data - The data to sign in json format
     * @param hashType - The hash type to use
     * @returns The signature and hash
     */
    public async signCredential(
        subject: string,
        data: { [key: string]: any },
        hashType: wasm.HashAlgorithm,
    ): Promise<{signature: string, hash: string}> {
        const msg = new wasm.SignInboundMessage(subject, data);
        const privateKey = this.programManager.account?.privateKey()?.to_string();
        if (!privateKey) {
            throw new Error("Private key is not available");
        }
        const { signature, hash } = wasm.sign_message(privateKey, msg, hashType);
        return {
            signature,
            hash,
        };
    }

    /**
     * Prove a function on-chain
     * @param programName - The name of the program to prove
     * @param functionName - The name of the function to prove
     * @param fee - The fee to pay for the proof
     * @param privateFee - Whether the fee is private
     * @param inputs - The inputs to the function
     * @param feeRecord - The fee record to use
     * @returns The transaction ID
     */
    public async proveOnChain(
        programName: string, 
        functionName: string,
        fee: number,
        privateFee: boolean,
        inputs: string[],
        feeRecord?: string,
    ): Promise<string> {
        const program = await this.programManager.networkClient.getProgram(programName);
        const cacheKey = `${programName}:${functionName}`;

        if (this.lastProgram !== program) {
        const keys = await this.programManager.synthesizeKeys(
                program,
                functionName,
                inputs,
                this.programManager.account?.privateKey()
            );
            this.keyProvider.cacheKeys(cacheKey, keys);
            this.lastProgram = program;
        }

        const keyParams = new aleo.AleoKeyProviderParams({
            cacheKey: cacheKey,
        });

        const transaction = await this.programManager.buildExecutionTransaction({
            programName,
            functionName,
            fee,
            privateFee,
            inputs,
            feeRecord,
            program,
            keySearchParams: keyParams,
            provingKey: this.keyProvider.getKeys(cacheKey)[0],
            verifyingKey: this.keyProvider.getKeys(cacheKey)[1],
        });

        await this.programManager.networkClient.submitTransaction(transaction);

        return transaction.transactionId();
    }

    /**
     * Verify a transaction on-chain
     * @param transactionId - The transaction ID
     * @param url - The URL of the network client
     * @returns The transaction
     */
    public static async verifyOnChain(
        transactionId: string,
        url?: string,
    ): Promise<aleo.TransactionModel> {
        let networkClient: aleo.AleoNetworkClient;
        if (!url) {
            networkClient = new aleo.AleoNetworkClient("https://api.explorer.provable.com/v1");
        } else {
            networkClient = new aleo.AleoNetworkClient(url);
        }
        const transaction = await networkClient.getTransaction(transactionId);
        return transaction;
    }
}
