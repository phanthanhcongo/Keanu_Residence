# MinIO Usage Guide

## Overview
MinIO là object storage tương tự AWS S3, dùng để lưu trữ files (images, documents, etc.)

## Access

### Web UI
- URL: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin123`

### API Endpoint
- S3 API: http://localhost:9000
- Trong Docker network: `minio:9000`

## Usage trong Code

### 1. Inject MinioService

```typescript
import { MinioService } from '../../minio/minio.service';

constructor(private readonly minioService: MinioService) {}
```

### 2. Upload File từ Buffer (từ API upload)

```typescript
// Ví dụ: Upload unit images
async uploadUnitImages(unitId: string, files: Express.Multer.File[]) {
  const bucket = 'units';
  const imageUrls: string[] = [];

  for (const file of files) {
    const fileName = `units/${unitId}/${Date.now()}-${file.originalname}`;
    
    // Upload to MinIO
    await this.minioService.uploadBuffer(
      bucket,
      fileName,
      file.buffer,
      file.mimetype
    );

    // Get URL (presigned - valid 7 days)
    const url = await this.minioService.getFileUrl(bucket, fileName, 7 * 24 * 60 * 60);
    imageUrls.push(url);
  }

  return imageUrls;
}
```

### 3. Upload File từ Local Path

```typescript
// Upload file từ server filesystem
await this.minioService.uploadFile(
  'projects',
  'project-1/hero.jpg',
  '/tmp/uploaded-hero.jpg'
);
```

### 4. Lấy File URL

```typescript
// Presigned URL (có expiry - mặc định 24h)
const url = await this.minioService.getFileUrl('bucket', 'file.jpg', 7 * 24 * 60 * 60);

// Hoặc nếu bucket public, dùng direct URL:
const directUrl = `http://localhost:9000/bucket/file.jpg`;
```

### 5. Xóa File

```typescript
// Xóa file cũ khi update
if (oldFileUrl) {
  const fileName = oldFileUrl.split('/bucket/')[1];
  await this.minioService.deleteFile('bucket', fileName);
}
```

### 6. Lấy File về Server

```typescript
// Download file về dạng Buffer
const buffer = await this.minioService.getFile('bucket', 'file.jpg');
// Có thể save hoặc process buffer
```

## Bucket Organization

### Recommended Structure:
```
users/
  └── avatars/
      └── {userId}/
          └── {timestamp}.jpg

units/
  └── {unitId}/
      └── {timestamp}-{filename}.jpg

projects/
  └── {projectId}/
      ├── hero.jpg
      ├── logo.jpg
      └── gallery/
          └── {image}.jpg
```

## Best Practices

1. **Bucket tự động tạo**: `ensureBucket()` tự động tạo bucket nếu chưa có
2. **File naming**: Dùng timestamp hoặc UUID để tránh conflict
3. **URL storage**: 
   - Presigned URL: Lưu vào DB, có expiry
   - Public URL: Lưu object path, generate URL khi cần
4. **Cleanup**: Xóa file cũ khi update/delete
5. **Content-Type**: Luôn set contentType khi upload để browser hiển thị đúng

## Environment Variables

```env
MINIO_ENDPOINT=localhost        # Trong Docker: minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
```

## Example: Upload Unit Images

```typescript
@Post('units/:id/images')
@UseInterceptors(FilesInterceptor('images', 10))
async uploadUnitImages(
  @Param('id') unitId: string,
  @UploadedFiles() files: Express.Multer.File[],
) {
  const bucket = 'units';
  const imageUrls: string[] = [];

  for (const file of files) {
    const fileName = `units/${unitId}/${Date.now()}-${file.originalname}`;
    
    await this.minioService.uploadBuffer(
      bucket,
      fileName,
      file.buffer,
      file.mimetype
    );

    const url = await this.minioService.getFileUrl(bucket, fileName);
    imageUrls.push(url);
  }

  // Update unit với imageUrls
  return this.prisma.unit.update({
    where: { id: unitId },
    data: { imageUrls },
  });
}
```

