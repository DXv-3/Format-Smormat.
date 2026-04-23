export interface SimpleUnit {
  factor: number;
}

export interface ComplexUnit {
  toBase: (val: number) => number;
  fromBase: (val: number) => number;
}

export type UnitConfig = SimpleUnit | ComplexUnit;

export interface ConverterFunc {
  params: Record<string, string>; 
  fn: (args: Record<string, number>) => number;
}

export interface UnitTypeDefinition {
  name: string;
  base: string;
  aliases?: Record<string, string>;
  units: Record<string, UnitConfig>;
  converters?: Record<string, ConverterFunc>;
}
