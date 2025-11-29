import 'dotenv/config';
import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

const oauth2 = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.OAUTH_REDIRECT_URI
);

// refresh token
oauth2.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

if (!DRIVE_FOLDER_ID) {
  throw new Error('GOOGLE_DRIVE_FOLDER_ID nincs beállítva (.env)!');
}

// oauth2
const drive = google.drive({ version: 'v3', auth: oauth2 });

export async function uploadBufferToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string
) {
  const fileMetadata = {
    name: filename,
    parents: [DRIVE_FOLDER_ID as string],
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = res.data.id!;
 
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });
  const downloadUrl = `${process.env.API_BASE_URL}/api/files/${fileId}`;

  return {
    fileId,
    webViewLink: res.data.webViewLink || '',
    webContentLink: res.data.webContentLink || '',
    downloadUrl,
  };
}

export default drive;
