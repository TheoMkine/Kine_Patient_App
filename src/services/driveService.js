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
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || 'Drive API Error');
    }

    return response.json();
};

// Find or create a folder by name within a parent folder
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
export const createPatientFolder = async (nom, prenom, telephone) => {
    try {
        // Ensure KINE_APP folder exists
        const kineAppFolderId = await findOrCreateFolder(ROOT_FOLDER_NAME, DRIVE_FOLDER_ID);

        // Ensure Patients folder exists
        const patientsFolderId = await findOrCreateFolder(PATIENTS_FOLDER_NAME, kineAppFolderId);

        // Create patient folder: NOM_PRENOM_TELEPHONE
        const patientFolderName = `${nom.toUpperCase()}_${prenom}_${telephone}`;
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
export const renamePatientFolder = async (patientFolderId, nom, prenom, telephone) => {
    try {
        if (!patientFolderId) {
            throw new Error('Missing patient folder id');
        }

        const newName = `${nom.toUpperCase()}_${prenom}_${telephone}`;

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

// Upload a file to Google Drive
export const uploadFileToDrive = async (file, folderId, fileName = null) => {
    try {
        const token = getAccessToken();
        const metadata = {
            name: fileName || file.name,
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
            {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + token }),
                body: form
            }
        );

        if (!response.ok) throw new Error('Upload failed');

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

// Helper to get a direct URL for a file
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
