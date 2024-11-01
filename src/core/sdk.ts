import * as aleo from '@provablehq/sdk';
import * as wasm from '../../wasm/pkg/issuer';
import { SDKError } from '../errors';
import { 
    SDKOptions, 
    SignCredentialOptions, 
    ProveOnChainOptions, 
    VerifyOnChainOptions,
    ProveOffChainOptions,
    VerifyOffChainOptions
} from '../interfaces';
import type { TransactionModel } from '@provablehq/sdk';

export type { TransactionModel };

export class ZPassSDK {
    private programManager: aleo.ProgramManager;
    private keyProvider: aleo.AleoKeyProvider;
    private recordProvider: aleo.NetworkRecordProvider;
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
            const account = new aleo.Account({privateKey});
            if (!host) {
                this.programManager = new aleo.ProgramManager();
                this.host = "https://api.explorer.provable.com/v1";
            } else {
                this.programManager = new aleo.ProgramManager(host);
                this.host = host;
            }
            this.keyProvider = new aleo.AleoKeyProvider();
            this.recordProvider = new aleo.NetworkRecordProvider(account, this.programManager.networkClient);
            this.programManager.setAccount(account);
            this.programManager.setKeyProvider(this.keyProvider);
            this.programManager.setRecordProvider(this.recordProvider);
            this.lastProgram = null;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'unknown error';
            throw new SDKError(`Invalid private key: ${message}`);
        }
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

        const keyParams = new aleo.AleoKeyProviderParams({
            cacheKey: cacheKey,
        });

        const fee = Number(await aleo.ProgramManagerBase.estimateExecutionFee(
            this.programManager.account?.privateKey(),
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

    public async proveOffChain(options: ProveOffChainOptions) {
        const { localProgram, functionName, inputs } = options;
        
        // Ensure the program is valid and that it contains the function specified
        const program = this.programManager.createProgramFromSource(localProgram);
        const program_id = program.id();
        if (!program.hasFunction(functionName)) {
          throw `Program ${program_id} does not contain function ${functionName}`;
        }
        const cacheKey = `${program_id}:${functionName}`;

        // Get the program imports
        const imports =
          this.programManager.networkClient.getProgramImports(localProgram);

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
        const keyParams = new aleo.AleoKeyProviderParams({
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
          this.programManager.account?.privateKey()
        );

        const outputs = response.getOutputs();
        const execution = response.getExecution().toString();

        return {
            outputs,
            execution,
        };
    }

    public static async verifyOnChain(options: VerifyOnChainOptions): Promise<TransactionModel> {
        const { transactionId, url } = options;
        let networkClient: aleo.AleoNetworkClient;
        if (!url) {
            networkClient = new aleo.AleoNetworkClient("https://api.explorer.provable.com/v1");
        } else {
            networkClient = new aleo.AleoNetworkClient(url);
        }
        const transaction = await networkClient.getTransaction(transactionId);
        return transaction;
    }

    public static async verifyOffChain(options: VerifyOffChainOptions): Promise<string> {
        const { execution, program, functionName, verifyingKey } = options;
        const res = aleo.verifyFunctionExecution(
            aleo.FunctionExecution.fromString(execution),
            verifyingKey, // This should be synthesize by verifier
            aleo.Program.fromString(program),
            functionName
        );
        return res;
    }
} 