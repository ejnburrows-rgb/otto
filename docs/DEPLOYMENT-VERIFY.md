# Production deployment verification

## Exact remote repository

`ejnburrows-rgb/otto`

https://github.com/ejnburrows-rgb/otto

## Intended production source

- Branch: `main`
- Public application: https://otto-kohl.vercel.app
- Static source marker: https://otto-kohl.vercel.app/version.json

The marker identifies the repository, intended branch, baseline commit, and the merged fail-closed security containment commit. A missing marker means the production alias is serving an older deployment or a different source.

## Security containment proof

Commit `d7492d15cd5c336156f87413eb6c3f2f5974dba0` disables sensitive public server routes until real server-side identity and authorization exist.

Verify status codes without printing response bodies or customer data:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://otto-kohl.vercel.app/api/data
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://otto-kohl.vercel.app/api/nvidia
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://otto-kohl.vercel.app/api/notify
```

Each must return `403`. Do not inspect or copy any old `200` response body; an old `200` means production has not deployed the containment commit.

## Data safety

- Do not delete the existing 13 live jobs during deployment verification.
- Do not treat network/auth/configuration failure as consent to seed demo records.
- Local/offline records must remain intact when cloud routes return `403`.
- Demo-data isolation remains tracked separately and is not proven by this marker.

## Platform-only gate

If `/version.json` is missing after `main` deploys, verify the Vercel project owns the production alias, uses repository `ejnburrows-rgb/otto`, uses production branch `main`, and uses the repository root. No source-code change can repair a dashboard link to the wrong repository or branch.
