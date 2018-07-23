import {
  AssignIdPluginOptions,
  FieldTypes,
  IdOptions,
} from '../../assigner.interfaces';
import { NormalisedOptions } from '../../MongooseIdAssigner';
import { normaliseOptions } from '../normalise-options';

const incFn = function(nextId: number) {
  return nextId + 1;
};

const options: AssignIdPluginOptions = {
  modelName: 'Person',
  fields: {
    _id: true,
    clientId: true,
    withUUID: 'UUID',
    String: '5555',
    Number: 5555,
    last: {
      type: FieldTypes.Number,
      nextId: 5641,
      incFn,
    },
  },
};

const expected: NormalisedOptions = {
  modelName: 'Person',
  network: true,
  fields: new Map<string, IdOptions>([
    ['_id', { type: FieldTypes.ObjectId }],
    ['clientId', { type: FieldTypes.ObjectId }],
    ['withUUID', { type: FieldTypes.UUID, version: 4 }],
    ['String', { type: FieldTypes.String, nextId: '5555' }],
    ['Number', { type: FieldTypes.Number, nextId: 5555 }],
    ['last', { type: FieldTypes.Number, nextId: 5641, incFn }],
  ]),
};

describe('normaliseOptions()', () => {
  it('should throw Error if Type not found', () => {
    expect(() =>
      normaliseOptions({
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

  it('should normalise options', () => {
    expect(normaliseOptions(options)).toEqual(expected);
  });
});
