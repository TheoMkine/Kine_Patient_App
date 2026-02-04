import { useState } from 'react';
import BilansList from './BilansList';
import SeancesList from './SeancesList';
import { deleteFile, renamePatientFolder } from '../services/driveService';

export default function PatientDetail({ patient, onBack, onPatientUpdated }) {
    const [activeTab, setActiveTab] = useState('bilans');
    const [deleting, setDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        nom: patient.nom,
        prenom: patient.prenom,
        telephone: patient.telephone
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');

    const handleDelete = async () => {
        if (window.confirm('⚠️ Êtes-vous sûr de vouloir supprimer ce patient ?\n\nCette action est irréversible et supprimera :\n- Le dossier Drive\n- Toutes les photos (Bilans & Séances)\n- Le journal des séances')) {
            if (window.confirm('⛔️ Confirmation finale : Supprimer DÉFINITIVEMENT ?')) {
                setDeleting(true);
                try {
                    // 1. Delete from Drive (recursively deletes subfolders/files)
                    if (patient.patientFolderId) {
                        await deleteFile(patient.patientFolderId).catch(err => {
                            console.error('Error deleting from Drive:', err);
                            // Verify permission issues specifically? 
                            // Proceed to local delete anyway so user isn't stuck
                        });
                    }

                    // 2. Delete from LocalStorage
                    const storedPatients = JSON.parse(localStorage.getItem('patients') || '[]');
                    const updatedPatients = storedPatients.filter(p => p.id !== patient.id);
                    localStorage.setItem('patients', JSON.stringify(updatedPatients));

                    // 3. Return to list
                    onBack();
                } catch (error) {
                    console.error('Error deleting patient:', error);
                    alert('Erreur lors de la suppression. Vérifiez votre connexion.');
                } finally {
                    setDeleting(false);
                }
            }
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
        setEditError('');
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();

        if (!editData.nom.trim() || !editData.prenom.trim() || !editData.telephone.trim()) {
            setEditError('Tous les champs sont obligatoires');
            return;
        }

        const hasChanges =
            editData.nom.trim() !== patient.nom ||
            editData.prenom.trim() !== patient.prenom ||
            editData.telephone.trim() !== patient.telephone;

        if (!hasChanges) {
            setIsEditing(false);
            return;
        }

        setSavingEdit(true);

        try {
            // 1. Renommer le dossier du patient sur Drive
            if (patient.patientFolderId) {
                await renamePatientFolder(
                    patient.patientFolderId,
                    editData.nom.trim(),
                    editData.prenom.trim(),
                    editData.telephone.trim()
                );
            }

            // 2. Mettre à jour le patient dans le localStorage
            const storedPatients = JSON.parse(localStorage.getItem('patients') || '[]');
            const updatedPatients = storedPatients.map((p) =>
                p.id === patient.id
                    ? {
                        ...p,
                        nom: editData.nom.trim(),
                        prenom: editData.prenom.trim(),
                        telephone: editData.telephone.trim()
                    }
                    : p
            );
            localStorage.setItem('patients', JSON.stringify(updatedPatients));

            // 3. Propager la mise à jour au parent
            const updatedPatient = {
                ...patient,
                nom: editData.nom.trim(),
                prenom: editData.prenom.trim(),
                telephone: editData.telephone.trim()
            };

            if (onPatientUpdated) {
                onPatientUpdated(updatedPatient);
            }

            setIsEditing(false);
        } catch (error) {
            console.error('Error updating patient:', error);
            setEditError('Erreur lors de la mise à jour. Vérifiez votre connexion.');
        } finally {
            setSavingEdit(false);
        }
    };

    if (deleting) {
        return (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto var(--spacing-lg)' }} />
                <p>Suppression en cours...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', paddingBottom: 'var(--spacing-xl)' }}>
            {/* Header */}
            <div style={{
                background: 'var(--surface)',
                padding: 'var(--spacing-lg)',
                marginBottom: 'var(--spacing-lg)',
                borderBottom: '1px solid var(--border)',
                /* Removing sticky positioning to force no-gap layout */
                /* position: 'sticky', */
                /* top: '73px', */
                /* zIndex: 99 */
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                    <button
                        onClick={onBack}
                        className="btn btn-secondary"
                        style={{ minHeight: '44px', padding: '8px 16px' }}
                    >
                        ← Retour
                    </button>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <button
                            onClick={() => {
                                setEditData({
                                    nom: patient.nom,
                                    prenom: patient.prenom,
                                    telephone: patient.telephone
                                });
                                setEditError('');
                                setIsEditing(true);
                            }}
                            className="btn btn-secondary"
                            style={{ minHeight: '44px', padding: '8px 16px' }}
                        >
                            ✏️ Modifier
                        </button>
                        <button
                            onClick={handleDelete}
                            className="btn btn-danger"
                            style={{ minHeight: '44px', padding: '8px 16px', background: '#dc3545', border: 'none' }}
                        >
                            🗑️ Supprimer
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--font-size-xl)',
                        flexShrink: 0
                    }}>
                        {patient.prenom[0]}{patient.nom[0]}
                    </div>

                    <div>
                        <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-xs)' }}>
                            {patient.prenom} {patient.nom}
                        </h2>
                        <a href={`tel:${patient.telephone}`} style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📞 {patient.telephone}
                        </a>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ marginTop: 'var(--spacing-lg)', marginBottom: 0 }}>
                    <button
                        className={`tab ${activeTab === 'bilans' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bilans')}
                    >
                        📋 Bilans
                    </button>
                    <button
                        className={`tab ${activeTab === 'seances' ? 'active' : ''}`}
                        onClick={() => setActiveTab('seances')}
                    >
                        🏋️ Séances
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="container" style={{ paddingTop: 0 }}>
                {activeTab === 'bilans' ? (
                    <BilansList patient={patient} />
                ) : (
                    <SeancesList patient={patient} />
                )}
            </div>

            {/* Edit modal */}
            {isEditing && (
                <div className="modal-overlay" onClick={() => !savingEdit && setIsEditing(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: 'var(--spacing-lg)' }}>
                            <h2 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-xl)' }}>
                                Modifier le patient
                            </h2>

                            <form onSubmit={handleEditSubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="edit-nom">Nom *</label>
                                    <input
                                        id="edit-nom"
                                        type="text"
                                        name="nom"
                                        value={editData.nom}
                                        onChange={handleEditChange}
                                        disabled={savingEdit}
                                        autoComplete="family-name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="edit-prenom">Prénom *</label>
                                    <input
                                        id="edit-prenom"
                                        type="text"
                                        name="prenom"
                                        value={editData.prenom}
                                        onChange={handleEditChange}
                                        disabled={savingEdit}
                                        autoComplete="given-name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="edit-telephone">Téléphone *</label>
                                    <input
                                        id="edit-telephone"
                                        type="tel"
                                        name="telephone"
                                        value={editData.telephone}
                                        onChange={handleEditChange}
                                        disabled={savingEdit}
                                        autoComplete="tel"
                                    />
                                </div>

                                {editError && (
                                    <div className="form-error" style={{ marginBottom: 'var(--spacing-md)' }}>
                                        {editError}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                    <button
                                        type="button"
                                        onClick={() => !savingEdit && setIsEditing(false)}
                                        className="btn btn-secondary"
                                        disabled={savingEdit}
                                        style={{ flex: 1 }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={savingEdit}
                                        style={{ flex: 1 }}
                                    >
                                        {savingEdit ? (
                                            <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                                        ) : (
                                            'Enregistrer'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
