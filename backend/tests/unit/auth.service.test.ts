import { AuthService } from "../../src/services/auth.service";
import { AppError } from "../../src/utils/app-error";

// Mock Prisma
jest.mock("../../src/config/database", () => {
  const dbMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
  return {
    __esModule: true,
    getDb: () => dbMock,
    default: dbMock,
  };
});

import prisma from "../../src/config/database";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("AuthService", () => {
  const authService = new AuthService();

  beforeEach(() => jest.clearAllMocks());

  describe("login", () => {
    it("should throw unauthorized for unknown email", async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(authService.login({ email: "x@x.com", password: "pass" })).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("register", () => {
    it("should throw conflict if email already exists", async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "1" });
      await expect(
        authService.register({ email: "x@x.com", password: "password123", name: "X", roleName: "admin" }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("should throw bad request if role does not exist", async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.role.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        authService.register({ email: "x@x.com", password: "password123", name: "X", roleName: "admin" }),
      ).rejects.toBeInstanceOf(AppError);
    });
  });
});
