import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt"
import { createError } from "../utils/error.util";

export const signUpService = async (name: string, email: string, password: string) => {
    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password,
            },
        });
        return user;
    } catch (error) {
        throw error
    }
}

export const loginService = async ( email:string, password: string)=>{
    try {
        const user = await prisma.user.findUnique({where: {email}})

        if (!user || !(await bcrypt.compare(password,user.password))) {
            throw createError("Incorrect email or password",404)
        }

        return user
    } catch (error) {
        throw error
    }
}