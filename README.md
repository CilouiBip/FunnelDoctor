# FunnelDoctor

FunnelDoctor est un micro-SaaS conçu pour suivre le parcours des leads organiques depuis YouTube jusqu'à la vente finale.

## Architecture du projet

- **Frontend** : Next.js, React, Tailwind CSS
- **Backend** : Nest.js (TypeScript)
- **Base de données** : PostgreSQL via Supabase

## Flux de conversion visiteur → lead

Le processus de conversion d'un visiteur en lead se fait en deux étapes distinctes :

### 1. Création d'un lead

La création d'un lead doit être effectuée avant de tenter la conversion d'un visiteur. Cette étape nécessite une authentification JWT.

```bash
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"email":"test@example.com","first_name":"Test","last_name":"Lead"}'
```

La réponse inclura l'identifiant du lead créé (`id`) qui devra être utilisé dans l'étape suivante.

### 2. Conversion du visiteur en lead

Une fois le lead créé, vous pouvez convertir un visiteur existant en associant son identifiant à celui du lead :

```bash
curl -X POST http://localhost:3001/api/visitors/<VISITOR_ID>/convert \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"<LEAD_ID>"}'
```

> **Important** : Le lead doit exister dans la base de données avant de tenter la conversion. Si le lead n'existe pas, une erreur BadRequest (400) sera renvoyée.

## Utilisation de l'API

Le backend expose plusieurs endpoints API pour gérer les visiteurs et les leads :

### Visiteurs

- `POST /api/visitors` : Créer un nouveau visiteur
- `GET /api/visitors/:visitorId` : Récupérer un visiteur par son ID
- `POST /api/visitors/:visitorId/convert` : Convertir un visiteur en lead

### Leads

- `POST /api/leads` : Créer un nouveau lead (authentification requise)
- `GET /api/leads` : Récupérer tous les leads (authentification requise)
- `GET /api/leads/:id` : Récupérer un lead par son ID (authentification requise)
- `PATCH /api/leads/:id` : Mettre à jour un lead (authentification requise)
- `DELETE /api/leads/:id` : Supprimer un lead (authentification requise)
- `POST /api/leads/:id/transition` : Changer le statut d'un lead (authentification requise)
- `GET /api/leads/:id/status-history` : Récupérer l'historique des statuts (authentification requise)

## Gestion des statuts de leads

Le système permet de suivre l'évolution des leads à travers différents statuts et de conserver un historique des transitions.

### Statuts disponibles

Les leads peuvent avoir l'un des statuts suivants :

- `new` : Nouveau lead, n'a pas encore été contacté
- `contacted` : Lead qui a été contacté
- `qualified` : Lead qualifié, intéressé par l'offre
- `negotiation` : Discussions en cours, négociations avancées
- `won` : Lead converti en client
- `lost` : Opportunité perdue

### Transitions d'état valides

Les transitions d'état sont soumises à des règles métier. Voici les transitions autorisées :

- De `new` vers : `contacted`, `lost`
- De `contacted` vers : `qualified`, `lost`
- De `qualified` vers : `negotiation`, `lost`
- De `negotiation` vers : `won`, `lost`
- De `won` vers : `lost` (un client peut être perdu)
- De `lost` vers : `contacted` (un lead perdu peut être recontacté)

### Exemples d'utilisation

**Changer le statut d'un lead :**
```bash
curl -X POST http://localhost:3001/api/leads/<LEAD_ID>/transition \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"status":"contacted", "comment":"Premier appel effectué"}'
```

**Consulter l'historique des changements de statut :**
```bash
curl -X GET http://localhost:3001/api/leads/<LEAD_ID>/status-history \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
