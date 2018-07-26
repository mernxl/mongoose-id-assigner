import { Schema } from 'mongoose';

const ExampleSchema = new Schema({
  _id: String,

  photoId: Number,
  emailId: String,
  personId: String,
  uuidField: Buffer,
  uuidFieldString: String,
  uuidFieldBuffer: Buffer,
  objectIdField: Schema.Types.ObjectId,
});

const CharacterSchema = new Schema(
  {
    _id: String,

    kind: String,
    someId: Number,
    friends: [String],
  },
  {
    discriminatorKey: 'kind',
  },
);

const PersonSchema = new Schema({
  license: String,
});

const DroidSchema = new Schema({
  make: String,
  timestamp: Number,
});

export function getSchema(index: number) {
  const schema = [ExampleSchema, CharacterSchema, PersonSchema, DroidSchema];

  return schema[index].clone();
}
