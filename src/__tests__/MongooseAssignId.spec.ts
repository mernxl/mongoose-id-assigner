import { Schema, Types } from 'mongoose';
import { demoDB, getSchema } from '../__mock__/test.models';
import { AssignerOptions, FieldConfigTypes } from '../assigner.interfaces';
import { localStateStore } from '../LocalStateStore';
import { MongooseIdAssigner } from '../MongooseIdAssigner';

afterAll(async () => {
  await demoDB.close();
});

afterEach(() => demoDB.dropDatabase());

describe('MongooseIdAssigner', () => {
  let exampleSchema: Schema;

  beforeEach(() => {
    exampleSchema = getSchema(1);
    localStateStore.clear();
  });

  it('should assign _id field if only modelName option passed', async () => {
    exampleSchema.plugin(MongooseIdAssigner.plugin, { modelName: 'example1' });

    const exampleModel = demoDB.model('example1', exampleSchema);

    const doc = await exampleModel.create({ personId: 'mernxl' });

    expect(doc._id).toBeTruthy();
  });

  it('should apply plugin by calling new MongooseIdAssigner', async () => {
    const plugin = new MongooseIdAssigner(exampleSchema, {
      modelName: 'example2',
    });

    expect(plugin).toBeInstanceOf(MongooseIdAssigner);

    const exampleModel = demoDB.model('example2', exampleSchema);

    const doc = await exampleModel.create({ personId: 'mernxl' });

    expect(doc._id).toBeTruthy();
  });

  it('should apply plugin with method MongooseIdAssigner.plugin', async () => {
    const plugin = MongooseIdAssigner.plugin(exampleSchema, {
      modelName: 'example3',
    });

    expect(plugin).toBeInstanceOf(MongooseIdAssigner);

    const exampleModel = demoDB.model('example3', exampleSchema);

    const doc = await exampleModel.create({ personId: 'mernxl' });

    expect(doc._id).toBeTruthy();
  });

  it('should assign _ids to Model instances with options', async () => {
    MongooseIdAssigner.plugin(exampleSchema, {
      modelName: 'example4',
      fields: {
        _id: {
          type: FieldConfigTypes.String,
          separator: 'T',
          nextId: '34T5565',
        },
      },
    });

    const exampleModel = demoDB.model('example4', exampleSchema);

    try {
      const doc = await exampleModel.create({ personId: 'mernxl' });

      expect(doc._id).toBe('34T5565');
    } catch (e) {
      expect(e).toBeUndefined();
    }
  });

  it('should assign multiple ids to fields', async () => {
    const options: AssignerOptions = {
      modelName: 'example5',
      fields: {
        _id: '33333',
        photoId: 44444,
        emailId: '55555',
        personId: '66666',
        uuidField: 'UUID',
      },
    };

    exampleSchema.plugin(MongooseIdAssigner.plugin, options);
    const exampleModel = demoDB.model('example5', exampleSchema);

    const doc = await exampleModel.create({ personId: 'mernxl' });
    const doc2 = await exampleModel.create({ personId: 'mernxl' });

    expect([doc._id, doc2._id]).toEqual(
      expect.arrayContaining(['33333', '33334']),
    );
    expect((doc as any).photoId).not.toBe((doc2 as any).photoId);
    expect([(doc as any).photoId, (doc2 as any).photoId]).toEqual(
      expect.arrayContaining([44444, 44445]),
    );
    expect((doc as any).emailId).not.toBe((doc2 as any).emailId);
    expect([(doc as any).emailId, (doc2 as any).emailId]).toEqual(
      expect.arrayContaining(['55555', '55556']),
    );
    expect((doc as any).personId).not.toBe((doc2 as any).personId);
    expect([(doc as any).personId, (doc2 as any).personId]).toEqual(
      expect.arrayContaining(['66666', '66667']),
    );
    expect((doc as any).uuidField).not.toBe((doc2 as any).uuidField);
    expect((doc as any).uuidField).toBeInstanceOf(Buffer);
    expect((doc2 as any).uuidField).toBeInstanceOf(Buffer);
  });

  it('should be robust enough to avoid duplicates', async () => {
    const options: AssignerOptions = {
      modelName: 'example6',
      fields: {
        _id: '33333',
        photoId: 44444,
        emailId: '55555',
        personId: {
          type: FieldConfigTypes.String,
          nextId: 'SPEC-7382-4344-3232',
          separator: '-',
        },
        uuidFieldString: FieldConfigTypes.UUID,
        uuidFieldBuffer: {
          type: FieldConfigTypes.UUID,
          version: 1,
        },
        objectIdField: FieldConfigTypes.ObjectId,
      },
    };

    try {
      const plugin = MongooseIdAssigner.plugin(exampleSchema, options);

      const exampleModel = demoDB.model('example6', exampleSchema);

      // initialise to ensure that
      // model is set and db is connected
      // before performing heavy tasks
      await plugin.initialise(exampleModel);

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(exampleModel.create({ personId: 'mernxl' }));
      }

      const docs: any[] = await Promise.all(promises);
      for (let i = 0; i < 100; i++) {
        const _id = docs[i]._id;
        const photoId = docs[i].photoId;
        const emailId = docs[i].emailId;
        const personId = docs[i].personId;
        const uuidFieldString = docs[i].uuidFieldString;
        const uuidFieldBuffer = docs[i].uuidFieldBuffer;
        const objectIdField = docs[i].objectIdField;
        expect(typeof photoId).toBe('number');
        expect(typeof emailId).toBe('string');
        expect(personId).toMatch(/(SPEC-7382-4344-3)\d+/);
        expect(objectIdField).toBeInstanceOf(Types.ObjectId);
        expect(typeof uuidFieldString).toBe('string');
        expect(uuidFieldBuffer).toBeInstanceOf(Buffer);

        for (const cDoc of docs) {
          if (_id === cDoc._id) {
            continue;
          }
          expect(photoId).not.toBe(cDoc.photoId);
          expect(emailId).not.toBe(cDoc.emailId);
          expect(personId).not.toBe(cDoc.personId);
          expect(objectIdField).not.toBe(cDoc.objectIdField);
          expect(uuidFieldString).not.toEqual(cDoc.uuidFieldString);
          expect(uuidFieldBuffer).not.toEqual(cDoc.uuidFieldBuffer);
        }
      }
    } catch (e) {
      expect(e).toBeUndefined();
    }
  });
});
