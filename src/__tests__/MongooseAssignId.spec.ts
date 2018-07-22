import { Schema } from 'mongoose';
import { demoDB, getSchema } from '../__mock__/test.models';
import { AssignIdPluginOptions, FieldTypes } from '../assigner.interfaces';
import { localStateStore } from '../LocalStateStore';
import { MongooseIdAssigner } from '../MongooseIdAssigner';

afterAll(async () => {
  await demoDB.close();
});

afterEach(() => demoDB.dropDatabase());

describe('MongooseIdAssigner', () => {
  let personSchema: Schema, droidSchema: Schema, characterSchema: Schema;

  beforeEach(() => {
    characterSchema = getSchema(0);
    personSchema = getSchema(1);
    droidSchema = getSchema(2);
    localStateStore.clear();
  });

  it('should assign _id field if only modelName option passed', async () => {
    personSchema.plugin(MongooseIdAssigner.plugin, { modelName: 'person1' });

    const personModel = demoDB.model('person1', personSchema);

    const doc = await personModel.create({ personId: 'mernxl' });

    expect(doc._id).toBeTruthy();
  });

  it('should apply plugin by calling new MongooseIdAssigner', async () => {
    const plugin = new MongooseIdAssigner(personSchema, {
      modelName: 'person2',
    });

    expect(plugin).toBeInstanceOf(MongooseIdAssigner);

    const personModel = demoDB.model('person2', personSchema);

    const doc = await personModel.create({ personId: 'mernxl' });

    expect(doc._id).toBeTruthy();
  });

  it('should apply plugin with method MongooseIdAssigner.plugin', async () => {
    const plugin = MongooseIdAssigner.plugin(personSchema, {
      modelName: 'person3',
    });

    expect(plugin).toBeInstanceOf(MongooseIdAssigner);

    const personModel = demoDB.model('person3', personSchema);

    const doc = await personModel.create({ personId: 'mernxl' });

    expect(doc._id).toBeTruthy();
  });

  it('should assign _ids to Model instances with options', async () => {
    MongooseIdAssigner.plugin(personSchema, {
      modelName: 'person4',
      fields: {
        _id: { type: FieldTypes.String, separator: 'T', nextId: '34T5565' },
      },
    });

    const personModel = demoDB.model('person4', personSchema);

    try {
      const doc = await personModel.create({ personId: 'mernxl' });

      expect(doc._id).toBe('34T5565');
    } catch (e) {
      expect(e).toBeUndefined();
    }
  });

  it('should assign multiple ids to fields', async () => {
    const options: AssignIdPluginOptions = {
      modelName: 'person5',
      fields: {
        _id: '33333',
        photoId: 44444,
        emailId: '55555',
        personId: '66666',
        uuidField: 'UUID',
      },
    };

    personSchema.plugin(MongooseIdAssigner.plugin, options);
    const personModel = demoDB.model('person5', personSchema);

    const doc = await personModel.create({ personId: 'mernxl' });
    const doc2 = await personModel.create({ personId: 'mernxl' });

    expect([ doc._id, doc2._id ]).toEqual(
      expect.arrayContaining([ '33333', '33334' ]),
    );
    expect((doc as any).photoId).not.toBe((doc2 as any).photoId);
    expect([ (doc as any).photoId, (doc2 as any).photoId ]).toEqual(
      expect.arrayContaining([ 44444, 44445 ]),
    );
    expect((doc as any).emailId).not.toBe((doc2 as any).emailId);
    expect([ (doc as any).emailId, (doc2 as any).emailId ]).toEqual(
      expect.arrayContaining([ '55555', '55556' ]),
    );
    expect((doc as any).personId).not.toBe((doc2 as any).personId);
    expect([ (doc as any).personId, (doc2 as any).personId ]).toEqual(
      expect.arrayContaining([ '66666', '66667' ]),
    );
    expect((doc as any).uuidField).not.toBe((doc2 as any).uuidField);
    expect((doc as any).uuidField).toBeInstanceOf(Buffer);
    expect((doc2 as any).uuidField).toBeInstanceOf(Buffer);
  });

  it('should be robust enough to avoid duplicates', async () => {
    const options: AssignIdPluginOptions = {
      modelName: 'person6',
      fields: {
        _id: '33333',
        photoId: 44444,
        emailId: '55555',
        personId: '66666',
        uuidField: 'UUID',
      },
    };

    try {
      const plugin = MongooseIdAssigner.plugin(personSchema, options);

      const personModel = demoDB.model('person6', personSchema);

      // initialise to ensure that model is set below before performing heavy tasks
      await plugin.initialise(personModel);

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(personModel.create({ personId: 'mernxl' }));
      }

      const docs: any[] = await Promise.all(promises);
      for (let i = 0; i < 100; i++) {
        const _id = docs[ i ]._id;
        const photoId = docs[ i ].photoId;
        const emailId = docs[ i ].emailId;
        const personId = docs[ i ].personId;
        const uuidField = docs[ i ].uuidField;

        for (const cDoc of docs) {
          if (_id === cDoc._id) {
            continue;
          }
          expect(photoId).not.toBe(cDoc.photoId);
          expect(emailId).not.toBe(cDoc.emailId);
          expect(personId).not.toBe(cDoc.personId);
          expect(uuidField).not.toEqual(cDoc.uuidField);
        }
      }
    } catch (e) {
      expect(e).toBeUndefined();
    }
  });
});
