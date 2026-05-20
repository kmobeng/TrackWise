import { prisma } from "../../lib/prisma";
import { loginService } from "../../services/auth.service";
import bcrypt from "bcrypt";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("bcrypt");

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCompare = bcrypt.compare as jest.Mock;

describe("Auth Service - Login", () => {
  it("should throw an error if password is incorrect", async () => {
    const email = "test@gmail.com";
    const password = "password123";
    mockFindUnique.mockResolvedValue({
      id: 1,
      name: "Test User",
      email,
      password: "hashedPassword",
    });
    mockCompare.mockResolvedValue(false);

    await expect(loginService(email, password)).rejects.toThrow(
      "Incorrect email or password",
    );
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email } });
    expect(mockCompare).toHaveBeenCalledWith(password, "hashedPassword");
  });

  it("should throw an error if user is not found", async () => {
    const email = "test@gmail.com";
    const password = "password123";

    mockFindUnique.mockResolvedValue(null);

    await expect(loginService(email, password)).rejects.toThrow(
      "Incorrect email or password",
    );
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email } });
  });

  it("should return user if login is successful", async () => {
    const email = "test@gmail.com";
    const password = "password123";

    mockFindUnique.mockResolvedValue({
      id: 1,
      name: "Test User",
      email,
      password: "hashedPassword",
    });
    mockCompare.mockResolvedValue(true);

    const result = await loginService(email, password);

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email } });
    expect(mockCompare).toHaveBeenCalledWith(password, "hashedPassword");
    expect(result).toEqual({
      id: 1,
      name: "Test User",
      email,
      password: "hashedPassword",
    });
  });
});
