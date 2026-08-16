import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { Resend } from "resend";
import logger from "../config/winston.config";

const sendEmail = async (options: any) => {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is missing");
  }

  if (process.env.NODE_ENV === "production") {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const from = process.env.RESEND_EMAIL_FROM as string;

    const result = await resend.emails.send({
      from,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
      attachments: options.attachments,
    });

    if (result.error) {
      logger.error("Resend error:", result.error);
      throw new Error("Email failed to send");
    }

    return result;
  }

  const transporter = nodemailer.createTransport({
    host: "localhost",
    port: 1025,
    secure: false,
  } as SMTPTransport.Options);

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
    attachments: options.attachments,
  };

  await transporter.sendMail(mailOptions);
};

export const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  const masked = "*****" + local!.slice(-2);
  return `${masked}@${domain}`;
};

export default sendEmail;