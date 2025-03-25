# Journal de migration FunnelDoctor

## Phase 2 : Normalisation de la base de données (Mars 2025)

### Résumé

La Phase 2 se concentre sur la normalisation complète de la base de données, après les corrections critiques apportées en Phase 1.
Cette normalisation implique une restructuration des tables existantes, l'ajout de nouvelles tables pour normaliser les données,
la migration des données existantes et l'ajout de contraintes pour garantir l'intégrité des données.

### Migrations d'authentification et vérification d'email (23/03/2025)

La fonctionnalité d'authentification avancée a nécessité plusieurs modifications de schéma dans la base de données :

1. **Création de la table `reset_tokens`** - Stockage sécurisé des tokens pour:
   - Réinitialisation de mot de passe
   - Vérification d'email
   - Structure avec expiration et mécanisme anti-réutilisation

2. **Ajout des champs de vérification d'email à `users`** :
   - `is_verified` (BOOLEAN, défaut FALSE)
   - `verified_at` (TIMESTAMP WITH TIME ZONE)

3. **Optimisation des requêtes** :
   - Ajout d'index sur `reset_tokens` (token, user_id)
   - Amélioration des performances des requêtes d'authentification

Ces modifications permettent un système d'authentification complet avec vérification d'email en deux étapes et réinitialisation de mot de passe sécurisée.

### Scripts de migration

| Timestamp | Nom | Description |
|-----------|-----|--------------|
| 20250323000000 | add_email_verification_fields.sql | Création de la table reset_tokens et ajout des champs de vérification d'email |
| 20250324000000 | phase2_fixes.sql | Ajout de DEMO_CANCELED à l'enum conversion_event_type et de rdv_canceled_at à funnel_progress |
| 20250325000000 | phase2_preparation.sql | Documentation des tables et colonnes, ajout d'index pour optimiser les performances |
| 20250326000000 | normalize_types.sql | Standardisation des types et enums, ajout de catégories pour les événements |
| 20250327000000 | normalize_contacts.sql | Création de la table lead_contacts pour normaliser les informations de contact |
| 20250328000000 | migrate_data.sql | Migration des données existantes vers les nouvelles structures |
| 20250329000000 | constraints.sql | Ajout de contraintes pour garantir l'intégrité des données |

### Modifications apportées

#### Nouveaux types
- `funnel_stage` : Enum standardisé pour les étapes du funnel

#### Nouvelles tables
- `lead_contacts` : Stockage normalisé des informations de contact (email, téléphone, etc.)

#### Nouvelles colonnes
- `conversion_events.event_category` : Catégorisation des événements (revenue, appointment, etc.)
- `conversion_events.source_system` : Origine de l'événement (site web, Calendly, etc.)
- `visitors.lead_id` : Relation directe entre visitors et leads

#### Nouvelles contraintes
- `funnel_progress_stage_check` : Validation des étapes du funnel
- `conversion_events_event_data_check` : Validation du format JSON
- `unique_primary_contact_per_type_and_lead` : Un seul contact principal par type et par lead

### ERD final (post-Phase 2)

```
┌────────────────┐       ┌───────────────────┐       ┌───────────────────────┐
│    visitors    │       │      leads        │       │   conversion_events    │
├────────────────┤       ├───────────────────┤       ├───────────────────────┤
│ id             │       │ id                │       │ id                    │
│ visitor_id     │       │ name              │       │ lead_id               │
│ utm_source     │       │ organization      │       │ event_type (enum)     │
│ utm_medium     │       │ status (enum)     │       │ event_name            │
│ utm_campaign   │       │ notes             │       │ event_data (JSON)     │
│ page_url       │       │ user_id           │       │ event_category        │
│ referrer       │       │ created_at        │       │ source_system         │
│ lead_id  ─────────────>│ updated_at        │       │ amount                │
│ created_at     │       └───────────────────┘       │ page_url              │
│ updated_at     │                 ▲                  │ user_id               │
└────────────────┘                 │                  │ created_at            │
        ▲                          │                  │ updated_at            │
        │                          │                  └───────────────────────┘
        │                          │                          ▲
        │                          │                          │
┌───────┴────────┐      ┌─────────┴────────┐     ┌────────────┴─────────────┐
│ funnel_progress │      │   lead_contacts  │     │      touchpoints         │
├────────────────┤      ├──────────────────┤     ├──────────────────────────┤
│ id             │      │ id                │     │ id                       │
│ visitor_id     │◄─────┼─ lead_id          │     │ visitor_id               │
│ current_stage  │      │ contact_type      │     │ event_type               │
│ user_id        │      │ contact_value     │     │ event_data               │
│ rdv_scheduled_at│      │ is_primary        │     │ page_url                 │
│ rdv_canceled_at│      │ created_at        │     │ created_at               │
│ created_at     │      │ updated_at        │     │ updated_at               │
│ updated_at     │      └──────────────────┘     └──────────────────────────┘
└────────────────┘
```

### Points d'attention

1. **Rétrocompatibilité** : Les colonnes `email` et `phone` dans la table `leads` sont conservées pour la rétrocompatibilité, mais toutes les nouvelles données de contact devraient utiliser la table `lead_contacts`.

2. **Migration progressive** : Les nouvelles fonctionnalités devraient utiliser la structure normalisée, tandis que le code existant peut continuer à fonctionner avec l'ancienne structure pendant une période de transition.

3. **Performance** : Des index ont été ajoutés pour optimiser les requêtes les plus fréquentes, notamment sur les jointures entre tables.

### Étapes suivantes

- **Phase 3** : Optimisation des requêtes et des performances
- **Phase 4** : Migration complète du code vers la nouvelle structure de données
