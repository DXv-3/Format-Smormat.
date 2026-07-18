// Bridge for the compiled markitdown WASM module

export class MarkItDownService {
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve) => {
      (async () => {
        try {
          // We expect wasm_exec.js to be included or fetched
          // In a real build, we'd copy `$(go env GOROOT)/misc/wasm/wasm_exec.js` to /public
          if (!(window as any).Go) {
             await this.loadWasmExec();
          }

          const go = new (window as any).Go();
          const response = await fetch('/markitdown.wasm');
          if (!response.ok) {
             throw new Error('markitdown.wasm not found. Please run build:wasm first.');
          }
          
          const wasmModule = await WebAssembly.instantiateStreaming(response, go.importObject);
          go.run(wasmModule.instance); // This runs the Go main() which sets window.markitdownConvert
          
          this.isLoaded = true;
          resolve();
        } catch (err) {
          console.warn("[Format-Smormat] MarkItDown WASM load failed. Fallbacks will be used.", err);
          // We resolve anyway so the app doesn't crash, but it won't be marked as successfully loaded if functions are missing.
          resolve();
        }
      })();
    });

    return this.loadPromise;
  }

  private async loadWasmExec(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/wasm_exec.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load wasm_exec.js'));
      document.head.appendChild(script);
    });
  }

  async convert(buffer: Uint8Array, fileName: string, mimeType: string): Promise<string> {
    await this.init();
    
    const converter = (window as any).markitdownConvert;
    if (!converter) {
      throw new Error("MarkItDown backend is not compiled or loaded. Defaulting to JS converters.");
    }

    const result = converter(buffer, fileName, mimeType);
    if (result.error) {
      throw new Error(`MarkItDown error: ${result.error}`);
    }

    return result.markdown;
  }
}

export const markItDownService = new MarkItDownService();
