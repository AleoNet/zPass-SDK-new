use super::*;

/// Exposes a Rust function to JavaScript for signing messages.
/// Returns the response as `SignResponse` or a `JsValue` error.
#[wasm_bindgen]
pub fn sign_message(private_key: String, message: SignInboundMessage, hash_alg: HashAlgorithm) -> Result<SignResponse, JsValue> {
    match sign_message_with_logger(private_key, message, hash_alg, &ConsoleLogger) {
        Ok((signature, hash)) => {
            Ok(
                SignResponse::new(signature, hash)
            )
        }
        Err(err) => {
            Err(JsValue::from_str(&err.to_string()))
        }
    }
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
pub fn get_field_from_value(str: Option<String>) -> Result<String, String> {
    let field = string_to_field(str).map_err(|e| e.to_string())?;
    Ok(field.to_string())
}

/// Exposes a Rust function to JavaScript for verifying a signed credential.
#[wasm_bindgen]
pub fn verify_signed_credential(signature: &str, address: &str, message: &str) -> Result<bool, String> {
    let (_, signature_bytes) = Signature::<CurrentNetwork>::parse(signature).unwrap();
    let (_, address_bytes) = Address::<CurrentNetwork>::parse(address).unwrap();
    let message_bytes = string_to_value_fields(message);
    match verify_signature_with_address_and_message(&signature_bytes, &address_bytes, message_bytes.as_slice()) {
        true => Ok(true),
        false => Err("Signature verification failed".to_string())
    }
}
