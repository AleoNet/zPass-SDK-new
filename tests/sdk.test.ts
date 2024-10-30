import { describe, it, expect, beforeEach } from 'vitest';
import ZPassSDK, { HashAlgorithm } from '../src/index';
import { Account, Signature } from '@provablehq/sdk';
import { verify_signed_credential } from '../wasm/pkg/issuer';

// Test configuration
const TEST_PRIVATE_KEY = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";
const TEST_ADDRESS = "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px";
const TEST_HOST = "https://api.explorer.provable.com/v1";

describe('ZPassSDK', () => {
    let sdk: ZPassSDK;

    beforeEach(() => {
        sdk = new ZPassSDK(TEST_PRIVATE_KEY, TEST_HOST);
    });

    describe('signCredential', () => {
        it('should successfully sign a credential', async () => {
            const subject = TEST_ADDRESS;
            const data = { key: "value" };
            
            const result = await sdk.signCredential(
                subject,
                data,
                HashAlgorithm.POSEIDON2
            );

            expect(result).toHaveProperty('signature');
            expect(result).toHaveProperty('hash');
            expect(typeof result.signature).toBe('string');
            expect(typeof result.hash).toBe('string');
        });

        it('should successfully verify a signed credential', async () => {
            const account = new Account({privateKey: TEST_PRIVATE_KEY});
            const subject = TEST_ADDRESS;
            const data = { key: "value" };
            
            const result = await sdk.signCredential(
                subject,
                data,
                HashAlgorithm.POSEIDON2
            );

            const verified = await verify_signed_credential(result.signature, subject, result.hash);
            expect(verified).toBe(true);
        });

        it('should throw error if private key is not available', () => {
            expect(() => new ZPassSDK('invalid_private_key')).toThrow('Invalid private key format. Private key must start with "APrivateKey1"');
        });
    });

    describe('proveOnChain', () => {
        it('should successfully create and submit a proof transaction', async () => {
            const result = await sdk.proveOnChain(
                "test_program",
                "test_function",
                50000,
                true,
                ["input1", "input2"]
            );

            expect(typeof result).toBe('string');
        });
    });

    describe('verifyOnChain', () => {
        it('should successfully verify a transaction', async () => {
            // First create a transaction to verify
            const txId = await sdk.proveOnChain(
                "test_program",
                "test_function", 
                50000,
                true,
                ["input1", "input2"]
            );

            const transaction = await ZPassSDK.verifyOnChain(txId);

            expect(transaction).toHaveProperty('type');
            expect(transaction).toHaveProperty('status');
        });

        it('should use custom URL when provided', async () => {
            // First create a transaction to verify
            const txId = await sdk.proveOnChain(
                "test_program",
                "test_function",
                50000,
                true,
                ["input1", "input2"]
            );

            const customUrl = "https://custom.api.com";
            const transaction = await ZPassSDK.verifyOnChain(txId, customUrl);

            expect(transaction).toHaveProperty('type');
            expect(transaction).toHaveProperty('status');
        });
    });
}); 