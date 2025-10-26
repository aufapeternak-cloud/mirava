# Dokumentasi API CapCut Automation

Dokumen ini menjelaskan cara berinteraksi dengan service HTTP yang didefinisikan di `main.go`. Service ini mengelola alur pembuatan video melalui CapCut, penjadwalan job, serta penyimpanan sementara hasil unduhan.

## Menjalankan Server
- Pastikan dependensi Go sudah ter-install (Go 1.21+ disarankan) dan modul-modul telah diunduh (`go mod tidy` bila perlu).
- Jalankan server dengan `go run main.go` atau build terlebih dahulu (`go build`) kemudian eksekusi binary.
- Secara default server berjalan pada `:8085`. Gunakan variabel lingkungan `ADDR` untuk mengganti binding alamat, contoh `ADDR="0.0.0.0:9000" go run main.go`.

### Variabel Lingkungan

| Nama | Default | Keterangan |
| --- | --- | --- |
| `ADDR` | `:8085` | Alamat dan port HTTP. |
| `MAX_WORKERS` | `50` | Jumlah worker paralel untuk memproses job. |
| `MAX_QUEUE` | `5000` | Kapasitas antrean job. Saat penuh, `/generate` mengembalikan 503. |
| `MAX_GEN_PER_ACCOUNT` | `2` | Batas pemakaian akun sebelum dirotasi. |
| `ACCOUNT_SWAP_MAX` | `200` | Batas swap akun saat rate-limit. |
| `LOGIN_TIMEOUT_SEC` | `30` | Timeout login ke CapCut. |
| `REQ_TIMEOUT_SEC` | `120` | Timeout umum request HTTP ke CapCut. |
| `POLL_ATTEMPTS` | `15` | Batas percobaan polling history. |
| `POLL_DELAY_FIRST_SEC` | `30` | Delay awal sebelum polling. |
| `POLL_DELAY_NEXT_SEC` | `30` | Delay antar polling berikutnya. |
| `REDIS_ADDR` | kosong | Jika diisi, job status disimpan di Redis. |
| `REDIS_DB` | `0` | Nomor database Redis. |
| `REDIS_PASSWORD` | kosong | Password Redis. |
| `JOB_TTL_MIN` | `1440` | TTL job (menit) saat Redis mode aktif. |

## File Pendukung
- `account_newcreate.json`: daftar akun CapCut dalam bentuk array objek `{"email": "...", "password": "..."}`. Contoh:
  ```json
  [
    { "email": "user1@example.com", "password": "secret1" },
    { "email": "user2@example.com", "password": "secret2" }
  ]
  ```
- `accountstate.json`: dibuat otomatis untuk menyimpan indeks terakhir akun yang digunakan. Tidak perlu disunting manual.
- `listproxy.txt` (opsional): daftar proxy (satu per baris). Mendukung format `host:port`, `host:port:user:pass`, atau `user:pass@host:port`.
- Direktori kerja:
  - `videos/`: video hasil unduhan sementara. File akan dihapus otomatis ±90 detik setelah selesai.
  - `downloads/`: file non-video (jika ada).
  - `debug_requests.log`: catatan request/response HTTP ke API CapCut.

Gunakan endpoint `POST /admin/reload` (lihat di bawah) bila Anda memperbarui `account_newcreate.json` atau `listproxy.txt` saat server sedang berjalan.

## Alur Kerja Umum
1. **Kirim job** via `POST /generate` (endpoint sederhana) atau `POST /v1/generate` (endpoint lengkap).
2. **Pantau status** job dengan `GET /jobs/{job_id}`. Anda dapat menambahkan query `?wait=30s` untuk long-polling (maksimal 30 detik per permintaan).
3. Jika job berstatus `success`, gunakan field `download_url` (misal `/video/<nama-file>.mp4`) untuk mengunduh video.
4. File video harus diunduh sebelum 90 detik karena ada proses cleanup otomatis.

## Endpoint

### `POST /generate`
Endpoint sederhana yang mengambil prompt pertama dari array.

- **Request body:**
  | Field | Tipe | Wajib | Catatan |
  | --- | --- | --- | --- |
  | `prompts` | array string | Ya | Hanya elemen pertama yang dipakai. |
  | `aspect` | string | Tidak | Default `16:9`. Gunakan format rasio seperti `9:16`, `1:1`. |
  | `mode` | string | Tidak | `browser` (default) atau `gdrive`. Mode `gdrive` akan menambah satu langkah upload, namun implementasi Google Drive saat ini belum lengkap. |
  | `debug` | bool | Tidak | Bila `true`, job ditandai debug (log HTTP tetap dicatat untuk semua job). |

- **Response (202):**
  ```json
  {
    "job_id": "uuid",
    "status": "queued",
    "message": "Job queued successfully, check /jobs/<id> for status"
  }
  ```
- **Kesalahan umum:**
  - 400 jika payload tidak valid atau `prompts` kosong.
  - 503 jika antrean penuh (`MAX_QUEUE` terlampaui).

- **Contoh permintaan:**
  ```bash
  curl -X POST http://localhost:8085/generate \
    -H "Content-Type: application/json" \
    -d '{
      "prompts": ["Create a cinematic travel montage of Bali at sunrise"],
      "aspect": "16:9"
    }'
  ```

### `POST /v1/generate`
Endpoint lengkap untuk kebutuhan lanjutan.

- **Request body:**
  | Field | Tipe | Wajib | Catatan |
  | --- | --- | --- | --- |
  | `prompt` | string | Ya | Deskripsi video yang ingin dibuat. |
  | `ratio` | string | Tidak | Default `16:9`. Sama seperti `aspect` pada endpoint sederhana. |
  | `mode` | string | Tidak | `local` (default) atau `gdrive`. |
  | `payload_mode` | integer | Tidak | Default `1`. Pertahankan nilai ini kecuali Anda mengerti variasi payload internal. |
  | `debug` | bool | Tidak | Menandai job sebagai debug. |
  | `gdrive_credentials_json` | objek/JSON | Kondisional | Diperlukan bila `mode` = `gdrive`. |
  | `gdrive_folder_id` | string | Kondisional | Folder tujuan di Google Drive untuk mode `gdrive`. |

- **Response (202):**
  ```json
  {
    "job_id": "uuid",
    "status": "queued"
  }
  ```

- **Contoh permintaan:**
  ```bash
  curl -X POST http://localhost:8085/v1/generate \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "Create a 30-second upbeat promo video for a coffee shop",
      "ratio": "9:16",
      "mode": "local",
      "payload_mode": 1
    }'
  ```

### `GET /jobs/{id}`
Mengambil status job. Alias tersedia di `/v1/jobs/{id}`.

- **Query opsional:** `wait=<durasi>` untuk long-polling (format `Xs`, maksimal `30s`). Server akan menahan respons sampai status job terminal (`success` atau `error`) atau batas waktu tercapai.
- **Response sukses (200):** objek job lengkap (lihat bagian Struktur Job).
- **Response lainnya:** 404 bila job tidak ditemukan, 408 bila long-polling timeout.

- **Contoh:**
  ```bash
  curl "http://localhost:8085/jobs/3d8b9d82-27f1-4a3f-b8a2-8bb2d34a1f59?wait=20s"
  ```

### `GET /video/{name}`
Mengirimkan file MP4 yang disimpan di `videos/`. Alias di `/v1/video/{name}`.

- Header respons mendukung streaming (`Content-Type: video/mp4`, `Accept-Ranges: bytes`).
- 404 jika file tidak ditemukan (misal karena cleanup 90 detik sudah berjalan).

### `GET /files/{name}`
Mengambil file non-video dari direktori `downloads/`. Alias di `/v1/files/{name}`. Server menolak path traversal.

### `POST /admin/reload`
Memuat ulang `account_newcreate.json` dan `listproxy.txt` tanpa mematikan server.

- **Response 200:** `{"status": "ok"}`
- 500 apabila file tidak bisa dibaca atau JSON tidak valid.

### `GET /healthz`
Endpoint kesehatan untuk monitoring.

- **Response 200:**
  ```json
  {
    "ok": true,
    "redis_enabled": false,
    "active_workers": 0,
    "total_generated": 12,
    "timestamp": 1715143412
  }
  ```

## Struktur Job & Status

- **Status:**
  | Nilai | Arti |
  | --- | --- |
  | `queued` | Menunggu worker tersedia. |
  | `running` | Sedang diproses oleh worker. |
  | `success` | Proses selesai sukses. |
  | `error` | Terjadi kegagalan permanen. Lihat `error_msg`. |

- **Field penting dalam objek job (`GET /jobs/{id}`):**
  | Field | Deskripsi |
  | --- | --- |
  | `id` | UUID job. |
  | `prompt` | Prompt yang dipakai. |
  | `ratio` | Rasio video. |
  | `mode` | `browser` / `local` / `gdrive` tergantung endpoint. |
  | `payload_mode` | Mode payload (default 1). |
  | `debug` | Flag debug. |
  | `gdrive_folder_id` | Folder tujuan Google Drive (jika ada). |
  | `filename` | Nama file video lokal (jika sukses). |
  | `download_url` | Endpoint relatif untuk mengunduh video. Hanya terisi saat sukses. |
  | `result_message` | Pesan hasil. Biasanya berisi link streaming. |
  | `error_msg` | Pesan error ketika status `error`. |
  | `current_step` | Langkah terkini: `starting`, `login`, `generate`, `queue_monitor`, `polling`, `download`, `save`. |
  | `total_steps` / `completed_steps` | Progres numerik pipeline. |
  | `progress` | Ringkasan progres yang dapat ditampilkan ke pengguna akhir. |
  | `created_at` / `updated_at` | Timestamp ISO8601. |

## Catatan Penting
- **Batas antrean:** Jika `MAX_QUEUE` terlampaui, endpoint `POST /generate` dan `POST /v1/generate` langsung memberi respons 503 tanpa menyimpan job.
- **Rate limiting CapCut:** Worker otomatis menonaktifkan akun yang kena rate limit dan mencoba swap hingga `ACCOUNT_SWAP_MAX`.
- **Penyimpanan video:** File di `videos/` dibersihkan ±90 detik setelah job sukses. Segera unduh atau pindahkan file jika perlu disimpan permanen.
- **Mode Google Drive:** Langkah upload belum sepenuhnya diimplementasikan. Job akan selesai dengan pesan placeholder meskipun mode `gdrive` dipilih.
- **Logging:** Semua request eksternal ditulis sebagai JSON ke `debug_requests.log` untuk kebutuhan audit/debugging.
- **CORS:** Middleware sudah mengizinkan preflight OPTIONS, jadi service dapat diakses langsung dari frontend lain bila diperlukan.

## Contoh Alur Lengkap
```bash
# 1. Kirim job
JOB_ID=$(curl -s -X POST http://localhost:8085/generate \
  -H "Content-Type: application/json" \
  -d '{"prompts":["Create a cinematic travel montage of Bali at sunrise"],"aspect":"16:9"}' \
  | jq -r '.job_id')

# 2. Pantau status (maks 30 detik per permintaan)
curl "http://localhost:8085/jobs/$JOB_ID?wait=30s"

# 3. Jika status success, ambil download_url lalu unduh video
curl -OJ "http://localhost:8085/video/<nama-file>.mp4"
```

Gunakan dokumentasi ini sebagai referensi utama ketika mengintegrasikan aplikasi Anda dengan service CapCut automation di repositori ini.
