-- Integration test entry point. All assertions live in the SECURITY DEFINER
-- helper `public._test_mfa_rate_limit()` (see migration) so we can create an
-- ephemeral auth.users row. Returns 'OK' or raises with the failing state.
\set ON_ERROR_STOP on
SELECT public._test_mfa_rate_limit();
