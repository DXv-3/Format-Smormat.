import { registry } from './registry';
import { ConvertChain } from './chain';

export function convert(type: string): ConvertChain {
  const typeDef = registry.get(type);
  return new ConvertChain(typeDef);
}

export * from './types';
