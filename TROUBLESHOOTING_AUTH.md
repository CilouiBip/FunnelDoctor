# Rapport d'analyse et de ru00e9solution du problu00e8me d'API d'inscription

## Ru00e9sumu00e9 exu00e9cutif

L'API d'inscription renvoie une erreur 500 (Internal Server Error) lors de la cru00e9ation de nouveaux utilisateurs. Une su00e9rie d'analyses et de modifications a u00e9tu00e9 effectuu00e9e pour identifier et ru00e9soudre ce problu00e8me, tout en amu00e9liorant la stabilitu00e9 et le processus de du00e9veloppement.

## Problu00e8me initial

Lors de l'inscription d'un nouvel utilisateur via la route `/api/auth/signup`, l'API renvoie une erreur 500 au lieu de cru00e9er l'utilisateur avec succu00e8s. Les propriu00e9tu00e9s attendues (full_name, company_name, plan_id) ne sont pas correctement enregistru00e9es dans la base de donnu00e9es.

## Causes identifiu00e9es

### 1. Double hachage du mot de passe

Le problu00e8me principal identifiu00e9 est un **double hachage du mot de passe**:

1. Premier hachage dans `AuthService.signup()` (ligne 36-39):
```typescript
const salt = await bcrypt.genSalt();
const password_hash = await bcrypt.hash(password, salt);
```

2. Deuxiu00e8me hachage dans `UsersService.create()` (lignes 18-20):
```typescript
const salt = await bcrypt.genSalt();
const password_hash = await bcrypt.hash(password, salt);
```

La valeur du mot de passe est donc hashu00e9e deux fois avant d'u00eatre stocku00e9e en base de donnu00e9es.

### 2. Problu00e8me de mapping camelCase/snake_case

Le frontend envoie les donnu00e9es au format snake_case pour le backend:

```typescript
// frontend/lib/services/auth.service.ts (ligne 59-65)
body: JSON.stringify({ 
  email, 
  password, 
  full_name: fullName, 
  company_name: companyName,
  plan_id: planId
})
```

Cependant, la validation et le traitement de ces donnu00e9es dans le backend nu00e9cessite une attention particuliu00e8re pour s'assurer qu'elles sont correctement mappu00e9es vers les champs attendus dans la base de donnu00e9es.

### 3. Gestion inefficace des redu00e9marrages de serveur

Lors du du00e9veloppement, les serveurs front et back doivent u00eatre fru00e9quemment redu00e9marru00e9s, ce qui occasionne une perte de temps et des erreurs potentielles (comme l'utilisation erronu00e9e des ports).

## Solutions implu00e9mentu00e9es

### 1. Pru00e9vention du double hachage

Pour ru00e9soudre le problu00e8me du double hachage, nous avons cru00e9u00e9 une nouvelle mu00e9thode dans `UsersService`:

```typescript
async createWithHash(userData: { 
  email: string; 
  full_name: string; 
  company_name?: string; 
  plan_id?: string; 
  password_hash: string;
}): Promise<User>
```

Cette mu00e9thode permet de passer directement le mot de passe hashu00e9 depuis `AuthService` sans le rehacher.

### 2. Amu00e9lioration du AuthService.signup()

La mu00e9thode `signup()` du AuthService a u00e9tu00e9 refactorisu00e9e pour:

- Valider explicitement que `full_name` est fourni
- Extraire les champs individuels du DTO pour un meilleur contru00f4le
- Hasher le mot de passe une seule fois 
- Utiliser la nouvelle mu00e9thode `createWithHash()`
- Amu00e9liorer les logs pour le du00e9bogage

### 3. Logs du00e9taillu00e9s dans le contru00f4leur d'authentification

Des logs du00e9taillu00e9s ont u00e9tu00e9 ajoutu00e9s au contru00f4leur d'authentification pour afficher:

- Les donnu00e9es reu00e7ues pour l'inscription
- Le type de chaque champ
- Le succu00e8s ou l'u00e9chec de l'opu00e9ration

### 4. Script de redu00e9marrage automatisu00e9

Un script de redu00e9marrage (`restart.sh`) a u00e9tu00e9 cru00e9u00e9 pour automatiser le processus de redu00e9marrage des serveurs:

- Du00e9tection et arru00eat automatique des processus existants
- Redu00e9marrage des serveurs dans l'ordre correct
- Respect des ru00e8gles de port (frontend sur 3000, backend sur 3001)
- Affichage clair des informations de processus

## u00c9tat actuel et problu00e8mes restants

Malgru00e9 les modifications apportu00e9es, l'erreur 500 persiste lors de l'inscription. Voici les pistes u00e0 explorer:

### 1. Vu00e9rification de la structure de la base de donnu00e9es

Il faut vu00e9rifier que la table `users` dans Supabase contient bien les colonnes attendues:
- `email`
- `password_hash`
- `full_name`
- `company_name`
- `plan_id`

### 2. Analyse des logs du00e9taillu00e9s

Apru00e8s les modifications, les logs ajoutu00e9s dans le contru00f4leur d'authentification devraient fournir des informations pru00e9cises sur:
- Les valeurs exactes des champs reu00e7us
- Le type de chaque champ (string, undefined, etc.)
- Le point exact de l'u00e9chec dans le processus d'inscription

### 3. Problu00e8me potentiel dans UsersService.createWithHash()

Il est possible que la mu00e9thode `createWithHash()` ne traite pas correctement les donnu00e9es reu00e7ues. Une vu00e9rification supplu00e9mentaire devrait u00eatre effectuu00e9e pour s'assurer que:
- Le plan_id par du00e9faut est correctement attribuu00e9
- Les donnu00e9es sont formatu00e9es correctement pour l'insertion dans Supabase

## Recommandations pour la ru00e9solution complu00e8te

### 1. Mise u00e0 jour du schu00e9ma SQL

Vu00e9rifier et mettre u00e0 jour la structure de la table `users` pour s'assurer qu'elle peut accueillir tous les champs requis.

### 2. Ajout de logs dans UsersService.createWithHash()

Ajouter des logs du00e9taillu00e9s dans la mu00e9thode `createWithHash()` pour suivre le processus d'insertion en base de donnu00e9es et identifier rapidement les problu00e8mes potentiels.

### 3. Test isolu00e9 de l'API

Tester l'API d'inscription de maniu00e8re isolu00e9e avec un outil comme Postman ou cURL pour vu00e9rifier si le problu00e8me existe indu00e9pendamment du frontend.

### 4. Vu00e9rification des contraintes SQL

S'assurer qu'il n'y a pas de contraintes sur la table `users` qui pourraient empu00eacher l'insertion de nouvelles lignes (par exemple, une contrainte d'unicitu00e9 sur un champ autre que l'email).

## Suivi et prochaines u00e9tapes

1. Implu00e9menter les recommandations ci-dessus
2. Ajouter des tests unitaires pour les fonctions d'authentification
3. Amu00e9liorer la gestion des erreurs pour fournir des messages plus pru00e9cis u00e0 l'utilisateur
4. Documenter les processus d'authentification pour faciliter la maintenance future

## Conclusion

Le problu00e8me d'erreur 500 lors de l'inscription est probablement du00fb u00e0 une combinaison de facteurs, dont le double hachage du mot de passe et des problu00e8mes de mapping entre le frontend et le backend. Les solutions mises en place ont ru00e9solu certains de ces problu00e8mes, mais une analyse plus approfondie est nu00e9cessaire pour ru00e9soudre complu00e8tement le problu00e8me.

Ce rapport a u00e9tu00e9 pru00e9paru00e9 le 19 mars 2025 pour faciliter la compru00e9hension et la ru00e9solution du problu00e8me d'inscription dans l'application FunnelDoctor.
