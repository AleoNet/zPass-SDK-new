// The 'verify_poseidon2_zpass' program.
program verify_poseidon2.aleo {
    struct Credentials {
        issuer: address,
        subject: address,
        dob: u32,
        nationality: field,
        expiry: u32
    }

    transition verify(
        sig: signature,
        public issuer: address,
        dob: u32,
        nationality: field,
        expiry: u32
    ) {
        let creds: Credentials = Credentials {
            issuer: issuer,
            subject: self.caller,
            dob: dob,
            nationality: nationality,
            expiry: expiry
        };
        let res: bool = signature::verify(sig, creds.issuer, Poseidon2::hash_to_field(creds));
        assert_eq(res, true);
    }
}
