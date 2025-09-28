import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME;

let client;
let db;

export async function connectDB() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log('[DB] Connected to MongoDB');
  }
  return db;
}

export async function pingDB() {
  try {
    const database = await connectDB();
    const admin = database.admin();
    const start = Date.now();
    await admin.ping();
    return Date.now() - start;
  } catch {
    return null;
  }
}

export default connectDB;