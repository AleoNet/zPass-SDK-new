import * as wasm from 'zpass-credential-signer';
import { SDKError } from '../errors';
import { 
    SDKOptions, 
    SignCredentialOptions,  
    VerifyOnChainOptions,
    ProveOffChainOptions,
    VerifyOffChainOptions,
    OnChainOptions,
} from '../interfaces';
import * as mainnetSDK from '@provablehq/sdk/mainnet.js';
import * as testnetSDK from '@provablehq/sdk/testnet.js';

export type OutputJSON = mainnetSDK.OutputJSON | testnetSDK.OutputJSON;

export class ZPassSDK {
    private programManager!: mainnetSDK.ProgramManager | testnetSDK.ProgramManager;
    private keyProvider!: mainnetSDK.AleoKeyProvider | testnetSDK.AleoKeyProvider;
    private recordProvider!: mainnetSDK.NetworkRecordProvider | testnetSDK.NetworkRecordProvider;
    private networkClient!: mainnetSDK.AleoNetworkClient | testnetSDK.AleoNetworkClient;
    private lastProgram!: string | null;
    private network!: wasm.Network;
    private sdk: typeof mainnetSDK | typeof testnetSDK;

    public async getSDKModules(): Promise<{
        Account: typeof mainnetSDK.Account | typeof testnetSDK.Account,
        OfflineQuery: typeof mainnetSDK.OfflineQuery | typeof testnetSDK.OfflineQuery,
        initThreadPool: typeof mainnetSDK.initThreadPool | typeof testnetSDK.initThreadPool
    }> {
        return {
            Account: this.sdk.Account,
            OfflineQuery: this.sdk.OfflineQuery,
            initThreadPool: this.sdk.initThreadPool
        };
    }

    constructor({ privateKey, host, network = 'mainnet' }: SDKOptions) {
        if (typeof WebAssembly === 'undefined') {
            throw new SDKError('WebAssembly is not supported in this environment. ZPassSDK requires WebAssembly support.');
        }

        if (!privateKey.startsWith('APrivateKey1')) {
            throw new SDKError('Invalid private key format. Private key must start with "APrivateKey1"');
        }

        if (network === 'mainnet') {
            this.sdk = mainnetSDK;
            const { Account, ProgramManager, AleoKeyProvider, NetworkRecordProvider, AleoNetworkClient } = this.sdk;
            try {
                const account = new Account({privateKey});
                host = host ? host : 'https://api.explorer.provable.com/v1';
                this.programManager = new ProgramManager(host);
                this.networkClient = new AleoNetworkClient(host, {
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                this.keyProvider = new AleoKeyProvider();
                this.recordProvider = new NetworkRecordProvider(account, this.networkClient);
                this.programManager.setAccount(account);
                this.programManager.setKeyProvider(this.keyProvider);
                this.programManager.setRecordProvider(this.recordProvider);
                this.lastProgram = null;
                this.network = wasm.Network.Mainnet;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'unknown error';
                throw new SDKError(`Error initializing SDK: ${message}`);
            }
        } else {
            this.sdk = testnetSDK;
            const { Account, ProgramManager, AleoKeyProvider, NetworkRecordProvider, AleoNetworkClient } = this.sdk;
            try {
                const account = new Account({privateKey});
                host = host ? host : 'https://api.explorer.provable.com/v1';
                this.programManager = new ProgramManager(host);
                this.networkClient = new AleoNetworkClient(host, {
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                this.keyProvider = new AleoKeyProvider();
                this.recordProvider = new NetworkRecordProvider(account, this.networkClient);
                this.programManager.setAccount(account);
                this.programManager.setKeyProvider(this.keyProvider);
                this.programManager.setRecordProvider(this.recordProvider);
                this.lastProgram = null;
                this.network = wasm.Network.Testnet;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'unknown error';
                throw new SDKError(`Error initializing SDK: ${message}`);
            }
        }
    }

    public async getMerkleRoot(inputs: string[]): Promise<string> {
        const root = wasm.get_merkle_root(inputs, this.network);
        return root;
    }

    public async getMerkleTree(inputs: string[]): Promise<string> {
        const proof = wasm.get_merkle_tree(inputs, this.network);
        return proof;
    }

    public async getMerkleProof(inputs: string[], index: number): Promise<string[]> {
        const proof = wasm.get_merkle_proof(inputs, index, this.network);
        return proof;
    }

    public async getLeavesHashes(inputs: string[]): Promise<string[]> {
        const hashes = wasm.hash_to_fields_size_8(inputs, this.network);
        return hashes;
    }

    public async signMerkleRoot(root: string): Promise<string> {
        const privateKey = this.programManager.account?.privateKey()?.to_string();
        if (!privateKey) {
            throw new SDKError("Private key is not available");
        }
        const proof = wasm.sign_merkle_root(privateKey, root, this.network);
        return proof;
    }

    public setNewHost(host: string) {
        this.programManager.setHost(host);
    }

    public async signCredential(options: SignCredentialOptions): Promise<{signature: string, hash: string}> {
        const { data, hashType, privateKey } = options;
        const msg = new wasm.SignInboundMessage(data);
        const privateKeyToUse = privateKey ?? this.programManager.account?.privateKey()?.to_string();
        if (!privateKeyToUse) {
            throw new SDKError("Private key is not available");
        }
        const { signature, hash } = wasm.sign_message(privateKeyToUse, msg, hashType, this.network);
        return {
            signature,
            hash,
        };
    }

    public async issueZPass(options: OnChainOptions): Promise<string> {
        return this.onChainInteract(options);
    }

    public async getZPassRecord(transactionId: string): Promise<string> {
        const { RecordCiphertext } = this.sdk;
        const tx = await this.networkClient.getTransaction(transactionId);
        const outputs = tx.execution?.transitions?.[0].outputs;
        if (!outputs) {
            throw new SDKError("No outputs found in transaction");
        }
        
        const recordOutput = outputs.find((output: mainnetSDK.OutputJSON | testnetSDK.OutputJSON) => output.type === 'record');
        if (!recordOutput) {
            throw new SDKError("No record found in transaction outputs");
        }
        const record = recordOutput.value;

        const recordCiphertext = RecordCiphertext.fromString(record);
        const viewKey = this.programManager.account?.viewKey();
        if (!viewKey) {
            throw new SDKError("View key is not available");
        }
        const recordPlaintext = recordCiphertext.decrypt(viewKey);

        return recordPlaintext.toString();
    }

    public async proveOnChain(options: OnChainOptions): Promise<string> {
        return this.onChainInteract(options);
    }

    public async proveOffChain(options: ProveOffChainOptions): Promise<{outputs: string[], execution: string, verifyingKey: string}> {
        const { localProgram, functionName, inputs, offlineQuery } = options;
        const { AleoKeyProviderParams } = this.sdk;
        
        // Ensure the program is valid and that it contains the function specified
        const program = this.programManager.createProgramFromSource(localProgram);
        const program_id = program.id();
        if (!program.hasFunction(functionName)) {
          throw `Program ${program_id} does not contain function ${functionName}`;
        }
        const cacheKey = `${program_id}:${functionName}`;

        // Get the program imports
        const imports = await this.networkClient.getProgramImports(localProgram);

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
        const response = await this.programManager.run(
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
        const verifyingKey = response.getVerifyingKey()?.toString();

        return {
            outputs,
            execution: execution!,
            verifyingKey,
        };
    }

    public static async verifyOnChain(options: VerifyOnChainOptions): Promise<{hasExecution: boolean, outputs: mainnetSDK.OutputJSON[] | testnetSDK.OutputJSON[]}> {
        const { transactionId, url, network } = options;
        let sdkModule = network === 'mainnet' ? mainnetSDK : testnetSDK;
        const { AleoNetworkClient } = sdkModule;

        const baseUrl = !url ? "https://api.explorer.provable.com/v1" : url;
        const networkClient = new AleoNetworkClient(baseUrl, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        const transaction = await networkClient.getTransaction(transactionId);
        console.log("Transaction:", transaction);
        const hasExecution = transaction.type === "execute" ? true : false;
        const outputs = transaction.execution?.transitions?.[0].outputs;
        return {
            hasExecution,
            outputs: outputs ?? [],
        };
    }

    public static async verifyOffChain(options: VerifyOffChainOptions): Promise<boolean> {
        const { execution, program, functionName, inputs, verifyingKey, url, network } = options;
        let sdkModule = network === 'mainnet' ? mainnetSDK : testnetSDK;
        const { ProgramManager, AleoKeyProvider, verifyFunctionExecution, FunctionExecution, VerifyingKey, Program } = sdkModule;
        
        // Validate that at least one of inputs or verifyingKey is provided
        if (!inputs && !verifyingKey) {
            throw new SDKError("Either inputs or verifyingKey must be provided");
        }

        let verifyingKeyToUse: string;
        
        if (!verifyingKey && inputs) {
            // Branch 1: Only use inputs if verifyingKey is not provided
            const programManager = new ProgramManager(url, new AleoKeyProvider());
            const keys = await programManager.synthesizeKeys(
                program,
                functionName,
                inputs,
            );
            verifyingKeyToUse = keys[1].toString();
        } else {
            // Branch 2: Priority branch - use verifyingKey if provided
            verifyingKeyToUse = verifyingKey!;
        }

        const res = verifyFunctionExecution(
            FunctionExecution.fromString(execution),
            VerifyingKey.fromString(verifyingKeyToUse),
            Program.fromString(program),
            functionName
        );
        return res;
    }

    async onChainInteract(options: OnChainOptions): Promise<string> {
        const { programName, functionName, inputs, privateFee, fee, feeRecord } = options;
        const { AleoKeyProviderParams } = this.sdk;
        const program = await this.networkClient.getProgram(programName);
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

        await this.networkClient.submitTransaction(transaction);

        return transaction.id();
    }
} 
