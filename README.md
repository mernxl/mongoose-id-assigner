# Mongoose-Id-Assigner (IA)
[![Build Status](https://travis-ci.org/mernxl/mongoose-id-assigner.svg?branch=master)](https://travis-ci.org/mernxl/mongoose-id-assigner)
[![codecov](https://codecov.io/gh/mernxl/mongoose-id-assigner/branch/master/graph/badge.svg)](https://codecov.io/gh/mernxl/mongoose-id-assigner)

Plugin for `mongoose`, Automatically assign and/or increment any field on your mongoose models that needs to be identified(ID).

It offers support for assigning with `MongoDB's ObjectId`, `UUID`, `Number Increments`, `String Generators` or you provide your custom `Generator Function`.

It also works if you have multiple mongooseConnection instances by using your underlying doc connections to update ids.

## Installation
```
npm install mongoose-id-assigner
```

## Basic Usage
### Plugin Options
TypeName: **AssignerOptions**
- *modelName*: **String** Name for the Model your are working with.
- *fields*: **AssignerFieldsConfigMap?** The configuration Map of the fields you want the assigner to assign ids to.
  If Null, then plugin assigns ids to _id field, (ObjectId).
  - [fieldName: string]: FieldConfig | string | number | boolean | 'GUID' | 'UUID'
  
### TypeDefinitions
```typescript
/**
 * If Option does not contain an AssignerFieldsConfigMap, then we use the config options for _id
 */
interface AssignerOptions {
  modelName: string;
  fields?: AssignerFieldsConfigMap;
}

/**
 * fieldOption = string, then nextId = string, default incrementer,
 * fieldOption = number, then nextId = number, incrementBy = 1
 * fieldOption = boolean(true), then fieldType = ObjectId
 * fieldOption = GUID | UUID, then use UUID v4
 */
interface AssignerFieldsConfigMap {
  [fieldName: string]:
    | FieldConfig
    | string
    | number
    | boolean
    | 'GUID'
    | 'UUID';
}

// noSpace, insure we consume all possible values, i.e. we must have 1, 2, 3, 4
// order doesn't matter but all those keys must be present, no 1, 3, 4, 6
type FieldConfig = {
  index?: boolean;
  unique?: boolean;
  noSpace?: boolean;
} & (
  | DefaultFieldConfig
  | StringFieldConfig
  | NumberFieldConfig
  | UUIDFieldConfig);

enum FieldConfigTypes {
  UUID = 'UUID',
  GUID = 'GUID',
  String = 'String',
  Number = 'Number',
  ObjectId = 'ObjectId',
}

interface DefaultFieldConfig {
  type: 'ObjectId';
}

interface StringFieldConfig {
  type: 'String';
  nextId: string;
  separator?: string;
  nextIdFunction?: (nextId: string) => string;
}

interface NumberFieldConfig {
  type: 'Number';
  nextId: number;
  incrementBy?: number;
  nextIdFunction?: (nextId: number, incrementBy?: number) => number;
}

interface UUIDFieldConfig {
  type: 'UUID' | 'GUID';
  asBinary?: boolean; // default string
  version?: number; // supports 1 and 4, default 1
  versionOptions?: any;
}
```

## Examples
Lets create our Mongoose Schema.
```js
// schema.js  We would be reusing this schema for brevity (clone)
import * as mongoose from 'mongoose';

const ExampleSchema = new mongoose.Schema({
  _id: String,

  photoId: Number,
  emailId: String,
  personId: String,
  uuidField: Buffer,
  uuidFieldString: String,
  uuidFieldBuffer: Buffer,
  objectIdField: mongoose.Schema.Types.ObjectId,
});
```

Configure the Plugin on any Model you want to use with Passing the Configuration options.
**Method 1**: Quick Config, Good if your ids need no network use, case ObjectId, UUID
```js
const options = {
  modelName: 'ExampleModel',
  fields: {
    // if no _id field config, assigner auto adds with type = "ObjectId"
    uuidField: 'UUID',
  }
};

ExampleSchema.plugin(MongooseIdAssigner.plugin, options);

// You need plugin instance to initialise Plugin
// No need to initialise if you don't intent to start saving files immediately
const ExampleModel = mongoose.model('ExampleModel', ExampleSchema);
```

**Method 2**: Request Assigner Instance
```js
const options = {
  modelName: 'ExampleModel',
  fields: {
    personId: '0000'   // needs network,
  }
};

// If you have startup logic that needs to save files, request instance then initialise
const ExampleIA = MongooseIdAssigner.plugin(ExampleSchema, options);

const ExampleModel = mongoose.model('ExampleModel', ExampleSchema);

// returns a promise...
ExampleIA.initialise(ExampleModel)
  .then((readyCode) => /* ...do stuff */)
  .catch((error) => /* ... do stuff */)
```

**Method 3**: Request Assigner Instance
```js
const options = {
  modelName: 'ExampleModel',
  fields: {
    personId: '0000'   // needs network,
  }
};

// If you have startup logic that needs to save files, request instance then initialise
const ExampleIA = new MongooseIdAssigner(ExampleSchema, options); // <- diff

const ExampleModel = mongoose.model('ExampleModel', ExampleSchema);

// returns a promise...
ExampleIA.initialise(ExampleModel)
  .then((readyCode) => /* ...do stuff */)
  .catch((error) => /* ... do stuff */)
```

### Strain test, Performs the task below on a locally hosted db instance.
```typescript
// using ts :)
import * as mongoose from 'mongoose';
import { AssignerOptions, FieldConfigTypes, localStateStore, MongooseIdAssigner } from './src';

describe('MongooseIdAssigner', () => {

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
          asBinary: true,
        },
        objectIdField: FieldConfigTypes.ObjectId,
      },
    };

    try {
      const plugin = MongooseIdAssigner.plugin(exampleSchema, options);

      const exampleModel = mongoose.model('example6', exampleSchema);

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
        expect(objectIdField).toBeInstanceOf(mongoose.Types.ObjectId);
        expect(typeof uuidFieldString).toBe('string');
        expect(uuidFieldBuffer).toBeInstanceOf(Binary);

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
```

## LICENSE
[MIT](https://github.com/mernxl/mongoose-id-assigner/blob/master/LICENSE.md)

