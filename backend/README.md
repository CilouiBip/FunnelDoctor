<h1 align="center">FunnelDoctor - Backend API</h1>

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<p align="center">API backend pour FunnelDoctor, développée avec NestJS</p>

## Description

FunnelDoctor est un micro-SaaS conçu pour suivre le parcours des leads organiques depuis YouTube jusqu'à la vente finale. Cette API backend fournit toutes les fonctionnalités nécessaires pour gérer les utilisateurs, les leads, les campagnes et les liens de tracking.

## Structure du projet

Le backend est structuré en plusieurs modules:

- **AuthModule** - Gestion de l'authentification (signup, login)
- **UsersModule** - Gestion des utilisateurs
- **LeadsModule** - Gestion des leads (prospects)
- **CampaignsModule** - Gestion des campagnes marketing
- **TrackingLinksModule** - Gestion des liens de tracking avec paramètres UTM

## Configuration

1. Créez un fichier `.env` à la racine du projet avec les variables suivantes:

```bash
NODE_ENV=development
PORT=3001

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

2. Installation des dépendances:

```bash
$ npm install
```

3. Configuration de la base de données Supabase:

- Créez un projet sur [Supabase](https://supabase.com/)
- Copiez l'URL et la clé anonyme dans votre fichier `.env`
- Exécutez le script SQL situé dans `sql/schema.sql` dans l'éditeur SQL de Supabase pour créer les tables nécessaires

## Démarrage

```bash
# Mode développement
$ npm run start:dev

# Mode production
$ npm run start:prod
```

## API Endpoints

### Authentification

- `POST /auth/signup` - Inscription d'un nouvel utilisateur
- `POST /auth/login` - Connexion utilisateur

### Utilisateurs

- `GET /users` - Liste des utilisateurs (admin uniquement)
- `GET /users/:id` - Détails d'un utilisateur
- `PATCH /users/:id` - Mise à jour d'un utilisateur
- `DELETE /users/:id` - Suppression d'un utilisateur

### Leads

- `GET /leads` - Liste des leads de l'utilisateur connecté
- `POST /leads` - Création d'un nouveau lead
- `GET /leads/:id` - Détails d'un lead
- `PATCH /leads/:id` - Mise à jour d'un lead
- `DELETE /leads/:id` - Suppression d'un lead

### Campagnes

- `GET /campaigns` - Liste des campagnes de l'utilisateur connecté
- `POST /campaigns` - Création d'une nouvelle campagne
- `GET /campaigns/:id` - Détails d'une campagne
- `PATCH /campaigns/:id` - Mise à jour d'une campagne
- `DELETE /campaigns/:id` - Suppression d'une campagne

### Liens de tracking

- `GET /tracking-links` - Liste des liens de tracking de l'utilisateur connecté
- `POST /tracking-links` - Création d'un nouveau lien de tracking
- `GET /tracking-links/:id` - Détails d'un lien de tracking
- `PATCH /tracking-links/:id` - Mise à jour d'un lien de tracking
- `DELETE /tracking-links/:id` - Suppression d'un lien de tracking

## Protection des données

Toutes les routes (à l'exception des endpoints d'authentification) sont protégées par JWT et nécessitent un token valide. De plus, les politiques Row Level Security (RLS) de Supabase assurent que chaque utilisateur ne peut accéder qu'à ses propres données.

## Tests

```bash
# Tests unitaires
$ npm run test

# Tests e2e
$ npm run test:e2e

# Couverture de tests
$ npm run test:cov
```

## License

Développé par FunnelDoctor.
