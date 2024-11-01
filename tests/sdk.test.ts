import { describe, it, expect, beforeEach } from 'vitest';
import { ZPassSDK, HashAlgorithm } from '../src/index';
import { verify_signed_credential, get_field_from_value } from '../wasm/pkg/issuer';
import { Account } from '@provablehq/sdk';

// Test configuration
const TEST_PRIVATE_KEY = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";
const TEST_ADDRESS = "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px";
// const TEST_HOST = "https://api.explorer.provable.com/v1";
const TEST_HOST = "http://localhost:3030";

describe('ZPassSDK', () => {
    let sdk: ZPassSDK;

    beforeEach(() => {
        sdk = new ZPassSDK({
            privateKey: TEST_PRIVATE_KEY,
            host: TEST_HOST
        });
    });

    describe('signCredential', () => {
        it('should successfully sign a credential', async () => {
            const subject = TEST_ADDRESS;
            const data = { key: "value" };
            
            const result = await sdk.signCredential(
                {
                    subject,
                    data,
                    hashType: HashAlgorithm.POSEIDON2
                }
            );

            expect(result).toHaveProperty('signature');
            expect(result).toHaveProperty('hash');
            expect(typeof result.signature).toBe('string');
            expect(typeof result.hash).toBe('string');
        });

        it('should successfully verify a signed credential', async () => {
            const subject = TEST_ADDRESS;
            const data = { key: "value" };
            
            const result = await sdk.signCredential(
                {
                    subject,
                    data,
                    hashType: HashAlgorithm.POSEIDON2
                }
            );

            const verified = await verify_signed_credential(result.signature, subject, result.hash);
            expect(verified).toBe(true);
        });

        it('should throw error if private key is not available', () => {
            expect(() => new ZPassSDK({privateKey: 'invalid_private_key'})).toThrow('Invalid private key format. Private key must start with "APrivateKey1"');
        });
    });

    describe('proveOnChain', () => {
        it('should successfully create and submit a proof transaction', async () => {
            const subject = TEST_ADDRESS;
            const data = {
                dob: 1990,
                nationality: "US",
                expiry: 2030
            };
            const nationalityField = get_field_from_value(data.nationality);
            
            const signResult = await sdk.signCredential(
                {
                    subject,
                    data,
                    hashType: HashAlgorithm.POSEIDON2
                }
            );

            const issuer = new Account({privateKey: TEST_PRIVATE_KEY}).address().to_string();

            const result = await sdk.proveOnChain({
                programName: "verify_poseidon2.aleo",
                functionName: "verify",
                privateFee: false,
                inputs: [signResult.signature, `{issuer: ${issuer}, subject: ${subject}, dob: ${data.dob}u32, nationality: ${nationalityField}, expiry: ${data.expiry}u32}`]
            });
            
            console.log("Transaction:", result);
            expect(typeof result).toBe('string');
        }, 500000);
    });

    describe('verifyOnChain', () => {
        it('should successfully verify a transaction', async () => {
            // First create a transaction to verify
            const txId = await sdk.proveOnChain({
                programName: "test_program",
                functionName: "test_function", 
                privateFee: true,
                inputs: ["input1", "input2"]
            });

            const transaction = await ZPassSDK.verifyOnChain({
                transactionId: txId
            });

            expect(transaction).toHaveProperty('type');
            expect(transaction).toHaveProperty('status');
        });

        it('should use custom URL when provided', async () => {
            // First create a transaction to verify
            const txId = await sdk.proveOnChain({
                programName: "test_program",
                functionName: "test_function",
                privateFee: true,
                inputs: ["input1", "input2"]
            });

            const customUrl = "https://custom.api.com";
            const transaction = await ZPassSDK.verifyOnChain({
                transactionId: txId,
                url: customUrl
            });

            expect(transaction).toHaveProperty('type');
            expect(transaction).toHaveProperty('status');
        });
    });
}); 