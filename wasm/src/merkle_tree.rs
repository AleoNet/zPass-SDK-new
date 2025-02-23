use super::*;

#[derive(Debug, Clone)]
pub struct MerkleTree<N: NetworkNative> {
    root: Field<N>,
    levels: Vec<Vec<Field<N>>>,
}

impl<N: NetworkNative> MerkleTree<N> {
    // Helper function to compute hash of sum of two fields
    fn hash_field_sum(a: &Field<N>, b: &Field<N>) -> Result<Field<N>, CustomError> {
        let sum = a.add(b);
        let value = Value::<N>::from(Literal::Field(sum)).to_fields()
            .map_err(CustomError::from)?;
        N::hash_psd2(value.as_slice()).map_err(CustomError::from)
    }

    pub fn new(inputs: Vec<Field<N>>) -> Result<Self, CustomError> {
        // Initialize tree levels array
        let mut levels: Vec<Vec<Field<N>>> = Vec::new();
        
        // Level 0: Input leaves
        levels.push(inputs);
        
        // Build tree bottom-up until we reach a single root node
        while levels.last().unwrap().len() > 1 {
            let current_level = levels.last().unwrap();
            let mut next_level = Vec::new();
            
            for chunk in current_level.chunks(2) {
                let hash = Self::hash_field_sum(&chunk[0], &chunk[1])?;
                next_level.push(hash);
            }
            
            levels.push(next_level);
        }

        // Root is the last element in the last level
        let root = levels.last().unwrap()[0];
        
        Ok(Self { root, levels })
    }

    pub fn get_proof(&self, index: usize) -> Result<Vec<Field<N>>, CustomError> {
        let mut proof = Vec::new();
        let mut current_index = index;

        // Skip the last level (root) by using .len() - 1
        for level in &self.levels[..self.levels.len() - 1] {
            if current_index % 2 == 0 {
                proof.push(level[current_index + 1]);
            } else {
                proof.push(level[current_index - 1]);
            }
            current_index /= 2;
        }

        Ok(proof)
    }

    pub fn verify_proof(&self, leaf: Field<N>, proof: &Vec<Field<N>>) -> Result<bool, CustomError> {
        let mut current_hash = leaf;
        for proof_element in proof {
            current_hash = Self::hash_field_sum(&current_hash, proof_element)?;
            println!("Current hash: {}", current_hash);
        }

        Ok(current_hash == self.root)
    }

    pub fn root(&self) -> Field<N> {
        self.root
    }

    pub fn levels(&self) -> &Vec<Vec<Field<N>>> {
        &self.levels
    }
}

pub fn sign_root<N: NetworkNative>(private_key: &str, root: &str) -> Result<String, CustomError> {
    if !private_key.starts_with("APrivateKey1") {
        return Err(CustomError::from(anyhow::anyhow!("Private key must start with APrivateKey1")));
    }

    if !root.ends_with("field") {
        return Err(CustomError::from(anyhow::anyhow!("Root must end with 'field'")));
    }
    let private_key = PrivateKey::<N>::from_str(private_key)?;
    let issuer = Address::<N>::try_from(&private_key)?;
    let hash_fields = string_to_value_fields::<N>(root);
    let mut rng = TestRng::default();

    let (signature, _nonce) = sign_message_with_private_key(
        &private_key,
        hash_fields.as_slice(),
        &mut rng
    )?;

    let verified = verify_signature_with_address_and_message(
        &signature,
        &issuer,
        hash_fields.as_slice()
    );
    assert!(verified, "Signature was not verified properly!");

    Ok(signature.to_string())
}

pub fn hash_inputs_size_8<N: NetworkNative>(inputs: Vec<&str>) -> Result<Vec<Field<N>>, CustomError> {
    let mut res = Vec::with_capacity(8);
    let mut last_i= 0;
    for (i, s) in inputs.into_iter().enumerate() {
        let hash = match s {
            s if s.starts_with("aleo1") => {
                let address = Address::<N>::from_str(s)
                    .unwrap_or_else(|e| panic!("Failed to parse Aleo address: {}", e));
                let fields = Value::<N>::from(Literal::Address(address)).to_fields()
                    .map_err(CustomError::from)?;
                N::hash_psd2(fields.as_slice())?
            }
            s if s.ends_with("field") => {
                let (_, field) = Field::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse field: {}", e));
                let fields = string_to_value_fields(field.to_string().as_str());
                N::hash_psd2(&fields)?
            }
            s if s.ends_with("u8") => {
                let (_, num) = U8::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse U8: {}", e));
                let value = Value::<N>::try_from(Literal::U8(num))
                    .unwrap_or_else(|e| panic!("Failed to convert U8 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("u16") => {
                let (_, num) = U16::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse U16: {}", e));
                let value = Value::<N>::try_from(Literal::U16(num))
                    .unwrap_or_else(|e| panic!("Failed to convert U16 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("u32") => {
                let (_, num) = U32::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse U32: {}", e));
                let value = Value::<N>::try_from(Literal::U32(num))
                    .unwrap_or_else(|e| panic!("Failed to convert U32 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("u64") => {
                let (_, num) = U64::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse U64: {}", e));
                let value = Value::<N>::try_from(Literal::U64(num))
                    .unwrap_or_else(|e| panic!("Failed to convert U64 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("u128") => {
                let (_, num) = U128::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse U128: {}", e));
                let value = Value::<N>::try_from(Literal::U128(num))
                    .unwrap_or_else(|e| panic!("Failed to convert U128 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("i8") => {
                let (_, num) = I8::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse I8: {}", e));
                let value = Value::<N>::try_from(Literal::I8(num))
                    .unwrap_or_else(|e| panic!("Failed to convert I8 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("i16") => {
                let (_, num) = I16::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse I16: {}", e));
                let value = Value::<N>::try_from(Literal::I16(num))
                    .unwrap_or_else(|e| panic!("Failed to convert I16 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("i32") => {
                let (_, num) = I32::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse I32: {}", e));
                let value = Value::<N>::try_from(Literal::I32(num))
                    .unwrap_or_else(|e| panic!("Failed to convert I328 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("i64") => {
                let (_, num) = I64::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse I64: {}", e));
                let value = Value::<N>::try_from(Literal::I64(num))
                    .unwrap_or_else(|e| panic!("Failed to convert I64 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("i128") => {
                let (_, num) = I128::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse I128: {}", e));
                let value = Value::<N>::try_from(Literal::I128(num))
                    .unwrap_or_else(|e| panic!("Failed to convert I128 to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("scalar") => {
                let (_, scalar) = Scalar::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse Scalar: {}", e));
                let value = Value::<N>::try_from(Literal::Scalar(scalar))
                    .unwrap_or_else(|e| panic!("Failed to convert Scalar to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s.ends_with("group") => {
                let (_, group) = Group::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse Group: {}", e));
                let value = Value::<N>::try_from(Literal::Group(group))
                    .unwrap_or_else(|e| panic!("Failed to convert Group to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            s if s == "true" || s == "false" => {
                let (_, boolean) = Boolean::<N>::parse(s)
                    .unwrap_or_else(|e| panic!("Failed to parse Boolean: {}", e));
                let value = Value::<N>::try_from(Literal::Boolean(boolean))
                    .unwrap_or_else(|e| panic!("Failed to convert Boolean to Value: {}", e));
                N::hash_psd2(value.to_fields()?.as_slice())?
            }
            _ => {
                panic!("unsupported type");
            }
        };
        res.push(hash);
        last_i = i;
    }
    if last_i < 8 {
        for _ in 0..8 - (last_i + 1) {
            res.push(Field::<N>::zero());
        }
    }
    Ok(res)
}


#[cfg(test)]
mod tests {
    use super::*;

    // Define the network type for the tests
    type N = TestnetV0;

    // Common test inputs
    const TEST_INPUTS: [&str; 4] = [
        "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px",
        "123field",
        "23u8",
        "33u128"
    ];

    #[test]
    fn test_get_proof() {
        let index = 3;
        let res = hash_inputs_size_8::<N>(TEST_INPUTS.to_vec()).unwrap();
        let leaf = res[index];
        let tree = MerkleTree::<N>::new(res).unwrap();
        let proof = tree.get_proof(index).unwrap();
        println!("{:?}", proof);
        let verified = tree.verify_proof(leaf, &proof).unwrap();
        println!("Verified: {}", verified);
        println!("Tree: {:?}", tree);
    }

    #[test]
    fn test_sign_root() {
        let res = hash_inputs_size_8::<N>(TEST_INPUTS.to_vec()).unwrap();
        let tree = MerkleTree::<N>::new(res.clone()).unwrap();
        let private_key = "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH";
        let sig = sign_root::<N>(private_key, tree.root().to_string().as_str()).unwrap();
        println!("Leaves: {:?}", res);
        println!("Root: {}", tree.root());
        println!("Signature: {}", sig);
    }

    #[test]
    fn test_merkle_8() {
        let res = hash_inputs_size_8::<N>(TEST_INPUTS.to_vec()).unwrap();
        let tree = MerkleTree::<N>::new(res).unwrap();
        println!("{:?}", tree);
    }

    #[test]
    fn test_hash_8() {
        let res = hash_inputs_size_8::<N>(TEST_INPUTS.to_vec()).unwrap();
        assert!(res.len() == 8);
        println!("Result: {:?}", res);
    }
}