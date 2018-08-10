import { Schema } from 'mongoose';
import {
  AssignerOptions,
  FieldConfig,
  FieldConfigTypes,
} from '../../assigner.interfaces';
import { NormalisedOptions } from '../../MongooseIdAssigner';
import { normaliseOptions } from '../normalise-options';

const schema = new Schema({});

describe('normaliseOptions()', () => {
  it('should throw error if no modelName', () => {
    expect(() => normaliseOptions('', schema, {} as any)).toThrowError(
      /(`modelName`)/,
    );
  });

  it('should throw Error if Type not found', () => {
    expect(() =>
      normaliseOptions('AAA', schema, {
        fields: {
          _id: {
            type: '404',
          },
        } as any,
      }),
    ).toThrowError(
      '[MongooseIdAssigner], Model: AAA, Unknown Field Type for field [_id]',
    );
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

      expect(() => normaliseOptions('Tests', schema, option1)).toThrowError(
        /(nextId not provided for field type)/,
      );
      expect(() => normaliseOptions('Tests', schema, option2)).toThrowError(
        /(nextId not provided for field type)/,
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

      expect(normaliseOptions('Character', schema, pluginOptions)).toEqual(
        pluginExpected,
      );
    });
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

    expect(normaliseOptions('Person', schema, options)).toEqual(expected);
  });
});
