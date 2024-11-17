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

export const verify_poseidon2_zpass = `
program verify_poseidon2_zpass.aleo;

record zPass:
    owner as address.private;
    issuer as address.private;
    dob as u32.private;
    nationality as field.private;
    expiry as u32.private;

struct Credentials:
    issuer as address;
    subject as address;
    dob as u32;
    nationality as field;
    expiry as u32;


function issue:
    input r0 as signature.private;
    input r1 as Credentials.private;
    hash.psd2 r1 into r2 as field;
    sign.verify r0 r1.issuer r2 into r3;
    assert.eq r3 true;
    cast r1.issuer r1.issuer r1.dob r1.nationality r1.expiry into r4 as zPass.record;
    output r4 as zPass.record;
`;