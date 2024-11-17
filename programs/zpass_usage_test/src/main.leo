// The 'zpass_usage_test' program.
import verify_poseidon2_zpass.aleo;

program zpass_usage_test.aleo {
    transition verify_zpass(input: verify_poseidon2_zpass.aleo/ZPass) -> u32 {
        return input.expiry;
    }
}
