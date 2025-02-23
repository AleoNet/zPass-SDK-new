use super::*;
use crate::merkle_tree::*;

#[wasm_bindgen]
#[derive(Debug, Clone, Copy)]
pub enum Network {
    Testnet = 0,
    Mainnet = 1
}

#[wasm_bindgen]
pub fn hash_to_fields_size_8(inputs: Vec<String>, network: Network) -> Result<Vec<String>, String> {
    match network {
        Network::Testnet => hash_inputs_size_8::<TestnetV0>(inputs.iter().map(|s| s.as_str()).collect())
            .map(|fields| fields.iter().map(|f| f.to_string()).collect())
            .map_err(|e| e.to_string()),
        Network::Mainnet => hash_inputs_size_8::<MainnetV0>(inputs.iter().map(|s| s.as_str()).collect())
            .map(|fields| fields.iter().map(|f| f.to_string()).collect())
            .map_err(|e| e.to_string()),
    }
}

#[wasm_bindgen]
pub fn sign_merkle_root(private_key: String, root: String, network: Network) -> Result<String, String> {
    match network {
        Network::Testnet => sign_root::<TestnetV0>(&private_key, &root)
            .map(|signature| signature.to_string())
            .map_err(|e| e.to_string()),
        Network::Mainnet => sign_root::<MainnetV0>(&private_key, &root)
            .map(|signature| signature.to_string())
            .map_err(|e| e.to_string()),
    }
}

#[wasm_bindgen]
pub fn get_merkle_proof(inputs: Vec<String>, index: usize, network: Network) -> Result<Vec<String>, String> {
    match network {
        Network::Testnet => {
            let fields = hash_inputs_size_8::<TestnetV0>(inputs.iter().map(|s| s.as_str()).collect()).unwrap();
            let tree = MerkleTree::<TestnetV0>::new(fields).unwrap();
            let proof = tree.get_proof(index).unwrap();
            Ok(proof.into_iter().map(|p| p.to_string()).collect())
        }
        Network::Mainnet => {
            let fields = hash_inputs_size_8::<MainnetV0>(inputs.iter().map(|s| s.as_str()).collect()).unwrap();
            let tree = MerkleTree::<MainnetV0>::new(fields).unwrap();
            let proof = tree.get_proof(index).unwrap();
            Ok(proof.into_iter().map(|p| p.to_string()).collect())
        }
    }
}

#[wasm_bindgen]
pub fn get_merkle_root(inputs: Vec<String>, network: Network) -> Result<String, String> {
    match network {
        Network::Testnet => {
            let fields = hash_inputs_size_8::<TestnetV0>(inputs.iter().map(|s| s.as_str()).collect()).unwrap();
            let tree = MerkleTree::<TestnetV0>::new(fields).unwrap();
            Ok(tree.root().to_string())
        }
        Network::Mainnet => {
            let fields = hash_inputs_size_8::<MainnetV0>(inputs.iter().map(|s| s.as_str()).collect()).unwrap();
            let tree = MerkleTree::<MainnetV0>::new(fields).unwrap();
            Ok(tree.root().to_string())
        }
    }
}

#[wasm_bindgen]
pub fn get_merkle_tree(inputs: Vec<String>, network: Network) -> Result<JsValue, String> {
    match network {
        Network::Testnet => {
            let fields = hash_inputs_size_8::<TestnetV0>(inputs.iter().map(|s| s.as_str()).collect()).unwrap();
            let tree = MerkleTree::<TestnetV0>::new(fields).unwrap();
            let result: Vec<Vec<String>> = tree.levels()
                .iter()
                .map(|level| level.iter().map(|f| f.to_string()).collect())
                .collect();
            serde_wasm_bindgen::to_value(&result).map_err(|e| e.to_string())
        }
        Network::Mainnet => {
            let fields = hash_inputs_size_8::<MainnetV0>(inputs.iter().map(|s| s.as_str()).collect()).unwrap();
            let tree = MerkleTree::<MainnetV0>::new(fields).unwrap();
            let result: Vec<Vec<String>> = tree.levels()
                .iter()
                .map(|level| level.iter().map(|f| f.to_string()).collect())
                .collect();
            serde_wasm_bindgen::to_value(&result).map_err(|e| e.to_string())
        }
    }
}

/// Exposes a Rust function to JavaScript for signing messages.
/// Returns the response as `SignResponse` or a `JsValue` error.
#[wasm_bindgen]
pub fn sign_message(
    private_key: String,
    message: SignInboundMessage,
    hash_alg: HashAlgorithm,
    network: Network
) -> Result<SignResponse, JsValue> {
    let result = match network {
        Network::Testnet => sign_message_with_logger::<TestnetV0>(private_key, message, hash_alg, &ConsoleLogger),
        Network::Mainnet => sign_message_with_logger::<MainnetV0>(private_key, message, hash_alg, &ConsoleLogger),
    };

    result
        .map(|(signature, hash)| SignResponse::new(signature, hash))
        .map_err(|err| JsValue::from_str(&err.to_string()))
}

/// A struct representing the response of a signing operation.
#[wasm_bindgen]
pub struct SignResponse {
    pub(crate) signature: String,
    pub(crate) hash: String,
}

impl SignResponse {
    /// Creates a new instance of `SignResponse`.
    pub fn new(signature: String, hash: String) -> Self {
        SignResponse { signature, hash }
    }
}

#[wasm_bindgen]
impl SignResponse {
    /// Returns the signature from the response.
    #[wasm_bindgen(getter)]
    pub fn signature(&self) -> String {
        self.signature.clone()
    }

    /// Sets the signature in the response.
    #[wasm_bindgen(setter)]
    pub fn set_signature(&mut self, signature: String) {
        self.signature = signature;
    }

    /// Returns the hash from the response.
    #[wasm_bindgen(getter)]
    pub fn hash(&self) -> String {
        self.hash.clone()
    }

    /// Sets the hash in the response.
    #[wasm_bindgen(setter)]
    pub fn set_hash(&mut self, hash: String) {
        self.hash = hash;
    }
}

/// An enum representing the various hash algorithms supported.
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HashAlgorithm {
    POSEIDON2 = 0,
    BHP1024 = 1,
    SHA3_256 = 2,
    KECCAK256 = 3
}

/// A struct representing the message to be signed in.
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignInboundMessage {
    pub(crate) data: JsonValue,
}

#[wasm_bindgen]
impl SignInboundMessage {
    /// Constructor for `SignInboundMessage`.
    #[wasm_bindgen(constructor)]
    pub fn new(data: JsValue) -> Result<SignInboundMessage, JsValue> {
         // Convert JsValue to serde_json::Value
         let data: JsonValue = serde_wasm_bindgen::from_value(data)
         .map_err(|e| JsValue::from_str(&format!("Failed to parse data: {}", e)))?;

        // Create a new instance with provided values
        Ok(SignInboundMessage { data })
    }

    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.data)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize data: {}", e)))
    }
}

/// Exposes a Rust function to JavaScript for converting a string option to a field value.
#[wasm_bindgen]
pub fn get_field_from_value(
    str: Option<String>, 
    network: Network
) -> Result<String, String> {
    let field = match network {
        Network::Testnet => string_to_field::<TestnetV0>(str).map_err(|e| e.to_string())?.to_string(),
        Network::Mainnet => string_to_field::<MainnetV0>(str).map_err(|e| e.to_string())?.to_string(),
    };
    Ok(field)
}

macro_rules! verify_credential_impl {
    ($signature:expr, $address:expr, $message:expr, $network:ty) => {{
        let (_, signature_bytes) = Signature::<$network>::parse($signature).unwrap();
        let (_, address_bytes) = Address::<$network>::parse($address).unwrap();
        let message_bytes = string_to_value_fields::<$network>($message);
        match verify_signature_with_address_and_message(&signature_bytes, &address_bytes, message_bytes.as_slice()) {
            true => Ok(true),
            false => Err("Signature verification failed".to_string())
        }
    }}
}

#[wasm_bindgen]
pub fn verify_signed_credential(
    signature: &str, 
    address: &str, 
    message: &str,
    network: Network
) -> Result<bool, String> {
    match network {
        Network::Testnet => verify_credential_impl!(signature, address, message, TestnetV0),
        Network::Mainnet => verify_credential_impl!(signature, address, message, MainnetV0),
    }
}
