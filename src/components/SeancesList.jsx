import { useState, useEffect } from 'react';
import { listFilesInFolder, uploadFileToDrive, generateDateFilename, getFileUrl, deleteFile, downloadFileContent } from '../services/driveService';
import { getSeancesFromJournal, addSeanceToJournal, updateSeanceInJournal, deleteSeanceFromJournal } from '../services/sheetsService';
import ZoomableImage from './ZoomableImage';

const createImagePreview = (file, maxWidth = 800) => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxWidth / img.width);
            const canvas = document.createElement('canvas');
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
};

export default function SeancesList({ patient }) {
    const [seances, setSeances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedSeance, setSelectedSeance] = useState(null);
    const [hdImageUrl, setHdImageUrl] = useState(null);

    // Effect to load HD image when seance is selected
    useEffect(() => {
        let url = null;
        if (selectedSeance?.fileId) {
            const loadHd = async () => {
                try {
                    const blob = await downloadFileContent(selectedSeance.fileId);
                    url = URL.createObjectURL(blob);
                    setHdImageUrl(url);
                } catch (err) {
                    console.error('Error loading HD image:', err);
                }
            };
            loadHd();
        } else {
            setHdImageUrl(null);
        }

        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [selectedSeance]);

    useEffect(() => {
        if (patient) {
            loadSeances();
        }
    }, [patient]);

    const loadSeances = async () => {
        setLoading(true);
        try {
            // Load from journal sheet
            const journalSeances = await getSeancesFromJournal(patient.journalSheetId);

            // Load files from folder to get image URLs
            const files = await listFilesInFolder(patient.seancesFolderId);

            // Merge data
            const mergedSeances = journalSeances.map(seance => {
                const file = files.find(f => f.name === seance.fileName);
                const fileId = file?.id;

                return {
                    ...seance,
                    fileId,
                    thumbnailLink: file?.thumbnailLink,
                    webViewLink: file?.webViewLink,
                    webContentLink: file?.webContentLink
                };
            });

            setSeances(mergedSeances);
        } catch (error) {
            console.error('Error loading seances:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            {/* Add Seance Button */}
            <button
                onClick={() => setShowAddForm(true)}
                className="btn btn-primary btn-full mb-lg"
            >
                📷 Ajouter une séance
            </button>

            {/* Seances List */}
            {seances.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🏋️</div>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Aucune séance</h3>
                    <p className="text-secondary">
                        Ajoutez votre première séance avec une photo
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {seances.map((seance, index) => (
                        <div
                            key={index}
                            className="card card-clickable"
                            onClick={() => seance.fileId && setSelectedSeance(seance)}
                        >
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                                {seance.thumbnailLink && (
                                    <img
                                        src={seance.thumbnailLink}
                                        alt={seance.fileName}
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            objectFit: 'cover',
                                            borderRadius: 'var(--radius-sm)',
                                            flexShrink: 0
                                        }}
                                    />
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                        <h4>{seance.date}</h4>
                                    </div>
                                    {seance.description && (
                                        <p className="text-secondary text-sm" style={{ marginBottom: 'var(--spacing-xs)' }}>
                                            {seance.description}
                                        </p>
                                    )}
                                    <p className="text-secondary text-sm">
                                        📄 {seance.fileName}
                                    </p>
                                </div>
                                {seance.fileId && <span style={{ fontSize: '24px' }}>→</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Seance Form */}
            {showAddForm && (
                <SeanceForm
                    patient={patient}
                    onClose={() => setShowAddForm(false)}
                    onSeanceAdded={() => {
                        setShowAddForm(false);
                        loadSeances();
                    }}
                />
            )}

            {isEditing && selectedSeance && (
                <SeanceForm
                    patient={patient}
                    editData={selectedSeance}
                    onClose={() => setIsEditing(false)}
                    onSeanceAdded={() => {
                        setIsEditing(false);
                        setSelectedSeance(null);
                        loadSeances();
                    }}
                />
            )}

            {/* Image Modal */}
            {selectedSeance && !isEditing && (
                <div className="modal-overlay" onClick={() => setSelectedSeance(null)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '900px', width: '100%' }}
                    >
                        <div
                            style={{
                                padding: 'var(--spacing-lg)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 'var(--spacing-md)'
                            }}
                        >
                            <h3 style={{ marginBottom: 0 }}>Séance du {selectedSeance.date}</h3>
                            {selectedSeance.description && (
                                <p className="text-secondary" style={{ textAlign: 'center' }}>
                                    {selectedSeance.description}
                                </p>
                            )}
                            <div
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}
                            >
                                <ZoomableImage
                                    src={hdImageUrl || selectedSeance.thumbnailLink || getFileUrl(selectedSeance.fileId)}
                                    alt={selectedSeance.fileName}
                                    style={{
                                        width: '100%',
                                        maxWidth: '700px',
                                        maxHeight: '80vh',
                                        objectFit: 'contain',
                                        borderRadius: 'var(--radius-sm)',
                                        opacity: hdImageUrl ? 1 : 0.6,
                                        transition: 'opacity 0.3s ease'
                                    }}
                                />
                                {!hdImageUrl && (
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                        <div className="spinner" style={{ width: '30px', height: '30px' }} />
                                    </div>
                                )}
                            </div>
                            {selectedSeance.webViewLink && (
                                <button
                                    onClick={() => window.open(selectedSeance.webViewLink, '_blank')}
                                    className="btn btn-secondary"
                                    style={{ width: '100%' }}
                                >
                                    Ouvrir dans Drive
                                </button>
                            )}
                            <button
                                onClick={() => setIsEditing(true)}
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                            >
                                ✏️ Modifier
                            </button>
                            <button
                                onClick={() => setSelectedSeance(null)}
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Seance Form Component (Supports Add and Edit)
function SeanceForm({ patient, onClose, onSeanceAdded, editData = null }) {
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(editData?.thumbnailLink || null);
    const [description, setDescription] = useState(editData?.description || '');
    const [date, setDate] = useState(editData?.date || new Date().toISOString().split('T')[0]);
    const [uploading, setUploading] = useState(false);

    const isEditMode = !!editData;

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            const url = URL.createObjectURL(file);
            setPhotoPreview(url);
            // Note: In a real app, we'd revoke this URL when the component unmounts 
            // or when a new photo is selected. For simplicity here, we'll keep it.
        }
    };

    const handleDelete = async () => {
        if (!isEditMode || !editData) return;

        if (window.confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette séance ?\n\nCette action est irréversible.')) {
            setUploading(true);
            try {
                // 1. Delete photo from Drive
                if (editData.fileId) {
                    await deleteFile(editData.fileId).catch(err => {
                        console.error('Error deleting file from Drive:', err);
                    });
                }

                // 2. Delete row from journal
                await deleteSeanceFromJournal(patient.journalSheetId, editData.rowIndex);

                onSeanceAdded();
            } catch (error) {
                console.error('Error deleting seance:', error);
                alert('Erreur lors de la suppression de la séance : ' + error.message);
            } finally {
                setUploading(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!photo && !isEditMode) {
            alert('Veuillez prendre une photo');
            return;
        }

        setUploading(true);
        try {
            let fileName = editData?.fileName;
            let fileId = editData?.fileId;

            // 1. Handle Photo Upload if changed or new
            if (photo) {
                const uploadResult = await uploadFileToDrive(photo, patient.seancesFolderId, generateDateFilename('webp'));
                fileId = uploadResult?.id;
                fileName = uploadResult?.name; // Use the actual name returned (which will be .webp)
            }

            // 2. Update or Add to Journal
            if (isEditMode) {
                await updateSeanceInJournal(patient.journalSheetId, editData.rowIndex, date, fileName, description);
            } else {
                await addSeanceToJournal(patient.journalSheetId, fileName, description, date);
            }

            onSeanceAdded();
        } catch (error) {
            console.error('Error saving seance:', error);
            alert('Erreur lors de l\'enregistrement de la séance : ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: 'var(--spacing-lg)' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>
                        {isEditMode ? 'Modifier la Séance' : 'Nouvelle Séance'}
                    </h2>

                    <form onSubmit={handleSubmit}>
                        {/* Date Input */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="seance-date">Date *</label>
                            <input
                                id="seance-date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                disabled={uploading}
                                required
                                style={{
                                    width: '100%',
                                    minHeight: '56px',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--spacing-md) var(--spacing-lg)',
                                    backgroundColor: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-primary)',
                                    fontWeight: '500',
                                    fontFamily: 'inherit',
                                    fontSize: 'var(--font-size-base)',
                                    boxSizing: 'border-box',
                                    appearance: 'none',
                                    display: 'block'
                                }}
                            />
                        </div>

                        {/* Photo Input */}
                        <div className="form-group">
                            <label className="form-label">Photo {isEditMode ? '(facultatif pour changement)' : '*'}</label>
                            <label className="btn btn-secondary btn-full" style={{ cursor: 'pointer' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoChange}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                                📷 {photo ? 'Photo prise ✓' : (isEditMode ? 'Changer la photo' : 'Prendre une photo')}
                            </label>
                        </div>

                        {/* Photo Preview */}
                        {photoPreview && (
                            <div className="image-preview mb-md">
                                <img src={photoPreview} alt="Preview" />
                            </div>
                        )}

                        {/* Description */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="description">
                                Description (facultatif)
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Notes sur la séance..."
                                rows={4}
                                disabled={uploading}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="btn btn-secondary"
                                    disabled={uploading}
                                    style={{ flex: 1 }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-success"
                                    disabled={uploading || (!photo && !isEditMode)}
                                    style={{ flex: 1 }}
                                >
                                    {uploading ? (
                                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                                    ) : (
                                        'Valider'
                                    )}
                                </button>
                            </div>

                            {isEditMode && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="btn btn-danger btn-full"
                                    disabled={uploading}
                                    style={{ background: '#dc3545', border: 'none' }}
                                >
                                    🗑️ Supprimer la séance
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
