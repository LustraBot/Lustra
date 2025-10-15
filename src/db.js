import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME;

let client;
let db;
let connectPromise;

export async function connectDB() {
  if (db) return db;
  if (!connectPromise) {
    const c = new MongoClient(uri);
    connectPromise = c
      .connect()
      .then(() => {
        client = c;
        db = client.db(dbName);
        console.log('[DB] Connected to MongoDB');
        try {
          const col = db.collection('auto_hentai');
          col.createIndex({ guildId: 1 }, { unique: true }).catch(() => {});
        } catch {}
        return db;
      })
      .catch((err) => {
        connectPromise = null;
        throw err;
      });
  }
  return connectPromise;
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

export async function getAutoHentaiCollection() {
  const database = await connectDB();
  const col = database.collection('auto_hentai');
  await col.createIndex({ guildId: 1 }, { unique: true }).catch(() => {});
  return col;
}

export async function upsertAutoHentaiConfig({ guildId, channelId, mode = 'both', intervalMs = 30 * 60 * 1000, enabled = true }) {
  const col = await getAutoHentaiCollection();
  const now = new Date();
  await col.updateOne(
    { guildId },
    {
      $set: { guildId, channelId, mode, intervalMs, enabled, updatedAt: now },
      $setOnInsert: { createdAt: now, lastSentAt: null },
    },
    { upsert: true }
  );
  return col.findOne({ guildId });
}

export async function getAllAutoHentaiConfigs() {
  const col = await getAutoHentaiCollection();
  return col.find({ enabled: true }).toArray();
}

export async function getAutoHentaiConfig(guildId) {
  const col = await getAutoHentaiCollection();
  return col.findOne({ guildId });
}

export async function disableAutoHentai(guildId) {
  const col = await getAutoHentaiCollection();
  await col.updateOne({ guildId }, { $set: { enabled: false, updatedAt: new Date() } });
}

export async function updateAutoHentaiLastSent(guildId) {
  const col = await getAutoHentaiCollection();
  await col.updateOne({ guildId }, { $set: { lastSentAt: new Date(), updatedAt: new Date() } });
}

export async function getRestrictedChannelsCollection() {
  const database = await connectDB();
  return database.collection('restricted_channels');
}

export async function getUserProfilesCollection() {
  const database = await connectDB();
  const col = database.collection('user_profiles');
  await col.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
  return col;
}

export async function getUserProfile(userId) {
  const col = await getUserProfilesCollection();
  if (!userId) return null;
  return col.findOne({ userId });
}

export async function optInUserProfile(userId) {
  const col = await getUserProfilesCollection();
  if (!userId) return null;
  const now = new Date();
  const result = await col.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        optedIn: true,
        updatedAt: now,
        optedInAt: now,
      },
      $setOnInsert: {
        totalCommands: 0,
        commandCounts: {},
        guildCounts: {},
        createdAt: now,
        firstOptInAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
  const value = result.value || {
    userId,
    optedIn: true,
    totalCommands: 0,
    commandCounts: {},
    guildCounts: {},
    createdAt: now,
    firstOptInAt: now,
    updatedAt: now,
    optedInAt: now,
  };
  if (!value.firstOptInAt) {
    value.firstOptInAt = now;
    await col.updateOne({ userId }, { $set: { firstOptInAt: now } }).catch(() => {});
  }
  return value;
}

export async function optOutUserProfile(userId) {
  const col = await getUserProfilesCollection();
  if (!userId) return null;
  const now = new Date();
  const result = await col.findOneAndUpdate(
    { userId },
    {
      $set: {
        optedIn: false,
        updatedAt: now,
        optOutAt: now,
      },
    },
    { returnDocument: 'after' }
  );
  return result.value || null;
}

export async function recordCommandUsage({ userId, commandName, guildId }) {
  if (!userId || !commandName) return false;
  const col = await getUserProfilesCollection();
  const now = new Date();

  const inc = {
    totalCommands: 1,
    [`commandCounts.${commandName}`]: 1,
  };
  if (guildId) {
    inc[`guildCounts.${guildId}`] = 1;
  }

  const set = {
    lastCommandAt: now,
    lastCommandName: commandName,
    updatedAt: now,
  };
  if (guildId) {
    set.lastGuildId = guildId;
  }

  const result = await col.updateOne(
    { userId, optedIn: true },
    {
      $inc: inc,
      $set: set,
    }
  );
  return result.modifiedCount > 0;
}

export async function addRestrictedChannel(guildId, channelId) {
  const collection = await getRestrictedChannelsCollection();
  await collection.updateOne(
    { guildId },
    { $addToSet: { channels: channelId } },
    { upsert: true }
  );
}

export async function removeRestrictedChannel(guildId, channelId) {
  const collection = await getRestrictedChannelsCollection();
  await collection.updateOne(
    { guildId },
    { $pull: { channels: channelId } },
    { upsert: false }
  );
}

export async function getRestrictedChannels(guildId) {
  const collection = await getRestrictedChannelsCollection();
  const doc = await collection.findOne({ guildId });
  return doc?.channels || [];
}

export async function isChannelRestricted(guildId, channelId) {
  const channels = await getRestrictedChannels(guildId);
  return channels.length > 0 ? !channels.includes(channelId) : false;
}

export default connectDB;
