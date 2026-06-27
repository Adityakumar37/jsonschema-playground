use wasm_bindgen::prelude::*;
use serde_json::Value;

#[wasm_bindgen]
pub fn validate(schema_str: &str, instance_str: &str) -> String {
    console_error_panic_hook::set_once();

    let schema: Value = match serde_json::from_str(schema_str) {
        Ok(s) => s,
        Err(e) => return format!("Invalid schema JSON: {}", e),
    };

    let instance: Value = match serde_json::from_str(instance_str) {
        Ok(i) => i,
        Err(e) => return format!("Invalid instance JSON: {}", e),
    };

    let validator = match jsonschema::validator_for(&schema) {
        Ok(v) => v,
        Err(e) => return format!("Schema error: {}", e),
    };

    let errors: Vec<String> = validator
        .iter_errors(&instance)
        .map(|e| format!("path: {} | error: {}", e.instance_path(), e))
        .collect();

    if errors.is_empty() {
        String::from("valid")
    } else {
        errors.join("\n")
    }
}