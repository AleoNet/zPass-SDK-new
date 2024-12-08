// The 'verify_poseidon2_zpass' program.
program verify_poseidon2_zpass.aleo {
    // The ZPass record
    record ZPass {
        owner: address,
        issuer: address,
        dob: u32,
        nationality: field,
        expiry: u32,
    }

    // The private credential struct
    struct PrivateCredential {
        issuer: address,
        subject: address,
        dob: u32,
        nationality: field,
        expiry: u32,
    }

    // The full credentials struct to be hashed and verified against the signature
    struct Credentials {
        issuer: address,
        subject: address,
        dob: u32,
        nationality: field,
        expiry: u32,
        salt: scalar
    }

    mapping issued: group => bool;

    transition hash(msg: Credentials) -> field {
        return Poseidon2::hash_to_field(msg);
    }

    async transition issue(
        sig: signature,
        msg: PrivateCredential,
        public salt: scalar,
    ) -> (ZPass, Future) {
        // Construct the full credentials struct to be hashed and verified against the signature
        let credentials: Credentials = Credentials {
            issuer: msg.issuer,
            subject: msg.subject,
            dob: msg.dob,
            nationality: msg.nationality,
            expiry: msg.expiry,
            salt: salt
        };

        // Verify signature
        assert_eq(signature::verify(sig, msg.issuer, Poseidon2::hash_to_field(credentials)), true);

        // Compute commitment to prevent double issuance
        let commit: group = BHP256::commit_to_group(msg.subject, salt);

        // Return the ZPass record and pass the commitment to store in the mapping
        return (ZPass {
            owner: msg.issuer,
            issuer: msg.issuer,
            dob: msg.dob,
            nationality: msg.nationality,
            expiry: msg.expiry
        }, issue_finalize(commit));
    }

    async function issue_finalize(
        public commit: group,
    ) {
        // Ensure the commitment is not already issued
        assert_eq(issued.get_or_use(commit, false), false);

        // Store the commitment in the mapping
        issued.set(commit, true);
    }
}
