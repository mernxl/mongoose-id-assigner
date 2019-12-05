import { MongoMemoryServer } from 'mongodb-memory-server-global';
import * as mongoose from 'mongoose';

const mongooseOptions = {
  promiseLibrary: Promise,
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const IN_MEM = !!process.env.IN_MEM;
const MONGOMS_VERSION = process.env.MONGOMS_VERSION;

export async function getMongoose() {
  if (IN_MEM) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

    const mongoServer = new MongoMemoryServer();

    const mongoUri = await mongoServer.getConnectionString();

    mongoose.connection.on('error', e => {
      if (e.message.code === 'ETIMEDOUT') {
        console.error(e);
      } else {
        throw e;
      }
    });

    mongoose.connection.once('open', () => {
      console.log(`MongoDB successfully connected to ${mongoUri}, ${MONGOMS_VERSION}`);
    });

    mongoose.connection.once('disconnected', () => mongoServer.stop());

    await mongoose.connect(mongoUri, mongooseOptions);

    return mongoose;
  } else {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

    mongoose.connection.once('open', () => {
      console.log(`MongoDB successfully connected local`);
    });

    await mongoose.connect('mongodb://localhost:27017/__mgIdAss__', mongooseOptions);

    return mongoose;
  }
}
