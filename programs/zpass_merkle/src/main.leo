// The 'zpass_merkle_8' program.
program zpass_merkle_8.aleo {
    // The ZPass record
    record ZPass {
        owner: address,
        issuer: address,
        root: field,
    }

    function get_merkle_tree(leaves_hashes: [field; 8]) -> (field, [field; 2], [field; 4]) {
        let third_level_nodes: [field; 4] = [
            Poseidon2::hash_to_field(leaves_hashes[0u8] + leaves_hashes[1u8]),
            Poseidon2::hash_to_field(leaves_hashes[2u8] + leaves_hashes[3u8]),
            Poseidon2::hash_to_field(leaves_hashes[4u8] + leaves_hashes[5u8]),
            Poseidon2::hash_to_field(leaves_hashes[6u8] + leaves_hashes[7u8]),
        ];

        let second_level_nodes: [field; 2] = [
            Poseidon2::hash_to_field(third_level_nodes[0u8] + third_level_nodes[1u8]),
            Poseidon2::hash_to_field(third_level_nodes[2u8] + third_level_nodes[3u8]),
        ];

        let root_hash: field = Poseidon2::hash_to_field(second_level_nodes[0u8] + second_level_nodes[1u8]);

        return (root_hash, second_level_nodes, third_level_nodes);
    }
    
    // External function to get the merkle tree
    transition get_merkle(leaves_hashed: [field; 8]) -> (field, [field; 2], [field; 4]) {
        return get_merkle_tree(leaves_hashed);
    }

    transition issue(
        private sig: signature,
        private leaves_hashes: [field; 8],
        private issuer: address,
    ) -> ZPass {
        // Verify the first leaf is the issuer
        assert_eq(leaves_hashes[0u8], Poseidon2::hash_to_field(issuer));

        // Get the merkle tree
        let merkle_tree: (field, [field; 2], [field; 4]) = get_merkle_tree(leaves_hashes);

        // Verify signature against root 
        assert_eq(signature::verify(sig, issuer, merkle_tree.0), true);

        // Return the ZPass record and pass the commitment to store in the mapping
        return (ZPass {
            owner: self.caller,
            issuer: issuer,
            root: merkle_tree.0,
        });
    }

    transition verify(zpass: ZPass, leaf_hash: field, merkle_proof: [field; 3]) -> bool {
        let element: field = leaf_hash;

        for i: u8 in 0u8..3u8 {
            // Order does not matter because of the commutative property of group addition
            element = Poseidon2::hash_to_field(element + merkle_proof[i]);
        }
        assert_eq(element, zpass.root);
        return true;
    }
}
