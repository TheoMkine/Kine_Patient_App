// Google API Configuration
// Les clés sont chargées depuis les variables d'environnement
// En développement : depuis .env.local
// En production (Netlify) : depuis les variables d'environnement Netlify
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "740423920986-d529ee2tisdq23i742f0n9a4l95k17p5.apps.googleusercontent.com";
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "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";
export const DRIVE_FOLDER_ID = import.meta.env.VITE_DRIVE_FOLDER_ID || null; // Set to null to create in root, or paste an ID of a folder you have write access to

// Google API Scopes
export const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
].join(' ');

// Discovery docs for Google APIs
export const DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    'https://sheets.googleapis.com/$discovery/rest?version=v4'
];

// Root folder structure
export const ROOT_FOLDER_NAME = 'KINE_APP';
export const PATIENTS_FOLDER_NAME = 'Patients';
export const BILANS_FOLDER_NAME = 'Bilans';
export const SEANCES_FOLDER_NAME = 'Seances';
export const JOURNAL_SHEET_NAME = 'journal';
