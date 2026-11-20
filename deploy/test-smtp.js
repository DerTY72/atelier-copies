const nodemailer = require("nodemailer");

const port = Number(process.env.SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: process.env.SMTP_SECURE === "true" || port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function main() {
  await transporter.verify();
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_ADMIN_TO,
    subject: "SMTP test: Atelier Copies",
    text: "SMTP test from production server.",
  });
  console.log("SMTP_OK");
}

main().catch((error) => {
  console.log("SMTP_FAIL");
  console.log(error && error.message ? error.message : error);
  process.exit(1);
});
