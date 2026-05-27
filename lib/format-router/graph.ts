import { FormatDef, ConversionPath } from './types';
import { useFileStore } from '../../src/stores/useFileStore';

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

  async runPath(buffer: Uint8Array, path: ConversionPath): Promise<{ irNodeKind: string, data: Uint8Array } | null> {
    const { addIREvent } = useFileStore.getState();
    addIREvent({ 
      type: 'FORMAT_ROUTE_START', 
      payload: { path: path.steps.map(s => `${s.fromFormat}->${s.toFormat}`) } 
    });

    // Mock pass-through but now wrapped with IRNodeKind
    let kind = 'RAW_FILE';
    const lastStep = path.steps[path.steps.length - 1];
    if (lastStep?.toFormat === 'json') kind = 'JSON';
    if (lastStep?.toFormat === 'md') kind = 'MARKDOWN';
    if (lastStep?.toFormat === 'csv') kind = 'CSV';

    addIREvent({ 
      type: 'FORMAT_ROUTE_END', 
      payload: { irNodeKind: kind } 
    });

    return {
       irNodeKind: kind,
       data: new Uint8Array(buffer)
    };
  }
}

export const conversionGraph = new ConversionGraph();
