import IORedis from "ioredis";
import { Queue } from "bullmq";
import logger from "../config/winston.config";
import sendEmail from "../utils/email.util";
import { QUEUE_ENABLED, REDIS_ENABLED } from "../config/features.config";

export type EmailJobPayload = {
  email: string;
  subject: string;
  message: string;
};

let emailQueue: Queue<EmailJobPayload> | null = null;

const createConnection = () =>
  new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
  });

const getQueue = () => {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobPayload>("email", {
      connection: createConnection(),
    });
  }
  return emailQueue;
};

export const sendEmailToQueue = async (payload: EmailJobPayload) => {
  if (!QUEUE_ENABLED || !REDIS_ENABLED) {
    await sendEmail(payload);
    logger.info(`Email sent directly to ${payload.email}`);
    return;
  }

  try {
    await getQueue().add("sendEmail", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 100,
    });
    logger.info(`Email job queued for ${payload.email}`);
  } catch (error) {
    logger.error("Error enqueueing email job", error);
    throw error;
  }
};