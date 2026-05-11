import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../lib/prisma";
import { createError } from "../utils/error.util";
import crypto from "crypto";

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: any, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(
  new GoogleStrategy(
    {
      //options for the google strategy
      callbackURL: "/api/v1/auth/google/redirect",
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    async (accessToken, refreshToken, profile, done) => {
      //passport callback function
      try {
        const currentUser = await prisma.user.findFirst({
          where: { googleId: profile.id },
        });

        if (currentUser) {
          done(null, currentUser, { authAction: "login" });
        } else {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(
              createError(
                "An email address is required to use this app. Please sign in with an account that allows email access.",
                403,
              ),
            );
          }

          const existingEmail = await prisma.user.findUnique({
            where: { email },
          });
          if (existingEmail) {
            await prisma.user.update({
              where: { id: existingEmail.id },
              data: { googleId: profile.id },
            });
            done(null, existingEmail, { authAction: "login" });
          }

          const password = crypto.randomBytes(32).toString("hex");
          const hashedPassword = crypto
            .createHash("sha256")
            .update(password)
            .digest("hex");

          const user = await prisma.user.create({
            data: {
              name: profile.name?.givenName + " " + profile.name?.familyName,
              email,
              googleId: profile.id,
              provider: "google",
              password: hashedPassword, //dummy password for required field
              needToChangePassword: true,
              isEmailVerified: true,
            },
          });

          done(null, user, { authAction: "signup" });
        }
      } catch (error) {
        done(error as Error);
      }
    },
  ),
);
