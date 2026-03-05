import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

let mongod = null;

const connectDB = async () => {
    try {
        let mongoUri = process.env.MONGO_URI;

        // Fallback to in-memory database to prevent localhost ECONNREFUSED errors for users without Mongo installed locally
        if (!mongoUri) {
            console.log('No MONGO_URI found in environment. Booting up temporary in-memory MongoDB server...');
            mongod = await MongoMemoryServer.create();
            mongoUri = mongod.getUri();
        }

        await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${mongoUri}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// Graceful shutdown to prevent orphan mongod processes
process.on('SIGINT', async () => {
    if (mongod) {
        await mongod.stop();
    }
    process.exit(0);
});

export default connectDB;
