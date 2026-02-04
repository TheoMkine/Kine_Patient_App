import { useState } from 'react';
import { createPatientFolder } from '../services/driveService';
import { createJournalSheet } from '../services/sheetsService';

export default function PatientForm({ onPatientCreated, onCancel }) {
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        telephone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.nom.trim() || !formData.prenom.trim() || !formData.telephone.trim()) {
            setError('Tous les champs sont obligatoires');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Create folder structure in Google Drive
            const folderStructure = await createPatientFolder(
                formData.nom.trim(),
                formData.prenom.trim(),
                formData.telephone.trim()
            );

            // Create the journal sheet in Seances folder
            const journalSheetId = await createJournalSheet(
                folderStructure.patientFolderName,
                folderStructure.seancesFolderId
            );

            // Create patient object
            const newPatient = {
                id: Date.now().toString(),
                nom: formData.nom.trim(),
                prenom: formData.prenom.trim(),
                telephone: formData.telephone.trim(),
                patientFolderId: folderStructure.patientFolderId,
                bilansFolderId: folderStructure.bilansFolderId,
                seancesFolderId: folderStructure.seancesFolderId,
                journalSheetId: journalSheetId,
                createdAt: new Date().toISOString()
            };

            // Save to localStorage
            const existingPatients = JSON.parse(localStorage.getItem('patients') || '[]');
            existingPatients.push(newPatient);
            localStorage.setItem('patients', JSON.stringify(existingPatients));

            // Notify parent component
            if (onPatientCreated) {
                onPatientCreated(newPatient);
            }

            // Reset form
            setFormData({ nom: '', prenom: '', telephone: '' });
        } catch (err) {
            console.error('Error creating patient:', err);
            setError('Erreur lors de la création du patient. Vérifiez votre connexion.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: 'var(--spacing-lg)' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-xl)' }}>
                        Nouveau Patient
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="nom">Nom *</label>
                            <input
                                id="nom"
                                type="text"
                                name="nom"
                                value={formData.nom}
                                onChange={handleChange}
                                placeholder="Dupont"
                                disabled={loading}
                                autoComplete="family-name"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="prenom">Prénom *</label>
                            <input
                                id="prenom"
                                type="text"
                                name="prenom"
                                value={formData.prenom}
                                onChange={handleChange}
                                placeholder="Jean"
                                disabled={loading}
                                autoComplete="given-name"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="telephone">Téléphone *</label>
                            <input
                                id="telephone"
                                type="tel"
                                name="telephone"
                                value={formData.telephone}
                                onChange={handleChange}
                                placeholder="0612345678"
                                disabled={loading}
                                autoComplete="tel"
                            />
                        </div>

                        {error && (
                            <div className="form-error" style={{ marginBottom: 'var(--spacing-md)' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <button
                                type="button"
                                onClick={onCancel}
                                className="btn btn-secondary"
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ flex: 1 }}
                            >
                                {loading ? (
                                    <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                                ) : (
                                    'Créer'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
