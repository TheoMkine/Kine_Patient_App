import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import PatientList from './components/PatientList';
import PatientForm from './components/PatientForm';
import PatientDetail from './components/PatientDetail';
import { initGoogleAPI, initGoogleIdentity, handleAuthClick, isAuthenticated } from './services/googleAuth';
import './styles/index.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize Google Identity Services
      await initGoogleIdentity();
      await initGoogleAPI(); // Keeping for compatibility, though empty now

      // Check if already authenticated
      if (isAuthenticated()) {
        setAuthenticated(true);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      await handleAuthClick();
      setAuthenticated(true);
    } catch (error) {
      console.error('Error during login:', error);
      alert('Erreur lors de la connexion. Veuillez réessayer.');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setSelectedPatient(null);
  };

  const handlePatientCreated = () => {
    setShowPatientForm(false);
    setRefreshKey(prev => prev + 1); // Force refresh of patient list
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
  };

  const handlePatientUpdated = (updatedPatient) => {
    setSelectedPatient(updatedPatient);
    // refresh list so name / phone are updated
    setRefreshKey(prev => prev + 1);
  };

  const handleBack = () => {
    setSelectedPatient(null);
  };

  // Loading screen
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto var(--spacing-lg)' }} />
          <p className="text-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!authenticated) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh', padding: 'var(--spacing-lg)' }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-md)' }}>
            🏥 Kiné App
          </h1>
          <p className="text-secondary mb-lg">
            Application de gestion des patients pour kinésithérapeutes
          </p>
          <button onClick={handleLogin} className="btn btn-primary btn-full">
            Se connecter avec Google
          </button>
          <p className="text-secondary text-sm mt-md">
            Nécessite un compte Google avec accès à Drive et Sheets
          </p>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <Layout onSignout={handleLogout}>
      {selectedPatient ? (
        <PatientDetail
          patient={selectedPatient}
          onBack={handleBack}
          onPatientUpdated={handlePatientUpdated}
        />
      ) : (
        <div className="container" style={{ paddingTop: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Mes Patients</h2>
            <button
              onClick={() => setShowPatientForm(true)}
              className="btn btn-primary"
              style={{ minHeight: '44px', padding: '8px 16px' }}
            >
              + Nouveau
            </button>
          </div>

          <PatientList key={refreshKey} onSelectPatient={handleSelectPatient} />

          {showPatientForm && (
            <PatientForm
              onPatientCreated={handlePatientCreated}
              onCancel={() => setShowPatientForm(false)}
            />
          )}
        </div>
      )}
    </Layout>
  );
}

export default App;
