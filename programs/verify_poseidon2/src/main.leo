// The 'verify_poseidon2_zpass' program.
program verify_poseidon2.aleo {
    record zPass {
        owner: address,
        issuer: address,
        dob: u32,
        nationality: field,
        expiry: u32
    }

    struct Credentials {
        issuer: address,
        subject: address,
        dob: u32,
        nationality: field,
        expiry: u32
    }

    transition issue(
        sig: signature,
        msg: Credentials,
    ) -> public bool {
        let res: bool = signature::verify(sig, msg.issuer, Poseidon2::hash_to_field(msg));
        assert_eq(res, true);
        return res;
    }
}
