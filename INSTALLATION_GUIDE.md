# Guide d'installation sur téléphone

Ce guide vous explique comment installer l'application Kiné App Patient sur votre téléphone iOS ou Android pour l'utiliser comme une vraie application.

## 📱 Installation sur iOS (iPhone/iPad)

### Prérequis
- Navigateur Safari (obligatoire pour l'installation PWA sur iOS)
- iOS 11.3 ou supérieur

### Étapes d'installation

1. **Ouvrez Safari** et accédez à l'URL de votre application (par exemple `http://localhost:5173` en développement ou votre URL de production)

2. **Appuyez sur le bouton Partager** 
   - C'est l'icône carrée avec une flèche vers le haut située en bas de l'écran

3. **Faites défiler et sélectionnez "Sur l'écran d'accueil"**
   - Vous devrez peut-être faire défiler vers le bas pour trouver cette option

4. **Personnalisez le nom** (optionnel)
   - Par défaut : "Kiné App"
   - Vous pouvez le modifier si vous le souhaitez

5. **Appuyez sur "Ajouter"** dans le coin supérieur droit

6. **L'application est installée !**
   - Une icône apparaît sur votre écran d'accueil
   - Vous pouvez la déplacer et l'organiser comme n'importe quelle autre app

### Utilisation sur iOS

- L'application s'ouvre en plein écran, sans les barres Safari
- Elle fonctionne même en mode offline (pour la consultation)
- Elle reste dans le multitâche comme une vraie app
- Les notifications et mises à jour sont automatiques

---

## 🤖 Installation sur Android

### Prérequis
- Navigateur Chrome (recommandé)
- Android 5.0 ou supérieur

### Étapes d'installation

1. **Ouvrez Chrome** et accédez à l'URL de votre application

2. **Attendez la bannière d'installation**
   - Une bannière "Installer l'application" devrait apparaître automatiquement en bas
   - Si vous la voyez, appuyez sur "Installer" et passez à l'étape 6

3. **Si la bannière n'apparaît pas, utilisez le menu**
   - Appuyez sur le menu Chrome (⋮) dans le coin supérieur droit

4. **Sélectionnez "Installer l'application"** ou "Ajouter à l'écran d'accueil"
   - Le libellé peut varier selon votre version d'Android

5. **Confirmez l'installation**
   - Appuyez sur "Installer" dans la popup

6. **L'application est installée !**
   - Une icône apparaît sur votre écran d'accueil
   - L'application apparaît également dans votre tiroir d'applications

### Utilisation sur Android

- L'application s'ouvre comme une app native
- Elle apparaît dans le gestionnaire d'applications Android
- Elle fonctionne en mode offline pour la consultation
- Les mises à jour sont automatiques

---

## 🌐 Installation depuis un autre navigateur

### Edge, Firefox, Opera

Ces navigateurs supportent également les PWA sur certaines plateformes :

1. Accédez à l'application dans le navigateur
2. Cherchez l'option "Installer" dans le menu (⋮ ou ≡)
3. Suivez les instructions à l'écran

---

## ✅ Vérification de l'installation

Pour vérifier que l'installation PWA fonctionne correctement :

1. **Ouvrez l'application** depuis l'icône de l'écran d'accueil
2. **Vérifiez que** :
   - L'app s'ouvre en plein écran (sans barre d'adresse)
   - Le fond est noir (mode sombre)
   - Vous voyez l'écran de connexion Google
   - Le statut de connexion apparaît en bas

---

## 🔄 Mise à jour de l'application

Les PWA se mettent à jour automatiquement :

- Chaque fois que vous ouvrez l'app, elle vérifie les mises à jour
- Les nouvelles versions se téléchargent en arrière-plan
- Aucune action requise de votre part

---

## 🗑 Désinstallation

### iOS
1. Maintenez l'icône appuyée
2. Sélectionnez "Supprimer l'app"
3. Confirmez

### Android
1. Maintenez l'icône appuyée
2. Glissez vers "Désinstaller"
3. Confirmez

---

## ❓ Problèmes fréquents

### "Installer l'application" n'apparaît pas

**Solution** :
- Vérifiez que vous utilisez Safari (iOS) ou Chrome (Android)
- Rechargez la page
- Vérifiez votre connexion internet
- Assurez-vous que le manifest.json est correctement configuré

### L'application ne fonctionne pas offline

**Solution** :
- Ouvrez l'app au moins une fois en ligne
- Le cache se remplit lors de la première visite
- Les données se synchronisent lors de la prochaine connexion

### L'icône n'apparaît pas

**Solution** :
- Vérifiez que les fichiers icon-192.png et icon-512.png existent dans `/public`
- Actualisez le cache du navigateur
- Réinstallez l'application

---

## 📞 Support

Pour toute question supplémentaire, consultez :
- [README.md](./README.md) - Documentation principale
- [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md) - Configuration des API Google
- La console du navigateur pour les erreurs techniques
