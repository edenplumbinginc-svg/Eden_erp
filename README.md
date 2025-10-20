# eden_erp
Monolithic shell.

## Features

### Attachments API
The system includes a pluggable attachments storage adapter that supports both local and cloud storage.

#### Configuration
Set the following environment variables to enable different storage backends:

##### Local Storage (Default)
If no Supabase configuration is provided, attachments are stored locally in `./tmp_uploads` directory.

##### Supabase Storage
To enable Supabase storage, set:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_BUCKET`: The storage bucket name (default: attachments)
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

#### API Endpoints
- `POST /api/tasks/:id/attachments/init` - Initialize an attachment upload
- `POST /api/tasks/:id/attachments/complete` - Complete an attachment upload
- `GET /api/tasks/:id/attachments` - List attachments for a task
- `DELETE /api/attachments/:attachmentId` - Delete an attachment (Manager/Admin or uploader only)

#### Activity Logging
All attachment operations are logged to the activity log:
- `attachment.add` - When an attachment is uploaded
- `attachment.delete` - When an attachment is deleted
