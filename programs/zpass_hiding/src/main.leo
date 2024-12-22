// The 'zpass_hiding' program.
program zpass_hiding.aleo {
    // The ZPass record
    record ZPass {
        owner: address,
        issuer: group,
        dob: group,
        nationality: group,
        expiry: group,
        salt: scalar
    }

    // The private credential struct
    struct PrivateCredential {
        issuer: address,
        subject: address,
        dob: u32,
        nationality: field,
        expiry: u32
    }

    // The public credential struct
    // This is the public information that is shared publicly onchain
    struct PublicCredential {
        salt: scalar
    }

    // The full credentials struct to be hashed and verified against the signature
    struct FullCredentials {
        issuer: address,
        subject: address,
        dob: u32,
        nationality: field,
        expiry: u32,
        salt: scalar
    }

    // The mapping of issued commitments
    mapping issued: group => bool;

    // The count of issued ZPasses
    // Using key of 0field as global key
    mapping issuance_count: field => u128;

    async transition issue(
        private sig: signature,
        private pri: PrivateCredential,
        public pub: PublicCredential,
    ) -> (ZPass, Future) {
        // Construct the full credentials struct to be hashed and verified against the signature
        let credentials: FullCredentials = FullCredentials {
            issuer: pri.issuer,
            subject: self.caller, // The caller must be the subject of the ZPass
            dob: pri.dob,
            nationality: pri.nationality,
            expiry: pri.expiry,
            salt: pub.salt,
        };

        // Verify signature
        assert_eq(signature::verify(sig, pri.issuer, Poseidon2::hash_to_field(credentials)), true);

        // Compute commitment to prevent double issuance
        let commit: group = BHP256::commit_to_group(self.caller, pub.salt);

        // Return the ZPass record and pass the commitment to store in the mapping
        return (ZPass {
            owner: self.caller,
            issuer: BHP256::commit_to_group(pri.issuer, pub.salt),
            dob: BHP256::commit_to_group(pri.dob, pub.salt),
            nationality: BHP256::commit_to_group(pri.nationality, pub.salt),
            expiry: BHP256::commit_to_group(pri.expiry, pub.salt),
            salt: pub.salt
        }, issue_finalize(commit));
    }

    async function issue_finalize(
        public commit: group
    ) {
        // Ensure the commitment is not already issued
        assert_eq(issued.get_or_use(commit, false), false);

        // Store the commitment in the mapping
        issued.set(commit, true);
        // Increment the issuance count
        issuance_count.set(0field, issuance_count.get_or_use(0field, 0u128) + 1u128);
    }

    // Sample transition to check if the dob is more than 18 years old
    transition more_than_18(
        dob: u32,
        salt: scalar,
        dob_commit: group,
        dob_check: u32
    ) {
        // Ensure knowledge of the dob commitment
        assert_eq(dob_commit, BHP256::commit_to_group(dob, salt));
        // Ensure the dob is more than 18 years old
        assert_eq(dob > dob_check, true);
    }
}
