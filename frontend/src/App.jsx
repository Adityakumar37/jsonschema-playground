import { useState, useEffect } from "react"
import init, { validate } from "./pkg/wasm_validator.js"

const DEFAULT_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Product",
  "type": "object",
  "properties": {
    "id": {
      "type": "integer"
    },
    "name": {
      "type": "string"
    },
    "price": {
      "type": "number",
      "minimum": 0
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": ["id", "name", "price"]
}`

const DEFAULT_JSON = `{
  "id": 1,
  "name": "Mechanical Keyboard",
  "price": -10,
  "tags": [
    "electronics",
    123
  ]
}`

function App() {
  const [wasmReady, setWasmReady] = useState(false)
  const [schema, setSchema] = useState(DEFAULT_SCHEMA)
  const [instance, setInstance] = useState(DEFAULT_JSON)
  const [result, setResult] = useState(null)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark"
  })

  // Load WASM when app starts
  useEffect(() => {
    init()
      .then(() => setWasmReady(true))
      .catch((err) => console.error("Failed to load WASM:", err))
  }, [])

  // Sync theme with body class
  useEffect(() => {
    localStorage.setItem("theme", theme)
    if (theme === "dark") {
      document.documentElement.classList.add("theme-dark")
    } else {
      document.documentElement.classList.remove("theme-dark")
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  const handleValidate = () => {
    if (!wasmReady) return
    const output = validate(schema.trim(), instance.trim())
    setResult(output)
  }

  // Formatting helper
  const handleFormat = (value, setter) => {
    try {
      const parsed = JSON.parse(value)
      setter(JSON.stringify(parsed, null, 2))
    } catch (e) {
      // Ignore if JSON is invalid
    }
  }

  // Clear helper
  const handleClear = (setter) => {
    setter("")
  }

  // Handle Tab key inside textareas
  const handleKeyDown = (e, setter) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const { selectionStart, selectionEnd, value } = e.target
      const newValue = value.substring(0, selectionStart) + "  " + value.substring(selectionEnd)
      setter(newValue)
      
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = selectionStart + 2
      }, 0)
    }
  }

  // Parser for validation results
  const parseResult = (output) => {
    if (!output) return null
    
    if (output === "valid") {
      return { isValid: true, errors: [] }
    }

    if (output.startsWith("Invalid schema JSON: ")) {
      return {
        isValid: false,
        errors: [{ path: "Schema Syntax", message: output.replace("Invalid schema JSON: ", "") }]
      }
    }

    if (output.startsWith("Invalid instance JSON: ")) {
      return {
        isValid: false,
        errors: [{ path: "JSON Syntax", message: output.replace("Invalid instance JSON: ", "") }]
      }
    }

    if (output.startsWith("Schema error: ")) {
      return {
        isValid: false,
        errors: [{ path: "Schema Constraints", message: output.replace("Schema error: ", "") }]
      }
    }

    // Split error list
    const lines = output.split("\n").filter(line => line.trim() !== "")
    const parsedErrors = lines.map((line) => {
      const match = line.match(/^path:\s*(.*?)\s*\|\s*error:\s*(.*)$/)
      if (match) {
        const rawPath = match[1]
        const message = match[2]
        return {
          path: rawPath === "" ? "/" : rawPath,
          message: message
        }
      }
      return { path: "Validation", message: line }
    })

    return { isValid: false, errors: parsedErrors }
  }

  const parsed = parseResult(result)

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>JSON Schema Playground</h1>
          <p>Validate JSON data against a JSON Schema using Rust and WebAssembly.</p>
        </div>
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn"
          aria-label="Toggle color theme"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </header>

      {/* Main Grid Panels */}
      <main style={{ flex: 1 }}>
        <div className="panels-grid">
          {/* Schema Panel */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Schema</span>
              <div className="panel-actions">
                <button onClick={() => handleFormat(schema, setSchema)} className="panel-btn">Format</button>
                <button onClick={() => handleClear(setSchema)} className="panel-btn">Clear</button>
              </div>
            </div>
            <textarea
              className="editor-textarea"
              name="schema"
              placeholder='{ "type": "object" }'
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, setSchema)}
              spellCheck="false"
            />
          </div>

          {/* JSON Panel */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">JSON</span>
              <div className="panel-actions">
                <button onClick={() => handleFormat(instance, setInstance)} className="panel-btn">Format</button>
                <button onClick={() => handleClear(setInstance)} className="panel-btn">Clear</button>
              </div>
            </div>
            <textarea
              className="editor-textarea"
              name="instance"
              placeholder='{ "id": 1 }'
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, setInstance)}
              spellCheck="false"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="action-bar">
          <button
            onClick={handleValidate}
            disabled={!wasmReady}
            className="validate-btn"
          >
            {wasmReady ? "Validate" : "Loading WASM..."}
          </button>
        </div>

        {/* Results Section */}
        {parsed && (
          <section className="results-section">
            <div className="results-header">
              <span className="results-title">Result</span>
              {parsed.isValid ? (
                <span className="status-badge valid">Valid</span>
              ) : (
                <span className="status-badge invalid">Invalid</span>
              )}
            </div>

            {!parsed.isValid && (
              <div className="error-list">
                {parsed.errors.map((err, i) => (
                  <div key={i} className="error-item">
                    <div className="error-path">{err.path}</div>
                    <div className="error-message">{err.message}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* RustSchema Section */}
      <section className="rustschema-section">
        <h2 className="rustschema-heading">RustSchema — VS Code Extension</h2>
        <p className="rustschema-description">
          Validate your JSON files automatically inside VS Code. No configuration needed. Add a <code className="rustschema-inline-code">$schema</code> key to your file and RustSchema handles the rest.
        </p>
        <div className="rustschema-install">
          <span className="rustschema-label">Install in one command</span>
          <pre className="rustschema-code"><code>curl -L https://github.com/adityakumar37/rustschema/releases/download/v0.0.1/rustschema-0.0.1.vsix -o rustschema.vsix && code --install-extension rustschema.vsix</code></pre>
        </div>
        <a
          href="https://github.com/adityakumar37/rustschema"
          target="_blank"
          rel="noopener noreferrer"
          className="rustschema-link"
        >
          View on GitHub
        </a>
      </section>

      {/* Footer */}
      <footer className="footer">
        Built on the open source <a href="https://github.com/Stranger6667/jsonschema" target="_blank" rel="noopener noreferrer">jsonschema</a> library by Stranger6667
      </footer>
    </div>
  )
}

export default App