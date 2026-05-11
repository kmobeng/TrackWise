import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

const sendEmail = async (options: any) => {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is missing");
  }

  const transporter =
    process.env.NODE_ENV === "production"
      ? nodemailer.createTransport({
          host: "smtp.sendgrid.net",
          port: 587,
          secure: false,
          auth: {
            user: process.env.SENDGRID_USERNAME || "apikey",
            pass: process.env.SENDGRID_PASSWORD,
          },
        } as SMTPTransport.Options)
      : nodemailer.createTransport({
          host: "localhost",
          port: 1025,
          secure: false,
        } as SMTPTransport.Options);

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

export const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  const masked = local!.slice(0, 2) + "***" + local!.slice(-2);
  return `${masked}@${domain}`;
};

export default sendEmail;
