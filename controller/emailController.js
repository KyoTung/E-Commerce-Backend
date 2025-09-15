const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const dotenv = require("dotenv");
dotenv.config();


const sendEmail = asyncHandler(async(data, req, res) => {
  const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.MP,
  },
});

// Wrap in an async IIFE so we can use await.
(async () => {
  const info = await transporter.sendMail({
    from: '"Hello" <kyotungsayno@gmail.com>',
    to: data.to,
    subject: data.subject,
    text: data.text, // plain‑text body
    html: data.html, // HTML body
  });

  console.log("Message sent:", info.messageId);
})();
})

module.exports = sendEmail;