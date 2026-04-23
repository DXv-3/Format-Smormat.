import { UnitTypeDefinition } from '../types';

export const distance: UnitTypeDefinition = {
  name: 'distance',
  base: 'meter',
  aliases: {
    m: 'meter',
    km: 'kilometer',
    cm: 'centimeter',
    mm: 'millimeter',
    mi: 'mile',
    yd: 'yard',
    ft: 'foot',
    in: 'inch'
  },
  units: {
    meter: { factor: 1 },
    kilometer: { factor: 1000 },
    centimeter: { factor: 0.01 },
    millimeter: { factor: 0.001 },
    mile: { factor: 1609.344 },
    yard: { factor: 0.9144 },
    foot: { factor: 0.3048 },
    inch: { factor: 0.0254 }
  },
  converters: {
    rectangleArea: {
      params: { length: 'distance', width: 'distance' },
      fn: (args) => args.length * args.width
    }
  }
};
