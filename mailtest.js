require("dotenv").config();
const nodemailer = require("nodemailer");

(async () => {
  try {
    console.log("Connecting to Gmail SMTP...");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: "✅ Test Email from Hasan's Portfolio",
      text: "If you see this, your Gmail SMTP is working!",
    });

    console.log("Mail sent successfully ✅");
    console.log(info);
  } catch (err) {
    console.error("❌ Mail sending failed:", err);
  }
})();
