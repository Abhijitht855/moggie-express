import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';
import dns from 'dns';

// Fix for Windows DNS resolution
if (process.platform === 'win32') {
  try {
    dns.setDefaultResultOrder?.('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {}
}

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not set in .env');

    await mongoose.connect(mongoUri);

    const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!email) throw new Error('ADMIN_EMAIL is not set in .env');

    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: { role: 'admin' },
        $setOnInsert: { name: 'Moggie Admin', email },
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`🎉 SUCCESS: ${user.email} is now configured as ADMIN! (ID: ${user._id})`);
  } catch (error: any) {
    console.error('❌ Failed to create/configure admin:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
