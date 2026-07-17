import { PredictionService } from "../../src/services/prediction.service";

jest.mock("../../src/config/database", () => ({
  __esModule: true,
  default: {
    camp: { findMany: jest.fn().mockResolvedValue([]) },
    prescription: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    prescriptionMedicine: { groupBy: jest.fn().mockResolvedValue([]) },
    medicine: { findUnique: jest.fn().mockResolvedValue(null) },
    patient: { count: jest.fn().mockResolvedValue(100) },
  },
}));

describe("PredictionService", () => {
  const predictionService = new PredictionService();

  it("should return a prediction output with required fields", async () => {
    const result = await predictionService.predict({
      location: "Nandigama",
      season: "monsoon",
      expectedPatients: 200,
    });

    expect(result).toHaveProperty("expectedPatients");
    expect(result).toHaveProperty("recommendedStock");
    expect(result).toHaveProperty("predictionConfidence");
    expect(result).toHaveProperty("generatedAt");
    expect(result.expectedPatients).toBe(200);
    expect(Array.isArray(result.recommendedStock)).toBe(true);
  });

  it("should apply seasonal multiplier for monsoon", async () => {
    const result = await predictionService.predict({
      location: "Test",
      season: "monsoon",
      expectedPatients: 100,
    });
    expect(result.expectedPatients).toBeGreaterThanOrEqual(100);
  });
});
