import { FormatDef, ConversionPath } from './types';
import { useFileStore } from '../../src/stores/useFileStore';
import { markItDownService } from './markitdownService';

class ConversionGraph {
  formats: Map<string, FormatDef> = new Map();
  handlers: Map<string, any> = new Map();

  async initAllSupported() {
    // Initializer
  }

  *yieldPaths(inFormat: string, outFormat: string): Generator<ConversionPath> {
    yield {
      totalCost: 1,
      steps: [{ fromFormat: inFormat, toFormat: outFormat, handlerId: 'direct' }]
    };
  }

  async runPath(buffer: Uint8Array, path: ConversionPath, fileMeta?: { name: string, type: string }): Promise<{ irNodeKind: string, data: Uint8Array } | null> {
    const { addIREvent } = useFileStore.getState();
    addIREvent({ 
      type: 'FORMAT_ROUTE_START', 
      payload: { path: path.steps.map(s => `${s.fromFormat}->${s.toFormat}`) } 
    });

    let kind = 'RAW_FILE';
    const lastStep = path.steps[path.steps.length - 1];
    if (lastStep?.toFormat === 'json') kind = 'JSON';
    if (lastStep?.toFormat === 'md') kind = 'MARKDOWN';
    if (lastStep?.toFormat === 'csv') kind = 'CSV';

    let resultBuffer = new Uint8Array(buffer);

    if (lastStep?.toFormat === 'md' && fileMeta) {
      try {
        addIREvent({ type: 'MARKITDOWN_START', payload: { backend: 'wasm-go' } });
        const mdString = await markItDownService.convert(buffer, fileMeta.name, fileMeta.type);
        resultBuffer = new TextEncoder().encode(mdString);
        addIREvent({ type: 'MARKITDOWN_SUCCESS', payload: { bytes: resultBuffer.length } });
      } catch (err: any) {
        addIREvent({ type: 'MARKITDOWN_DISABLED_FALLBACK_JS', payload: { warning: err.message } });
        // Fallback or pass-through
      }
    }

    addIREvent({ 
      type: 'FORMAT_ROUTE_END', 
      payload: { irNodeKind: kind } 
    });

    return {
       irNodeKind: kind,
       data: resultBuffer
    };
  }
}

export const conversionGraph = new ConversionGraph();

