const { google } = require('googleapis');
const fs = require('fs');

// Load your env vars
require('dotenv').config({ path: '.env.local' });

// If .env.local doesn't work, try .env
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  require('dotenv').config({ path: '.env' });
}

console.log('=== Testing Google Drive Connection ===\n');

// Check credentials
console.log('1. Checking credentials...');
console.log('   Email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'NOT SET');
console.log('   Key exists:', !!process.env.GOOGLE_PRIVATE_KEY);
console.log('   Key length:', process.env.GOOGLE_PRIVATE_KEY?.length || 0);
console.log('   Folder ID:', process.env.GOOGLE_DRIVE_FOLDER_ID || 'NOT SET');

if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
  console.log('\n❌ Missing credentials. Check your .env file.');
  process.exit(1);
}

async function testGoogleDrive() {
  try {
    // Create auth
    console.log('\n2. Creating auth client...');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });
    console.log('   ✅ Auth client created');

    // Test 1: List files in the shared folder
    console.log('\n3. Testing access to shared folder...');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    const folderResponse = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, owners',
      supportsAllDrives: true,
    });
    
    console.log('   ✅ Folder accessible!');
    console.log('   Folder name:', folderResponse.data.name);
    console.log('   Folder ID:', folderResponse.data.id);

    // Test 2: List contents of folder
    console.log('\n4. Listing folder contents...');
    const listResponse = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    
    console.log('   ✅ List successful!');
    console.log('   Files in folder:', listResponse.data.files?.length || 0);
    listResponse.data.files?.forEach(f => {
      console.log(`     - ${f.name} (${f.mimeType})`);
    });

    // Test 3: Create a test folder
    console.log('\n5. Creating test folder...');
    const testFolderResponse = await drive.files.create({
      requestBody: {
        name: 'test-folder-' + Date.now(),
        mimeType: 'application/vnd.google-apps.folder',
        parents: [folderId],
      },
      fields: 'id, name',
      supportsAllDrives: true,
    });
    
    console.log('   ✅ Folder created!');
    console.log('   New folder ID:', testFolderResponse.data.id);
    console.log('   New folder name:', testFolderResponse.data.name);

    // Test 4: Upload a test file
    console.log('\n6. Uploading test file...');
    const testContent = Buffer.from('Hello, this is a test file for KYC upload!');
    const { Readable } = require('stream');
    
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: 'test-file-' + Date.now() + '.txt',
        parents: [testFolderResponse.data.id],
      },
      media: {
        mimeType: 'text/plain',
        body: Readable.from(testContent),
      },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true,
    });
    
    console.log('   ✅ File uploaded!');
    console.log('   File ID:', uploadResponse.data.id);
    console.log('   File name:', uploadResponse.data.name);

    // Test 5: Make file public
    console.log('\n7. Making file public...');
    await drive.permissions.create({
      fileId: uploadResponse.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });
    
    console.log('   ✅ File is now public!');

    // Get shareable link
    const fileInfo = await drive.files.get({
      fileId: uploadResponse.data.id,
      fields: 'webViewLink, webContentLink',
      supportsAllDrives: true,
    });
    
    console.log('   View link:', fileInfo.data.webViewLink);
    console.log('   Download link:', fileInfo.data.webContentLink);

    // Cleanup
    console.log('\n8. Cleaning up test files...');
    await drive.files.delete({ fileId: uploadResponse.data.id, supportsAllDrives: true });
    await drive.files.delete({ fileId: testFolderResponse.data.id, supportsAllDrives: true });
    console.log('   ✅ Test files deleted');

    console.log('\n=== ALL TESTS PASSED! ===');
    console.log('Google Drive integration is working correctly.');

  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    if (error.response?.data) {
      console.log('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('\nFull error:', error);
  }
}

testGoogleDrive();
