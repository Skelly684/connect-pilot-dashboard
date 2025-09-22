# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4eea4002-c26f-4077-984b-b1a962c47101

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4eea4002-c26f-4077-984b-b1a962c47101) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4eea4002-c26f-4077-984b-b1a962c47101) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Email deduping / scheduler

We rely on a DB-level unique index on `email_logs.idem_key` to prevent duplicate sends
when multiple nodes race. Apply migration `2025-ensure-idempotency-email_logs.sql`.

Only one node should run the email-sequence poller:
- Web/API: `EMAIL_SEQUENCE_SCHEDULER_ENABLED=false`
- Worker:  `EMAIL_SEQUENCE_SCHEDULER_ENABLED=true`

SMTP fallback is disabled via `ALLOW_SMTP_FALLBACK=false`.

To verify setup:
- Apply SQL migration to the database (Supabase SQL editor or CI migration step)
- Confirm only worker has EMAIL_SEQUENCE_SCHEDULER_ENABLED=true
- Verify startup logs show:
  "[Scheduler] Email steps poller scheduled (every 5m)" on worker only
