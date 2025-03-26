# Documentation d'Intégration YouTube - FunnelDoctor

## 1. Vue d'ensemble de l'architecture

L'intégration YouTube dans FunnelDoctor suit une architecture modulaire basée sur NestJS pour le backend et React pour le frontend. Cette intégration permet aux utilisateurs de connecter leur compte YouTube, récupérer leurs vidéos, analyser les statistiques d'engagement et surveiller les performances au fil du temps.

### 1.1 Composants principaux

#### Backend (NestJS)

- **IntegrationService** : Service générique qui gère le stockage et la récupération des tokens pour toutes les intégrations.
- **YouTubeAuthService** : Gère le flux d'authentification OAuth avec l'API YouTube.
- **YouTubeDataService** : Service principal qui interagit avec l'API YouTube pour récupérer les données vidéo.
- **YouTubeStorageService** : Gère la persistance des données vidéo et des statistiques dans Supabase.
- **YouTubeTokenRefreshService** : Gère le rafraîchissement automatique des tokens OAuth expirés.

#### Frontend (React)

- **YouTubeService** (youtube.service.ts) : Service client qui interagit avec les endpoints du backend.
- **Pages YouTube** : Interfaces utilisateur pour connecter YouTube, afficher les vidéos et analyser les métriques.

## 2. Flux d'authentification OAuth

### 2.1 Processus de connexion

1. **Initiation** : L'utilisateur clique sur "Connecter YouTube" dans l'interface.
2. **Redirection** : Le frontend appelle `/api/auth/youtube/connect/{userId}` qui redirige vers l'écran d'autorisation Google.
3. **Autorisation** : L'utilisateur accorde les permissions demandées sur l'écran Google.
4. **Callback** : Google redirige vers le callback URL configuré (via ngrok en développement).
5. **Échange de code** : Le backend échange le code d'autorisation contre un access_token et refresh_token.
6. **Stockage** : Les tokens sont stockés dans la table `integrations` de Supabase.

### 2.2 Configuration nécessaire

```
# Variables d'environnement requises
YOUTUBE_CLIENT_ID=<client_id>
YOUTUBE_CLIENT_SECRET=<client_secret>
YOUTUBE_REDIRECT_URI=https://<ngrok-url>/api/auth/youtube/callback
```

## 3. Services backend - Détails d'implémentation

### 3.1 YouTubeDataService

Ce service est le composant central de l'intégration YouTube, responsable de récupérer les données de l'API YouTube et de les transformer en DTOs utilisables par l'application.

#### Modifications récentes

- **Réécriture complète** : Le fichier a été entièrement réécrit pour éliminer les duplications de code, supprimer les fragments résiduels et assurer une structure cohérente.
- **Correction des erreurs TypeScript** : Élimination des erreurs de typage et de compilation.
- **Ajout de journalisation diagnostique** : Des logs détaillés ont été ajoutés pour faciliter le débogage.
- **Implémentation du traitement automatique des tokens expirés** : Le service détecte maintenant les tokens invalides et révoque automatiquement l'intégration.

#### Principales méthodes

```typescript
// Récupère les vidéos utilisateur depuis YouTube avec pagination
async getUserVideos(userId: string, options?: VideoQueryOptions, storeInDb: boolean = true)

// Récupère les détails complets d'une vidéo spécifique avec métriques d'engagement
async getVideoDetails(userId: string, videoId: string): Promise<VideoStatsDTO>

// Récupère les vidéos stockées en base de données (sans appel API)
async getStoredVideos(userId: string, limit?: number, includeStats?: boolean): Promise<VideoDTO[]>

// Récupère les commentaires d'une vidéo spécifique
async getVideoComments(userId: string, videoId: string, maxResults = 20)
```

#### Fonctionnalités clés

- **Calcul d'engagement** : Formule pondérée (likes + 5*commentaires) / vues pour évaluer l'engagement.
- **Catégorisation d'engagement** : Classification des vidéos en 6 niveaux (Faible → Exceptionnel).
- **Auto-révocation** : Détection des tokens invalides et révocation automatique de l'intégration.

### 3.2 YouTubeStorageService

Gère la persistance des données YouTube dans Supabase, avec deux tables principales :

- **youtube_videos** : Stocke les métadonnées des vidéos (titre, description, etc.)
- **youtube_video_stats** : Stocke l'historique des statistiques (vues, likes, commentaires, etc.)

#### Principales méthodes

```typescript
// Stocke ou met à jour une vidéo dans la base de données
async storeVideo(userId: string, video: VideoDTO): Promise<string>

// Récupère toutes les vidéos stockées pour un utilisateur
async getUserStoredVideos(userId: string)

// Récupère l'historique des statistiques d'une vidéo
async getVideoStatsHistory(dbVideoId: string)
```

## 4. API et Contrôleurs

### 4.1 Endpoints d'authentification

- **GET /api/auth/youtube/connect/:userId** : Initie le flux de connexion OAuth.
- **GET /api/auth/youtube/callback** : Callback pour Google OAuth, échange le code contre des tokens.
- **GET /api/auth/youtube/revoke/:userId** : Révoque l'intégration YouTube.
- **GET /api/auth/youtube/debug/:userId** : Vérifie l'état de la connexion YouTube.

### 4.2 Endpoints de données

- **GET /api/youtube/videos** : Récupère les vidéos de l'utilisateur (avec pagination).
- **GET /api/youtube/videos/:videoId** : Récupère les détails d'une vidéo spécifique.
- **GET /api/youtube/videos/:videoId/comments** : Récupère les commentaires d'une vidéo.

### 4.3 Endpoints de test (environnement de développement)

- **GET /api/test/youtube/videos** : Version de test pour récupérer les vidéos.
- **GET /api/test/youtube/videos/:videoId** : Version de test pour les détails de vidéo.

## 5. Configuration et déploiement

### 5.1 Configuration de ngrok pour le développement

Utilisé pour exposer le serveur local à Internet et permettre les callbacks OAuth :

```bash
ngrok http 3001  # Expose le port backend
```

Mettez à jour le `YOUTUBE_REDIRECT_URI` dans le fichier `.env` avec l'URL ngrok générée.

### 5.2 Structure de la base de données

**Table `integrations`**
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  integration_type VARCHAR NOT NULL DEFAULT 'generic',
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, integration_type)
);
```

**Table `youtube_videos`**
```sql
CREATE TABLE youtube_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR NOT NULL,
  video_id VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR,
  channel_id VARCHAR,
  channel_title VARCHAR,
  published_at TIMESTAMP WITH TIME ZONE,
  duration VARCHAR,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);
```

**Table `youtube_video_stats`**
```sql
CREATE TABLE youtube_video_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES youtube_videos(id),
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  engagement_rate FLOAT,
  normalized_engagement_rate FLOAT,
  engagement_level VARCHAR,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 6. Débugger les problèmes d'intégration

### 6.1 Flux de débogage recommandé

1. **Vérifier l'état de la connexion** : Utilisez `/api/auth/youtube/debug/:userId` pour vérifier si l'intégration est valide.
2. **Vérifier les tokens** : Consultez la table `integrations` dans Supabase pour confirmer que les tokens sont présents.
3. **Examiner les logs** : La classe `YouTubeDataService` inclut maintenant des logs diagnostiques extensifs préfixés par `[DIAGNOSTIC]`.
4. **Surveiller les erreurs 401/403** : Ces erreurs indiquent généralement des problèmes d'authentification.

### 6.2 Erreurs communes et solutions

- **404 sur `/api/auth/youtube/revoke/:userId`** : Confirmer que le contrôleur d'authentification est correctement configuré.
- **Échecs d'actualisation de token** : Vérifier que le refresh_token est stocké et que les credentials Google sont valides.
- **Erreurs CORS** : Vérifier la configuration de sécurité et les en-têtes autorisés.

## 7. Tests et validation

### 7.1 Scripts de test

Des scripts de test ont été créés pour valider l'intégration YouTube :

- **manual-youtube-auth.ts** : Test manuel du flux d'authentification.
- **test-youtube-oauth-complete.ts** : Test complet du flux OAuth.

### 7.2 Commandes utiles

```bash
# Compiler le projet
npm run build

# Démarrer en mode développement
npm run start:dev

# Exécuter des scripts de test
npx ts-node src/scripts/test-youtube-oauth-complete.ts
```

## 8. Travaux récents et évolutions futures

### 8.1 Changements effectués

- ✅ Réécriture complète de `YouTubeDataService` pour éliminer les erreurs TypeScript.
- ✅ Correction des méthodes dupliquées et des fragments de code incohérents.
- ✅ Ajout de la gestion automatique des tokens invalides avec révocation proactive.
- ✅ Amélioration de la journalisation pour faciliter le débogage.

### 8.2 Améliorations futures recommandées

- 🟡 Corriger l'endpoint `/api/auth/youtube/revoke/:userId` qui renvoie actuellement une erreur 404.
- 🟡 Mettre à jour les scripts de test pour les aligner avec les services refactorisés.
- 🟡 Implémenter des mécanismes de retry pour les appels API qui échouent temporairement.
- 🟡 Ajouter des métriques de performance pour surveiller la latence des appels API YouTube.
