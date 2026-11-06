import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Windows local ISP DNS failing MongoDB Atlas SRV lookups (ECONNREFUSED)
if (process.platform === 'win32') {
  try {
    dns.setDefaultResultOrder?.('ipv4first');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Ignore if custom DNS cannot be set
  }
}

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ MONGO_URI is not defined in .env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DB Error: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
