import { 
    Account, 
    Program, 
    ProgramManager, 
    AleoKeyProvider, 
    NetworkRecordProvider, 
    AleoKeyProviderParams,
    ProgramManagerBase,
    FunctionExecution,
    verifyFunctionExecution,
    AleoNetworkClient,
    PrivateKey,
    VerifyingKey
} from '@provablehq/sdk/testnet.js';
import * as wasm from '../../wasm/pkg/issuer';
import { SDKError } from '../errors';
import { 
    SDKOptions, 
    SignCredentialOptions, 
    ProveOnChainOptions, 
    VerifyOnChainOptions,
    ProveOffChainOptions,
    VerifyOffChainOptions,
    GetRecordsOptions,
} from '../interfaces';
import type { TransactionModel } from '@provablehq/sdk';

export type { TransactionModel };

export class ZPassSDK {
    private programManager: ProgramManager;
    private keyProvider: AleoKeyProvider;
    private recordProvider: NetworkRecordProvider;
    private lastProgram: string | null;
    private host: string;

    constructor({ privateKey, host }: SDKOptions) {
        if (typeof WebAssembly === 'undefined') {
            throw new SDKError('WebAssembly is not supported in this environment. ZPassSDK requires WebAssembly support.');
        }

        if (!privateKey.startsWith('APrivateKey1')) {
            throw new SDKError('Invalid private key format. Private key must start with "APrivateKey1"');
        }

        try {
            const account = new Account({privateKey});
            if (!host) {
                this.programManager = new ProgramManager();
                this.host = "https://api.explorer.provable.com/v1";
            } else {
                this.programManager = new ProgramManager(host);
                this.host = host;
            }
            this.keyProvider = new AleoKeyProvider();
            this.recordProvider = new NetworkRecordProvider(account, this.programManager.networkClient);
            this.programManager.setAccount(account);
            this.programManager.setKeyProvider(this.keyProvider);
            this.programManager.setRecordProvider(this.recordProvider);
            this.lastProgram = null;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'unknown error';
            throw new SDKError(`Invalid private key: ${message}`);
        }
    }

    public setNewHost(host: string) {
        this.host = host;
        this.programManager.setHost(host);
    }

    public async signCredential(options: SignCredentialOptions): Promise<{signature: string, hash: string}> {
        const { subject, data, hashType } = options;
        const msg = new wasm.SignInboundMessage(subject, data);
        const privateKey = this.programManager.account?.privateKey()?.to_string();
        if (!privateKey) {
            throw new SDKError("Private key is not available");
        }
        const { signature, hash } = wasm.sign_message(privateKey, msg, hashType);
        return {
            signature,
            hash,
        };
    }

    public async proveOnChain(options: ProveOnChainOptions): Promise<string> {
        const { programName, functionName, privateFee, inputs, feeRecord } = options;
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

        const keyParams = new AleoKeyProviderParams({
            cacheKey: cacheKey,
        });

        const fee = Number(await ProgramManagerBase.estimateExecutionFee(
            this.programManager.account?.privateKey() as PrivateKey,
            program,
            functionName,
            inputs,
            this.host,
            undefined,
            this.keyProvider.getKeys(cacheKey)[0],
            this.keyProvider.getKeys(cacheKey)[1],
            undefined,
        ));
        console.log("Fee: ", fee);

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

    public async proveOffChain(options: ProveOffChainOptions): Promise<{outputs: string[], execution: string, provingKey: string, verifyingKey: string}> {
        const { localProgram, functionName, inputs, offlineQuery } = options;
        
        // Ensure the program is valid and that it contains the function specified
        const program = this.programManager.createProgramFromSource(localProgram);
        const program_id = program.id();
        if (!program.hasFunction(functionName)) {
          throw `Program ${program_id} does not contain function ${functionName}`;
        }
        const cacheKey = `${program_id}:${functionName}`;

        // Get the program imports
        const imports = await this.programManager.networkClient.getProgramImports(localProgram);

        // Get the proving and verifying keys for the function
        if (this.lastProgram !== localProgram) {
          const keys = await this.programManager.synthesizeKeys(
            localProgram,
            functionName,
            inputs,
            this.programManager.account?.privateKey()
          );
          this.keyProvider.cacheKeys(cacheKey, keys);
          this.lastProgram = localProgram;
        }

        // Pass the cache key to the execute function
        const keyParams = new AleoKeyProviderParams({
          cacheKey: cacheKey,
        });

        // Execute the function locally
        let response = await this.programManager.run(
          localProgram,
          functionName,
          inputs,
          true,
          imports,
          keyParams,
          this.keyProvider.getKeys(cacheKey)[0],
          this.keyProvider.getKeys(cacheKey)[1],
          this.programManager.account?.privateKey(),
          offlineQuery
        );
        const outputs = response.getOutputs();
        const execution = response.getExecution()?.toString();
        const provingKey = response.getProvingKey()?.toString();
        const verifyingKey = response.getVerifyingKey()?.toString();

        return {
            outputs,
            execution: execution!,
            provingKey: provingKey!,
            verifyingKey,
        };
    }

    public static async verifyOnChain(options: VerifyOnChainOptions): Promise<{hasExecution: boolean, value: string}> {
        const { transactionId, url } = options;

        const baseUrl = !url ? "https://api.explorer.provable.com/v1" : url;
        const networkClient = new AleoNetworkClient(baseUrl);

        const transaction = await networkClient.getTransaction(transactionId);
        const hasExecution = transaction.type === "execute" ? true : false;
        const value = transaction.execution.transitions?.[0].outputs?.[0].value ?? "";
        return {
            hasExecution,
            value,
        };
    }

    public static async verifyOffChain(options: VerifyOffChainOptions): Promise<boolean> {
        const { execution, program, functionName, verifyingKey } = options;
        const res = verifyFunctionExecution(
            FunctionExecution.fromString(execution),
            VerifyingKey.fromString(verifyingKey), // This should be synthesize by verifier
            Program.fromString(program),
            functionName
        );
        return res;
    }

    public async getRecords(options: GetRecordsOptions) {
        // Not implemented yet
        throw new SDKError("Not implemented yet");
    }
} 
