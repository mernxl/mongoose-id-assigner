# Mongoose-Id-Assigner (IA)
Plugin for `mongoose`, Automatically assign and/or increment any field on your mongoose models that needs to be identified(ID).

It offers support for assigning with `MongoDB's ObjectId`, `UUID`, `Number Increments`, `String Generators` or you provide your custom `Generator Function`.

It also works if you have multiple mongooseConnection instances by using your underlying doc connections to update ids

### Strain test, Performs the task below on a locally hosted db instance.
```typescript
import * as mongoose from 'mongoose';
import { AssignIdPluginOptions, FieldTypes, localStateStore, MongooseIdAssigner } from './src';


describe('MongooseIdAssigner', () => {

  const PersonSchema = new mongoose.Schema({
    _id: String,

    photoId: Number,
    emailId: String,
    personId: String,
    uuidField: Buffer,
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
      const plugin = MongooseIdAssigner.plugin(PersonSchema, options);

      const personModel = mongoose.model('person6', PersonSchema);

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
  })
})
```
