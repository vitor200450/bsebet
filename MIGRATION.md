# Database Migration Guide: Neon -> Supabase

Since you have data in your Neon database that you want to move to Supabase, the most reliable method is using the standard PostgreSQL tools `pg_dump` and `psql`.

> [!IMPORTANT]
> Your Neon database is currently returning a `402 Payment Required` error (Quota Exceeded). You **must resolve this first** (e.g., upgrade plan or wait for reset) before you can export data. The commands below will fail if the database is locked.

## 1. Install PostgreSQL Tools

Ensure you have `pg_dump` and `psql` installed on your machine.

- **Windows:** Download from [PostgreSQL.org](https://www.postgresql.org/download/windows/) (Command Line Tools are sufficient).
- **Mac:** `brew install postgresql`
- **Linux:** `sudo apt-get install postgresql-client`

## 2. Connection Strings

**Source (Neon):**

```bash
postgresql://neondb_owner:npg_WUprQHj81KLN@ep-summer-queen-ac8ruqk7-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

**Target (Supabase):**

```bash
postgresql://postgres:BrawlStars2004!@db.ruxfadkwvvcsdunmhdcq.supabase.co:5432/postgres
```

## 3. Migration Steps

### Step A: Export Data from Neon

Does a "data only" dump to avoid schema conflicts (since we already pushed the schema).

```bash
pg_dump "postgresql://neondb_owner:npg_WUprQHj81KLN@ep-summer-queen-ac8ruqk7-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require" \
  --data-only \
  --no-owner \
  --no-acl \
  --file=neon_data.sql
```

### Step B: Import Data to Supabase

Imports the data into your new database.

```bash
psql "postgresql://postgres:BrawlStars2004!@db.ruxfadkwvvcsdunmhdcq.supabase.co:5432/postgres" < neon_data.sql
```

> [!TIP]
> If you encounter "Duplicate Key" errors, it means the target database already has some data (e.g. from the seed script). You might need to truncate tables in Supabase first:
> `TRUNCATE TABLE "user", "session", "account", "verification", "tournament", "stage", "match", "bet" RESTART IDENTITY CASCADE;`

## Alternative: Full Migration (Schema + Data)

If you prefer to overwrite everything:

1. **Dump everything:** remove `--data-only` flag in Step A.
2. **Import:** Run Step B. (You may need to drop existing tables in Supabase first).
