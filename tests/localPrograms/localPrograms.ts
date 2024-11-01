export const verify_poseidon2 = `
program verify_poseidon2.aleo;

struct Credentials:
    issuer as address;
    subject as address;
    dob as u32;
    nationality as field;
    expiry as u32;


function verify:
    input r0 as signature.private;
    input r1 as Credentials.private;
    hash.psd2 r1 into r2 as field;
    sign.verify r0 r1.issuer r2 into r3;
    assert.eq r3 true;
    output r3 as boolean.public;
`;