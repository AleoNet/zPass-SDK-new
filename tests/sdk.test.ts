import { ZPassSDK, HashAlgorithm } from '../src/index';
import { verify_signed_credential, get_field_from_value, Network } from 'zpass-credential-signer';
import { Account, OfflineQuery } from '@provablehq/sdk/mainnet.js';
import { verify_poseidon2 } from './localPrograms/localPrograms';

// Test configuration
const TEST_PRIVATE_KEY = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";
const TEST_ADDRESS = "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px";
// const TEST_HOST = "https://api.explorer.provable.com/v1";
const TEST_HOST = "http://localhost:3030";

type TestContext = {
    transactionId?: string;
    zPassRecordTxId?: string;
    zPassRecord?: string;
    verifyingKey?: string;
    execution?: string;
};

describe('ZPassSDK', () => {
    let sdk: ZPassSDK;
    const ctx: TestContext = {};

    beforeEach(() => {
        sdk = new ZPassSDK({
            privateKey: TEST_PRIVATE_KEY,
            host: TEST_HOST,
            network: 'testnet'
        });
    });

    describe('signCredential', () => {
        it('should successfully sign a credential', async () => {
            const issuer = new Account({privateKey: TEST_PRIVATE_KEY}).address().to_string();
            const subject = TEST_ADDRESS;
            const data = { 
                issuer: issuer,
                subject: subject,
                number: "20000101u128",
            };
            
            const result = await sdk.signCredential({
                data,
                hashType: HashAlgorithm.POSEIDON2
            });

            expect(result).toHaveProperty('signature');
            expect(result).toHaveProperty('hash');
            expect(typeof result.signature).toBe('string');
            expect(typeof result.hash).toBe('string');
        });

        it('should successfully verify a signed credential', async () => {
            const issuer = new Account({privateKey: TEST_PRIVATE_KEY}).address().to_string();
            const subject = TEST_ADDRESS;
            const data = { 
                issuer: issuer,
                subject: subject,
                number: "12398field",
            };
            
            const result = await sdk.signCredential({
                data,
                hashType: HashAlgorithm.POSEIDON2
            });

            const verified = await verify_signed_credential(result.signature, issuer, result.hash, Network.Testnet);
            expect(verified).toBe(true);
        });

        it('should throw error if private key is not available', () => {
            expect(() => new ZPassSDK({privateKey: 'invalid_private_key', network: 'testnet'}))
                .toThrow('Invalid private key format. Private key must start with "APrivateKey1"');
        });
    });

    describe('issueZPass', () => {
        it('should successfully issue a zPass', async () => {
            const issuer = new Account({privateKey: TEST_PRIVATE_KEY}).address().to_string();
            const subject = TEST_ADDRESS;

            const nationalityField = get_field_from_value("US", Network.Testnet);
            const data = {
                issuer: issuer,
                subject: subject,
                dob: "1990u32",
                nationality: nationalityField,
                expiry: "2030u32"
            };

            const signResult = await sdk.signCredential({
                data,
                hashType: HashAlgorithm.POSEIDON2
            });

            const txId = await sdk.issueZPass({
                programName: "verify_poseidon2_zpass.aleo",
                functionName: "issue",
                privateFee: false,
                fee: 3000,
                inputs: [signResult.signature, `{issuer: ${issuer}, subject: ${subject}, dob: ${data.dob}, nationality: ${nationalityField}, expiry: ${data.expiry}}`]
            });
            
            console.log("Transaction Id with zPass record:", txId);
            expect(typeof txId).toBe('string');
            ctx.zPassRecordTxId = txId;
        }, 500000);
    });

    describe('proveOnChain', () => {
        it('should successfully create and submit a proof transaction', async () => {
            const issuer = new Account({privateKey: TEST_PRIVATE_KEY}).address().to_string();
            const subject = TEST_ADDRESS;

            const nationalityField = get_field_from_value("US", Network.Testnet);
            const data = {
                issuer: issuer,
                subject: subject,
                dob: "1990u32",
                nationality: nationalityField,
                expiry: "2030u32"
            };

            const signResult = await sdk.signCredential({
                data,
                hashType: HashAlgorithm.POSEIDON2
            });

            const result = await sdk.proveOnChain({
                programName: "verify_poseidon2.aleo",
                functionName: "verify",
                privateFee: false,
                fee: 3000,
                inputs: [signResult.signature, `{issuer: ${issuer}, subject: ${subject}, dob: ${data.dob}, nationality: ${nationalityField}, expiry: ${data.expiry}}`]
            });
            
            console.log("Transaction Id:", result);
            expect(typeof result).toBe('string');
            expect(result.startsWith('at')).toBe(true);
            ctx.transactionId = result;
        }, 500000);
    });

    describe('proveOffChain', () => {
        it('should successfully generate an off-chain proof', async () => {
            const issuer = new Account({privateKey: TEST_PRIVATE_KEY}).address().to_string();
            const subject = TEST_ADDRESS;

            const nationalityField = get_field_from_value("US", Network.Testnet);
            const data = {
                issuer: issuer,
                subject: subject,
                dob: "1990u32",
                nationality: nationalityField,
                expiry: "2030u32"
            };

            const signResult = await sdk.signCredential({
                data,
                hashType: HashAlgorithm.POSEIDON2
            });
            const offlineQueryString = `{"state_paths":{},"state_root": "sr1rjxjfdxtr02fl5fgut2z06lpg02tya0tfj2pae6h4p2usdg8gqxqy22lhf"}`;
            const offlineQuery = OfflineQuery.fromString(offlineQueryString);

            const result = await sdk.proveOffChain({
                localProgram: verify_poseidon2,
                functionName: "verify",
                inputs: [
                    signResult.signature, 
                    `{issuer: ${issuer}, subject: ${subject}, dob: ${data.dob}, nationality: ${nationalityField}, expiry: ${data.expiry}}`
                ],
                offlineQuery
            });
            
            console.log("Result: ", result);
            expect(result).toHaveProperty('execution');
            expect(typeof result.execution).toBe('string');
            ctx.execution = result.execution;
            ctx.verifyingKey = result.verifyingKey;
        }, 500000);
    });

    describe('verifyOffChain with verifyingKey', () => {
        it('should successfully verify an off-chain proof', async () => {
            const verificationResult = await ZPassSDK.verifyOffChain({
                execution: ctx.execution!,
                program: verify_poseidon2,
                functionName: "verify",
                verifyingKey: ctx.verifyingKey!,
                network: 'testnet'
            });

            expect(verificationResult).toBe(true);
        }, 500000);
    });

    describe('verifyOffChain with inputs', () => {
        it('should successfully verify an off-chain proof using inputs', async () => {
            const issuer = new Account({privateKey: TEST_PRIVATE_KEY}).address().to_string();
            const subject = TEST_ADDRESS;

            const nationalityField = get_field_from_value("US", Network.Testnet);
            const data = {
                issuer: issuer,
                subject: subject,
                dob: "1990u32",
                nationality: nationalityField,
                expiry: "2030u32"
            };

            const signResult = await sdk.signCredential({
                data,
                hashType: HashAlgorithm.POSEIDON2
            });

            const verificationResult = await ZPassSDK.verifyOffChain({
                execution: ctx.execution!,
                program: verify_poseidon2,
                functionName: "verify",
                inputs: [
                    signResult.signature,
                    `{issuer: ${issuer}, subject: ${subject}, dob: ${data.dob}, nationality: ${nationalityField}, expiry: ${data.expiry}}`
                ],
                network: 'testnet'
            });

            expect(verificationResult).toBe(true);
        }, 500000);
    });

    describe('verifyOnChain', () => {
        it('should successfully verify an onchain transaction proof', async () => {
            const txId = ctx.transactionId!;

            const { hasExecution, outputs } = await ZPassSDK.verifyOnChain({
                transactionId: txId,
                url: TEST_HOST,
                network: 'testnet'
            });

            expect(hasExecution).toBe(true);
            console.log("Returned outputs: ", outputs);
        });
    });

    describe('getZPassRecord', () => {
        it('should successfully get a zPass record', async () => {
            const result = await sdk.getZPassRecord(ctx.zPassRecordTxId!);
            console.log("zPass record:", result);
            expect(typeof result).toBe('string');
            ctx.zPassRecord = result;
        });
    });

    describe('zPassUsageTest', () => {
        it('should successfully verify an imported zPass', async () => {
            const result = await sdk.proveOnChain({
                programName: "zpass_usage_test.aleo",
                functionName: "verify_zpass",
                privateFee: false,
                fee: 3000,
                inputs: [ctx.zPassRecord!]
            });
            console.log("zPass usage test result:", result);
            expect(typeof result).toBe('string');
        }, 500000);
    });
}); 
