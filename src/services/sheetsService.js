import { JOURNAL_SHEET_NAME } from '../config/google';
import { getAccessToken } from './googleAuth';

const GOOGLE_SHEETS_ROOT = 'https://sheets.googleapis.com/v4/spreadsheets';
const GOOGLE_DRIVE_ROOT = 'https://www.googleapis.com/drive/v3';

const apiFetch = async (url, options = {}) => {
    const token = getAccessToken();
    if (!token) throw new Error('No access token');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'API Error');
    }
    return response.json();
};

// Find journal sheet in folder (Moved helper function to export)
export const findJournalSheet = async (seancesFolderId) => {
    try {
        const query = `name='${JOURNAL_SHEET_NAME}' and '${seancesFolderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
        const response = await apiFetch(`${GOOGLE_DRIVE_ROOT}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`);

        if (response.files && response.files.length > 0) {
            return response.files[0].id;
        }

        return null;
    } catch (error) {
        console.error('Error finding journal sheet:', error);
        return null;
    }
};

// Create a Google Sheet in a specific folder
export const createJournalSheet = async (patientFolderName, seancesFolderId) => {
    try {
        // 1. Create the spreadsheet
        const requestBody = {
            properties: { title: JOURNAL_SHEET_NAME },
            sheets: [{
                properties: {
                    title: 'Séances',
                    gridProperties: { frozenRowCount: 1 }
                },
                data: [{
                    startRow: 0,
                    startColumn: 0,
                    rowData: [{
                        values: [
                            { userEnteredValue: { stringValue: 'Date' }, userEnteredFormat: { textFormat: { bold: true } } },
                            { userEnteredValue: { stringValue: 'Nom du fichier' }, userEnteredFormat: { textFormat: { bold: true } } },
                            { userEnteredValue: { stringValue: 'Description' }, userEnteredFormat: { textFormat: { bold: true } } }
                        ]
                    }]
                }]
            }]
        };

        const sheetRes = await apiFetch(GOOGLE_SHEETS_ROOT, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        const spreadsheetId = sheetRes.spreadsheetId;

        // 2. Move the sheet to the Seances folder (using Drive API)
        // First get current parents to remove them
        const fileInfo = await apiFetch(`${GOOGLE_DRIVE_ROOT}/files/${spreadsheetId}?fields=parents`);
        const previousParents = fileInfo.parents.join(',');

        await apiFetch(`${GOOGLE_DRIVE_ROOT}/files/${spreadsheetId}?addParents=${seancesFolderId}&removeParents=${previousParents}`, {
            method: 'PATCH'
        });

        return spreadsheetId;
    } catch (error) {
        console.error('Error creating journal sheet:', error);
        throw error;
    }
};

// Add a row to the journal sheet
export const addSeanceToJournal = async (spreadsheetId, fileName, description = '') => {
    try {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const values = [[dateStr, fileName, description]];

        const encodedRange = encodeURIComponent('Séances!A:C');
        await apiFetch(`${GOOGLE_SHEETS_ROOT}/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            body: JSON.stringify({ values })
        });

        return true;
    } catch (error) {
        console.error('Error adding seance to journal:', error);
        throw error;
    }
};

// Get all seances from journal
export const getSeancesFromJournal = async (spreadsheetId) => {
    try {
        const encodedRange = encodeURIComponent('Séances!A2:C');
        const response = await apiFetch(`${GOOGLE_SHEETS_ROOT}/${spreadsheetId}/values/${encodedRange}`);

        const rows = response.values || [];
        return rows.map(row => ({
            date: row[0] || '',
            fileName: row[1] || '',
            description: row[2] || ''
        })).reverse(); // Most recent first
    } catch (error) {
        console.error('Error getting seances from journal:', error);
        return [];
    }
};
