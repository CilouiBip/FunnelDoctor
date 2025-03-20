# Migrations Supabase - FunnelDoctor

Ce dossier contient les migrations de base de donnu00e9es gu00e9ru00e9es via Supabase CLI.

## Pru00e9requis

- [Supabase CLI](https://github.com/supabase/cli#installation) installu00e9e
- Authentification avec votre compte Supabase

## Commandes principales

### Authentification

```bash
supabase login
```

### Lier le projet

```bash
supabase link --project-ref oulqsejjorqpgggkiaoy
```

### Cru00e9er une nouvelle migration

```bash
supabase migration new nom_de_la_migration
```

Cette commande cru00e9era un fichier avec un timestamp dans le dossier `supabase/migrations/`.

### Appliquer les migrations

```bash
supabase db push
```

### Ru00e9cupu00e9rer les changements depuis la base de donnu00e9es distante

```bash
supabase db pull
```

### Autre commandes utiles

- `supabase db diff` : comparer l'u00e9tat local avec la base distante
- `supabase db reset` : ru00e9initialiser complu00e8tement la base de donnu00e9es
- `supabase migration list` : lister les migrations appliquu00e9es

## Bonnes pratiques

1. Une migration par fonctionnalitu00e9 ou modification cohu00e9rente
2. Utiliser des instructions conditionnelles (`IF NOT EXISTS`) pour u00e9viter les erreurs
3. Documenter le contenu de chaque migration avec des commentaires
4. Toujours tester les migrations sur un environnement de du00e9veloppement avant de les appliquer en production

## Structure des migrations

- `20250320000001_base_schema.sql`: Schu00e9ma de base (users, leads, campaigns)
- `20250320000002_create_visitors_table.sql`: Table des visiteurs
- `20250320000003_create_touchpoints_table.sql`: Table des points de contact
- `20250320000004_lead_status_history.sql`: Historique des statuts de leads
- `20250320000005_conversion_events.sql`: u00c9vu00e9nements de conversion
