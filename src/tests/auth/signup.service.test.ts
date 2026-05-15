import {prisma} from "../../lib/prisma";
import { signUpService } from "../../services/auth.service";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: { create: jest.fn() },
  },
}));

const mockCreateUser = prisma.user.create as jest.Mock;

describe("Auth Service - Sign Up", () => {
  it("should create a new user successfully", async () => {
    const name = "Test User";
    const email = "test@gmail.com";
    const password = "password123";

    mockCreateUser.mockResolvedValue({
      id: 1,
      name,
      email,
    });

    const result = await signUpService(name, email, password);

    expect(mockCreateUser).toHaveBeenCalledWith({
      data: {
        name,
        email,
        password,
      },
    });
    expect(result).toEqual({
      id: 1,
      name,
      email,
    });
  });
});
