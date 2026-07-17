# Requirements

| ID | Requirement | Source | Status |
|----|-------------|--------|--------|
| **REQ-01** | Establish Express + TS codebase in `/backend` using a clean/repository pattern. | SPEC Goal 1 | Completed |
| **REQ-02** | Configure Prisma ORM with PostgreSQL mapping 22+ tables (Users, Camps, Patients, Vitals, Inventory, etc.). | SPEC Goal 3 | Completed |
| **REQ-03** | Implement JWT Authentication with token refresh endpoints and password hashing. | SPEC Goal 2 | Pending |
| **REQ-04** | Build role and permission verification middleware (Admin, Volunteer, Medical Assistant, Doctor, Pharmacy). | SPEC Goal 2 | Pending |
| **REQ-05** | Build Patient Registration and Smart Queue management APIs. | SPEC Goal 3 | Pending |
| **REQ-06** | Create Vitals capture and history endpoints. | SPEC Goal 3 | Pending |
| **REQ-07** | Implement Doctor Consultation APIs allowing digital signatures, prescriptions, and follow-ups. | SPEC Goal 3 | Pending |
| **REQ-08** | Implement Pharmacy dispensing APIs with inventory transaction history and low-stock/expiry alerts. | SPEC Goal 3 | Pending |
| **REQ-09** | Build incremental offline synchronization endpoints (`/api/sync`) with timestamp versioning and Last-Write-Wins. | SPEC Goal 4 | Pending |
| **REQ-10** | Implement statistical demand prediction module taking season, location, and past camp details to suggest stock. | SPEC Goal 5 | Pending |
| **REQ-11** | Create Analytics APIs for patient volume, gender ratio, age distribution, disease stats, and doctor performance. | SPEC Goal 3 | Pending |
| **REQ-12** | Implement PDF generator to compile professional A4 prescriptions with branding and signatures. | SPEC Goal 6 | Pending |
| **REQ-13** | Design mock email/SMS triggers that log messages to file and console. | SPEC Goal 6 | Pending |
| **REQ-14** | Add rate limiting, CORS, Helmet, and input validation schemas using Zod. | SPEC Goal 2 | Pending |
| **REQ-15** | Configure Swagger/OpenAPI documentation for all routes. | SPEC Goal 1 | Pending |
