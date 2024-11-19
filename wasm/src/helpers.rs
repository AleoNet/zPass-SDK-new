use super::*;
use hex::encode;
use wasm_bindgen::prelude::JsValue;
use web_sys::console;
use crate::{Field, CurrentNetwork};

pub trait Logger {
    fn log(&self, message: &str);
}

pub struct ConsoleLogger;

impl Logger for ConsoleLogger {
    fn log(&self, message: &str) {
        console::log_1(&JsValue::from_str(message));
    }
}

pub struct StdoutLogger;

impl Logger for StdoutLogger {
    fn log(&self, message: &str) {
        println!("{}", message);
    }
}

/// Arbitrary message to StructType conversion
pub fn convert_data_to_struct(data: JsonValue, logger: &dyn Logger) -> IndexMap<String, Plaintext<CurrentNetwork>> {
    let mut members: IndexMap<String, Plaintext<CurrentNetwork>> = IndexMap::new();

    for (key, value) in data.as_object().unwrap().clone().into_iter() {
        match value {
            JsonValue::String(s) => {
                let plaintext = match s {
                    s if s.starts_with("aleo1") => {
                        let address = Address::<CurrentNetwork>::from_str(&s)
                            .unwrap_or_else(|e| panic!("Failed to parse Aleo address: {}", e));
                        Plaintext::from(Literal::Address(address))
                    },
                    s if s.ends_with("field") => {
                        let num_str = s.trim_end_matches("field");
                        let field = string_to_field(Some(num_str.to_string()))
                            .unwrap_or_else(|e| panic!("Failed to parse field: {}", e));
                        Plaintext::from(Literal::Field(field))
                    },
                    s if s.ends_with("u8") => {
                        let num_str = s.trim_end_matches("u8");
                        let number = num_str.parse::<u8>()
                            .unwrap_or_else(|e| panic!("Failed to parse u8: {}", e));
                        Plaintext::from(Literal::U8(U8::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("u16") => {
                        let num_str = s.trim_end_matches("u16");
                        let number = num_str.parse::<u16>()
                            .unwrap_or_else(|e| panic!("Failed to parse u16: {}", e));
                        Plaintext::from(Literal::U16(U16::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("u32") => {
                        let num_str = s.trim_end_matches("u32");
                        let number = num_str.parse::<u32>()
                            .unwrap_or_else(|e| panic!("Failed to parse u32: {}", e));
                        Plaintext::from(Literal::U32(U32::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("u64") => {
                        let num_str = s.trim_end_matches("u64");
                        let number = num_str.parse::<u64>()
                            .unwrap_or_else(|e| panic!("Failed to parse u64: {}", e));
                        Plaintext::from(Literal::U64(U64::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("u128") => {
                        let num_str = s.trim_end_matches("u128");
                        let number = num_str.parse::<u128>()
                            .unwrap_or_else(|e| panic!("Failed to parse u128: {}", e));
                        Plaintext::from(Literal::U128(U128::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("i8") => {
                        let num_str = s.trim_end_matches("i8");
                        let number = num_str.parse::<i8>()
                            .unwrap_or_else(|e| panic!("Failed to parse i8: {}", e));
                        Plaintext::from(Literal::I8(I8::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("i16") => {
                        let num_str = s.trim_end_matches("i16");
                        let number = num_str.parse::<i16>()
                            .unwrap_or_else(|e| panic!("Failed to parse i16: {}", e));
                        Plaintext::from(Literal::I16(I16::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("i32") => {
                        let num_str = s.trim_end_matches("i32");
                        let number = num_str.parse::<i32>()
                            .unwrap_or_else(|e| panic!("Failed to parse i32: {}", e));
                        Plaintext::from(Literal::I32(I32::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("i64") => {
                        let num_str = s.trim_end_matches("i64");
                        let number = num_str.parse::<i64>()
                            .unwrap_or_else(|e| panic!("Failed to parse i64: {}", e));
                        Plaintext::from(Literal::I64(I64::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("i128") => {
                        let num_str = s.trim_end_matches("i128");
                        let number = num_str.parse::<i128>()
                            .unwrap_or_else(|e| panic!("Failed to parse i128: {}", e));
                        Plaintext::from(Literal::I128(I128::<CurrentNetwork>::new(number)))
                    },
                    s if s.ends_with("bool") => {
                        let bool_str = s.trim_end_matches("bool");
                        let b = bool_str.parse::<bool>()
                            .unwrap_or_else(|e| panic!("Failed to parse boolean: {}", e));
                        Plaintext::from(Literal::Boolean(Boolean::<CurrentNetwork>::new(b)))
                    },
                    s if s.ends_with("group") => {
                        let (_, group) = Group::<CurrentNetwork>::parse(&s)
                            .unwrap_or_else(|e| panic!("Failed to parse group: {}", e));
                        Plaintext::from(Literal::Group(group))
                    },
                    s if s.ends_with("scalar") => {
                        let (_, scalar) = Scalar::<CurrentNetwork>::parse(&s)
                            .unwrap_or_else(|e| panic!("Failed to parse scalar: {}", e));
                        Plaintext::from(Literal::Scalar(scalar))
                    },
                    s => {
                        let field = string_to_field(Some(s)).unwrap();
                        Plaintext::from(Literal::Field(field))
                    }
                };
                members.insert(key, plaintext);
            },
            _ => {
                logger.log(&format!("Unsupported data type: {:?}", value));
            }
        }
    }
    members
}

pub fn string_to_field(input_str: Option<String>) -> Result<Field<CurrentNetwork>, anyhow::Error> {
    // Convert the input string to a hex-encoded string
    if input_str.is_none() {
        return Ok(Field::<CurrentNetwork>::zero());
    };
    let string_value = input_str.ok_or(anyhow!("The input string was None"))?;
    let u128type = match string_value.as_str().parse::<u128>() {
        Ok(value) => value,
        Err(_) => {
            let hex_encoded = encode(string_value.as_str());
            // Attempt to parse the hex-encoded string into a u128
            u128::from_str_radix(&hex_encoded, 16)
                .map_err(|e| anyhow!("String to field conversion error: {}", e))?
        },
    };

    Ok(Field::<CurrentNetwork>::from_u128(u128type))

}

// Helper functions for various cryptographic and utility operations.
pub(crate) fn insert_to_map(map: &mut IndexMap<Identifier<CurrentNetwork>, Plaintext<CurrentNetwork>>, key: &str, value: Plaintext<CurrentNetwork>) -> Result<(), anyhow::Error> {
    let id = Identifier::from_str(key)
        .map_err(|e| anyhow!("{}: {}", format!("Can't convert {} to Identifier", key), e))?;
    map.insert(id, value);
    Ok(())
}

pub(crate) fn generate_message_with_addresses_and_fields(payload: Credential) -> Result<Value<CurrentNetwork>, anyhow::Error> {
    // Initialize map with capacity matching payload data size
    let mut map = IndexMap::with_capacity(payload.data.len());

    for (key, value) in payload.data.iter() {
        insert_to_map(&mut map, key, value.clone())?;
    }

    Ok(Value::Plaintext(Plaintext::Struct(map, Default::default())))
}

pub(crate) fn create_hash(value: Value<CurrentNetwork>, algorithm: HashAlgorithm) -> Result<String, anyhow::Error> {
    let hash = match algorithm  {
        HashAlgorithm::POSEIDON2 => {
            let message = value.to_fields()
                .map_err(|e| anyhow!("Failed value to Fields conversion: {}", e))?;
            let hash = CurrentNetwork::hash_psd2(message.as_slice())
                .map_err(|e| anyhow!("Failed hash_psd2 conversion: {}", e))?;
            hash.to_string()
        }
        HashAlgorithm::BHP1024 => {
            let message = value.to_bits_le();
            let hash = CurrentNetwork::hash_bhp1024(message.as_slice())
                .map_err(|e| anyhow!("Failed hash_bhp1024 conversion: {}", e))?;
            hash.to_string()
        }
        HashAlgorithm::SHA3_256 => {
            let message = value.to_bits_le();
            let sha_bit_vec = CurrentNetwork::hash_sha3_256(message.as_slice())
                .map_err(|e| anyhow!("Failed hash_sha3_256 conversion: {}", e))?;
            let bhp_group = CurrentNetwork::hash_to_group_bhp256(sha_bit_vec.as_slice())
                .map_err(|e| anyhow!("Failed hash_to_group_bhp256 conversion: {}", e))?;
            let literal_group_from_bhp = Literal::Group(bhp_group);
            let casted_to_field = literal_group_from_bhp
                .cast_lossy(snarkvm_console::program::LiteralType::Field)
                .map_err(|e| anyhow!("Failed cast_lossy conversion: {}", e))?;

            casted_to_field.to_string()
        }
        HashAlgorithm::KECCAK256 => {
            let message = value.to_bits_le();
            let keccak_bit_vec = CurrentNetwork::hash_keccak256(message.as_slice())
                .map_err(|e| anyhow!("Failed hash_keccak256 conversion: {}", e))?;
            let bhp_group = CurrentNetwork::hash_to_group_bhp256(keccak_bit_vec.as_slice())
                .map_err(|e| anyhow!("Failed hash_to_group_bhp256 conversion: {}", e))?;
            let literal_group_from_bhp = Literal::Group(bhp_group);
            let casted_to_field = literal_group_from_bhp
                .cast_lossy(snarkvm_console::program::LiteralType::Field)
                .map_err(|e| anyhow!("Failed cast_lossy conversion: {}", e))?;

            casted_to_field.to_string()
        }
    };
    Ok(hash)
}

pub(crate) fn sign_message_with_private_key(
    private_key: &PrivateKey<CurrentNetwork>,
    message: &[Field<CurrentNetwork>],
    rng: &mut TestRng
) -> Result<(Signature<CurrentNetwork>, Scalar<CurrentNetwork>), anyhow::Error> {
    match Signature::<CurrentNetwork>::sign(private_key, message, rng) {
        Ok(signature) => {
            let nonce = Scalar::rand(rng);
            Ok((signature, nonce))
        }
        Err(_) => Err(anyhow::anyhow!("Failed to create signature")),
    }
}


pub(crate) fn verify_signature_with_address_and_message(
    signature: &Signature<CurrentNetwork>,
    address: &Address<CurrentNetwork>,
    message: &[Field<CurrentNetwork>]
) -> bool {
    signature.verify(address, message)
}

pub(crate) fn string_to_value(s: &str) -> Value<CurrentNetwork> {
    Value::<CurrentNetwork>::from_str(s).expect("Can't convert string to Value")
}

pub(crate) fn string_to_value_fields(s: &str) -> Vec<Field<CurrentNetwork>> {
    let value  = string_to_value(s);
    value.to_fields().expect("Can't convert value to fields")
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_string_to_field_with_valid_u128() {
        let input_str = Some("12345".to_string());
        let result = string_to_field(input_str);
        assert!(result.is_ok());
        let field = result.unwrap();
        assert_eq!(field.to_string(), "12345field");
    }

    #[test]
    fn test_string_to_field_with_valid_hex_encoded_string() {
        let input_str = Some("American".to_string()); // "test" in hex
        let result = string_to_field(input_str);
        assert!(result.is_ok());
        let field = result.unwrap();
        assert_eq!(field.to_string(), "4714535926995575150field");
    }
}
