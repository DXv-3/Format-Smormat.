import { UnitTypeDefinition } from './types';
import { distance } from './definitions/distance';
import { temperature } from './definitions/temperature';

class Registry {
  private types = new Map<string, UnitTypeDefinition>();

  constructor() {
    this.register(distance);
    this.register(temperature);
  }

  register(def: UnitTypeDefinition) {
    this.types.set(def.name.toLowerCase(), def);
  }

  get(name: string): UnitTypeDefinition {
    const def = this.types.get(name.toLowerCase());
    if (!def) {
      throw new Error(`Unknown unit type: ${name}`);
    }
    return def;
  }
}

export const registry = new Registry();
