# Connect ShelfSense to Neon

ShelfSense uses FastAPI and SQLAlchemy for database access. Neon replaces the
local SQLite database; it does not host the Python backend or provide the app's
local authentication service.

## Before changing the database

- Use a dedicated Neon project or empty development branch for this application.
- Preserve `backend/storage/shelfsense.db` if you need its accounts, shelves,
  preferences, conversations, or catalog changes.
- Switching `DATABASE_URL` does not transfer SQLite records. The application
  creates tables and seeds the catalog only when the selected database is empty.
- The connection URL includes a password. Store it in the ignored `backend/.env`
  file or your hosting platform's secret store, never in a commit or screenshot.

## Configure the connection

1. Create a project in [Neon Console](https://console.neon.tech/).
2. Open **Connect** and select the intended branch, database, and role. For the
   initial setup, use the database-owner role: startup creates tables and enables
   row-level security, which requires schema and table permissions.
3. Copy the pooled PostgreSQL URL. Copy the URL itself, without a surrounding
   `psql` command. Retain all SSL and other parameters supplied by Neon.
4. Replace the SQLite value in `backend/.env`:

   ```dotenv
   DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.neon.tech/neondb?sslmode=require"
   ```

   This is a placeholder, not a usable credential. The backend converts the
   `postgresql://` scheme to SQLAlchemy's `postgresql+psycopg://` dialect.
5. From the project root, restart the script-managed servers:

   ```powershell
   .\stop.ps1
   .\start.ps1
   ```

The PostgreSQL driver is already included in `backend/requirements.txt`. No Neon
management API key or frontend database variable is needed.

## Verify the integration

Check readiness without printing credentials:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/ready
```

The expected response has `status` equal to `ready`. Then use the website:

1. Confirm Discover shows the seeded catalog.
2. Create a test reader account and save its recovery code privately.
3. Save a book to the shelf, set its reading status, and save preferences.
4. Ask the librarian for a constrained shortlist.
5. Sign out and sign in again; confirm the shelf and preferences remain.
6. Restart the backend and confirm the same records still load.

In Neon, verify the presence of `works`, `editions`, `copies`, `accounts`, and
`login_sessions`. Do not share session hashes, password hashes, or reader notes
when reporting the result. Live Neon integration is verified only after these
checks succeed with your configured database.

## Authentication and agents are separate

Local accounts continue to work with PostgreSQL. Supabase Auth is optional and is
not required to use Neon. OpenAI agents require `OPENAI_API_KEY` independently;
without it, the app uses the labeled local catalog workflow.

For a public deployment, set `DEMO_MODE=false`, replace the shared
`GATEWAY_SECRET` in both environment files, configure `APP_ORIGIN`, and allowlist
staff account UUIDs in `STAFF_USER_IDS`. Database creation privileges are for
server-side initialization; review runtime role permissions before deployment.

## Troubleshooting and rollback

| Symptom | Check |
| --- | --- |
| Connection or authentication failure | Verify the branch, role, password, full URL, and SSL parameters from the Connect panel. |
| Permission error during startup | The selected role must be able to create tables and alter their row-level security configuration. |
| Old SQLite records are missing | A new database has separate data. Preserve SQLite and perform an explicit migration if required. |
| Availability is unverified | Copy records become stale after the configured observation window. Confirm statuses in the staff workspace. |
| Browser says the service is unavailable | Check `/ready` and `logs/backend-error.log`; do not publish logs containing connection details. |

To return to the previous local store, restore this value in `backend/.env` and
restart the servers:

```dotenv
DATABASE_URL=sqlite:///./storage/shelfsense.db
```

Rollback reconnects the existing SQLite file. It does not copy records created
in Neon back to SQLite, and it does not delete the Neon database.

See [Neon's connection guide](https://neon.com/docs/get-started/connect-neon)
and the project's [architecture notes](IMPLEMENTATION.md) for more context.
