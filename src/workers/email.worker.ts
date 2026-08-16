import IORedis from "ioredis";
import { Worker } from "bullmq";
import sendEmail from "../utils/email.util";
import logger from "../config/winston.config";
import { EmailJobPayload } from "../queues/email.queue";

let emailWorker: Worker<EmailJobPayload> | null = null;

export const startEmailWorker = () => {
  if (emailWorker) {
    return emailWorker;
  }

  emailWorker = new Worker<EmailJobPayload>(
    "email",
    async (job) => {
      const { email, subject, message } = job.data;
      await sendEmail({ email, subject, message });
      logger.info(`Email sent to ${email}`);
    },
    {
      connection: new IORedis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: null,
      }),
    },
  );

  emailWorker.on("failed", (job, err) => {
    logger.error(
      `Email job ${job?.id} failed after ${job?.attemptsMade} attempts`,
      err,
    );
  });

  logger.info("Email worker started");
  return emailWorker;
};