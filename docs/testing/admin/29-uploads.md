# 29 — Uploads & Media

`POST /api/admin/upload` (images) and `POST /api/admin/upload-video`

Both are admin-only. Boundary values matter here — test just under and just over
every limit.

| Limit | Value |
|---|---|
| Image input size | **15 MB** |
| Image output target | 400–800 KB WebP |
| Image max dimension | 1920 px (long edge) |
| Thumbnail | 480 px wide, quality 60 |
| Video input size | **60 MB** |
| Video duration | **120 s** |

Security cases for uploads are in
[`../security/47-uploads-security.md`](../security/47-uploads-security.md).

**Area prefix:** `TC-ADM-UPL`

---

## Images — happy path

- [ ] **TC-ADM-UPL-001** `[PROD-DATA]` — A normal JPEG uploads
  - **Expect:** a preview thumbnail, a green "Uploaded — NKB (thumbnail NKB)" and a
    read-only URL.
- [ ] **TC-ADM-UPL-002** `[PROD-DATA]` — A PNG uploads
- [ ] **TC-ADM-UPL-003** `[PROD-DATA]` — A WebP uploads
- [ ] **TC-ADM-UPL-004** `[PROD-DATA]` — Everything is converted to WebP
  - **Steps:** 1. Upload a JPEG 2. Read the resulting URL
  - **Expect:** it ends `.webp`.
- [ ] **TC-ADM-UPL-005** `[PROD-DATA]` — The output lands between 400 and 800 KB
  - **Steps:** 1. Upload a large photo 2. Read the reported size
  - **Expect:** in range. A very simple image may fall below 400 KB — that is
    acceptable, note it.
- [ ] **TC-ADM-UPL-006** `[PROD-DATA]` — A large image is resized to 1920 px
  - **Steps:** 1. Upload a 4000×3000 image 2. Open the resulting URL and check
    dimensions
  - **Expect:** the long edge is 1920, aspect preserved.
- [ ] **TC-ADM-UPL-007** `[PROD-DATA]` — A small image is **not** upscaled
  - **Steps:** 1. Upload a 400×300 image
  - **Expect:** it stays 400×300.
- [ ] **TC-ADM-UPL-008** `[PROD-DATA]` — A thumbnail is generated at 480 px wide
- [ ] **TC-ADM-UPL-009** `[PROD-DATA]` — The status shows "Compressing & uploading..." during
- [ ] **TC-ADM-UPL-010** `[PROD-DATA]` — The help text states the limit
  - **Expect:** "Max 15MB in; auto-converted to WebP at up to 1920px."

## Images — boundaries and rejections

- [ ] **TC-ADM-UPL-014** `[PROD-DATA]` — A 14 MB image is accepted
- [ ] **TC-ADM-UPL-015** `[PROD-DATA]` — A 16 MB image is rejected
  - **Expect:** **413** and "File exceeds the 15MB upload limit"
- [ ] **TC-ADM-UPL-016** `[PROD-DATA]` — A renamed non-image is rejected
  - **Steps:** 1. Rename a `.txt` to `.jpg` 2. Upload
  - **Expect:** **400** "File is not a valid image"
- [ ] **TC-ADM-UPL-017** `[PROD-DATA]` — A zero-byte file is rejected
- [ ] **TC-ADM-UPL-018** `[PROD-DATA]` — A corrupt image is rejected
  - **Steps:** 1. Truncate a JPEG to half its bytes 2. Upload
- [ ] **TC-ADM-UPL-019** `[PROD-DATA]` — An animated GIF is handled
  - **Expect:** record whether it is accepted and, if so, whether animation
    survives the WebP conversion. Likely a still frame — worth logging.
- [ ] **TC-ADM-UPL-020** `[PROD-DATA]` — An SVG is handled
  - **Expect:** record the outcome. If accepted and stored **as SVG**, flag it — SVG
    can carry script. If rasterised to WebP, that is safe.
- [ ] **TC-ADM-UPL-021** `[PROD-DATA]` — Errors render in red under the field
- [ ] **TC-ADM-UPL-022** `[PROD-DATA]` — A failure leaves the previous image intact

## Images — destination and naming

- [ ] **TC-ADM-UPL-026** `[PROD-DATA]` — Each upload type lands in the right directory
  - **Steps:** upload one image from each context and read the URL
  - **Expect:** product → `/images/products/`, collection → `/images/collections/`,
    look card → `/images/lookcards/`, hero/banner → `/images/banners/`,
    blog → `/images/blogs/`, section background → `/images/sections/`.
- [ ] **TC-ADM-UPL-027** `[PROD-DATA]` — Filenames are slugified with a random suffix
  - **Steps:** 1. Upload `My Photo (Final).jpg`
  - **Expect:** something like `my-photo-final-a1b2c3d4.webp`.
- [ ] **TC-ADM-UPL-028** `[PROD-DATA]` — Two files with the same name do not collide
  - **Steps:** 1. Upload the same filename twice 2. Compare URLs
  - **Expect:** different URLs, both images intact.
- [ ] **TC-ADM-UPL-029** `[PROD-DATA]` — A very long filename is truncated
- [ ] **TC-ADM-UPL-030** `[PROD-DATA]` — Non-ASCII filenames are handled
  - **Steps:** upload `照片.jpg` and `café.jpg`
  - **Expect:** a usable slug, no error.

---

## Video — happy path

- [ ] **TC-ADM-UPL-034** `[PROD-DATA]` — A short MP4 uploads
  - **Expect:** a preview player, "Uploaded — NMB, Ns", and a URL.
- [ ] **TC-ADM-UPL-035** `[PROD-DATA]` — A WebM uploads
- [ ] **TC-ADM-UPL-036** `[PROD-DATA]` — A MOV uploads
- [ ] **TC-ADM-UPL-037** `[PROD-DATA]` — A thumbnail is generated automatically
  - **Expect:** a still from near the start of the clip.
- [ ] **TC-ADM-UPL-038** `[PROD-DATA]` — The video is **not** transcoded
  - **Steps:** 1. Note the source file size 2. Compare with the reported size
  - **Expect:** roughly identical — the file is stored unmodified. Only the
    thumbnail is processed.
- [ ] **TC-ADM-UPL-039** `[PROD-DATA]` — The help text states the limits
  - **Expect:** "Max 60MB, up to 2 minutes. A thumbnail is generated automatically."
- [ ] **TC-ADM-UPL-040** `[PROD-DATA]` — The status shows "Validating & uploading..."

## Video — boundaries and rejections

- [ ] **TC-ADM-UPL-044** `[PROD-DATA]` — A 55 MB video is accepted
- [ ] **TC-ADM-UPL-045** `[PROD-DATA]` — A 61 MB video is rejected
  - **Expect:** **413** "File exceeds the 60MB upload limit"
- [ ] **TC-ADM-UPL-046** `[PROD-DATA]` — A 115-second video is accepted
- [ ] **TC-ADM-UPL-047** `[PROD-DATA]` — A 125-second video is rejected
  - **Expect:** **400** "Video exceeds the 120s limit"
- [ ] **TC-ADM-UPL-048** `[PROD-DATA]` — An audio-only file is rejected
  - **Steps:** upload an MP3 renamed to `.mp4`
  - **Expect:** **400** "File does not contain a video stream"
- [ ] **TC-ADM-UPL-049** `[PROD-DATA]` — A non-video file is rejected
  - **Expect:** **400** "File is not a valid video"
- [ ] **TC-ADM-UPL-050** `[PROD-DATA]` — A corrupt video is rejected
- [ ] **TC-ADM-UPL-051** `[PROD-DATA]` — The picker filters to mp4/webm/quicktime
  - **Steps:** 1. Open the file picker 2. Try to select an `.mkv`
  - **Expect:** it is not offered by default. Note that "All files" can override
    this — the server has **no extension allowlist**, so an `.mkv` ffprobe accepts
    will be stored. See `security/47-uploads-security.md`.

## Video — storage

- [ ] **TC-ADM-UPL-055** `[PROD-DATA]` — Videos land in `/videos/moments/`
- [ ] **TC-ADM-UPL-056** `[PROD-DATA]` — Thumbnails land in `/images/moments/`
- [ ] **TC-ADM-UPL-057** `[PROD-DATA]` — The uploaded video plays on the homepage
  - **Steps:** 1. Upload, caption and save 2. Load `/` 3. Play it in the carousel

---

## General

- [ ] **TC-ADM-UPL-061** `[PROD-DATA]` — Uploading is disabled while in progress
- [ ] **TC-ADM-UPL-062** `[LOCAL-ONLY]` — A network failure shows "Upload failed"
- [ ] **TC-ADM-UPL-063** `[PROD-DATA]` — Uploads work on mobile
  - **Steps:** upload from a phone's photo library and camera
- [ ] **TC-ADM-UPL-064** `[PROD-DATA]` — A slow upload shows progress and does not time out
  - **Steps:** 1. Throttle to Slow 3G 2. Upload a 10 MB image
- [ ] **TC-ADM-UPL-065** `[PROD-DATA]` — Staff cannot upload
  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/admin/upload" \
    -H "cookie: naami_session=$SESSION_STAFF" -F 'file=@test.jpg'
  ```
  **Expect:** **403**.
- [ ] **TC-ADM-UPL-066** `[LOCAL-ONLY]` — Missing file returns a clear error
  ```bash
  curl -s -X POST "$BASE/api/admin/upload" \
    -H "cookie: naami_session=$SESSION_ADMIN" -F 'type=product'
  ```
  **Expect:** **400** `{"error":"No file provided"}`
- [ ] **TC-ADM-UPL-067** `[LOCAL-ONLY]` — An unknown `type` silently defaults to product
  - **Steps:** send `-F 'type=banana'` with a valid file
  - **Expect:** **200**, and the URL is under `/images/products/`. No error is
    raised — record as S4 (it is also what prevents directory injection).
- [ ] **TC-ADM-UPL-068** `[PROD-DATA]` — Uploaded images are served correctly
  - **Steps:** 1. Open an uploaded URL directly 2. Check the response headers
  - **Expect:** `Content-Type: image/webp` and the image renders.
