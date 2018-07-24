import MongodbMemoryServer from 'mongodb-memory-server';
import * as mongoose from 'mongoose';

(mongoose as any).Promise = Promise;

const TEST_SITE = process.env.TEST_SITE;

export function getMongoose() {
  if (TEST_SITE === 'travis-ci') {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

    const originalConnect = mongoose.connect;
    (mongoose as any).connect = async () => {
      const mongoServer = new MongodbMemoryServer();

      const mongoUri = await mongoServer.getConnectionString(true);

      // originalConnect.bind(mongoose)(mongoUri, { useMongoClient: true }); // mongoose 4
      originalConnect.bind(mongoose)(mongoUri, { useNewUrlParser: true }); // mongoose 5

      mongoose.connection.on('error', e => {
        if (e.message.code === 'ETIMEDOUT') {
          console.error(e);
        } else {
          throw e;
        }
      });

      mongoose.connection.once('open', () => {
        // console.log(`MongoDB successfully connected to ${mongoUri}`);
      });

      mongoose.connection.once('disconnected', () => {
        // console.log('MongoDB disconnected!');
        mongoServer.stop();
      });
    };
    (mongoose as any).connect();

    return mongoose;
  } else {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    mongoose.connect(
      'mongodb://localhost:27017/test_ia',
      {
        useNewUrlParser: true,
      },
    );
    return mongoose;
  }
}
