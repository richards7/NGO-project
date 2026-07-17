export const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Arogya Camp OS API",
    version: "1.0.0",
    description:
      "Production-ready REST API for the Arogya Camp OS — Medical NGO Camp Management Platform. Manages patient flows, consultations, pharmacy dispensing, analytics, offline sync, and medicine demand prediction.",
    contact: { name: "Arogya NGO Dev Team" },
  },
  servers: [{ url: "/api/v1", description: "v1 API" }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          code: { type: "string" },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Authentication & user sessions" },
    { name: "Camps", description: "Medical camp management" },
    { name: "Patients", description: "Patient registration & management" },
    { name: "Consultation", description: "Doctor consultations & prescriptions" },
    { name: "Pharmacy", description: "Medicine dispensing & inventory" },
    { name: "Analytics", description: "Reports & analytical dashboards" },
    { name: "Sync", description: "Offline data synchronization" },
    { name: "Prediction", description: "Medicine demand prediction engine" },
  ],
};
