# Security remediation

This document records repository-side hardening that can be prepared without access to the production database or the Lovable Security scan.

## Changes made

- Local `.env` was removed from the tracked branch. `.env` and other local environment files are now ignored; `.env.example` contains placeholders only.
- GitHub Actions receives the public Supabase URL and publishable key from repository secrets at build time instead of relying on a committed local environment file.
- The atomic queue migration qualifies the queue columns in `RETURNING` to avoid PL/pgSQL output-parameter ambiguity.
- Crisis escalation server functions now enforce volunteer/admin authorization, verify that the selected conversation exists and that the supplied user matches its participant, and restrict escalation review/acknowledgement/resolution to administrators.

## Seeded administrator credential

An older bootstrap migration contains a fixed password for the seeded `admin@desabafo.br` account. Treat that credential as compromised.

A forward migration, `20261114020000_rotate_seeded_admin_credential.sql`, replaces the password hash with an unknown random value without deleting the user or removing the admin role. **Do not apply it until an administrator can access the Supabase Dashboard and is ready to set a new unique password for this account.** After applying it, set the new password in Supabase Dashboard > Authentication > Users.

The old credential remains in Git history even though it is no longer needed by the current application code. Removing a secret from the current branch does not erase old commits. History rewriting should only be done as a coordinated repository-maintenance operation because it changes commit IDs and affects every existing clone.

## Deployment and verification limits

- These repository changes do not apply SQL to production.
- The queue function and administrator credential rotation must be verified/applied through the authorized Supabase migration process.
- The Supabase Security Advisor could not be read with the connected account's current permissions.
- The Lovable Security scan findings could not be loaded because the workspace had exhausted its credits.
- Do not mark the security scan as clean based on this repository review alone.
