import { UnitTypeDefinition, UnitConfig } from './types';

export class ConvertChain {
  private fromValue?: number;
  private fromUnitStr?: string;
  
  private converterName?: string;
  private withArgs: Record<string, { value: number, unitStr: string }> = {};

  constructor(private typeDef: UnitTypeDefinition) {}

  from(val: number | string, unitStr?: string): this {
    const parsed = this.parseInput(val, unitStr);
    this.fromValue = parsed.value;
    this.fromUnitStr = parsed.unitStr;
    return this;
  }

  using(converterName: string): this {
    this.converterName = converterName;
    return this;
  }

  with(paramName: string, val: number | string, unitStr?: string): this {
    this.withArgs[paramName] = this.parseInput(val, unitStr);
    return this;
  }

  to(targetUnitStr: string): number {
    let baseValue: number;

    if (this.converterName) {
      const converter = this.typeDef.converters?.[this.converterName];
      if (!converter) {
        throw new Error(`Unknown converter function: ${this.converterName} for type ${this.typeDef.name}`);
      }
      
      const argsInBase: Record<string, number> = {};
      
      for (const paramName of Object.keys(converter.params)) {
         const arg = this.withArgs[paramName];
         if (!arg) return NaN;
         argsInBase[paramName] = this.convertToBase(arg.value, arg.unitStr);
      }
      
      baseValue = converter.fn(argsInBase);
    } else {
      if (this.fromValue === undefined || !this.fromUnitStr) {
         throw new Error("Must specify input using .from() before calling .to(), or use .using() and .with()");
      }
      baseValue = this.convertToBase(this.fromValue, this.fromUnitStr);
    }

    return this.convertFromBase(baseValue, targetUnitStr);
  }

  private parseInput(val: number | string, explicitUnitStr?: string): { value: number, unitStr: string } {
    if (typeof val === 'number') {
      if (!explicitUnitStr) throw new Error("Unit string is required when value is a number.");
      return { value: val, unitStr: explicitUnitStr };
    }

    if (explicitUnitStr) {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error(`Non-numeric input: ${val}`);
      return { value: num, unitStr: explicitUnitStr };
    }

    const match = val.trim().match(/^([\d.-]+)\s+([a-zA-Z_]+)$/);
    if (!match) throw new Error(`Unparseable string: "${val}". Expected format 'value unit'.`);
    const num = parseFloat(match[1]);
    if (isNaN(num)) throw new Error(`Non-numeric input: ${match[1]}`);
    
    return { value: num, unitStr: match[2] };
  }

  private resolveUnitName(name: string): string {
    const lower = name.toLowerCase();
    if (this.typeDef.aliases && this.typeDef.aliases[lower]) {
      return this.typeDef.aliases[lower];
    }
    return lower;
  }

  private getUnitConfig(name: string): UnitConfig {
    const resolved = this.resolveUnitName(name);
    const config = this.typeDef.units[resolved];
    if (!config) {
      throw new Error(`Unknown unit: ${name} for type ${this.typeDef.name}`);
    }
    return config;
  }

  private convertToBase(val: number, unitStr: string): number {
    const resolved = this.resolveUnitName(unitStr);
    if (resolved === this.typeDef.base) return val;

    const config = this.getUnitConfig(resolved);
    if ('factor' in config) {
      return val * config.factor;
    } else {
      return config.toBase(val);
    }
  }

  private convertFromBase(baseVal: number, targetUnitStr: string): number {
    const resolved = this.resolveUnitName(targetUnitStr);
    if (resolved === this.typeDef.base) return baseVal;

    const config = this.getUnitConfig(resolved);
    if ('factor' in config) {
      return baseVal / config.factor;
    } else {
      return config.fromBase(baseVal);
    }
  }
}
