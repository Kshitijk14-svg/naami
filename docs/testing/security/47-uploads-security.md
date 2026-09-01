# 47 — Upload Security

Two upload endpoints, both admin-only, both writing into `public/` where files are
served from **your own origin**. That last point is what makes file-type confusion
serious here: same-origin HTML can read the session cookie's page context.

Functional upload tests are in
[`../admin/29-uploads.md`](../admin/29-uploads.md) — this file is only the security
angle.

**Area prefix:** `TC-SEC-UP`

---

## The headline finding

⚠ **KNOWN** KI-005 — `src/app/api/admin/upload-video/route.ts:53`:

```js
const ext = path.extname(file.name) || ".mp4";
```

The extension comes from the **client-supplied filename**. There is no server-side
MIME or extension allowlist — only ffprobe's "can I decode this as video" check. A
file that satisfies ffprobe **and** is named `.html` is written to
`public/videos/moments/` and served from your origin.

- [ ] **TC-SEC-UP-001** `[LOCAL-ONLY]` — **A video can be stored with an arbitrary extension**
  - **Steps:**
    1. Take a small valid MP4
    2. Rename it `evil.html`
    3. Upload it via `/admin/design` → Shared Moments, or directly:
       ```bash
       curl -s -X POST "$BASE/api/admin/upload-video" \
         -H "cookie: naami_session=$SESSION_ADMIN" \
         -F 'file=@evil.html;type=video/mp4'
       ```
    4. Read the returned URL
  - **Expect:** it should be normalised to `.mp4`. **Known defect:** expect the URL
    to end `.html`.
  - **Then check how it is served:**
    ```bash
    curl -sI "$BASE/videos/moments/evil-XXXX.html" | grep -i content-type
    ```
  - **Record the `Content-Type`.** If it is `text/html`, the next case is live.

- [ ] **TC-SEC-UP-002** `[LOCAL-ONLY]` — **A polyglot file executes as HTML**
  - **Steps:**
    1. Build a polyglot — a valid MP4 with HTML appended so ffprobe still accepts it:
       ```bash
       cp small.mp4 poly.html
       printf '\n<script>console.log("ZZTEST-XSS")</script>\n' >> poly.html
       ```
    2. Upload it 3. Open the resulting URL in a browser with the Console open
  - **Expect:** the browser should download or refuse it. **If the script runs, this
    is stored XSS on your own origin — S1.**
  - **Mitigating factor:** it requires admin access first. Record that in the report
    — it turns an admin compromise into a persistent foothold rather than being
    directly exploitable.
  - **Cleanup:** delete the uploaded file from disk.

- [ ] **TC-SEC-UP-003** `[LOCAL-ONLY]` — `nosniff` limits the damage
  - **Steps:** check whether `X-Content-Type-Options: nosniff` is served on
    `/videos/` paths
  - **Expect:** if the `Content-Type` is `video/mp4` and `nosniff` is present, the
    browser will not treat it as HTML even with an `.html` extension. **Verify which
    of these is true** — it determines whether TC-SEC-UP-002 is exploitable or
    merely untidy.

- [ ] **TC-SEC-UP-004** `[LOCAL-ONLY]` — Other dangerous extensions
  - **Steps:** repeat with `.svg`, `.js`, `.xhtml`, `.htm`
  - **Expect:** record which are accepted and what `Content-Type` each is served
    with.

---

## Images

- [ ] **TC-SEC-UP-008** `[PROD-DATA]` — Images are always re-encoded to WebP
  - **Steps:** upload a JPEG and read the resulting URL
  - **Expect:** `.webp`. **Re-encoding through sharp destroys any embedded
    payload**, which is why the image path is much safer than the video path.
- [ ] **TC-SEC-UP-009** `[LOCAL-ONLY]` — An image polyglot is neutralised
  - **Steps:** 1. Append `<script>alert(1)</script>` to a valid JPEG 2. Upload
    3. Download the stored WebP and search it for the string
  - **Expect:** the payload is gone — the file was decoded and re-encoded.
- [ ] **TC-SEC-UP-010** `[LOCAL-ONLY]` — **An SVG upload is handled safely**
  - **Steps:** 1. Create an SVG containing `<script>alert('ZZTEST')</script>`
    2. Upload it 3. Read the returned URL and open it
  - **Expect:** it should be rasterised to WebP. **If it is stored as `.svg` and
    served as `image/svg+xml`, the script executes on your origin — S1.**
  - **This is the most important image case.** Record the outcome precisely.
- [ ] **TC-SEC-UP-011** `[LOCAL-ONLY]` — An image bomb is rejected or survivable
  - **Steps:** upload a small, highly compressed file that decompresses enormously
    (a "decompression bomb")
  - **Expect:** sharp rejects it or the 15 MB input cap prevents it. Record memory
    behaviour — a server OOM would be **S2**.
- [ ] **TC-SEC-UP-012** `[LOCAL-ONLY]` — EXIF data is stripped
  - **Steps:** 1. Upload a photo with GPS EXIF 2. Download the stored WebP and read
    its metadata
  - **Expect:** no GPS. **If location data survives into a public product image,
    that is a privacy issue — S3.**

---

## Path traversal

- [ ] **TC-SEC-UP-016** `[LOCAL-ONLY]` — A traversal filename cannot escape the directory
  ```bash
  curl -s -X POST "$BASE/api/admin/upload" \
    -H "cookie: naami_session=$SESSION_ADMIN" \
    -F 'file=@test.jpg;filename=../../../evil.jpg' -F 'type=product'
  ```
  **Expect:** the returned URL stays under `/images/products/` with a slugified
  name. **A file written outside that directory is S1.**
- [ ] **TC-SEC-UP-017** `[LOCAL-ONLY]` — Encoded traversal is also handled
  - **Steps:** filenames `..%2f..%2fevil.jpg` and `....//....//evil.jpg`
- [ ] **TC-SEC-UP-018** `[LOCAL-ONLY]` — A traversal `type` cannot redirect the destination
  ```bash
  curl -s -X POST "$BASE/api/admin/upload" \
    -H "cookie: naami_session=$SESSION_ADMIN" \
    -F 'file=@test.jpg' -F 'type=../../../etc'
  ```
  **Expect:** silently falls back to `product`, so the file lands in
  `/images/products/`. The allowlist on `type` is what prevents directory
  injection — confirm it holds.
- [ ] **TC-SEC-UP-019** `[LOCAL-ONLY]` — **Image deletion cannot be redirected**
  - **Steps:** 1. Edit a product via the API, setting an image URL to
    `/images/products/../../../.env` 2. Then remove that image and save, which
    triggers the unlink path
  - **Expect:** the file is **not** deleted — the path is normalised and re-checked
    against the products directory. **Deleting a file outside that directory is S1.**
  - **Verify `.env.production` still exists afterwards.**
- [ ] **TC-SEC-UP-020** `[LOCAL-ONLY]` — Absolute paths are rejected
  - **Steps:** set an image URL to `/etc/passwd` and trigger removal

---

## Access control

- [ ] **TC-SEC-UP-024** `[PROD-SAFE]` — Uploads require admin
  ```bash
  for s in "$SESSION_CUSTOMER" "$SESSION_STAFF"; do
    curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/admin/upload" \
      -H "cookie: naami_session=$s" -F 'file=@test.jpg'
  done
  ```
  **Expect:** **403** for both.
- [ ] **TC-SEC-UP-025** `[PROD-SAFE]` — Unauthenticated uploads return 401
- [ ] **TC-SEC-UP-026** `[PROD-SAFE]` — The same for `upload-video`

---

## Resource exhaustion

- [ ] **TC-SEC-UP-030** `[LOCAL-ONLY]` — The size cap is enforced before processing
  - **Steps:** upload a 20 MB image
  - **Expect:** **413** quickly, without a long processing delay.
- [ ] **TC-SEC-UP-031** `[LOCAL-ONLY]` — A lying `Content-Length` does not bypass the cap
  - **Steps:** send a chunked upload larger than 15 MB
  - **Expect:** still rejected. Note the check reads `file.size` before the body is
    buffered — but the body **is** fully buffered into memory afterwards, so record
    peak memory during a large upload.
- [ ] **TC-SEC-UP-032** `[LOCAL-ONLY]` — Concurrent large uploads do not exhaust memory
  - **Steps:** fire five 14 MB uploads simultaneously and watch server memory
  - **Expect:** the process survives. On a 4 GB box with a 700 MB PM2 restart
    threshold, record whether any worker restarts.
- [ ] **TC-SEC-UP-033** `[LOCAL-ONLY]` — A long video does not hang the server
  - **Steps:** upload a 60 MB, 119-second video
  - **Expect:** ffprobe and ffmpeg complete without blocking other requests. Time it.
- [ ] **TC-SEC-UP-034** `[LOCAL-ONLY]` — Nginx's body cap is above the app's
  - **Expect:** `client_max_body_size 65M` — comfortably above the 60 MB video
    limit, so the app returns its own clear 413 rather than nginx returning an
    opaque one.

---

## Stored file exposure

- [ ] **TC-SEC-UP-038** `[PROD-SAFE]` — Uploaded files are publicly readable
  - **Expect:** they are, by design — product images must be. Confirm nothing
    sensitive is ever uploaded through these endpoints.
- [ ] **TC-SEC-UP-039** `[PROD-SAFE]` — Filenames are not guessable
  - **Steps:** compare several uploaded URLs
  - **Expect:** each carries a random suffix, so an unreleased product's image
    cannot be found by guessing its name. **Sequential or predictable names would be
    S3** — unpublished product imagery would leak.
- [ ] **TC-SEC-UP-040** `[PROD-DATA]` — An unpublished product's image is still fetchable by URL
  - **Steps:** 1. Upload an image to an unpublished product 2. Request the URL
    directly
  - **Expect:** it loads — file serving has no publication check. Combined with
    unguessable names this is acceptable; record it as a known characteristic.
- [ ] **TC-SEC-UP-041** `[PROD-SAFE]` — Directory listing is off for upload directories
  - **Steps:** request `/images/products/`, `/videos/moments/`
  - **Expect:** 403 or 404, never an index. **A listing here would expose every
    unpublished product image — S2.**
