import { useState, useEffect } from 'react';
import { listFilesInFolder, uploadFileToDrive, generateDateFilename, getFileUrl } from '../services/driveService';
import { getSeancesFromJournal, addSeanceToJournal, updateSeanceInJournal } from '../services/sheetsService';
import ZoomableImage from './ZoomableImage';

const getSeancesPreviewKey = (patientId) => `seances_previews_${patientId}`;

const getSeancesPreviews = (patientId) => {
    try {
        return JSON.parse(localStorage.getItem(getSeancesPreviewKey(patientId)) || '[]');
    } catch {
        return [];
    }
};

const saveSeancePreview = (patientId, fileId, dataUrl) => {
    const existing = getSeancesPreviews(patientId);
    existing.push({ fileId, dataUrl });
    localStorage.setItem(getSeancesPreviewKey(patientId), JSON.stringify(existing));
};

const createImagePreview = (file, maxWidth = 800) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxWidth / img.width);
                const canvas = document.createElement('canvas');
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function SeancesList({ patient }) {
    const [seances, setSeances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedSeance, setSelectedSeance] = useState(null);

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

            const previews = getSeancesPreviews(patient.id);

            // Merge data
            const mergedSeances = journalSeances.map(seance => {
                const file = files.find(f => f.name === seance.fileName);
                const fileId = file?.id;
                const preview = previews.find((p) => p.fileId === fileId);

                return {
                    ...seance,
                    fileId,
                    thumbnailLink: file?.thumbnailLink,
                    webViewLink: file?.webViewLink,
                    webContentLink: file?.webContentLink,
                    localThumbnail: preview?.dataUrl || null
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
                                {(seance.localThumbnail || seance.thumbnailLink) && (
                                    <img
                                        src={seance.localThumbnail || seance.thumbnailLink}
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
                                    src={selectedSeance.localThumbnail || selectedSeance.thumbnailLink || getFileUrl(selectedSeance.fileId)}
                                    alt={selectedSeance.fileName}
                                    style={{
                                        width: '100%',
                                        maxWidth: '700px',
                                        maxHeight: '80vh',
                                        objectFit: 'contain',
                                        borderRadius: 'var(--radius-sm)'
                                    }}
                                />
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
    const [photoPreview, setPhotoPreview] = useState(editData?.localThumbnail || editData?.thumbnailLink || null);
    const [description, setDescription] = useState(editData?.description || '');
    const [date, setDate] = useState(editData?.date || new Date().toISOString().split('T')[0]);
    const [uploading, setUploading] = useState(false);

    const isEditMode = !!editData;

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
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
                // If adding, generate new name. If editing, we keep the original name to replace? 
                // Drive upload with same name in same folder might create a duplicate unless we handle it.
                // Let's generate a new name for sanity and clean up later if needed, 
                // but the user wants to "change of photo".
                fileName = generateDateFilename('jpg');
                const [uploadResult, previewDataUrl] = await Promise.all([
                    uploadFileToDrive(photo, patient.seancesFolderId, fileName),
                    createImagePreview(photo)
                ]);
                fileId = uploadResult?.id;

                // Save local preview linked to file id
                if (fileId && previewDataUrl) {
                    saveSeancePreview(patient.id, fileId, previewDataUrl);
                }
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
            alert('Erreur lors de l\'enregistrement de la séance');
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
                    </form>
                </div>
            </div>
        </div>
    );
}
