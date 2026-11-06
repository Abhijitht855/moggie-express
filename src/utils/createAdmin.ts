import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI as string);

  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error('ADMIN_EMAIL not set in .env');

const user = await User.findOneAndUpdate(
  { email },
  { role: 'admin' },
  { returnDocument: 'after' }
);

  if (!user) {
    console.log('❌ User not found');
  } else {
    console.log(`✅ ${user.email} is now admin`);
  }

  await mongoose.disconnect();
};

createAdmin();

