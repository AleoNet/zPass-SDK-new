// Extern crate
extern crate core;

// Modules
mod helpers;
pub mod wasm;
mod error;
mod merkle_tree;

// Crate level imports
pub use wasm::*;

// Standard library imports
use std::convert::TryFrom;
use std::str::FromStr;

// External crate imports
use snarkvm_console::{
    prelude::Parser, account::{PrivateKey, Signature}, network::{environment::ToFields, TestnetV0, MainnetV0, Network as NetworkNative}, prelude::Zero, program::{Identifier, Literal, Plaintext, Value}, types::{*, field::Add}
};
use snarkvm_utilities::{TestRng, ToBits, Uniform};

use indexmap::IndexMap;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use anyhow::anyhow;

// Internal module imports
use crate::error::CustomError;
use crate::helpers::{
    ConsoleLogger, Logger, create_hash, generate_message_with_addresses_and_fields,
    sign_message_with_private_key, string_to_field, string_to_value_fields,
    verify_signature_with_address_and_message, convert_data_to_struct
};

#[derive(Debug)]
struct Credential<N: NetworkNative> {
    data: IndexMap<String, Plaintext<N>>,
}

/// Signs the provided message using the given private key.
///
/// This function also logs various stages of the signing process using the provided logger.
///
/// # Parameters
///
/// - `private_key`: A string representing the private key to sign the message.
/// - `message`: The message to be signed, wrapped inside `SignInboundMessage` struct.
/// - `hash`: The hash algorithm to be used.
/// - `logger`: Logger to log various stages of the signing process.
///
/// # Returns
///
/// A result with tuple of signature and hash as strings if successful, otherwise returns a `CustomError`.
pub fn sign_message_with_logger<N: NetworkNative>(private_key: String, message: SignInboundMessage, hash: HashAlgorithm, logger: &dyn Logger) -> Result<(String, String), CustomError> {
    let private_key = PrivateKey::<N>::from_str(&private_key)
        .map_err(|e| anyhow!("Failed to parse private key: {}", e))?;
    let issuer = Address::<N>::try_from(&private_key)
        .map_err(|e| anyhow!("Failed to parse issuer address: {}", e))?;

    let data = convert_data_to_struct(message.data, logger);

    logger.log(&format!("Income Hash Algo: {:?}", hash));

    let credential  = Credential {
        data
    };

    let credentials_message: Value<N> = generate_message_with_addresses_and_fields(credential)?;
    let hash = create_hash(credentials_message.clone(), hash)?;
    let mut rng = TestRng::default();

    let hash_fields = string_to_value_fields(hash.to_string().as_str());

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

    logger.log(&format!("Message: {:?}", credentials_message));
    logger.log(&format!("Signature: {:?}", signature));
    logger.log(&format!("Verified: {:?}", verified));
    logger.log(&format!("Hash: {:?}", hash));


    Ok((signature.to_string(), hash.to_string()))
}


#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use helpers::StdoutLogger;
    use crate::helpers::{create_hash, generate_message_with_addresses_and_fields, string_to_value};

    // Define the network type for the tests
    type N = TestnetV0;

    fn get_test_data() -> (String, String, String, String) {
        let private_key = "APrivateKey1zkp5LqRmm7535XfiX77VPQEgsS2Dj1B2DvH4QNP1UYrHEoR".to_string();
        let issuer = "aleo1ekyuzclmcw3aj7qncsxxaapxem82mgrd8zadgrrvl5k705zx6q9s7usuqy".to_string();
        let subject = "aleo14w44zfrehup9g894j7tgeyz5gsjuxn0nfn09vd2fvpznrg85rs8skywkte".to_string();
        let dob = "20000101scalar".to_string();
        (private_key, issuer, subject, dob)
    }

    #[test]
    fn test_sign_message_with_private_key() {
        let (private_key, issuer, subject, dob) = get_test_data();

        // create test json value
        let json_value = json!({
            "issuer": issuer,
            "subject": subject,
            "dob": dob
        });

        let message = SignInboundMessage {
            data: json_value,
        };
        let result = sign_message_with_logger::<N>(private_key, message, HashAlgorithm::POSEIDON2, &StdoutLogger);

        assert!(result.is_ok());

        let (_, _) = result.unwrap();
    }

    #[test]
    fn test_create_hash_with_different_messages_psd2() {
        let message1 = string_to_value::<N>("123field");
        let message2 = string_to_value::<N>("321field");

        let hash1 = create_hash(message1, HashAlgorithm::POSEIDON2).unwrap();
        let hash2 = create_hash(message2, HashAlgorithm::POSEIDON2).unwrap();

        assert_ne!(hash1, hash2, "Hashes of different messages should be different");
    }

    #[test]
    fn test_create_hash_with_different_messages_bhp1024() {
        let message1 = string_to_value::<N>("123field");
        let message2 = string_to_value::<N>("321field");

        let hash1 = create_hash(message1, HashAlgorithm::BHP1024).unwrap();
        let hash2 = create_hash(message2, HashAlgorithm::BHP1024).unwrap();

        assert_ne!(hash1, hash2, "Hashes of different messages should be different");
    }

    #[test]
    fn test_create_hash_with_same_messages_psd2() {
        let message = string_to_value::<N>("123field");


        let hash1 = create_hash(message.clone(), HashAlgorithm::POSEIDON2).unwrap();
        let hash2 = create_hash(message.clone(), HashAlgorithm::POSEIDON2).unwrap();

        println!("{}", hash1.clone());
        println!("{}", hash2.clone());

        assert_eq!(hash1, hash2, "Hashes of the same message should be the same");
    }

    #[test]
    fn test_create_hash_with_same_messages_bhp2014() {
        let message = string_to_value::<N>("123field");

        let hash1 = create_hash(message.clone(), HashAlgorithm::BHP1024).unwrap();
        let hash2 = create_hash(message.clone(), HashAlgorithm::BHP1024).unwrap();

        println!("{}", hash1.clone());
        println!("{}", hash2.clone());

        assert_eq!(hash1, hash2, "Hashes of the same message should be the same");
    }

    #[test]
    fn test_create_hash_with_same_messages_sha3() {
        let message = string_to_value::<N>("123field");

        let hash1 = create_hash(message.clone(), HashAlgorithm::SHA3_256).unwrap();
        let hash2 = create_hash(message.clone(), HashAlgorithm::SHA3_256).unwrap();

        println!("{}", hash1.clone());
        println!("{}", hash2.clone());

        assert_eq!(hash1, hash2, "Hashes of the same message should be the same");
    }

    #[test]
    fn test_create_hash_with_same_messages_keccak256() {
        let message = string_to_value::<N>("123field");

        let hash1 = create_hash(message.clone(), HashAlgorithm::KECCAK256).unwrap();
        let hash2 = create_hash(message.clone(), HashAlgorithm::KECCAK256).unwrap();

        println!("{}", hash1.clone());
        println!("{}", hash2.clone());

        assert_eq!(hash1, hash2, "Hashes of the same message should be the same");
    }

    #[test]
    fn test_generate_message() {
        let (_private_key, issuer, subject, dob) = get_test_data();

        // create test json value
         let json_value = json!({
            "issuer": issuer,
            "subject": subject,
            "dob": dob
        });

        let credential = Credential::<N> {
            data: convert_data_to_struct(json_value, &StdoutLogger),
        };

        println!("{:?}", credential);

        let result = generate_message_with_addresses_and_fields(credential);

        assert!(result.is_ok(), "Message generation should be successful");
    }
}
