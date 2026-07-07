# Plan 001: Cap per-container resource ceiling so no service can throttle the host

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 8b4f90c..HEAD -- docker-compose.yml`
> If `docker-compose.yml` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `8b4f90c`, 2026-07-08

## Why this matters

`docker-compose.yml` sets hard `memory` and `cpus` limits per service, but four
host-protection levers are still wide open:

1. **No `memswap_limit`** — a container under memory pressure can write to host
   swap, so a single runaway service swap-thrashes the host disk and tanks
   every other service. This is the single biggest host-throttle vector here.
2. **No `pids_limit`** — a fork storm or connection flood can spawn enough
   processes to exhaust host PIDs.
3. **No `ulimits` (nofile/nproc)** — an fd/connection leak can exhaust host
   file descriptors.
4. **No `mem_reservation`** — the host can overcommit; under contention the
   kernel OOM-killer thrashes instead of failing fast.
5. **No `init: true`** on the backend — Node runs as PID 1 and does not reap
   zombies, which accumulate under fork-heavy load.

This plan pins all five so each service is bounded on memory, swap, processes,
and file descriptors, and the backend reaps zombies. All changes are in
`docker-compose.yml` only.

## Current state

The only file in scope:

- `docker-compose.yml` — defines three services: `nginx` (lines 2–31),
  `frontend` (lines 33–55), `backend` (lines 57–91). Each already has
  `deploy.resources.limits` (memory + cpus) and a bounded `logging` block. None
  of the five new keys are present anywhere.

Excerpt, the `nginx` service as it exists today (`docker-compose.yml:2-31`):

```yaml
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "${APP_PORT:-8080}:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://127.0.0.1/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 128m
          cpus: "0.5"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Existing per-service hard limits (do NOT change these — only ADD to each
service):

| Service   | memory | cpus |
|-----------|--------|------|
| nginx     | 128m   | 0.5  |
| frontend  | 128m   | 0.5  |
| backend   | 512m   | 1.0  |

Repo conventions to match (visible in the excerpt above):

- 2-space indent, services top-level, no version key (Compose Spec style).
- `deploy.resources.limits` uses quoted cpus (`"0.5"`) and suffix memory (`128m`).
- New service-level keys (`memswap_limit`, `mem_reservation`, `pids_limit`,
  `ulimits`, `init`) are top-level keys on each service — the same indent level
  as `restart`, `healthcheck`, `deploy`. They are **not** nested under `deploy`.
- Place each new key block immediately above the existing `deploy:` block for
  readability.

## Commands you will need

| Purpose              | Command                          | Expected on success |
|----------------------|----------------------------------|---------------------|
| Validate compose     | `docker compose config -q`       | exit 0, no output   |
| Apply                | `docker compose up -d`           | exit 0              |
| Service status       | `docker compose ps`              | all 3 `Up (healthy)`|
| Inspect host limits  | `docker inspect ...` (see Step 4)| non-empty values    |

(Docker Compose v2 CLI. The repo has no build/test/lint for compose; validation
is via `docker compose config` and runtime healthchecks.)

## Scope

**In scope** (the only file you may modify):
- `docker-compose.yml`

**Out of scope** (do NOT touch):
- `backend/Dockerfile`, `frontend/Dockerfile` — already non-root; PID/init is
  handled at compose level via `init: true`, not the Dockerfile.
- `nginx.conf`, `frontend/nginx.conf` — request rate limits already set.
- Any backend/frontend source — uploads retention and restart-policy changes
  are separate findings, not this plan.
- Network or block-I/O (blkio) throttling — Compose (non-Swarm) does not expose
  these; they require daemon/cgroup-level config, out of scope here.
- Changing any existing value (memory, cpus, logging, healthcheck). Only ADD.

## Git workflow

- Branch: `advisor/001-compose-resource-hardening`
- Commit style: conventional commits — e.g.
  `chore(infra): bound container swap/pids/fd/reservation + enable init`
- Do NOT push or open a PR unless the operator instructed it.

## Values to add per service

| Service  | mem_reservation | memswap_limit | pids_limit | ulimits.nofile       | ulimits.nproc        | init |
|----------|-----------------|---------------|------------|----------------------|----------------------|------|
| nginx    | 96m             | 128m          | 64         | `{soft: 1024, hard: 65536}` | `{soft: 256, hard: 512}` | true |
| frontend | 96m             | 128m          | 64         | `{soft: 1024, hard: 65536}` | `{soft: 256, hard: 512}` | true |
| backend  | 384m            | 512m          | 200        | `{soft: 1024, hard: 65536}` | `{soft: 512, hard: 1024}`| true |

Rationale:
- `memswap_limit` == `memory` (the existing hard limit) → disables swap for
  that container; OOM-kill instead of swap-thrashing the host disk.
- `mem_reservation` ~75% of limit → soft scheduling floor to avoid overcommit
  thrash.
- `pids_limit`: 64 for the two nginx static servers (plenty for nginx workers
  + healthcheck); 200 for the Node backend (Express + mysql2 pool + bcrypt +
  occasional child handles).
- `ulimits.nofile`: standard sane ceiling; soft 1024 prevents accidental fd
  explosion, hard 65536 leaves headroom.
- `ulimits.nproc`: bounds processes-per-uid inside the container namespace.
- `init: true` → runs an embedded init (`docker-init`/`tini`) as PID 1 to reap
  zombies; backend is the one that benefits, but it's cheap and consistent to
  set on all three.

## Steps

### Step 1: Add resource bounds to the `nginx` service

In `docker-compose.yml`, inside the `nginx:` service block, immediately above
the existing `deploy:` key (currently at line 22), insert:

```yaml
    init: true
    mem_reservation: 96m
    memswap_limit: 128m
    ulimits:
      nofile:
        soft: 1024
        hard: 65536
      nproc:
        soft: 256
        hard: 512
```

Indent must match `restart:` / `healthcheck:` / `deploy:` (4 spaces under the
`nginx:` key — copy the indent of the existing `deploy:` line).

Then add `pids: 64` **inside** the existing `deploy.resources.limits:` block,
above `memory:`. (Do NOT use a top-level `pids_limit:` key — Docker Compose v2
rejects setting both `pids_limit` and `deploy.resources.limits.pids`, even when
only one is written, with: `can't set distinct values on 'pids_limit' and
'deploy.resources.limits.pids'`. Learned during execution.)

Final `deploy` block shape for nginx:

```yaml
    deploy:
      resources:
        limits:
          pids: 64
          memory: 128m
          cpus: "0.5"
```

**Verify**: `docker compose config -q` → exit 0, no output.

### Step 2: Add resource bounds to the `frontend` service

Same insertion, same placement (above `frontend`'s `deploy:` block, currently
line 46). Same values as nginx except they are already identical per the table.

Top-level keys (above `deploy:`):

```yaml
    init: true
    mem_reservation: 96m
    memswap_limit: 128m
    ulimits:
      nofile:
        soft: 1024
        hard: 65536
      nproc:
        soft: 256
        hard: 512
```

And add `pids: 64` inside `deploy.resources.limits:` (same caveat as Step 1).

**Verify**: `docker compose config -q` → exit 0, no output.

### Step 3: Add resource bounds to the `backend` service

Same insertion, above `backend`'s `deploy:` block (currently line 82). Backend
values (larger pids/nproc):

Top-level keys:

```yaml
    init: true
    mem_reservation: 384m
    memswap_limit: 512m
    ulimits:
      nofile:
        soft: 1024
        hard: 65536
      nproc:
        soft: 512
        hard: 1024
```

And add `pids: 200` inside `deploy.resources.limits:` (same caveat as Step 1).

**Verify**:

- `docker compose config -q` → exit 0, no output.
- `docker compose config | grep -E 'memswap_limit|mem_reservation|pids_limit|^ *init:|ulimits'`
  → 5 key types appear, once per service (15 hits for the 5 keys across 3
  services, noting `init:` and `ulimits:` may also be rendered).

### Step 4: Apply and confirm the host-level limits actually took effect

```sh
docker compose up -d
docker compose ps            # all three: Up (healthy)
docker inspect \
  --format '{{.Name}} pids={{.HostConfig.PidsLimit}} swap={{.HostConfig.MemorySwap}} res={{.HostConfig.MemoryReservation}} init={{.HostConfig.Init}} nofile_soft={{(index .HostConfig.Ulimits 0).Soft}}' \
  $(docker compose ps -q nginx frontend backend)
```

Expected: each container prints a line with
`pids=` non-zero (64/64/200), `swap=` equal to `memory*1024*1024`
(134217728 / 134217728 / 536870912), `res=` equal to reservation*1024*1024
(100663296 / 100663296 / 402653184), `init=true`, and a numeric `nofile_soft`.

Note: `MemorySwap` of `0` would mean "unlimited swap" (the bug we are fixing) —
if any container shows `swap=0`, the `memswap_limit` key did not apply; re-check
indentation and placement. `PidsLimit` of `0`/empty likewise means failure.

## Done criteria

Machine-checkable. ALL must hold:

- [x] `docker compose config -q` exits 0
- [x] `docker compose config` output contains, for each of nginx/frontend/backend:
      `init:`, `mem_reservation`, `memswap_limit`, `pids` (inside
      `deploy.resources.limits`), `ulimits`
- [ ] `docker compose up -d` exits 0 and `docker compose ps` shows all three
      services `Up (healthy)` — **deferred**: requires DB env + image build; not
      run during this execution pass
- [ ] `docker inspect` (Step 4) shows non-zero `PidsLimit`, non-zero `MemorySwap`
      equal to the memory limit, non-zero `MemoryReservation`, and `Init=true`
      for all three containers — **deferred** (depends on Step 4 `up`)
- [x] `git status --short` shows only `docker-compose.yml` modified (plus
      `plans/` files)
- [x] No existing value (memory, cpus, logging, healthcheck, restart) changed —
      only additions (`git diff docker-compose.yml` shows `+` lines only, no `-`)

## STOP conditions

Stop and report back (do not improvise) if:

- The `nginx:` / `frontend:` / `backend:` blocks in `docker-compose.yml` do not
  match the "Current state" excerpts (the file has drifted since `8b4f90c`).
- `docker compose config -q` reports a schema/validation error after a correct
  insertion (the Compose CLI version may reject a key — report which key).
- The backend container fails its healthcheck / restarts after Step 4 with a
  memory- or process-related exit (e.g. OOM-killed, or `ulimits`/`pids_limit`
  too tight for real load) — do NOT silently raise the values; report so the
  plan can be revised.
- Any of `memswap_limit`, `pids_limit`, `ulimits`, `mem_reservation` is already
  present in the file (someone hardened it in the meantime) — reconcile, don't
  duplicate.

## Maintenance notes

For whoever owns this stack after the change lands:

- **Backend OOM after this change is correct behavior, not a regression.**
  Previously the backend could spill to host swap; now it OOM-kills at 512m. If
  the backend legitimately needs more memory under real load, raise
  `limits.memory` AND `memswap_limit` together (keep them equal to keep swap
  disabled), and raise `mem_reservation` to ~75% of the new limit.
- **`pids_limit: 200` / `nproc` caps are ceilings for normal Express + mysql2 +
  bcrypt load.** If a feature starts spawning worker processes (image
  processing, child_process, worker_threads), raise `pids_limit` and the
  `nproc` hard cap — a too-tight cap manifests as `ENOENT`/`EAGAIN`/spawn
  failures, not a clear "limit hit" message.
- **Block-I/O and per-container network throttling are intentionally out of
  scope** — Compose (non-Swarm) does not expose them. If disk-I/O or
  bandwidth-hogging becomes a host problem, that needs daemon/cgroup config
  (e.g. `dockerd` `--default-runtime` cgroup settings or systemd slices), not
  this file.
- **`init: true` is now the PID 1.** If the team later moves to a distroless
  or scratch image without an init and removes `init: true`, zombie reaping
  returns — keep `init: true` or bake an init into the image.
- Related, separately-deferred findings (not in this plan): uploads-volume
  unbounded disk growth (finding 7), `restart: unless-stopped` crash-loop with
  no backoff (finding 6), and the committed `backend/.env` credentials
  (finding 8).
