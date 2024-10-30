import { expect, test, describe } from 'vitest';
import ZPassSDK, { HashAlgorithm } from 'zpass-sdk';

describe('ZPassSDK', () => {
    // Test private key from the Rust tests
    const privateKey = "APrivateKey1zkp5LqRmm7535XfiX77VPQEgsS2Dj1B2DvH4QNP1UYrHEoR";
    const subject = "aleo14w44zfrehup9g894j7tgeyz5gsjuxn0nfn09vd2fvpznrg85rs8skywkte";
    
    test('should initialize SDK', () => {
        const sdk = new ZPassSDK(privateKey);
        expect(sdk).toBeDefined();
    });

    test('should sign credential', async () => {
        const sdk = new ZPassSDK(privateKey);
        const data = {
            name: "John Doe",
            age: 30,
            city: "New York"
        };

        const result = await sdk.signCredential(
            subject,
            data,
            HashAlgorithm.POSEIDON2
        );

        expect(result.signature).toBeDefined();
        expect(result.hash).toBeDefined();
    });

    test('should verify transaction on chain', async () => {
        const transactionId = "at1abcdef..."; // Replace with a real transaction ID
        const transaction = await ZPassSDK.verifyOnChain(transactionId);
        expect(transaction).toBeDefined();
    }, 10000);
});
