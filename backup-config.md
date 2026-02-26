# Cấu Hình Backup Firestore — Yêu Cầu 15

Hướng dẫn cấu hình Google Cloud cho backup tự động Firestore.

## Yêu cầu
- Google Cloud CLI (`gcloud`) đã đăng nhập
- Firebase project ID (ví dụ: `giatsay-online`)
- Quyền admin trên project

## TC 1-2: Tạo GCS Bucket + Scheduled Backup

```bash
# 1. Tạo bucket lưu backup
gcloud storage buckets create gs://giatsay-online-backups \
  --location=asia-southeast1 \
  --uniform-bucket-level-access

# 2. Tạo Cloud Scheduler job cho backup hàng ngày (2:00 AM)
gcloud scheduler jobs create http firestore-daily-backup \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/giatsay-online/databases/(default)/exportDocuments" \
  --http-method=POST \
  --oauth-service-account-email="PROJECT_ID@appspot.gserviceaccount.com" \
  --headers="Content-Type=application/json" \
  --message-body='{"outputUriPrefix":"gs://giatsay-online-backups"}'
```

## TC 3: Giữ backup 30 ngày

```bash
# Cấu hình lifecycle policy xóa file sau 30 ngày
cat > /tmp/lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://giatsay-online-backups \
  --lifecycle-file=/tmp/lifecycle.json
```

## TC 5: Point-in-Time Recovery (PITR)

```bash
# Bật PITR cho Firestore (giữ lại 7 ngày)
gcloud firestore databases update --type=firestore-native \
  --enable-pitr
```

## TC 7: Alert khi backup thất bại

```bash
# Tạo notification channel (email)
gcloud beta monitoring channels create \
  --display-name="Admin Email" \
  --type=email \
  --channel-labels=email_address=admin@giatsayonline.vn

# Tạo alert policy cho Cloud Scheduler job failures
gcloud beta monitoring policies create \
  --display-name="Firestore Backup Failed" \
  --condition-display-name="Backup job failed" \
  --condition-filter='resource.type="cloud_scheduler_job" AND metric.type="custom.googleapis.com/scheduler/job/execution_count" AND metric.labels.status!="SUCCESS"' \
  --notification-channels="CHANNEL_ID"
```

## TC 6: Test khôi phục hàng tháng

Quy trình test hàng tháng:

1. Chọn backup gần nhất từ GCS
2. Import vào Firestore test project:
```bash
gcloud firestore import gs://giatsay-online-backups/YYYY-MM-DD \
  --project=giatsay-online-test
```
3. Kiểm tra dữ liệu trên test project
4. Ghi nhận kết quả test vào log

## TC 4: Export JSON từ giao diện

Đã tích hợp nút "Export dữ liệu (JSON)" trong **Cài đặt** (`CaiDatPage.tsx`).
Nhân viên admin có thể tải file JSON chứa tất cả collections.
