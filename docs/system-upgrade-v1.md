# System Upgrade v1

This upgrade adds a safe system-wide enhancement layer on top of the existing SCAN OCR app.

## Goals

- Keep the existing OCR, Multi OCR, OQC, export, and UI flows intact.
- Add one central upgrade panel for system health and document profile status.
- Improve final OCR quality after OQC by applying profile-aware cleanup.
- Reduce OCR garbage before users copy or export text.
- Improve government memo, receipt, IT/network, finance/stock, and general document handling.

## Added files

- `js/system-upgrade.js`
- `css/system-upgrade.css`

## Main features

### 1. System Upgrade Center

A new dashboard section displays:

- OCR Engine readiness
- OQC Strict status
- Auto-detected document profile
- Export readiness

It also adds quick actions:

- `Clean Final Text`
- `Copy Clean`
- `ดูระบบอัปเกรด`

### 2. Auto document profile

The system detects the scanned document profile from final OCR text:

- `เอกสารราชการ / บันทึกข้อความ`
- `ใบเสร็จ / ใบกำกับภาษี`
- `IT Ticket / Network`
- `หุ้น / การเงิน`
- `เอกสารทั่วไป`

### 3. Final OCR polish

After the existing Multi OCR + OQC flow completes, the upgrade layer:

- Removes broken OCR noise lines.
- Removes mixed Thai/English/digit garbage tokens.
- Applies government memo cleanup when it detects official memo wording.
- Syncs the cleaned text back to `AppState`, the visible output, formatted layout, and export flow.

### 4. Government memo cleanup

For documents with terms such as `บันทึกข้อความ`, `ส่วนราชการ`, `เรื่อง`, `เรียน`, `สรรพากร`, `Mac Address`, and `Notebook`, the system applies extra corrections such as:

- `ข้อัความ` → `ข้อความ`
- `เรอง` → `เรื่อง`
- `ขอเพิม` → `ขอเพิ่ม`
- `ตรวาจ` → `ตรวจ`
- `เนการ` → `ในการ`
- `ความมันคง` → `ความมั่นคง`
- `สือสาร` → `สื่อสาร`

### 5. Cache/deploy

The service worker cache is bumped to:

`riptwosec-scan-v46-system-upgrade`

and caches the new system upgrade assets.

## Safety notes

This upgrade is implemented as a post-load enhancement layer. It avoids deleting existing OCR logic and can be disabled by removing the loader calls in `js/theme.js`.
