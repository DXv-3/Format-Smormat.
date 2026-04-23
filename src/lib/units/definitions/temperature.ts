import { UnitTypeDefinition } from '../types';

export const temperature: UnitTypeDefinition = {
  name: 'temperature',
  base: 'kelvin',
  aliases: {
    k: 'kelvin',
    c: 'celsius',
    f: 'fahrenheit'
  },
  units: {
    kelvin: { factor: 1 },
    celsius: {
      toBase: (c) => c + 273.15,
      fromBase: (k) => k - 273.15
    },
    fahrenheit: {
      toBase: (f) => (f - 32) * 5 / 9 + 273.15,
      fromBase: (k) => (k - 273.15) * 9 / 5 + 32
    }
  }
};
