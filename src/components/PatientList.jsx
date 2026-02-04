import { useState, useEffect } from 'react';

export default function PatientList({ onSelectPatient }) {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = () => {
        const storedPatients = JSON.parse(localStorage.getItem('patients') || '[]');
        setPatients(storedPatients);
    };

    const filteredPatients = patients
        .filter(patient => {
            const search = searchTerm.toLowerCase();
            return (
                patient.nom.toLowerCase().includes(search) ||
                patient.prenom.toLowerCase().includes(search) ||
                patient.telephone.includes(search)
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
