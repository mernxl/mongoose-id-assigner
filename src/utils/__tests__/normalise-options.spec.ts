import { Schema } from 'mongoose';
import {
  AssignerOptions,
  FieldConfig,
  FieldConfigTypes,
} from '../../assigner.interfaces';
import { NormalisedOptions } from '../../MongooseIdAssigner';
import { normaliseOptions } from '../normalise-options';

const schema = new Schema({});

const nextIdFunction = function(nextId: number) {
  return nextId + 1;
};

const options: AssignerOptions = {
  modelName: 'Person',
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
    ['withUUID', { type: FieldConfigTypes.UUID, asBinary: false, version: 1 }],
    ['String', { type: FieldConfigTypes.String, nextId: '5555' }],
    ['Number', { type: FieldConfigTypes.Number, nextId: 5555 }],
    ['last', { type: FieldConfigTypes.Number, nextId: 5641, nextIdFunction }],
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

describe('normaliseOptions()', () => {
  it('should throw error if no options', () => {
    expect(() => normaliseOptions(schema, '' as any)).toThrowError(
      /(Options not specified)/,
    );
  });

  it('should throw error if no modelName', () => {
    expect(() => normaliseOptions(schema, {} as any)).toThrowError(
      /(`modelName`)/,
    );
  });

  it('should throw Error if Type not found', () => {
    expect(() =>
      normaliseOptions(schema, {
        modelName: 'AAA',
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
        modelName: 'Test',
        fields: {
          number: FieldConfigTypes.Number, // throws exception, no nextId
        },
      };
      const option2: AssignerOptions = {
        modelName: 'Test',
        fields: {
          string: FieldConfigTypes.String, // throws error, no nextId
        },
      };

      expect(() => normaliseOptions(schema, option1)).toThrowError(
        /(nextId not provided for field type)/,
      );
      expect(() => normaliseOptions(schema, option2)).toThrowError(
        /(nextId not provided for field type)/,
      );
    });

    it('should be optimised at sting catchall', () => {
      const option: AssignerOptions = {
        modelName: 'Test',
        fields: {
          _id: FieldConfigTypes.Number, // throws exception, no nextId
          string: FieldConfigTypes.String, // throws error, no nextId, no match string-incrementer regex
        },
      };
    });
  });

  it('should normalise options', () => {
    expect(normaliseOptions(schema, options)).toEqual(expected);
  });
});
