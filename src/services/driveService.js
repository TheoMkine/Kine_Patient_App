import {
    DRIVE_FOLDER_ID,
    ROOT_FOLDER_NAME,
    PATIENTS_FOLDER_NAME,
    BILANS_FOLDER_NAME,
    SEANCES_FOLDER_NAME
} from '../config/google';
import { getAccessToken } from './googleAuth';

const GOOGLE_API_ROOT = 'https://www.googleapis.com/drive/v3';

// Helper for fetch requests
const driveFetch = async (endpoint, options = {}) => {
    const token = getAccessToken();
    if (!token) throw new Error('No access token');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(`${GOOGLE_API_ROOT}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        let errorMsg = 'Drive API Error';
        try {
            const errorBody = await response.json();
            errorMsg = errorBody.error?.message || errorMsg;
        } catch (e) {
            errorMsg = `Status: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMsg);
    }

    return response.json();
};

// Find or create a folder by name within a parent folder
export const findOrCreateFolder = async (folderName, parentId) => {
    try {
        let query;
        if (parentId && parentId !== 'root') {
            query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        } else {
            query = `name='${folderName}' and 'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        }

        const searchRes = await driveFetch(`/files?q=${encodeURIComponent(query)}&fields=files(id,name)`);

        if (searchRes.files && searchRes.files.length > 0) {
            return searchRes.files[0].id;
        }

        // Create folder if it doesn't exist
        const body = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };

        if (parentId && parentId !== 'root') {
            body.parents = [parentId];
        }

        const createRes = await driveFetch('/files', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        return createRes.id;
    } catch (error) {
        console.error('Error finding/creating folder:', error);
        throw error;
    }
};

// List subfolders in a folder
export const listSubFolders = async (parentId) => {
    try {
        const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const res = await driveFetch(`/files?q=${encodeURIComponent(query)}&fields=files(id,name)`);
        return res.files || [];
    } catch (error) {
        console.error('Error listing folders:', error);
        return [];
    }
};


// Create complete patient folder structure
export const createPatientFolder = async (nom, prenom) => {
    try {
        // Ensure KINE_APP folder exists
        const kineAppFolderId = await findOrCreateFolder(ROOT_FOLDER_NAME, DRIVE_FOLDER_ID);

        // Ensure Patients folder exists
        const patientsFolderId = await findOrCreateFolder(PATIENTS_FOLDER_NAME, kineAppFolderId);

        // Create patient folder: NOM_PRENOM
        const patientFolderName = `${nom.toUpperCase()}_${prenom}`;
        const patientFolderId = await findOrCreateFolder(patientFolderName, patientsFolderId);

        // Create Bilans subfolder
        const bilansFolderId = await findOrCreateFolder(BILANS_FOLDER_NAME, patientFolderId);

        // Create Seances subfolder
        const seancesFolderId = await findOrCreateFolder(SEANCES_FOLDER_NAME, patientFolderId);

        return {
            patientFolderId,
            bilansFolderId,
            seancesFolderId,
            patientFolderName
        };
    } catch (error) {
        console.error('Error creating patient folder structure:', error);
        throw error;
    }
};

// Rename an existing patient folder to match updated contact info
export const renamePatientFolder = async (patientFolderId, nom, prenom) => {
    try {
        if (!patientFolderId) {
            throw new Error('Missing patient folder id');
        }

        const newName = `${nom.toUpperCase()}_${prenom}`;

        await driveFetch(`/files/${patientFolderId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: newName })
        });

        return newName;
    } catch (error) {
        console.error('Error renaming patient folder:', error);
        throw error;
    }
};

// Upload a file to Google Drive using multipart/related for better compatibility
export const uploadFileToDrive = async (file, folderId, fileName = null) => {
    try {
        const token = getAccessToken();
        const metadata = {
            name: fileName || file.name,
            parents: [folderId]
        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const contentType = file.type || 'application/octet-stream';

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + contentType + '\r\n\r\n';

        // Use Blob to merge metadata and binary file safely
        const body = new Blob([
            multipartRequestBody,
            file,
            close_delim
        ], { type: `multipart/related; boundary=${boundary}` });

        const response = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: body
            }
        );

        if (!response.ok) {
            let errorMsg = 'Upload failed';
            try {
                const errorBody = await response.json();
                errorMsg = errorBody.error?.message || errorMsg;
            } catch (e) {
                errorMsg = `Status: ${response.status}`;
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};


// List files in a folder
export const listFilesInFolder = async (folderId) => {
    try {
        const query = `'${folderId}' in parents and trashed=false`;
        const fields = 'files(id, name, createdTime, webViewLink, webContentLink, thumbnailLink)';
        const res = await driveFetch(`/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime desc`);
        return res.files || [];
    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
    }
};

// Helper to generate a date-based filename (DD_MM_YYYY.ext)
export const generateDateFilename = (extension = 'jpg') => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // Format demandé : DD_MM_YYYY.ext
    return `${day}_${month}_${year}.${extension}`;
};

// Download file content as a Blob (for HD display)
export const downloadFileContent = async (fileId) => {
    const token = getAccessToken();
    if (!token) throw new Error('No access token');

    const response = await fetch(`${GOOGLE_API_ROOT}/files/${fileId}?alt=media`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.blob();
};

// Helper to get a direct URL for a file (useful for external links, limited for authenticated tags)
export const getFileUrl = (fileId) => {
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
};

// Delete a file or folder by ID
export const deleteFile = async (fileId) => {
    try {
        await driveFetch(`/files/${fileId}`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};
