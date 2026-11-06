import 'dotenv/config';
import dns from 'dns';

// Force IPv4 lookup first across all Node.js outbound connections (Render/Linux fix)
try {
  dns.setDefaultResultOrder?.('ipv4first');
  (dns as any).resolve6 = (_hostname: string, callback: any) => {
    callback(Object.assign(new Error('IPv6 disabled in cloud environment'), { code: (dns as any).NODATA }));
  };
  if ((dns as any).Resolver?.prototype?.resolve6) {
    (dns as any).Resolver.prototype.resolve6 = (_hostname: string, callback: any) => {
      callback(Object.assign(new Error('IPv6 disabled in cloud environment'), { code: (dns as any).NODATA }));
    };
  }
} catch {}

import app from './app';
import connectDB from './config/db';

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect:', err);
    process.exit(1);
  });

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
