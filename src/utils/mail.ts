import nodemailer from 'nodemailer';
import dns from 'dns';

// Ensure IPv4 is strictly used to avoid ENETUNREACH & timeouts on Linux/Render cloud containers
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

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  family: 4, // Force IPv4 socket connection
  connectionTimeout: 10000, // 10s maximum to avoid UI hanging
  greetingTimeout: 5000,
  socketTimeout: 15000,
  pool: true,
  maxConnections: 5,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
} as any);

export const sendOrderEmail = async (
  userEmail: string,
  order: any,
  type: 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'
) => {
  const orderId = order._id.toString().slice(-8).toUpperCase();
  const brandName = "Moggie Attires";
  const brandEmail = process.env.SUPPORT_EMAIL || "support@moggieattires.com";

  let subject = "";
  let title = "";
  let message = "";
  let accentColor = "#be185d"; // Moggie Rose Accent

  if (type === 'CONFIRMED') {
    subject = `Order Confirmed! #${orderId} - ${brandName}`;
    title = "Order Confirmed";
    message = `Thank you for shopping with ${brandName}! Your payment was successful, and we've started preparing your outfit for dispatch.`;
  } else if (type === 'SHIPPED') {
    subject = `Your Order has been Shipped! #${orderId} - ${brandName}`;
    title = "Package Dispatched";
    const courierText = order.courierPartner ? ` via ${order.courierPartner}` : '';
    const trackingText = order.trackingId ? ` Tracking ID: <b>${order.trackingId}</b>.` : '';
    const trackingLinkText = order.trackingUrl ? ` <a href="${order.trackingUrl}" target="_blank" style="color: #be185d; text-decoration: underline;">Track Order</a>` : '';
    message = `Exciting news! Your ${brandName} package has been dispatched${courierText}.${trackingText}${trackingLinkText}`;
    accentColor = "#1f2937";
  } else if (type === 'DELIVERED') {
    subject = `Order Delivered! #${orderId} - ${brandName}`;
    title = "Delivered";
    message = `Your order has been delivered! We hope you love your new pieces from ${brandName}.`;
    accentColor = "#16a34a";
  }

  const mailOptions = {
    from: `"${brandName}" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .content-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .content-table td { padding: 12px; border-bottom: 1px solid #f0f0f0; }
          .item-img { width: 50px; height: 65px; border-radius: 4px; object-fit: cover; }
        </style>
      </head>
      <body style="background-color: #faf5f5; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #f0e6e6; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          
          <!-- Brand Header -->
          <div style="padding: 30px 20px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #fce7f3;">
            <h1 style="margin: 0; font-family: Georgia, serif; font-size: 28px; letter-spacing: 3px; color: #111827; text-transform: uppercase;">
              MOGGIE
            </h1>
            <p style="margin: 4px 0 0; font-size: 11px; letter-spacing: 4px; color: #be185d; text-transform: uppercase; font-weight: 600;">
              ATTIRES
            </p>
          </div>

          <!-- Status Banner -->
          <div style="background-color: #fff1f2; padding: 18px; text-align: center; border-bottom: 1px solid #ffe4e6;">
            <h2 style="margin: 0; color: ${accentColor}; text-transform: uppercase; font-size: 18px; letter-spacing: 1.5px;">${title}</h2>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Order ID: #${orderId}</p>
          </div>

          <!-- Body -->
          <div style="padding: 30px;">
            <p style="font-size: 15px; color: #374151;">Dear <b>${order.shippingAddress.firstName}</b>,</p>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">${message}</p>

            <h4 style="margin: 25px 0 10px; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Order Summary</h4>
            <table class="content-table">
              ${order.orderItems
                .map(
                  (item: any) => `
                <tr>
                  <td style="width: 60px;">
                    <img src="${item.image}" class="item-img" alt="${item.name}">
                  </td>
                  <td>
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${item.name}</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Color: ${item.color} | Size: ${item.size} × ${item.quantity}</p>
                  </td>
                  <td style="text-align: right; font-weight: 600; font-size: 14px; color: #111827;">
                    ₹${item.price * item.quantity}
                  </td>
                </tr>
              `
                )
                .join('')}
            </table>

            <!-- Totals -->
            <div style="border-top: 1.5px solid #111827; padding-top: 15px;">
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="color: #6b7280; padding: 4px 0;">Subtotal</td>
                  <td style="text-align: right; color: #111827;">₹${order.totalPrice - (order.shippingPrice || 0)}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 4px 0;">Shipping</td>
                  <td style="text-align: right; color: #111827;">${order.shippingPrice === 0 ? 'FREE' : '₹' + order.shippingPrice}</td>
                </tr>
                <tr style="font-size: 17px; font-weight: bold;">
                  <td style="padding-top: 12px; color: #111827;">Total Paid</td>
                  <td style="padding-top: 12px; text-align: right; color: #be185d;">₹${order.totalPrice}</td>
                </tr>
              </table>
            </div>

            <!-- Shipping Info -->
            <div style="margin-top: 30px; padding: 18px; background-color: #fafafa; border: 1px solid #f3f4f6; border-radius: 8px;">
              <h4 style="margin: 0 0 8px; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</h4>
              <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.5;">
                ${order.shippingAddress.firstName} ${order.shippingAddress.lastName || ''}<br/>
                ${order.shippingAddress.address}<br/>
                ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}<br/>
                Phone: ${order.shippingAddress.phone}
              </p>
            </div>

            <div style="text-align: center; margin-top: 35px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
              <p style="font-size: 13px; color: #9ca3af; margin: 0;">Have a question? Reach us at <a href="mailto:${brandEmail}" style="color: #be185d; text-decoration: none;">${brandEmail}</a></p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 18px; background-color: #111827; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">
              © ${new Date().getFullYear()} Moggie Attires. All Rights Reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Notification email [${type}] sent to: ${userEmail}`);

    if (type === 'CONFIRMED') {
      const adminUrl = `${process.env.ADMIN_PANEL_URL}/orders/${order._id}`;

      await transporter.sendMail({
        from: `"${brandName} System" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `🚨 New Paid Order Received: #${orderId} - ${brandName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <body style="background-color: #f4f4f4; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                <div style="max-width: 500px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0;">
                    
                    <div style="padding: 20px; text-align: center; background-color: #111827;">
                        <h2 style="margin: 0; color: #ffffff; font-size: 18px; text-transform: uppercase; letter-spacing: 2px;">Moggie Attires</h2>
                        <p style="margin: 4px 0 0; color: #f472b6; font-size: 11px; text-transform: uppercase;">New Order Received</p>
                    </div>

                    <div style="padding: 30px;">
                        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">A new order payment has been successfully verified via Razorpay:</p>
                        
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
                            <tr>
                                <td style="padding: 8px 0; color: #888;">Order ID:</td>
                                <td style="padding: 8px 0; font-weight: bold; text-align: right;">#${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #888;">Customer:</td>
                                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${order.shippingAddress.firstName} ${order.shippingAddress.lastName || ''}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #888;">Total Amount:</td>
                                <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #be185d; font-size: 17px;">₹${order.totalPrice}</td>
                            </tr>
                        </table>

                        <div style="text-align: center; margin-top: 30px;">
                            <a href="${adminUrl}" style="background-color: #be185d; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; text-transform: uppercase; display: inline-block;">
                                View in Admin Panel
                            </a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
      });
    }
  } catch (error) {
    console.error('❌ Email failed:', error);
  }
};

export const sendOTPEmail = async (email: string, otp: string) => {
  const brandName = "Moggie Attires";
  const mailOptions = {
    from: `"${brandName}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your ${brandName} Verification Code`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #faf5f5; padding: 30px 15px; margin: 0;">
        <div style="max-width: 450px; margin: auto; background-color: #ffffff; border-radius: 12px; padding: 35px 25px; border: 1px solid #fce7f3; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
          
          <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 3px; color: #111827; text-transform: uppercase;">
            MOGGIE
          </h1>
          <p style="margin: 2px 0 25px; font-size: 10px; letter-spacing: 3px; color: #be185d; text-transform: uppercase; font-weight: 600;">
            ATTIRES
          </p>

          <h2 style="font-size: 18px; color: #1f2937; margin: 0 0 10px;">Verification Code</h2>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin: 0 0 25px;">
            Please use the following One-Time Password (OTP) to access your account:
          </p>

          <div style="background-color: #fff1f2; border: 1.5px dashed #f43f5e; border-radius: 8px; padding: 15px; display: inline-block; min-width: 180px; margin-bottom: 25px;">
            <span style="color: #be185d; font-size: 32px; font-weight: bold; letter-spacing: 6px; font-family: monospace;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            This OTP is valid for 10 minutes. Please do not share this code with anyone.
          </p>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('❌ OTP Email failed:', error);
  }
};
