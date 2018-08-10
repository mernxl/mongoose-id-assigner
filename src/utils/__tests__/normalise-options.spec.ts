import { Schema } from 'mongoose';
import {
  AssignerOptions,
  FieldConfig,
  FieldConfigTypes,
} from '../../assigner.interfaces';
import { NormalisedOptions } from '../../MongooseIdAssigner';
import { normaliseOptions } from '../normalise-options';

describe('normaliseOptions()', () => {
  it('should throw error if no modelName', () => {
    expect(() => normaliseOptions('', {} as any)).toThrowError(/(`modelName`)/);
  });

  it('should throw Error if Type not found', () => {
    expect(() =>
      normaliseOptions('AAA', {
        fields: {
          _id: {
            type: '404',
          },
        } as any,
      }),
    ).toThrowError(/(Unknown FieldConfigType)/);
  });

  it('should normalise options', () => {
    const nextIdFunction = function(nextId: number) {
      return nextId + 1;
    };

    const options: AssignerOptions = {
      fields: {
        _id: true,
        clientId: true,
        withUUID: 'UUID',
        String: '5555',
        Number: 5555,
        last: {
          type: FieldConfigTypes.Number,
          nextId: 5641,
          nextIdFunction,
        },
      },
      discriminators: {
        person: {
          clientId: true,
        },
        droid: {
          make: 5555,
        },
      },
    };

    const expected: NormalisedOptions = {
      modelName: 'Person',
      network: true,
      fields: new Map<string, FieldConfig>([
        ['_id', { type: FieldConfigTypes.ObjectId }],
        ['clientId', { type: FieldConfigTypes.ObjectId }],
        [
          'withUUID',
          { type: FieldConfigTypes.UUID, asBinary: false, version: 1 },
        ],
        ['String', { type: FieldConfigTypes.String, nextId: '5555' }],
        ['Number', { type: FieldConfigTypes.Number, nextId: 5555 }],
        [
          'last',
          { type: FieldConfigTypes.Number, nextId: 5641, nextIdFunction },
        ],
      ]),
      discriminators: new Map<string, Map<string, FieldConfig>>([
        [
          'person',
          new Map<string, FieldConfig>([
            ['clientId', { type: FieldConfigTypes.ObjectId }],
          ]),
        ],
        [
          'droid',
          new Map<string, FieldConfig>([
            ['make', { type: FieldConfigTypes.Number, nextId: 5555 }],
          ]),
        ],
      ]),
    };

    expect(normaliseOptions('Person', options)).toEqual(expected);
  });

  describe('normaliseFieldConfigMap()', () => {
    it('should throw error if no nextId for Number and String, no FieldConfig', () => {
      const option1: AssignerOptions = {
        fields: {
          number: FieldConfigTypes.Number, // throws exception, no nextId
        },
      };
      const option2: AssignerOptions = {
        fields: {
          string: FieldConfigTypes.String, // throws error, no nextId
        },
      };

      expect(() => normaliseOptions('Tests', option1)).toThrowError(
        /(nextId not provided for field type Number)/,
      );
      expect(() => normaliseOptions('Tests', option2)).toThrowError(
        /(nextId not provided for field type String)/,
      );
    });

    it('should be optimised at sting catchall', () => {
      const pluginOptions: AssignerOptions = {
        discriminators: {
          ['Person']: {
            _id: '12T1542',
          },
        },
      };

      const pluginExpected: NormalisedOptions = {
        modelName: 'Character',
        network: true,
        fields: new Map<string, FieldConfig>([
          ['_id', { type: FieldConfigTypes.ObjectId }],
        ]),
        discriminators: new Map<string, Map<string, FieldConfig>>([
          [
            'Person',
            new Map<string, FieldConfig>([
              ['_id', { type: FieldConfigTypes.String, nextId: '12T1542' }],
            ]),
          ],
        ]),
      };

      expect(normaliseOptions('Character', pluginOptions)).toEqual(
        pluginExpected,
      );
    });

    describe('checkFieldConfig()', () => {
      it('should throw an error if FieldConfigType does not match nextId type', () => {
        const option: AssignerOptions = {
          fields: {
            number: {
              type: FieldConfigTypes.Number,
              nextId: '33' as any, // type must be number
            },
          },
        };

        expect(() => normaliseOptions('Tests', option)).toThrowError(
          /(nextId is required, should have as type Number)/,
        );
      });

      it('should throw an error UUID version passed is is unsupported', () => {
        const option: AssignerOptions = {
          fields: {
            number: {
              type: FieldConfigTypes.UUID,
              version: 3 as any,
            },
          },
        };

        expect(() => normaliseOptions('Tests', option)).toThrowError(
          /(UUID version must be either 1 or 4!)/,
        );
      });

      it('should throw an if incrementBy is not of type Number', () => {
        const option: AssignerOptions = {
          fields: {
            number: {
              type: FieldConfigTypes.Number,
              incrementBy: 'string' as any,
              nextId: 4444,
            },
          },
        };

        expect(() => normaliseOptions('Tests', option)).toThrowError(
          /(incrementBy must be of type `number`!)/,
        );
      });

      it('should throw error if nextIdFunctions is not of type function', () => {
        const option1: AssignerOptions = {
          fields: {
            number: {
              type: FieldConfigTypes.Number,
              nextId: 44,
              nextIdFunction: 'string' as any,
            },
          },
        };
        const option2: AssignerOptions = {
          fields: {
            string: {
              type: FieldConfigTypes.String,
              nextId: '444',
              nextIdFunction: 444 as any,
            },
          },
        };

        expect(() => normaliseOptions('Tests', option1)).toThrowError(
          /(nextIdFunction must be a `Function`!)/,
        );
        expect(() => normaliseOptions('Tests', option2)).toThrowError(
          /(nextIdFunction must be a `Function`!)/,
        );
      });

      it('should throw error if return types for nextIdFunctions do not return respective types', () => {
        const option1: AssignerOptions = {
          fields: {
            number: {
              type: FieldConfigTypes.Number,
              nextId: 44,
              nextIdFunction: () => 'string' as any,
            },
          },
        };
        const option2: AssignerOptions = {
          fields: {
            string: {
              type: FieldConfigTypes.String,
              nextId: '444',
              nextIdFunction: () => 444 as any,
            },
          },
        };

        expect(() => normaliseOptions('Tests', option1)).toThrowError(
          /(nextIdFunction must return nextId of type `number`!)/,
        );
        expect(() => normaliseOptions('Tests', option2)).toThrowError(
          /(nextIdFunction must return nextId of type `string`!)/,
        );
      });
    });
  });
});
