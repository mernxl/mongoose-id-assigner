import { MongoMemoryServer } from 'mongodb-memory-server-global';
import * as mongoose from 'mongoose';
import uuid = require('uuid');

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

    const connection = mongoose.createConnection();

    connection.on('error', e => {
      if (e.message.code === 'ETIMEDOUT') {
        console.error(e);
      } else {
        throw e;
      }
    });

    connection.once('open', () => {
      console.log(`MongoDB successfully connected to ${mongoUri}, ${MONGOMS_VERSION}`);
    });

    connection.once('close', () => mongoServer.stop());

    await connection.openUri(mongoUri, mongooseOptions);

    return connection;
  } else {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

    const connection = mongoose.createConnection();

    connection.once('open', () => {
      console.log(`MongoDB successfully connected local`);
    });

    connection.once('close', () => console.log('Closed'));

    await connection.openUri(`mongodb://localhost:27017/__${uuid()}__`, mongooseOptions);

    return connection;
  }
}
