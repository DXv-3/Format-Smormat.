import { FormatDef, ConversionPath } from './types';

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async runPath(buffer: Uint8Array, path: ConversionPath): Promise<Uint8Array | null> {
    // Fallback pass-through mock since original logic was lost.
    return new Uint8Array(buffer);
  }
}

export const conversionGraph = new ConversionGraph();
