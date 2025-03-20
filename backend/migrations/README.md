# Système de migrations FunnelDoctor

Ce répertoire contient toutes les migrations de la base de données pour FunnelDoctor. Le système permet de gérer l'évolution du schéma de base de données de manière contrôlée et reproductible.

## Structure des fichiers

Chaque fichier de migration suit la convention de nommage :
```
YYYY-MM-DD-NNN_description.sql
```
Où :
- `YYYY-MM-DD` est la date de création
- `NNN` est un numéro séquentiel (001, 002, etc.)
- `description` est une brève description du contenu

Exemple : `2025-03-20-001_base_schema.sql`

## Exécution des migrations

### Commande principale

Pour exécuter toutes les migrations non encore appliquées :

```bash
npm run migrate
```

Cette commande :
1. Vérifie la table `migrations` dans la base de données
2. Identifie les migrations déjà appliquées
3. Exécute les migrations manquantes dans l'ordre alphabétique
4. Enregistre chaque migration réussie dans la table `migrations`

### Base de données cible

Les migrations s'exécutent sur la base de données configurée dans les variables d'environnement :
- `SUPABASE_URL` : URL de la base Supabase
- `SUPABASE_SERVICE_KEY` : Clé de service pour l'authentification

## Ajout d'une nouvelle migration

Pour créer une nouvelle migration :

1. Créez un nouveau fichier SQL dans le dossier `migrations/` en suivant la convention de nommage
2. Écrivez vos requêtes SQL dans ce fichier
3. Utilisez des instructions conditionnelles comme `IF NOT EXISTS` pour éviter les erreurs
4. Exécutez `npm run migrate` pour appliquer cette migration

## Rollback (Retour en arrière)

Le système actuel ne gère pas automatiquement les rollbacks. Si vous devez annuler une migration, vous devrez :

1. Écrire manuellement une nouvelle migration qui inverse les changements
2. Supprimer l'entrée correspondante dans la table `migrations`

## Bonnes pratiques

- Chaque migration doit être autonome et idempotente (peut être exécutée plusieurs fois sans effet secondaire)
- Utilisez des instructions conditionnelles (`IF NOT EXISTS`, `IF EXISTS`, etc.)
- Documentez les changements importants en commentaires dans le fichier SQL
- Testez vos migrations sur un environnement de développement avant de les déployer en production
- N'utilisez pas de migration pour modifier des données existantes à grande échelle
