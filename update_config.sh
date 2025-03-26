#!/bin/bash

# Script pour mettre à jour les configurations d'environnement

# Mettre à jour le .env du frontend
echo "Mise à jour du .env frontend..."
cat > /Users/mehdi/CascadeProjects/FunnelDoctor/frontend/.env << EOL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
EOL
echo "✅ Frontend .env mis à jour"

# Mettre à jour le .env du backend
echo "Mise à jour du .env backend (YouTube redirect URI)..."
sed -i '' 's|YOUTUBE_REDIRECT_URI=.*|YOUTUBE_REDIRECT_URI=http://localhost:3001/api/auth/youtube/callback|g' /Users/mehdi/CascadeProjects/FunnelDoctor/backend/.env
echo "✅ Backend .env mis à jour"

echo "Configurations mises à jour avec succès! Redémarrez les serveurs pour appliquer les changements."
