# RI Validation App — Snowflake Photo Evidence Build Plan

## Purpose

Implement Snowflake stage-based storage for validation evidence photos in the RI Validation Platform API.

The app does **not** need to retrieve or display photos after submission. The requirement is evidence traceability:

```text
Store / Visit Date / Session / Alert / Validation Result / Photo
```

When analysing validations in Snowflake or Claude, a user should be able to query a store, visit date, session, or alert and see the photo evidence mapped to that validation.

---

## Current files referenced

The current API files provided are:

- `main.py` — FastAPI app setup, CORS middleware, `/health`, and sessions router registration.
- `result.py` — `ValidationResult` model. Currently includes `photo_refs: List[str] = []`.
- `session.py` — session/store visit models with `client_id`, `store_id`, `store_name`, `visit_date`, `alert_type`, `session_id`, status, and counts.
- `alert.py` — alert model with `alert_id`, `session_id`, store and product metadata, category, subcategory, alert type, rank, and alert date.

---

# Build Plan for Codex

## Phase 1 — Confirm current repository structure

Codex should inspect the repository and identify:

1. Where the uploaded model files live in the actual project structure.
2. Where the sessions router is implemented.
3. Where Snowflake connection/session logic already exists.
4. How validation results are currently inserted into Snowflake.
5. Whether there is already a submit-session or submit-visit endpoint.
6. Whether Supabase upload logic currently exists and where it is implemented.

Do not start by rewriting the app. First map the current flow.

Expected output from this phase:

```text
- Existing submit endpoint identified
- Existing Snowflake connection utility identified
- Existing validation insert function identified
- Existing Supabase photo upload function identified, if present
```

---

## Phase 2 — Add Snowflake migration SQL

Create a migration or SQL file for the new Snowflake objects.

Suggested file:

```text
sql/validation_photo_evidence.sql
```

### 2.1 Create Snowflake stage

```sql
CREATE STAGE IF NOT EXISTS VALIDATION_APP.VALIDATION_PHOTOS_STAGE
    DIRECTORY = (ENABLE = TRUE);
```

Adjust `VALIDATION_APP` if the real database/schema is different.

### 2.2 Create `PHOTO_EVIDENCE` table

```sql
CREATE TABLE IF NOT EXISTS VALIDATION_APP.PHOTO_EVIDENCE (
    photo_id VARCHAR NOT NULL,
    result_id VARCHAR,
    session_id VARCHAR NOT NULL,
    alert_id VARCHAR NOT NULL,

    client_id VARCHAR NOT NULL,
    store_id VARCHAR NOT NULL,
    store_name VARCHAR,
    visit_date DATE NOT NULL,

    local_photo_id VARCHAR,
    stage_name VARCHAR NOT NULL,
    stage_path VARCHAR NOT NULL,
    file_name VARCHAR,
    file_extension VARCHAR,
    content_type VARCHAR,
    file_size_bytes NUMBER,

    photo_status VARCHAR DEFAULT 'UPLOADED',
    uploaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    uploaded_by VARCHAR,

    PRIMARY KEY (photo_id)
);
```

### 2.3 Create analysis view

If `VALIDATION_RESULTS` has enough context directly:

```sql
CREATE OR REPLACE VIEW VALIDATION_APP.VW_ALERT_VALIDATION_EVIDENCE AS
SELECT
    r.session_id,
    r.result_id,
    r.alert_id,
    r.validated_at,
    r.validated_by,
    r.gap_on_shelf,
    r.other_issue,
    r.os_count,
    r.boh_count,
    r.total_count,
    r.delta,
    r.comment,
    r.sync_status,

    p.photo_id,
    p.client_id,
    p.store_id,
    p.store_name,
    p.visit_date,
    p.stage_name,
    p.stage_path,
    p.file_name,
    p.content_type,
    p.file_size_bytes,
    p.photo_status,
    p.uploaded_at,
    p.uploaded_by
FROM VALIDATION_APP.VALIDATION_RESULTS r
LEFT JOIN VALIDATION_APP.PHOTO_EVIDENCE p
    ON r.result_id = p.result_id;
```

If session/store/date context lives only in the sessions table, use:

```sql
CREATE OR REPLACE VIEW VALIDATION_APP.VW_ALERT_VALIDATION_EVIDENCE AS
SELECT
    s.client_id,
    s.store_id,
    s.store_name,
    s.visit_date,
    s.alert_type,

    r.session_id,
    r.result_id,
    r.alert_id,
    r.validated_at,
    r.validated_by,
    r.gap_on_shelf,
    r.other_issue,
    r.os_count,
    r.boh_count,
    r.total_count,
    r.delta,
    r.comment,
    r.sync_status,

    p.photo_id,
    p.stage_name,
    p.stage_path,
    p.file_name,
    p.content_type,
    p.file_size_bytes,
    p.photo_status,
    p.uploaded_at,
    p.uploaded_by
FROM VALIDATION_APP.VALIDATION_RESULTS r
LEFT JOIN VALIDATION_APP.SESSIONS s
    ON r.session_id = s.session_id
LEFT JOIN VALIDATION_APP.PHOTO_EVIDENCE p
    ON r.result_id = p.result_id;
```

Codex should adapt table/schema names to the actual repo and Snowflake environment.

---

## Phase 3 — Add environment configuration

Add these environment variables to the app configuration:

```env
SNOWFLAKE_PHOTO_STAGE=VALIDATION_APP.VALIDATION_PHOTOS_STAGE
MAX_PHOTO_SIZE_MB=10
PHOTO_ALLOWED_TYPES=image/jpeg,image/png,image/heic,image/webp
```

Use the existing Snowflake configuration already present in Railway:

```text
SNOWFLAKE_ACCOUNT
SNOWFLAKE_DATABASE
SNOWFLAKE_PRIVATE_KEY
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE
SNOWFLAKE_ROLE
SNOWFLAKE_WAREHOUSE
SNOWFLAKE_SCHEMA
```

Codex should not hard-code Snowflake credentials.

---

## Phase 4 — Update Pydantic models

### 4.1 Update `ValidationResult`

Current issue:

```python
photo_refs: List[str] = []
```

This is too weak because it does not explicitly map photos to uploaded files.

Replace or extend it with a structured model.

Recommended:

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class PhotoRef(BaseModel):
    local_photo_id: str
    file_name: Optional[str] = None
    content_type: Optional[str] = None


class ValidationResult(BaseModel):
    result_id: Optional[UUID] = None
    alert_id: str
    session_id: UUID
    validated_at: Optional[datetime] = None
    validated_by: str
    gap_on_shelf: Optional[bool] = None
    other_issue: Optional[bool] = None
    os_count: Optional[float] = None
    boh_count: Optional[float] = None
    total_count: Optional[float] = None
    delta: Optional[float] = None
    comment: Optional[str] = None
    photo_refs: List[PhotoRef] = []
    sync_status: str = "pending"
```

If backwards compatibility is needed, support both string refs and structured refs temporarily. Preferred v1 is a clean structured contract if frontend and backend are deployed together.

### 4.2 Add `PhotoEvidence` model

Create a new model file, for example:

```text
models/photo.py
```

```python
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID


class PhotoEvidence(BaseModel):
    photo_id: str
    result_id: Optional[UUID] = None
    session_id: UUID
    alert_id: str

    client_id: str
    store_id: str
    store_name: Optional[str] = None
    visit_date: date

    local_photo_id: Optional[str] = None
    stage_name: str
    stage_path: str
    file_name: Optional[str] = None
    file_extension: Optional[str] = None
    content_type: Optional[str] = None
    file_size_bytes: Optional[int] = None

    photo_status: str = "UPLOADED"
    uploaded_at: Optional[datetime] = None
    uploaded_by: Optional[str] = None
```

---

## Phase 5 — Define frontend/backend submission contract

The endpoint should accept `multipart/form-data`.

The frontend sends:

1. `metadata` — JSON string containing session details and validation results.
2. Image files — one uploaded file per `local_photo_id`.

Example metadata:

```json
{
  "session_id": "0d79c6f2-6e31-4a6e-b229-b15a4e5fd874",
  "client_id": "COOP",
  "store_id": "0482",
  "store_name": "Example Store",
  "visit_date": "2026-07-07",
  "submitted_by": "dave.byrne@live.co.uk",
  "results": [
    {
      "result_id": "0ac4b50e-2169-45e6-9e92-0bf43cd167c2",
      "alert_id": "123",
      "session_id": "0d79c6f2-6e31-4a6e-b229-b15a4e5fd874",
      "validated_by": "dave.byrne@live.co.uk",
      "gap_on_shelf": true,
      "other_issue": false,
      "os_count": 0,
      "boh_count": 4,
      "total_count": 4,
      "delta": -4,
      "comment": "Product not on shelf. Backroom count found.",
      "photo_refs": [
        {
          "local_photo_id": "photo_alert_123_001",
          "file_name": "alert_123_001.jpg",
          "content_type": "image/jpeg"
        }
      ]
    }
  ]
}
```

The matching file field must use the same `local_photo_id`:

```text
photo_alert_123_001 = <binary image file>
```

The backend must not infer alert ownership from filenames. The metadata is the source of truth.

---

## Phase 6 — Add photo storage service

Create:

```text
services/photo_storage.py
```

Required functions:

```text
safe_path_part(value: str) -> str
get_file_extension(file_name: str, content_type: str) -> str
build_photo_stage_path(...)
validate_photo(...)
save_upload_to_temp_file(...)
upload_file_to_snowflake_stage(...)
insert_photo_evidence(...)
```

### 6.1 Path sanitisation

```python
import re


def safe_path_part(value: str) -> str:
    value = str(value or "").strip()
    value = re.sub(r"[^A-Za-z0-9_\-\.=]", "_", value)
    return value[:120]
```

### 6.2 Stage path convention

Use:

```text
{client_id}/{store_id}/{visit_date}/{session_id}/{alert_id}/{photo_id}.{extension}
```

Full Snowflake reference example:

```text
@VALIDATION_PHOTOS_STAGE/COOP/0482/2026-07-07/0d79c6f2-6e31-4a6e-b229-b15a4e5fd874/123/4b7f9c.jpg
```

### 6.3 File validation

Validate:

```text
- file is present
- file is not empty
- content type is allowed
- file size <= MAX_PHOTO_SIZE_MB
```

Allowed content types by default:

```text
image/jpeg
image/png
image/heic
image/webp
```

### 6.4 Snowflake PUT

Use the repository’s existing Snowflake connection/session utility.

Snowflake upload shape:

```python
import os
import tempfile
from pathlib import Path


def upload_file_to_snowflake_stage(conn, upload_file, stage_path: str) -> dict:
    suffix = Path(upload_file.filename or "").suffix or ".jpg"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        content = upload_file.file.read()
        tmp.write(content)

    try:
        cursor = conn.cursor()
        put_sql = f"PUT file://{tmp_path} @{stage_path} AUTO_COMPRESS=FALSE OVERWRITE=TRUE"
        cursor.execute(put_sql)
        return {"status": "UPLOADED"}
    finally:
        try:
            os.remove(tmp_path)
        except FileNotFoundError:
            pass
```

Codex must adapt the SQL execution style to the existing codebase.

Important: do not put raw user-entered values directly in `stage_path`. Use `safe_path_part`.

---

## Phase 7 — Update submit endpoint

Codex should find the current submit-session / submit-visit endpoint and update it. If no endpoint exists, add one.

Suggested route:

```text
POST /api/sessions/{session_id}/submit
```

Expected handler behaviour:

```text
1. Accept multipart/form-data:
   - metadata: str
   - files: list[UploadFile]
2. Parse metadata as JSON.
3. Validate metadata against a Pydantic submit model.
4. Build file_map using local_photo_id / form field name.
5. For each validation result:
   - upsert/insert validation result
   - for each photo_ref:
       - find matching uploaded file
       - validate file
       - generate photo_id
       - build stage path
       - upload to Snowflake stage
       - insert PHOTO_EVIDENCE row
6. Mark session as submitted only after all validation/photo processing succeeds.
7. Return submit summary.
```

Success response:

```json
{
  "status": "submitted",
  "session_id": "0d79c6f2-6e31-4a6e-b229-b15a4e5fd874",
  "result_count": 1,
  "photo_count": 1,
  "photos": [
    {
      "photo_id": "4b7f9c",
      "alert_id": "123",
      "result_id": "0ac4b50e-2169-45e6-9e92-0bf43cd167c2",
      "stage_path": "@VALIDATION_PHOTOS_STAGE/COOP/0482/2026-07-07/0d79c6f2-6e31-4a6e-b229-b15a4e5fd874/123/4b7f9c.jpg"
    }
  ]
}
```

---

## Phase 8 — Error handling

Use all-or-nothing behaviour for v1.

If any required photo upload fails:

```text
- Do not mark the session as submitted.
- Return a non-2xx response.
- Include a clear error message.
- Log session_id, alert_id, local_photo_id, and error details.
```

Reject the request with `400` if:

```text
- metadata is invalid JSON
- metadata does not match schema
- photo_ref has no matching file
- duplicate local_photo_id appears in metadata
- unsupported file type
- file is too large
```

Return `500` if:

```text
- Snowflake PUT fails
- PHOTO_EVIDENCE insert fails
```

Do not silently submit the visit with missing evidence.

---

## Phase 9 — Remove or bypass Supabase writes

Find any existing Supabase photo upload logic.

Change behaviour so:

```text
- New photo evidence is written to Snowflake stage.
- New photo metadata is written to PHOTO_EVIDENCE.
- The app no longer writes new validation photos to Supabase.
```

Do not delete historical Supabase code unless it is clearly unused. It may be needed to read or migrate old records later.

---

## Phase 10 — Add tests

### 10.1 Unit tests

Add tests for:

```text
safe_path_part sanitises unsafe strings
build_photo_stage_path creates expected path
file extension detection works for jpg/png/heic/webp
photo validation rejects unsupported content types
photo validation rejects oversized files
payload validation rejects missing local_photo_id file
payload validation rejects duplicate local_photo_id
```

### 10.2 Mocked integration tests

Mock Snowflake and assert:

```text
PUT is called with the expected stage path
PHOTO_EVIDENCE insert is called after PUT success
PHOTO_EVIDENCE insert is not called if PUT fails
session is not marked submitted if PUT fails
```

### 10.3 Contract test

Given:

```text
session_id=S1
client_id=COOP
store_id=0482
visit_date=2026-07-07
alert_id=123
local_photo_id=photo_alert_123_001
```

And uploaded file:

```text
photo_alert_123_001
```

Then inserted `PHOTO_EVIDENCE` must contain:

```text
session_id=S1
client_id=COOP
store_id=0482
visit_date=2026-07-07
alert_id=123
local_photo_id=photo_alert_123_001
stage_path contains /COOP/0482/2026-07-07/S1/123/
```

---

## Phase 11 — Manual verification queries

After deployment, these queries must work.

### 11.1 Find photos for a store visit

```sql
SELECT
    client_id,
    store_id,
    store_name,
    visit_date,
    session_id,
    alert_id,
    result_id,
    photo_id,
    stage_path,
    uploaded_at
FROM VALIDATION_APP.PHOTO_EVIDENCE
WHERE store_id = '0482'
  AND visit_date = '2026-07-07';
```

### 11.2 Find evidence for one alert

```sql
SELECT
    *
FROM VALIDATION_APP.VW_ALERT_VALIDATION_EVIDENCE
WHERE store_id = '0482'
  AND visit_date = '2026-07-07'
  AND alert_id = '123';
```

### 11.3 Count photos per submitted session

```sql
SELECT
    session_id,
    COUNT(*) AS photo_count
FROM VALIDATION_APP.PHOTO_EVIDENCE
GROUP BY session_id;
```

### 11.4 List files in the stage path

```sql
LIST @VALIDATION_APP.VALIDATION_PHOTOS_STAGE/COOP/0482/2026-07-07;
```

---

# Acceptance Criteria

The implementation is complete when:

1. The API accepts a visit/session submission with validation results and photo files.
2. Each photo is explicitly mapped to an alert via `local_photo_id`.
3. Each photo is uploaded to the configured Snowflake internal stage.
4. One `PHOTO_EVIDENCE` row is inserted per photo.
5. `PHOTO_EVIDENCE` contains:
   - `photo_id`
   - `result_id`
   - `session_id`
   - `alert_id`
   - `client_id`
   - `store_id`
   - `visit_date`
   - `stage_path`
6. Session submission fails clearly if a referenced photo file is missing.
7. Session submission fails clearly if Snowflake stage upload fails.
8. The app no longer writes new photos to Supabase.
9. Existing validation/session behaviour is preserved except for photo storage.
10. `VW_ALERT_VALIDATION_EVIDENCE` supports querying by store/date/alert for Claude analysis.

---

# Direct Codex Prompt

Use this prompt in Codex after adding this file to the repository.

```text
Read docs/snowflake_photo_evidence_build_plan.md and implement the build sequentially.

Important constraints:
- Do not build app-facing photo retrieval. The app does not need to display photos after submission.
- Preserve the existing FastAPI app structure.
- Reuse the existing Snowflake connection/session utility.
- Replace new Supabase photo writes with Snowflake stage uploads.
- Keep evidence traceability at ValidationResult → PhotoEvidence level.
- Do not store a single generic photo path on the session.
- Do not infer alert ownership from filenames. Use metadata.photo_refs[].local_photo_id as the mapping source.
- Add tests for path creation, payload validation, missing files, and mocked Snowflake upload/insert behaviour.
- Add SQL migration for the Snowflake stage, PHOTO_EVIDENCE table, and VW_ALERT_VALIDATION_EVIDENCE view.
```
