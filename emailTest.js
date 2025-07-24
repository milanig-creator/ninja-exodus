require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  // Create reusable transporter object using SMTP settings
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Send mail with defined transport object
  try {
    let info = await transporter.sendMail({
      from: `"Ninja Exodus Mailer" <${process.env.SMTP_USER}>`,
      to: "milangonzalez4@gmail.com",  // <-- REPLACE with your real receiving email
      subject: "✅ SMTP Test Email - Ninja Exodus",
      text: "Hello! SMTP configuration is working perfectly.",
    });

    console.log("✅ Message sent successfully! Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

testEmail();
