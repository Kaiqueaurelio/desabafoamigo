<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Use `.validator()` for server-function input validation with the installed TanStack Start version; `.inputValidator()` is unavailable.
- Keep pending migration contracts in `src/lib/pending-database-types.ts`, preserving the authenticated client and normal runtime errors; never edit generated database types or infer deployment from these contracts.
