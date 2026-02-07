import { useState, useEffect } from 'react'; // React hooks import
import { findOrCreateFolder, listSubFolders } from '../services/driveService';
import { findJournalSheet } from '../services/sheetsService';
import {
    DRIVE_FOLDER_ID,
    ROOT_FOLDER_NAME,
    PATIENTS_FOLDER_NAME,
    BILANS_FOLDER_NAME,
    SEANCES_FOLDER_NAME
} from '../config/google';

export default function PatientList({ onSelectPatient }) {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadPatients();
        // Background sync
        syncPatientsWithDrive();
    }, []);

    const loadPatients = () => {
        const storedPatients = JSON.parse(localStorage.getItem('patients') || '[]');
        setPatients(storedPatients);
    };

    const syncPatientsWithDrive = async () => {
        setSyncing(true);
        try {
            // 1. Resolve folder IDs
            console.log('Sync: Starting with DRIVE_FOLDER_ID:', DRIVE_FOLDER_ID || 'root');
            const rootId = await findOrCreateFolder(ROOT_FOLDER_NAME, DRIVE_FOLDER_ID || 'root');
            console.log('Sync: rootId (KINE_APP):', rootId);
            const patientsFolderId = await findOrCreateFolder(PATIENTS_FOLDER_NAME, rootId);
            console.log('Sync: patientsFolderId:', patientsFolderId);

            // 2. List folders in Drive
            const folders = await listSubFolders(patientsFolderId);
            console.log(`Sync: Found ${folders.length} folders in Patients folder:`, folders.map(f => f.name));

            if (!folders.length) {
                console.log('Sync: No folders found. Exiting sync.');
                return;
            }

            // 3. Compare with local data
            const existingPatients = JSON.parse(localStorage.getItem('patients') || '[]');
            let updatedList = [...existingPatients];
            let hasChanges = false;

            for (const folder of folders) {
                // Name format: NOM_PRENOM or NOM_PRENOM_TELEPHONE
                const parts = folder.name.split('_');
                if (parts.length < 2) continue;

                const nom = parts[0];
                const prenom = parts[1];
                const telephone = parts[2] || '';

                const exists = existingPatients.find(p =>
                    p.nom.toLowerCase() === nom.toLowerCase() &&
                    p.prenom.toLowerCase() === prenom.toLowerCase()
                );

                if (!exists) {
                    console.log(`Sync: New patient detected: ${folder.name}`);

                    // Fetch subfolder IDs
                    const subs = await listSubFolders(folder.id);
                    console.log(`Sync: Subfolders for ${folder.name}:`, subs.map(s => s.name));

                    const bilansFolderId = subs.find(f => f.name === BILANS_FOLDER_NAME)?.id;
                    const seancesFolderId = subs.find(f => f.name === SEANCES_FOLDER_NAME)?.id;

                    if (seancesFolderId) {
                        console.log(`Sync: Finding journal sheet for ${folder.name}...`);
                        const journalSheetId = await findJournalSheet(seancesFolderId);
                        console.log(`Sync: journalSheetId for ${folder.name}:`, journalSheetId);

                        const newPatient = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            nom,
                            prenom,
                            telephone,
                            patientFolderId: folder.id,
                            bilansFolderId,
                            seancesFolderId,
                            journalSheetId,
                            createdAt: new Date().toISOString()
                        };

                        updatedList.push(newPatient);
                        hasChanges = true;
                    } else {
                        console.warn(`Sync: Missing Seances folder for ${folder.name}`);
                    }
                }
            }

            if (hasChanges) {
                localStorage.setItem('patients', JSON.stringify(updatedList));
                setPatients(updatedList);
            }
        } catch (error) {
            console.error('Background sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };


    const filteredPatients = patients
        .filter(patient => {
            const search = searchTerm.toLowerCase();
            return (
                patient.nom.toLowerCase().includes(search) ||
                patient.prenom.toLowerCase().includes(search)
            );
        })
        // Tri principal par prénom
        .sort((a, b) => a.prenom.localeCompare(b.prenom));

    return (
        <div>
            {/* Search Bar */}
            {patients.length > 0 && (
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Rechercher un patient..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}

            {syncing && (
                <div style={{
                    textAlign: 'center',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                    <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />
                    Synchronisation avec Google Drive...
                </div>
            )}

            {/* Patient List */}
            {filteredPatients.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>
                        {searchTerm ? 'Aucun patient trouvé' : 'Aucun patient'}
                    </h3>
                    <p className="text-secondary">
                        {searchTerm ? 'Essayez une autre recherche' : 'Commencez par créer votre premier patient'}
                    </p>
                </div>
            ) : (
                <div className="contact-list">
                    {(() => {
                        // Group patients by first letter of First Name
                        const grouped = filteredPatients.reduce((acc, patient) => {
                            const letter = patient.prenom.charAt(0).toUpperCase();
                            if (!acc[letter]) acc[letter] = [];
                            acc[letter].push(patient);
                            return acc;
                        }, {});

                        const sortedLetters = Object.keys(grouped).sort();

                        return sortedLetters.map(letter => (
                            <div key={letter}>
                                <div className="contact-section">
                                    {letter}
                                </div>
                                <div>
                                    {grouped[letter].map(patient => (
                                        <div
                                            key={patient.id}
                                            className="contact-row"
                                            onClick={() => onSelectPatient(patient)}
                                        >
                                            <div className="contact-avatar">
                                                {patient.prenom[0]}{patient.nom[0]}
                                            </div>
                                            <div className="contact-info">
                                                <div className="contact-name">
                                                    <strong>{patient.prenom}</strong> {patient.nom.toUpperCase()}
                                                </div>
                                                {/* Optional: Show phone in list or keep it minimal like contacts? 
                                                   User said "Prénom Nom sur la même ligne". Usually contacts don't show phone in list.
                                                   I'll keep it very subtle or remove it for cleaner look. 
                                                   Let's remove phone from main view to match iPhone Contacts strict style, 
                                                   or keep it small if user relies on it. I'll keep it small. */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}
        </div>
    );
}
