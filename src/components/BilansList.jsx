import { useState, useEffect } from 'react';
import { listFilesInFolder, uploadFileToDrive, getFileUrl, downloadFileContent } from '../services/driveService';
import ZoomableImage from './ZoomableImage';

// Local metadata for grouped bilans: one bilan can contain several photos
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

// Helper component to load HD image for ZoomableImage
function HdZoomableImage({ fileId, thumbnailLink, alt, style }) {
    const [hdUrl, setHdUrl] = useState(null);

    useEffect(() => {
        let url = null;
        const loadHd = async () => {
            try {
                const blob = await downloadFileContent(fileId);
                url = URL.createObjectURL(blob);
                setHdUrl(url);
            } catch (err) {
                console.error('Error loading HD bilan image:', err);
            }
        };
        loadHd();
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [fileId]);

    return (
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <ZoomableImage
                src={hdUrl || thumbnailLink || getFileUrl(fileId)}
                alt={alt}
                style={{
                    ...style,
                    opacity: hdUrl ? 1 : 0.6,
                    transition: 'opacity 0.3s ease'
                }}
            />
            {!hdUrl && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <div className="spinner" style={{ width: '30px', height: '30px' }} />
                </div>
            )}
        </div>
    );
}

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

// Add Bilan Form Component
function AddBilanForm({ patient, onClose, onBilanAdded }) {
    const [title, setTitle] = useState('');
    const [photos, setPhotos] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handlePhotosChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newPreviews = await Promise.all(files.map(createImagePreview));

        setPhotos(prev => [...prev, ...files]);
        setPhotoPreviews(prev => [...prev, ...newPreviews]);
        setError('');
    };

    const removePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
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

            // Upload photos sequentially to avoid memory spikes on mobile
            const results = [];
            for (let i = 0; i < photos.length; i++) {
                const file = photos[i];
                const uploadRes = await uploadFileToDrive(
                    file,
                    patient.bilansFolderId,
                    `${fileNameBase}_${i + 1}.webp`,
                );
                results.push({ uploadRes });
            }

            // Save meta
            const existing = getBilansMeta(patient.id);
            const newBilan = {
                id: Date.now().toString(),
                title: title.trim(),
                date: now.toISOString(),
                fileIds: results.map(r => r.uploadRes.id),
            };
            saveBilansMeta(patient.id, [...existing, newBilan]);

            onBilanAdded();
            onClose();
        } catch (error) {
            console.error('Error adding bilan:', error);
            setError('Erreur lors de l\'ajout du bilan : ' + error.message);
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
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Photos *</label>

                            {photos.length === 0 ? (
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
                                    📷 Ajouter des photos
                                </label>
                            ) : (
                                <div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                                        gap: '8px',
                                        marginBottom: '8px'
                                    }}>
                                        {photoPreviews.map((preview, index) => (
                                            <div key={index} style={{ position: 'relative', aspectRatio: '1' }}>
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index}`}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        borderRadius: 'var(--radius-sm)'
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(index)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-5px',
                                                        right: '-5px',
                                                        background: 'red',
                                                        color: 'white',
                                                        borderRadius: '50%',
                                                        width: '20px',
                                                        height: '20px',
                                                        border: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                        <label
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                aspectRatio: '1',
                                                fontSize: '24px'
                                            }}
                                        >
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                multiple
                                                onChange={handlePhotosChange}
                                                disabled={uploading}
                                                style={{ display: 'none' }}
                                            />
                                            +
                                        </label>
                                    </div>
                                    <p className="text-secondary text-sm">
                                        📷 {photos.length} photo{photos.length > 1 ? 's' : ''} sélectionnée{photos.length > 1 ? 's' : ''}
                                    </p>
                                </div>
                            )}
                        </div>

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

            const enrichFile = (file) => ({
                ...file
            });

            // 1. Bilans définis par la meta (nouveau système)
            const usedFileIds = new Set();
            const metaBilans = meta.map((bilan) => {
                const bilanFiles = bilan.fileIds
                    .map((id) => filesById.get(id))
                    .filter(Boolean)
                    .map(enrichFile);

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

            // 2. Fichiers orphelins (anciens bilans ou synchro multi-appareils)
            // On essaie de regrouper les fichiers orphelins par leur pattern de nom : DD_MM_YYYY_Titre_Index.webp
            const orphanFiles = files.filter((f) => !usedFileIds.has(f.id));
            const groupedOrphans = new Map();

            orphanFiles.forEach(file => {
                // Pattern attendu : 07_02_2026_titre-bilan_1.webp
                const nameParts = file.name.replace(/\.[^/.]+$/, "").split('_');

                // Si le nom ressemble à notre pattern (au moins Date + Titre + Index)
                if (nameParts.length >= 4) {
                    const datePart = `${nameParts[0]}_${nameParts[1]}_${nameParts[2]}`;
                    const index = nameParts[nameParts.length - 1];
                    const titlePart = nameParts.slice(3, -1).join('_');
                    const groupKey = `${datePart}_${titlePart}`;

                    if (!groupedOrphans.has(groupKey)) {
                        groupedOrphans.set(groupKey, {
                            title: titlePart.replace(/-/g, ' '),
                            files: [],
                            date: file.createdTime
                        });
                    }
                    groupedOrphans.get(groupKey).files.push(enrichFile(file));
                } else {
                    // Fichier vraiment isolé ou ancien format
                    const groupKey = `isolated_${file.id}`;
                    groupedOrphans.set(groupKey, {
                        title: file.name.split('.')[0],
                        files: [enrichFile(file)],
                        date: file.createdTime
                    });
                }
            });

            const orphanBilans = Array.from(groupedOrphans.values()).map((group, index) => ({
                id: `orphan_${index}`,
                title: group.title,
                createdAt: group.date,
                files: group.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
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
                                            alt={cover?.name}
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
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '900px', width: '100%' }}
                    >
                        <div style={{
                            padding: 'var(--spacing-lg)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 'var(--spacing-md)'
                        }}>
                            <h3 style={{ marginBottom: 0 }}>
                                {selectedBilan.title || 'Bilan'} –{' '}
                                {new Date(selectedBilan.createdAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </h3>

                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                                {selectedBilan.files.map((file) => (
                                    <HdZoomableImage
                                        key={file.id}
                                        fileId={file.id}
                                        thumbnailLink={file.thumbnailLink}
                                        alt={file.name}
                                        style={{
                                            width: '100%',
                                            maxWidth: '700px',
                                            maxHeight: '80vh',
                                            objectFit: 'contain',
                                            borderRadius: 'var(--radius-sm)'
                                        }}
                                    />
                                ))}
                            </div>

                            {selectedBilan.files[0]?.webViewLink && (
                                <button
                                    onClick={() => window.open(selectedBilan.files[0].webViewLink, '_blank')}
                                    className="btn btn-secondary"
                                    style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
                                >
                                    Ouvrir dans Drive
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedBilan(null)}
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
