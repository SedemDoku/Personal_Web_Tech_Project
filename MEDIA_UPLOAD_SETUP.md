# Media Upload Setup Guide

## Directory Structure

After applying the fixes, you need to create the uploads directory:

```
Personal Web Tech Project/
├── api/
│   ├── auth.php
│   ├── bookmarks.php
│   ├── collections.php
│   └── media.php (NEW)
├── uploads/
│   └── media/         (CREATE THIS DIRECTORY)
├── WebExtention/
├── config.php
└── index.php
```

## Setup Steps

### 1. Create the uploads directory

**On Linux/Mac:**
```bash
mkdir -p uploads/media
chmod 755 uploads/media
chmod 755 uploads
```

**On Windows (PowerShell):**
```powershell
New-Item -ItemType Directory -Path uploads\media -Force
```

### 2. Set proper permissions (if on school server)

```bash
chown www-data:www-data uploads/media  # Linux
chmod 755 uploads/media                # Readable & writable by web server
```

### 3. Verify upload directory is writable

Create a test file:
```bash
touch uploads/media/test.txt
rm uploads/media/test.txt
```

If it works, the directory is properly configured.

## How It Works

### Upload Flow
1. User selects audio/video file in web app or extension
2. File is sent to `api/bookmarks.php` as multipart form data
3. Server validates: file size, extension, MIME type
4. File saved to: `uploads/media/{userId}_{timestamp}_{hash}.{ext}`
5. Database stores: relative path in `bookmarks.content`

### Playback Flow
1. App displays bookmark with media URL: `api/media.php?f={filename}`
2. Browser requests: `api/media.php?f=12_1701234567_a1b2c3d4.mp3`
3. Server verifies:
   - User is authenticated
   - User owns the file (user ID in filename)
   - File exists in database
   - MIME type is safe
4. File is served with proper headers
5. Browser plays audio/video inline

## Important Notes

- **Never** delete the `uploads` directory while in production
- **Backup** regularly: `uploads/media/` contains user media
- **Monitor** disk usage: files accumulate over time
- **Set quota**: Consider max storage per user if needed
- **Files are private**: Only owner + authenticated users can access

## Troubleshooting

### Upload fails with "Failed to save file"
- Check that `uploads/media/` directory exists
- Check that web server has write permissions
- Check disk space availability

### Can't play uploaded media
- Verify file was actually uploaded: check `uploads/media/` directory
- Check browser console for 404 errors
- Verify user is authenticated for media serving

### Files appear but won't play
- Check MIME type is supported (mp3, mp4, etc.)
- Try different browser
- Check `api/media.php` is properly configured

## File Size Limits

Default: **50 MB** per file

To change, edit `config.php`:
```php
define('MAX_FILE_SIZE', 100 * 1024 * 1024); // 100MB
```

## Supported Formats

### Audio
- MP3 (audio/mpeg)
- WAV (audio/wav)
- WebM (audio/webm)
- FLAC (audio/flac)
- M4A (audio/mpeg)

### Video
- MP4 (video/mp4)
- WebM (video/webm)
- QuickTime (video/quicktime) - .mov files

## Security

- Files are stored **outside web root** conceptually (via PHP serving)
- File ownership verified by user ID in filename
- MIME type validated on upload AND serving
- Direct file path access is blocked

All uploads are **completely isolated** between users!
