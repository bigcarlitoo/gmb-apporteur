# 🗺️ Configuration Google Maps Places Autocomplete

## 📋 Vue d'ensemble

L'application utilise Google Places Autocomplete pour faciliter la saisie des
adresses lors de la création d'un dossier. Cette fonctionnalité permet de :

- ✅ Saisir une adresse avec autocomplétion intelligente
- ✅ Remplir automatiquement le code postal et la ville
- ✅ Réduire les erreurs de saisie
- ✅ Améliorer l'expérience utilisateur

## 🚀 Configuration

### 1. Obtenir une clé API Google Maps

1. **Créer un projet Google Cloud**
   - Allez sur [Google Cloud Console](https://console.cloud.google.com/)
   - Créez un nouveau projet ou sélectionnez un projet existant

2. **Activer l'API Places**
   - Dans le menu, allez dans **APIs & Services** > **Library**
   - Recherchez "Places API"
   - Cliquez sur **Enable** pour activer l'API

3. **Créer une clé API**
   - Allez dans **APIs & Services** > **Credentials**
   - Cliquez sur **Create Credentials** > **API Key**
   - Copiez la clé générée

4. **Configurer les restrictions (recommandé)**
   - Cliquez sur la clé API créée
   - Dans **Application restrictions**, sélectionnez **HTTP referrers (web
     sites)**
   - Ajoutez vos domaines :
     - `localhost:3000/*` (pour le développement)
     - `votre-domaine.com/*` (pour la production)
   - Dans **API restrictions**, sélectionnez **Restrict key**
   - Choisissez **Places API** uniquement

### 2. Ajouter la clé à votre projet

Ajoutez la variable d'environnement dans votre fichier `.env.local` :

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDDujGPgzycOk_Kngsj6Jq4RpOSb5g_8Fo
```

⚠️ **Important** : Le préfixe `NEXT_PUBLIC_` est nécessaire car cette variable
est utilisée côté client.

### 3. Vérifier l'installation

1. Redémarrez votre serveur de développement :
   ```bash
   npm run dev
   ```

2. Allez sur la page de création de dossier
3. Dans le champ "Adresse", commencez à taper une adresse
4. Vous devriez voir des suggestions d'adresses apparaître

## 🔧 Utilisation

### Dans le formulaire de création de dossier

Le composant `AddressAutocomplete` est automatiquement intégré dans le
formulaire d'informations client. Lorsque l'utilisateur :

1. **Tape une adresse** : Des suggestions apparaissent automatiquement
2. **Sélectionne une adresse** : Les champs suivants sont remplis
   automatiquement :
   - **Adresse** : Numéro et nom de rue
   - **Code postal** : Code postal français (5 chiffres)
   - **Ville** : Nom de la ville

### Saisie manuelle

L'utilisateur peut toujours saisir l'adresse manuellement si l'autocomplétion ne
trouve pas l'adresse souhaitée.

## 💰 Coûts

Google Places API propose un **crédit gratuit** de 200$ par mois, ce qui
correspond à environ :

- **40 000 requêtes d'autocomplétion** (0,005$ par requête)
- **40 000 requêtes de détails de lieu** (0,005$ par requête)

Pour la plupart des applications, le crédit gratuit est largement suffisant.

## 🛠️ Dépannage

### Erreur : "Erreur de chargement de Google Maps"

**Causes possibles :**

- La clé API n'est pas définie dans `.env.local`
- La clé API est invalide ou expirée
- L'API Places n'est pas activée dans Google Cloud Console
- Les restrictions de la clé API bloquent votre domaine

**Solutions :**

1. Vérifiez que `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` est bien définie
2. Vérifiez que l'API Places est activée
3. Vérifiez les restrictions de la clé API dans Google Cloud Console
4. Redémarrez le serveur de développement

### L'autocomplétion ne fonctionne pas

**Causes possibles :**

- Le script Google Maps n'est pas chargé
- La connexion internet est lente
- Les restrictions de la clé API sont trop strictes

**Solutions :**

1. Vérifiez la console du navigateur pour les erreurs
2. Vérifiez que vous avez une connexion internet active
3. Vérifiez les restrictions de la clé API

### Les suggestions ne s'affichent pas

**Causes possibles :**

- La clé API a atteint sa limite de quota
- Les restrictions de domaine bloquent l'accès

**Solutions :**

1. Vérifiez votre quota dans Google Cloud Console
2. Vérifiez que votre domaine est autorisé dans les restrictions

## 📚 Documentation

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [Places Autocomplete](https://developers.google.com/maps/documentation/javascript/places-autocomplete)
- [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)

## 🔒 Sécurité

⚠️ **Important** : Ne commitez jamais votre clé API dans le dépôt Git.

- La clé API est exposée côté client (préfixe `NEXT_PUBLIC_`)
- Configurez des restrictions strictes dans Google Cloud Console
- Limitez l'utilisation à l'API Places uniquement
- Surveillez votre utilisation dans Google Cloud Console
