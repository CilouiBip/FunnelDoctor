# Documentation de l'Intu00e9gration YouTube OAuth

Ce document du00e9crit en du00e9tail le flux d'authentification OAuth pour l'intu00e9gration YouTube dans FunnelDoctor, de la configuration initiale jusqu'u00e0 la gestion de session JWT apru00e8s authentification.

## 1. Configuration Requise

### 1.1 Variables d'Environnement

#### Backend (.env)

```env
# YouTube OAuth
YOUTUBE_CLIENT_ID=votre_client_id_google
YOUTUBE_CLIENT_SECRET=votre_client_secret_google
YOUTUBE_REDIRECT_URI=https://votre-domaine.ngrok.app/api/auth/youtube/callback

# CORS et NGROK
NGROK_DOMAIN=votre-domaine.ngrok.app
NGROK_PUBLIC_URL=https://votre-domaine.ngrok.app
ALLOWED_ORIGINS=http://localhost:3000,https://votre-domaine.ngrok.app

# JWT
JWT_SECRET=votre_secret_jwt
JWT_EXPIRES_IN=7d
```

#### Frontend (.env)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001  # Pour du00e9veloppement local
# ou NEXT_PUBLIC_BACKEND_URL=https://votre-domaine.ngrok.app  # Pour utiliser Ngrok
```

### 1.2 Configuration Google Cloud Console

1. Cru00e9er un projet dans Google Cloud Console
2. Activer l'API YouTube Data v3
3. Configurer l'u00e9cran de consentement OAuth
4. Cru00e9er des identifiants OAuth 2.0 (type Web)
5. Ajouter explicitement l'URI de redirection : `https://votre-domaine.ngrok.app/api/auth/youtube/callback`
6. Configurer les scopes requis (youtube.readonly, youtube.force-ssl)

## 2. Flux Backend

### 2.1 Route d'Autorisation (/api/auth/youtube/authorize)

- **Requu00eate** : GET avec JWT d'authentification FunnelDoctor
- **Fonctionnement** :
  1. Valide l'authentification de l'utilisateur via JwtAuthGuard
  2. Gu00e9nu00e8re une URL d'autorisation Google avec state contenant userId
  3. Retourne l'URL vers le frontend

### 2.2 Route de Callback (/api/auth/youtube/callback)

- **Requu00eate** : GET (appelu00e9e par Google apru00e8s consentement utilisateur)
- **Fonctionnement** :
  1. Reu00e7oit `code` et `state` de Google
  2. Vu00e9rifie le `state` pour extraire l'userId
  3. u00c9change le code contre des tokens OAuth (access_token, refresh_token)
  4. Chiffre et stocke les tokens dans la table `integrations`
  5. Ru00e9gu00e9nu00e8re un JWT FunnelDoctor pour l'utilisateur
  6. Redirige vers `/dashboard/video` avec le nouveau JWT dans le hash fragment

### 2.3 Route de Statut (/api/auth/youtube/status)

- **Requu00eate** : GET avec JWT d'authentification FunnelDoctor
- **Fonctionnement** :
  1. Vu00e9rifie si l'utilisateur a une intu00e9gration YouTube active
  2. Retourne le statut de connexion et d'autres informations

## 3. Flux Frontend

### 3.1 Initiation de l'Autorisation

```typescript
// Appel pour obtenir l'URL d'autorisation
const { data } = await axios.get('/api/auth/youtube/authorize', {
  headers: { Authorization: `Bearer ${jwtToken}` }
});

// Redirection vers l'URL Google
window.location.href = data.authUrl;
```

### 3.2 Gestion du Retour apru00e8s Callback

```typescript
// Dans le composant de la page /dashboard/video
useEffect(() => {
  // Vu00e9rifier si un token JWT est pru00e9sent dans le hash
  const hashToken = getTokenFromHash();
  if (hashToken) {
    // Mettre u00e0 jour le token dans le localStorage ou context
    setAuthToken(hashToken);
    // Nettoyer l'URL
    window.history.replaceState(null, '', window.location.pathname);
  }
  
  // Vu00e9rifier le statut de connexion YouTube
  const youtubeConnected = new URLSearchParams(window.location.search).get('youtube_connected');
  if (youtubeConnected === 'true') {
    // Afficher un message de succu00e8s
    setYouTubeStatus('connected');
    // Recharger les donnu00e9es YouTube
    loadYouTubeData();
  }
}, []);
```

## 4. Su00e9curitu00e9 et Considu00e9rations

### 4.1 Gestion CORS

- Configuration pru00e9cise dans `main.ts` pour autoriser les requu00eates cross-origin
- Gestion spu00e9cifique des requu00eates OPTIONS (preflight)
- Filtre d'exception CORS pour assurer que les erreurs 401/403 incluent les headers CORS

### 4.2. Chiffrement des Tokens

- Les tokens OAuth YouTube sont chiffru00e9s avant stockage en BDD
- Utilisation d'une clu00e9 de chiffrement symu00e9trique su00e9curisu00e9e

### 4.3 Utilisation de Ngrok pour le Du00e9veloppement

- Permets d'exposer le serveur local u00e0 internet pour les callbacks
- Commande : `ngrok http 3001 --subdomain=votre-domaine`

## 5. Du00e9pannage

### 5.1 Problu00e8mes CORS

- Vu00e9rifier que Ngrok est actif avec un domaine stable
- S'assurer que les origines sont correctement configuru00e9es dans `ALLOWED_ORIGINS`
- Vu00e9rifier les headers des requu00eates OPTIONS avec curl ou les DevTools

### 5.2 Erreurs d'Authentification

- Vu00e9rifier la validitu00e9 et la pru00e9sence du JWT FunnelDoctor
- Vu00e9rifier les logs backend pour les erreurs :
  - Extraction du JWT
  - Gu00e9nu00e9ration de l'URL d'autorisation
  - u00c9change du code d'autorisation
  - Stockage des tokens

### 5.3 Problu00e8mes de Callback

- Vu00e9rifier que l'URI de redirection est exactement identique dans :
  - Google Cloud Console
  - Variable d'environnement YOUTUBE_REDIRECT_URI
  - Configuration Ngrok

## 6. Maintenance et Mise u00e0 Jour

- Surveiller les u00e9vu00e9nements de ru00e9vocation de tokens via `oauth_events`
- Implu00e9menter des mu00e9canismes de rafrau00eechissement automatique des tokens
- Vu00e9rifier ru00e9guliu00e8rement les quotas d'API YouTube
