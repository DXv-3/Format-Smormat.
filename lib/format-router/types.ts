export interface FormatDef {
  id: string;
  name: string;
  extensions: string[];
  mimeTypes: string[];
}

export interface ConversionStep {
  fromFormat: string;
  toFormat: string;
  handlerId: string;
}

export interface ConversionPath {
  totalCost: number;
  steps: ConversionStep[];
}
