import { prisma } from "../../lib/prisma";
import {
  getMeService,
  updateMeService,
} from "../../services/user.service";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;

const fullUser = {
  id: "user-1",
  googleId: "google-1",
  name: "Test User",
  email: "test@test.com",
  role: "USER",
  provider: "local",
  needToChangePassword: false,
  isEmailVerified: true,
  pendingEmail: null,
  passwordChangedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("User Service - profile selects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getMeService selects every profile field except password", async () => {
    mockFindUnique.mockResolvedValue(fullUser);

    const result = await getMeService("user-1");

    const { select } = mockFindUnique.mock.calls[0][0];
    expect(select).toMatchObject({
      id: true,
      googleId: true,
      name: true,
      email: true,
      role: true,
      provider: true,
      needToChangePassword: true,
      isEmailVerified: true,
      pendingEmail: true,
      passwordChangedAt: true,
      createdAt: true,
      updatedAt: true,
    });
    expect(select.password).toBeUndefined();
    expect(result).toEqual(fullUser);
  });

  it("updateMeService selects every profile field except password", async () => {
    mockUpdate.mockResolvedValue(fullUser);

    const result = await updateMeService("user-1", "Updated Name");

    const { select } = mockUpdate.mock.calls[0][0];
    expect(select).toMatchObject({
      id: true,
      googleId: true,
      name: true,
      email: true,
      role: true,
      provider: true,
      needToChangePassword: true,
      isEmailVerified: true,
      pendingEmail: true,
      passwordChangedAt: true,
      createdAt: true,
      updatedAt: true,
    });
    expect(select.password).toBeUndefined();
    expect(result).toEqual(fullUser);
  });
});