import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

export async function uploadToGoogleDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath: string
): Promise<{ fileId: string; webViewLink: string }> {
  // Get or create the folder path
  const folderId = await getOrCreateFolderPath(folderPath);

  // Upload file
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: require('stream').Readable.from(buffer),
    },
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = response.data.id!;

  // Make file accessible via link
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  // Get the updated file info
  const file = await drive.files.get({
    fileId,
    fields: 'webViewLink, webContentLink',
  });

  return {
    fileId,
    webViewLink: file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  };
}

export async function getFileUrl(fileId: string): Promise<string> {
  const file = await drive.files.get({
    fileId,
    fields: 'webViewLink, webContentLink',
  });
  return file.data.webContentLink || file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
}

export async function deleteFile(fileId: string): Promise<void> {
  await drive.files.delete({ fileId });
}

async function getOrCreateFolderPath(folderPath: string): Promise<string> {
  const parts = folderPath.split('/').filter(Boolean);
  let currentParentId = ROOT_FOLDER_ID;

  for (const folderName of parts) {
    currentParentId = await getOrCreateFolder(folderName, currentParentId);
  }

  return currentParentId;
}

async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  // Check if folder exists
  const response = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  return folder.data.id!;
}
