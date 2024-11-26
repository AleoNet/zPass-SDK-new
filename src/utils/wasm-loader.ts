export async function loadWasm(wasmPath: string): Promise<WebAssembly.Instance> {
  // Helper function to get the base URL in both ESM and CJS environments
  const getBaseUrl = () => {
    if (typeof process !== 'undefined' && process.cwd) {
      // Node.js/CJS environment
      return `file://${process.cwd()}/`;
    }
    if (typeof document !== 'undefined') {
      // Browser environment
      return document.baseURI;
    }
    // Fallback for other environments
    return '/';
  };

  try {
    const wasmModule = await WebAssembly.compileStreaming(
      fetch(new URL(wasmPath, getBaseUrl()))
    );
    return await WebAssembly.instantiate(wasmModule);
  } catch {
    // Fallback for environments that don't support compileStreaming
    const response = await fetch(new URL(wasmPath, getBaseUrl()));
    const buffer = await response.arrayBuffer();
    const wasmModule = await WebAssembly.compile(buffer);
    return await WebAssembly.instantiate(wasmModule);
  }
} 