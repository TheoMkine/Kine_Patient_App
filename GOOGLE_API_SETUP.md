# Configuration Google API

Ce guide vous explique comment configurer les API Google Drive et Sheets pour utiliser l'application Kiné App Patient.

## 🔑 Identifiants fournis

Les identifiants suivants sont déjà configurés dans `src/config/google.js` :

- **Client ID** : `740423920986-d529ee2tisdq23i742f0n9a4l95k17p5.apps.googleusercontent.com`
- **API Key** : `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`
- **Drive Folder ID** : `1DkwP5mOrMlv7Y2kVLCGf1Swqy4s2vCeM`

> **⚠️ IMPORTANT** : Ces identifiants doivent être configurés dans la Google Cloud Console pour fonctionner correctement.

---

## 📝 Étapes de configuration

### 1. Accéder à Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Connectez-vous avec votre compte Google
3. Créez un nouveau projet ou sélectionnez un projet existant

### 2. Activer les API nécessaires

1. Dans le menu de navigation (☰), allez dans **APIs & Services > Library**
2. Recherchez et activez les API suivantes :
   - **Google Drive API**
   - **Google Sheets API**

### 3. Configurer l'écran de consentement OAuth

1. Allez dans **APIs & Services > OAuth consent screen**
2. Sélectionnez le type d'utilisateur :
   - **Interne** : Si vous utilisez Google Workspace (recommandé)
   - **Externe** : Pour les comptes Google personnels
3. Remplissez les informations obligatoires :
   - **Nom de l'application** : "Kiné App Patient"
   - **Email de support utilisateur** : Votre email
   - **Domaine de l'application** : Laissez vide pour le développement local
4. Ajoutez les scopes requis :
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/spreadsheets`
5. Sauvegardez et continuez

### 4. Créer les identifiants OAuth 2.0

1. Allez dans **APIs & Services > Credentials**
2. Cliquez sur **Create Credentials > OAuth client ID**
3. Sélectionnez **Web application** comme type d'application
4. Configurez les URI autorisés :

   **JavaScript origins autorisés** :
   ```
   http://localhost:5173
   http://localhost:5174
   https://votre-domaine.com (pour la production)
   ```

   **Redirect URIs autorisés** :
   ```
   http://localhost:5173
   https://votre-domaine.com (pour la production)
   ```

5. Cliquez sur **Create**
6. **Notez le Client ID généré** - vous devrez le mettre à jour dans `src/config/google.js` si différent

### 5. Créer une clé API

1. Toujours dans **Credentials**
2. Cliquez sur **Create Credentials > API Key**
3. Une clé API est générée
4. **Recommandé** : Cliquez sur **Restrict Key**
   - Restreignez-la aux API : Google Drive API et Google Sheets API
   - Ajoutez des restrictions HTTP referrers pour la sécurité
5. **Notez la clé API générée** - mettez-la à jour dans `src/config/google.js` si différente

### 6. Préparer le dossier Google Drive

1. Accédez à [Google Drive](https://drive.google.com)
2. Le dossier avec l'ID `1DkwP5mOrMlv7Y2kVLCGf1Swqy4s2vCeM` doit exister
3. **Pour créer un nouveau dossier** :
   - Créez un dossier dans Drive
   - Ouvrez-le et copiez l'ID depuis l'URL : `drive.google.com/drive/folders/VOTRE_ID_ICI`
   - Mettez à jour `DRIVE_FOLDER_ID` dans `src/config/google.js`
4. **Important** : Assurez-vous que le compte qui se connecte a accès à ce dossier

### 7. Mettre à jour la configuration

Si vous avez des identifiants différents, mettez à jour le fichier `src/config/google.js` :

```javascript
export const GOOGLE_CLIENT_ID = "VOTRE_CLIENT_ID";
export const GOOGLE_API_KEY = "VOTRE_API_KEY";
export const DRIVE_FOLDER_ID = "VOTRE_FOLDER_ID";
```

---

## 🧪 Tester la configuration

### Test en développement

1. Lancez l'application :
   ```bash
   npm run dev
   ```

2. Ouvrez `http://localhost:5173`

3. Cliquez sur "Se connecter avec Google"

4. **Vérifiez** :
   - La popup de connexion Google s'ouvre
   - Vous pouvez sélectionner votre compte
   - Les permissions Drive et Sheets sont demandées
   - Après autorisation, vous accédez à l'application

### Test des fonctionnalités

1. **Créez un patient** :
   - Vérifiez que le dossier est créé dans Drive
   - Structure : `KINE_APP/Patients/NOM_PRENOM_TELEPHONE/`

2. **Ajoutez un bilan** :
   - Vérifiez que la photo est uploadée dans `Bilans/`

3. **Ajoutez une séance** :
   - Vérifiez que la photo est dans `Seances/`
   - Vérifiez que le Google Sheet "journal" est créé et rempli

---

## ⚠️ Problèmes fréquents

### "popup_closed_by_user" ou "access_denied"

**Cause** : L'utilisateur a fermé la popup ou refusé les permissions

**Solution** :
- Acceptez toutes les permissions demandées
- Vérifiez que les scopes sont correctement configurés dans l'écran de consentement

### "redirect_uri_mismatch"

**Cause** : L'URL de redirection n'est pas autorisée

**Solution** :
- Ajoutez l'URL exacte dans **OAuth client > Authorized redirect URIs**
- Incluez `http://localhost:5173` pour le développement
- Pas de slash final

### "Access blocked: This app's request is invalid"

**Cause** : Les scopes ne sont pas configurés correctement

**Solution** :
- Vérifiez que les scopes Drive et Sheets sont ajoutés dans l'écran de consentement OAuth
- Republiez l'application si nécessaire

### "API key not valid"

**Cause** : La clé API n'est pas correcte ou restreinte

**Solution** :
- Vérifiez que la clé API est active
- Vérifiez les restrictions (HTTP referrers, APIs autorisées)
- Régénérez une nouvelle clé si nécessaire

### Les fichiers ne s'uploadent pas

**Cause** : Problème de permissions ou d'ID de dossier

**Solution** :
- Vérifiez que le `DRIVE_FOLDER_ID` est correct
- Vérifiez que le compte connecté a accès au dossier
- Vérifiez les scopes incluent `drive.file` et `drive`

---

## 🚀 Déploiement en production

### Avant de déployer

1. **Mettez à jour les URI autorisés** dans Google Cloud Console :
   - Ajoutez votre domaine de production
   - Exemple : `https://kine-app.example.com`

2. **Vérifiez les restrictions de sécurité** :
   - Restreignez la clé API aux domaines autorisés
   - Activez les restrictions HTTP referrers

3. **Publiez l'écran de consentement** (si type Externe) :
   - Demandez une révision Google si nécessaire
   - Ou restez en mode "Testing" avec utilisateurs limités

### Recommandations de sécurité

- Ne commitez JAMAIS vos clés dans un dépôt public
- Utilisez des variables d'environnement pour la production
- Activez toutes les restrictions possibles sur votre clé API
- Limitez les scopes au strict nécessaire

---

## 📞 Support

Pour plus d'informations :
- [Documentation Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Documentation Google Drive API](https://developers.google.com/drive)
- [Documentation Google Sheets API](https://developers.google.com/sheets)
