// The 'verify_poseidon2' program.
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
        msg: Credentials,
    ) -> public bool {
        let res: bool = signature::verify(sig, msg.issuer, Poseidon2::hash_to_field(msg));
        assert_eq(res, true);
        return res;
    }
}
