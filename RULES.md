# RÈGLES DE DÉVELOPPEMENT - FUNNEL DOCTOR

## STRATÉGIE DE RÉSOLUTION DE PROBLÈMES

1. Toujours réfléchir à 5-7 sources possibles de problème, puis distiller les 1-2 sources les plus probables
2. Ajouter des logs pour valider les hypothèses avant d'implémenter toute correction de code
3. Toujours chercher à avoir un code stable, vérifier les imbrications et comprendre les choix sur un plan macro, de routes et d'architecture

## RÈGLES DE DÉVELOPPEMENT ALGORITHMIQUE

1. Limiter le nombre maximal d'itérations à 5 pour toute tâche répétitive. Si la tâche n'est pas terminée après 5 itérations, demander l'intervention de l'utilisateur
2. Avant de signaler une erreur, vérifier si elle peut être résolue automatiquement. Si ce n'est pas le cas, proposer au moins deux solutions alternatives avant de demander de l'aide
3. Implémenter un mécanisme de détection de boucles. Si la même action est répétée plus de 3 fois sans progression, arrêter et demander des clarifications
4. Analyser le contexte global du code avant de proposer une solution à une erreur, ne pas se concentrer uniquement sur la ligne problématique

## APPROCHE MÉTHODOLOGIQUE

1. Utiliser une approche par étapes pour résoudre les problèmes complexes. Décomposer la tâche en sous-tâches plus petites et gérables, et vérifier la progression à chaque étape
2. Implémenter un système de 'timeout' pour les tâches longues. Si une tâche prend plus de 2 minutes, demander s'il faut continuer ou arrêter le processus
3. Garder une trace des modifications apportées au code. Si une modification ne résout pas le problème après 3 tentatives, revenir à l'état initial du code et proposer une approche différente

## CRITÈRES D'ÉVALUATION ET PRIORITÉS

1. Avant de commencer une tâche, définir clairement les critères de réussite et d'échec. Utiliser ces critères pour évaluer la progression
2. Implémenter un système de priorités pour les erreurs. Traiter d'abord les erreurs critiques qui empêchent l'exécution du code, puis passer aux avertissements et aux optimisations
3. Utiliser une approche de 'essai et erreur' contrôlée. Pour chaque solution proposée, définir un 'point de contrôle' auquel revenir si la solution ne fonctionne pas

## RÈGLES SPÉCIFIQUES POUR LES PORTS ET SERVEURS

1. Pour les projets Next.js: Utiliser strictement le port 3000
2. Pour les projets Vite (comme Dashboard Mindeo): Utiliser le port 2000 comme configuré dans vite.config.ts
3. Si un port est occupé, prioritiser la fermeture du processus existant plutôt que de changer de port
4. Ne JAMAIS suggérer de changer de port, même si une erreur EADDRINUSE est rencontrée

## RÈGLES DE DOCUMENTATION

1. Générer une documentation complète pour le code
2. Inclure les signatures de fonction, descriptions des paramètres, valeurs de retour, exemples d'utilisation et pièges courants
3. Documenter les intégrations avec les services externes (Stripe, Calendly, ActiveCampaign, YouTube)
