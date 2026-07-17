# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
Build a production-ready, highly modular Express + TypeScript + PostgreSQL backend service (placed in `/backend`) for the Arogya Camp OS Medical NGO platform, featuring offline SQLite incremental synchronization, role-based access control, a statistical medicine demand prediction module, PDF prescription generation, and comprehensive security middleware.

## Goals
1. **Express & TypeScript Backend Framework:** Standardize under Clean Architecture/Repository Pattern with proper validation, logging, and error handling layers.
2. **RBAC & Security Management:** Secure authentication via JWT + Refresh tokens, role verification (Admin, Volunteer, Medical Assistant, Doctor, Pharmacy), Helmet, rate limiting, and inputs/SQLi/XSS validations.
3. **Camp Workflows & Schema Integration:** Build models and APIs matching the camp lifecycle: Registration -> Vitals -> Consultation (Doctor Notes & Prescriptions) -> Pharmacy (Medicine dispensing & inventory transactions).
4. **Offline Synchronization:** Provide endpoints for incremental push/pull data synchronization using timestamp tracking and Last-Write-Wins conflict resolution.
5. **Medicine Demand Prediction:** Implement a statistical engine analyzing past camps, seasonal variables, and disease patterns to output expected patient count, medicine stock recommendations, and confidence indices.
6. **Auxiliary Services:** Generate professional A4 PDF prescriptions with QR codes and digital signatures, and support mock email/SMS transmission.

## Non-Goals (Out of Scope)
- Real production-grade integrations for Twilio and SMTP providers (mock/console logging implementation only).
- Production-grade cloud storage solutions like AWS S3 or Cloudinary (local disk storage only).
- Machine learning model execution (statistical weighted math only for prediction; ML hook/interface defined for future extension).
- Frontend UI development (using the existing TanStack Start application structure as-is).

## Users
- **NGO Admins:** Oversee camps, inventory tracking, analytics, and volunteer access.
- **Registration Volunteers:** Register patients, generate identifiers, and queue patients.
- **Medical Assistants:** Capture vitals, queue patients.
- **Doctors:** Consultation, review patient history, make prescriptions, store digital signatures.
- **Pharmacy Workers:** Dispense prescribed medicines, update inventory.

## Constraints
- Run the server in a `/backend` subfolder to keep Vite and TanStack Start UI configuration separate.
- Must compile cleanly with TypeScript.
- Database must be PostgreSQL queried through Prisma ORM.

## Success Criteria
- [ ] Backend compiles without TypeScript errors.
- [ ] Database migrations successfully map all 22+ tables.
- [ ] JWT authentication with role-based access control blocks unauthorized resources.
- [ ] Offline Sync successfully reconciles timestamps and resolves conflicts.
- [ ] Medicine demand prediction calculates stock recommendations using weighted averages.
- [ ] REST API endpoints documented via Swagger/OpenAPI.
