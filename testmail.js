// testMail.js
const nodemailer = require("nodemailer");
require("dotenv").config();

(async () => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.SMTP_USER,
    subject: "Test from Hasan Portfolio",
    text: "Hello! Mail sending works!",
  });
  console.log("Mail sent!");
})();
