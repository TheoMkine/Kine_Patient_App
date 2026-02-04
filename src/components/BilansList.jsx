import { useState, useEffect } from 'react';
import { listFilesInFolder, uploadFileToDrive } from '../services/driveService';

// Local metadata for grouped bilans: one bilan can contain several photos
const getBilansMetaKey = (patientId) => `bilans_meta_${patientId}`;

const getBilansMeta = (patientId) => {
    try {
        return JSON.parse(localStorage.getItem(getBilansMetaKey(patientId)) || '[]');
    } catch {
        return [];
    }
};

const saveBilansMeta = (patientId, bilans) => {
    localStorage.setItem(getBilansMetaKey(patientId), JSON.stringify(bilans));
};

// Clean a title to be used safely in file names
const sanitizeTitleForFileName = (title) =>
    title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '');

// Format date as DD_MM_YYYY
const formatDateForName = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}_${month}_${year}`;
};

export default function BilansList({ patient }) {
    const [bilans, setBilans] = useState([]); // grouped bilans
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedBilan, setSelectedBilan] = useState(null);

    useEffect(() => {
        if (patient) {
            loadBilans();
        }
    }, [patient]);

    const loadBilans = async () => {
        setLoading(true);
        try {
            const files = await listFilesInFolder(patient.bilansFolderId);
            const filesById = new Map(files.map((f) => [f.id, f]));

            const meta = getBilansMeta(patient.id);

            // 1. Bilans définis par la meta (nouveau système)
            const usedFileIds = new Set();
            const metaBilans = meta.map((bilan) => {
                const bilanFiles = bilan.fileIds
                    .map((id) => filesById.get(id))
                    .filter(Boolean);

                bilanFiles.forEach((f) => usedFileIds.add(f.id));

                const createdAt =
                    bilanFiles[0]?.createdTime || bilan.createdAt || new Date().toISOString();

                return {
                    id: bilan.id,
                    title: bilan.title,
                    createdAt,
                    files: bilanFiles,
                };
            }).filter((b) => b.files.length > 0);

            // 2. Fichiers orphelins (anciens bilans, 1 fichier = 1 bilan sans titre)
            const orphanBilans = files
                .filter((f) => !usedFileIds.has(f.id))
                .map((file) => ({
                    id: file.id,
                    title: '',
                    createdAt: file.createdTime,
                    files: [file],
                }));

            const allBilans = [...metaBilans, ...orphanBilans].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            );

            setBilans(allBilans);
        } catch (error) {
            console.error('Error loading bilans:', error);
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
            {/* Add Bilan Button */}
            <button
                className="btn btn-primary btn-full mb-lg"
                onClick={() => setShowAddForm(true)}
            >
                📷 Ajouter un bilan
            </button>

            {/* Bilans List */}
            {bilans.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Aucun bilan</h3>
                    <p className="text-secondary">
                        Ajoutez votre premier bilan en prenant une ou plusieurs photos
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {bilans.map((bilan) => {
                        const cover = bilan.files[0];
                        return (
                            <div
                                key={bilan.id}
                                className="card card-clickable"
                                onClick={() => setSelectedBilan(bilan)}
                            >
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                                    {cover?.thumbnailLink && (
                                        <img
                                            src={cover.thumbnailLink}
                                            alt={cover.name}
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                objectFit: 'cover',
                                                borderRadius: 'var(--radius-sm)',
                                                flexShrink: 0,
                                            }}
                                        />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ marginBottom: 'var(--spacing-xs)' }}>
                                            {bilan.title || cover?.name}
                                        </h4>
                                        <p className="text-secondary text-sm">
                                            {new Date(bilan.createdAt).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </p>
                                        {bilan.files.length > 1 && (
                                            <p className="text-secondary text-sm">
                                                {bilan.files.length} photos
                                            </p>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '24px' }}>→</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Bilan Form */}
            {showAddForm && (
                <AddBilanForm
                    patient={patient}
                    onClose={() => setShowAddForm(false)}
                    onBilanAdded={loadBilans}
                />
            )}

            {/* Bilan Modal with all photos */}
            {selectedBilan && (
                <div className="modal-overlay" onClick={() => setSelectedBilan(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: 'var(--spacing-lg)' }}>
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
                                {selectedBilan.title || 'Bilan'} –{' '}
                                {new Date(selectedBilan.createdAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                {selectedBilan.files.map((file) => (
                                    <div key={file.id} className="image-preview">
                                        <img src={file.thumbnailLink} alt={file.name} />
                                    </div>
                                ))}
                            </div>

                            {selectedBilan.files[0]?.webViewLink && (
                                <button
                                    onClick={() => window.open(selectedBilan.files[0].webViewLink, '_blank')}
                                    className="btn btn-secondary btn-full mt-md"
                                >
                                    Ouvrir dans Drive
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedBilan(null)}
                                className="btn btn-primary btn-full mt-md"
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

// Add Bilan Form Component
function AddBilanForm({ patient, onClose, onBilanAdded }) {
    const [title, setTitle] = useState('');
    const [photos, setPhotos] = useState([]);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handlePhotosChange = (e) => {
        const files = Array.from(e.target.files || []);
        setPhotos(files);
        setError('');

        if (files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(files[0]);
        } else {
            setPhotoPreview(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Le titre du bilan est obligatoire');
            return;
        }

        if (photos.length === 0) {
            setError('Ajoutez au moins une photo');
            return;
        }

        setUploading(true);
        try {
            const now = new Date();
            const dateName = formatDateForName(now);
            const safeTitle = sanitizeTitleForFileName(title) || 'bilan';
            const fileNameBase = `${dateName}_${safeTitle}`;

            // Upload all photos in parallel
            const uploadResults = await Promise.all(
                photos.map((file) =>
                    uploadFileToDrive(
                        file,
                        patient.bilansFolderId,
                        `${fileNameBase}.jpg`,
                    ),
                ),
            );

            // Save meta
            const existing = getBilansMeta(patient.id);
            const newBilan = {
                id: Date.now().toString(),
                title: title.trim(),
                date: now.toISOString(),
                fileIds: uploadResults.map((r) => r.id),
            };
            saveBilansMeta(patient.id, [...existing, newBilan]);

            onBilanAdded();
            onClose();
        } catch (error) {
            console.error('Error adding bilan:', error);
            setError('Erreur lors de l\'ajout du bilan. Vérifiez votre connexion.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: 'var(--spacing-lg)' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-xl)' }}>
                        Nouveau Bilan
                    </h2>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="bilan-title">
                                Titre du bilan *
                            </label>
                            <input
                                id="bilan-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Exemple : Lombalgie"
                                disabled={uploading}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Photos *</label>
                            <label className="btn btn-secondary btn-full" style={{ cursor: 'pointer' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    onChange={handlePhotosChange}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                                📷 {photos.length > 0 ? `${photos.length} photo(s) sélectionnée(s)` : 'Ajouter des photos'}
                            </label>
                        </div>

                        {photoPreview && (
                            <div className="image-preview mb-md">
                                <img src={photoPreview} alt="Preview" />
                            </div>
                        )}

                        {error && (
                            <div className="form-error" style={{ marginBottom: 'var(--spacing-md)' }}>
                                {error}
                            </div>
                        )}

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
                                className="btn btn-primary"
                                disabled={uploading}
                                style={{ flex: 1 }}
                            >
                                {uploading ? (
                                    <div
                                        className="spinner"
                                        style={{ width: '20px', height: '20px', borderWidth: '2px' }}
                                    />
                                ) : (
                                    'Enregistrer'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
