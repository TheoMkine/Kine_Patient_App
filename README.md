# Kiné App Patient

Application Progressive Web App (PWA) mobile-first pour kinésithérapeutes, permettant de gérer les patients, bilans et séances avec stockage complet dans Google Drive et Google Sheets.

## 🎯 Fonctionnalités

- **Gestion des patients** : Création, recherche et tri alphabétique
- **Bilans** : Capture photo avec la caméra et stockage dans Google Drive
- **Séances** : Photos + descriptions stockées dans Drive et enregistrées dans un journal Google Sheets
- **Mode sombre** : Interface optimisée pour une utilisation rapide
- **PWA** : Installable sur iOS et Android comme une vraie application
- **Offline** : Navigation et consultation des données en cache même sans connexion

## 📋 Prérequis

- Compte Google avec accès à Drive et Sheets
- Node.js 18+ et npm
- Un navigateur moderne (Chrome, Safari, Edge)

## 🚀 Installation pour le développement

```bash
# Cloner ou naviguer vers le dossier
cd Kine_App_Patient

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 🔑 Configuration des API Google

Avant d'utiliser l'application, vous devez configurer les API Google. Consultez le fichier [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md) pour les instructions détaillées.

Les identifiants sont déjà configurés dans `src/config/google.js` :
- Client ID
- API Key
- Folder ID

**Important** : Assurez-vous que ces identifiants sont correctement configurés dans la Google Cloud Console avec :
- Les APIs Drive et Sheets activées
- Les scopes appropriés autorisés
- L'URL de votre application ajoutée aux origines autorisées

## 📱 Installation sur téléphone

Consultez le fichier [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) pour les instructions détaillées d'installation sur iOS et Android.

### Résumé rapide :

**iOS (Safari)** :
1. Ouvrir l'application dans Safari
2. Appuyer sur le bouton "Partager"
3. Choisir "Sur l'écran d'accueil"

**Android (Chrome)** :
1. Ouvrir l'application dans Chrome
2. Appuyer sur le menu (⋮)
3. Choisir "Installer l'application"

## 📁 Structure de fichiers

```
Kine_App_Patient/
├── public/
│   ├── sw.js                 # Service Worker pour PWA
│   ├── icon-192.png         # Icône PWA 192x192
│   └── icon-512.png         # Icône PWA 512x512
├── src/
│   ├── components/
│   │   ├── Layout.jsx       # Layout principal
│   │   ├── PatientForm.jsx  # Formulaire création patient
│   │   ├── PatientList.jsx  # Liste des patients
│   │   ├── PatientDetail.jsx # Vue détaillée patient
│   │   ├── BilansList.jsx   # Gestion des bilans
│   │   └── SeancesList.jsx  # Gestion des séances
│   ├── services/
│   │   ├── googleAuth.js    # Authentification Google
│   │   ├── driveService.js  # Gestion Google Drive
│   │   └── sheetsService.js # Gestion Google Sheets
│   ├── config/
│   │   └── google.js        # Configuration API Google
│   ├── styles/
│   │   └── index.css        # Design system
│   ├── App.jsx              # Composant principal
│   └── main.jsx             # Point d'entrée
├── index.html               # HTML principal
├── vite.config.js           # Configuration Vite + PWA
└── package.json             # Dépendances
```

## 🗂 Structure Google Drive

Pour chaque patient, la structure suivante est créée automatiquement :

```
KINE_APP/
└── Patients/
    └── NOM_PRENOM_TELEPHONE/
        ├── Bilans/
        │   ├── 2026-02-04.jpg
        │   └── 2026-02-05.jpg
        └── Seances/
            ├── journal (Google Sheet)
            ├── 2026-02-04.jpg
            └── 2026-02-05.jpg
```

Le Google Sheet "journal" contient :
| Date | Nom du fichier | Description |

## 🏗 Build de production

```bash
# Créer le build de production
npm run build

# Prévisualiser le build
npm run preview
```

Les fichiers de production seront dans le dossier `dist/`

## 🔧 Technologies utilisées

- **React** : Framework UI
- **Vite** : Build tool
- **Google Drive API** : Stockage des fichiers
- **Google Sheets API** : Journal des séances
- **Vite PWA Plugin** : Support PWA
- **Workbox** : Stratégies de cache offline

## 📄 Licence

Usage privé pour professionnels de santé.

## 🆘 Support

Pour toute question sur la configuration ou l'utilisation :
1. Vérifier [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md)
2. Vérifier [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md)
3. Consulter la console du navigateur pour les erreurs
