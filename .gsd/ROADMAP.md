# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: v1.0

## Must-Haves (from SPEC)
- [ ] Scalable Clean Architecture backend in `/backend` using Express + TypeScript
- [ ] Complete database schema containing all 22 required tables in PostgreSQL via Prisma
- [ ] JWT authentication with Refresh Tokens and Role-Based Access Control
- [ ] Full Patient Flow APIs (Registration, Queue, Vitals, Consultation, Pharmacy, Inventory updates)
- [ ] Incremental offline push/pull synchronization with conflict resolution
- [ ] Statistical medicine demand prediction model
- [ ] PDF prescription compiler with digital signature storage
- [ ] API Swagger documentation and testing suite

## Phases

### Phase 1: Foundation & Schema Setup
**Status**: ✅ Completed
**Objective**: Build backend boilerplate, configure Prisma with 22+ tables, write seed script, and establish error handling/logger utilities.
**Requirements**: REQ-01, REQ-02

### Phase 2: Authentication & Patient Flow
**Status**: ⬜ Not Started
**Objective**: Implement JWT authentication + refresh tokens, create RBAC middlewares, and build Patient registration, smart queuing, and vitals APIs.
**Requirements**: REQ-03, REQ-04, REQ-05, REQ-06

### Phase 3: Consultation, Pharmacy & Prescription PDFs
**Status**: ⬜ Not Started
**Objective**: Create doctor consultation endpoints (capturing prescriptions & signatures), pharmacy medicine dispensing routes (with inventory updates), PDF compilation services, and email/SMS mock drivers.
**Requirements**: REQ-07, REQ-08, REQ-12, REQ-13

### Phase 4: Offline Sync, Prediction & Analytics
**Status**: ⬜ Not Started
**Objective**: Build the offline sync api (pull/push increments), implement the statistical demand prediction module, and write dashboard analytics routers.
**Requirements**: REQ-09, REQ-10, REQ-11

### Phase 5: Security Hardening, Swagger & Testing
**Status**: ⬜ Not Started
**Objective**: Harden endpoints with Helmet, rate limiting, and inputs validation, establish Swagger configuration, add integration tests, and provide Docker scripts.
**Requirements**: REQ-14, REQ-15
