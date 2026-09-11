# iMBrace Platform Service

Microservice handling core platform logic: **authentication, organizations, and users**.
Built with **Hono** + **Drizzle ORM** + **PostgreSQL**. Designed for single-tenant, self-hosted deployment with email/password authentication only.

> One of the services that make up the open-source iMBrace platform.

> The default organization (`default`) and owner user are auto-created on first startup.
> See [Bootstrap](#bootstrap) for details.

## License

MIT — see [LICENSE](./LICENSE).

---

## Run with Docker Compose

The quickest way to start the service plus a PostgreSQL database:

```bash
cp .env.example .env      # set NEW_ORG_USERNAME / NEW_ORG_PASSWORD for first-run bootstrap
docker compose up --build
```

This builds the image, starts PostgreSQL, runs migrations, and serves on port `6040`.
`DATABASE_URL` is set automatically for the bundled database.

---

## Quick Start (local, without Docker)

```bash
# 1. Install dependencies
yarn install

# 2. Copy and edit env
cp .env.example .env
```

Edit `.env` — minimum for local dev:

```env
PORT=6040
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imbrace_platform
NEW_ORG_USERNAME=admin@example.com
NEW_ORG_PASSWORD=your-password-here
```

```bash
# 3. Start PostgreSQL (Docker)
docker run -d --name platform-pg ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=imbrace_platform ^
  -p 5432:5432 postgres:16-alpine

# 4. Create tables (first-time only — see db:push warning below)
yarn db:push

# 5. Start dev server
yarn dev
```

```bash
# 6. Verify
curl http://localhost:6040/health
# Expected: {"status":"ok","service":"platform-service","timestamp":"..."}
```

---

## System Requirements

| Component                       | Required?        | Notes                                            |
| ------------------------------- | ---------------- | ------------------------------------------------ |
| Node.js >= 18 (20+ recommended) | Yes              |                                                  |
| Yarn                            | Yes              | `npm i -g yarn`                                |
| PostgreSQL 14+                  | Yes              | Database for all data                            |
| Docker                          | No (recommended) | To run PostgreSQL locally                        |
| SMTP server                     | No (optional)    | Required for email verification & password reset |
| AWS credentials                 | No (optional)    | Required for S3 file storage                     |

---

## Directory Structure

```
platform/
├── src/
│   ├── index.ts                       # Entry point + bootstrap
│   ├── application/
│   │   └── use-cases/                 # Business logic (CreateOrganization, etc.)
│   ├── domain/
│   │   ├── entities/                  # Domain entities
│   │   └── repositories/             # Repository interfaces
│   ├── infrastructure/
│   │   └── database/                  # DB connection, repositories, seed
│   ├── interfaces/
│   │   └── http/
│   │       ├── routes/                # API route definitions
│   │       ├── middleware/            # Hono middleware (auth, error handler)
│   │       └── controllers/          # Route handlers
│   └── shared/
│       ├── config/                    # Configuration loader
│       ├── di/                        # Dependency injection (tsyringe)
│       └── utils/                     # Helpers (id generator, etc.)
├── .env.example                       # Environment template
├── drizzle.config.ts                  # Drizzle Kit config
├── tsconfig.json
└── package.json
```

---

## Database

### Schema Commands

| Command              | When to use                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `yarn db:push`     | **First-time setup or full reset** — creates/updates tables from schema. **Drops & recreates tables.** |
| `yarn db:generate` | **After changing schema files** — generates a SQL migration file                                             |
| `yarn db:migrate`  | **Apply pending migrations** — safe, incremental, no data loss                                               |
| `yarn db:studio`   | Open Drizzle Studio (GUI)                                                                                           |
| `yarn db:seed`     | Run seed script                                                                                                     |

> ⚠️ **Warning:** Do NOT run `yarn db:push` on a database with existing data. It drops and recreates tables. Use `yarn db:generate` + `yarn db:migrate` for incremental changes.

---

## Bootstrap

On **first startup**, the service automatically creates:

1. A **login user** from `NEW_ORG_USERNAME` / `NEW_ORG_PASSWORD` env vars
2. The **default organization** (`name = 'default'`)
3. A **default business unit** linked to that organization
4. The user's role is set to `owner`

On **subsequent startups**, if the org already exists:

- Creates a default business unit if missing
- Ensures the bootstrap user has `owner` role

> If `NEW_ORG_USERNAME` or `NEW_ORG_PASSWORD` is missing on first startup, the service starts but skips bootstrapping — you'll need to create the org manually.

---

## Environment Variables

| Variable                                    | Required | Description                            |
| ------------------------------------------- | -------- | -------------------------------------- |
| `PORT`                                    | No       | Server port (default:`6040`)         |
| `DB_TYPE`                                 | No       | Database Type (default: `postgres`)  |
| `DATABASE_URL`                            | Yes      | PostgreSQL connection string           |
| `NEW_ORG_USERNAME`                        | Yes (*)  | Bootstrap admin email                  |
| `NEW_ORG_PASSWORD`                        | Yes (*)  | Bootstrap admin password               |
| `NODE_ENV`                                | No       | Environment (e.g. `development`)       |
| `APP_URL` / `APP_API_URL`               | No       | Frontend & API URLs                    |
| `SERVICE_AI` / `SERVICE_AI_V2`          | No       | AI service URLs                        |
| `SMTP_*`                                  | No       | Email configuration (for verify/reset) |
| `AWS_*`                                   | No       | S3 file storage                        |

> (*) Required only on **first startup** for bootstrapping.

### Full `.env` reference

```env
PORT=6040

DB_TYPE=postgres
# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/imbrace_platform

# Bootstrap: First-run organization setup
# These are REQUIRED for the first startup to create the default org + owner user
NEW_ORG_USERNAME=admin@example.com
NEW_ORG_PASSWORD=

# App
NODE_ENV=development

# App URL (frontend)
APP_URL=http://localhost:3000
APP_API_URL=http://localhost:6040

# AI Service
SERVICE_AI=
SERVICE_AI_V2=

# Cross-service hosts
SERVICE_CHANNEL=http://localhost:4100
SERVICE_DATA_BOARD=http://localhost:8866

# SMTP Email
SMTP_ADDRESS=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_SENDER=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
AWS_S3_BUCKET_PREFIX=
```

---

## API Endpoints

### Health

| Method | Path        | Auth | Description          |
| ------ | ----------- | ---- | -------------------- |
| GET    | `/health` | —   | Service health check |

### Auth — `/v1/login`

| Method | Path                       | Auth | Description                             |
| ------ | -------------------------- | ---- | --------------------------------------- |
| POST   | `/sign_in`               | —   | Sign in with email + password           |
| POST   | `/sign_up`               | —   | Sign up a new user                      |
| GET    | `/sign_up/verify`        | —   | Verify email with code                  |
| GET    | `/sign_up/verify/resend` | —   | Resend verification code                |
| POST   | `/authenticate`          | —   | Sign in & return login token + org list |
| GET    | `/forget`                | —   | Request password reset email            |
| POST   | `/forget/reset`          | —   | Reset password                          |

### Access — `/v1/access`

| Method | Path                        | Auth       | Description                 |
| ------ | --------------------------- | ---------- | --------------------------- |
| POST   | `/_exchange_access_token` | login_acc_ | Exchange token + select org |

### Organizations

| Method | Path                       | Auth       | Description                     |
| ------ | -------------------------- | ---------- | ------------------------------- |
| GET    | `/v2/organizations`      | login_acc_ | List orgs for user (login flow) |
| GET    | `/v2/organizations/_all` | acc_       | List orgs (for app use)         |

### Users — `/v2/user`

| Method | Path  | Auth | Description                       |
| ------ | ----- | ---- | --------------------------------- |
| GET    | `/` | acc_ | List users with dynamic filtering |

### Third Party Token — `/v1/third_party_token`

| Method | Path        | Auth | Description              |
| ------ | ----------- | ---- | ------------------------ |
| POST   | `/`       | acc_ | Create third-party token |
| GET    | `/:token` | acc_ | Verify third-party token |
| DELETE | `/:token` | acc_ | Delete third-party token |

### Internal — `/v1/internal`

| Method | Path  | Auth | Description           |
| ------ | ----- | ---- | --------------------- |
| GET    | `/` | acc_ | Internal service info |

---

## Authentication Flow

### Tokens

| Token        | Prefix         | TTL | Table            | Used for                                    |
| ------------ | -------------- | --- | ---------------- | ------------------------------------------- |
| Login Access | `login_acc_` | 3h  | `login_access` | After login/signup, before selecting an org |
| Access Token | `acc_`       | 30d | `access`       | API calls after org selection               |

### Login Flow

```
POST /v1/login/sign_in                  → returns login_acc_ token
GET  /v2/organizations                  → list orgs (header: x-access-token: login_acc_...)
POST /v1/access/_exchange_access_token  → exchange login_acc_ + org_id → acc_ token
```

---

## Architecture & Constraints

### Single-Tenant

- Exactly one organization (`default`) and one business unit.
- External identity providers (SSO, OIDC) and AWS Marketplace integrations are **not** supported.

### Simple Role Model

Exactly two organization-level roles:

- `owner` — Full access to settings, user management, and configuration.
- `member` — Regular member access.

### Invited Members & Passwords — important

In this Open-Source edition, the initial authentication and invitation flow has been simplified to work smoothly out-of-the-box, even without an email server:

- **Default Password on Invite:** When you invite a member, the system instantly creates a fully verified `LoginUser` account for them and assigns a default password behind the scenes.
- **What is the Default Password?** The default password is **`Imbrace@12345`**. You can override this globally securely by adding a `DEFAULT_INVITE_PASSWORD` variable to your `.env` file.
- **Immediate Sign-in:** Because the invited user is pre-verified (`isVerify: true`), they do not have to perform an email OTP validation. They can immediately log in using their email and the assigned default password. (It is highly recommended they change this password after their first login).
- **Two Scenarios regarding SMTP:**
  - **If SMTP is NOT configured:** The system will skip sending the invitation email (it catches the error silently in the background) but still completes the invitation. You will just need to manually hand the default password to the person you invited so they can log in.
  - **If SMTP IS configured:** An invitation email is dispatched successfully to their inbox. The user can click the link and log in with the default password.

---

## Common Commands

```bash
yarn dev                # Start dev with hot-reload (tsx watch)
yarn build              # Compile TypeScript
yarn start              # Run production build
yarn test               # Run unit tests (vitest)
yarn test:integration   # Run integration tests
```

---

## Troubleshooting

| Issue                                      | Cause                              | Solution                                                      |
| ------------------------------------------ | ---------------------------------- | ------------------------------------------------------------- |
| `ECONNREFUSED :::5432`                   | PostgreSQL not running             | `docker start platform-pg`                                  |
| `Cannot find module`                     | Dependencies not installed         | `yarn install`                                              |
| `Missing required env: NEW_ORG_USERNAME` | First startup needs bootstrap vars | Set `NEW_ORG_USERNAME` and `NEW_ORG_PASSWORD` in `.env` |
| Bootstrap runs but org not created         | DB already has organizations       | That's expected — bootstrap only runs on empty DB            |

---

## Useful Links

- [Docker Compose](./docker-compose.yml) — Local stack
