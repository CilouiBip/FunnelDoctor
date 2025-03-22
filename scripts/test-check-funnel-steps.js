const fetch = require('node-fetch');

// Définir l'URL de base de l'API (à mettre à jour selon l'environnement)
const apiEndpoint = 'http://localhost:3001/api/funnel-steps';

async function main() {
  const token = process.argv.find(a => a.startsWith('--token='))?.split('=')[1];
  if (!token) {
    console.error('Usage: node test-check-funnel-steps.js --token=YOUR_JWT');
    process.exit(1);
  }
  
  try {
    const res = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      console.error('Erreur:', res.status, res.statusText);
      const errBody = await res.text();
      console.error('Détails:', errBody);
      process.exit(1);
    }
    
    const data = await res.json();
    console.log('\n📊 Steps récupérés:');
    
    if (!Array.isArray(data)) {
      console.error('❌ La réponse n\'est pas un tableau. Vérifiez le backend.');
      console.log(data);
      process.exit(1);
    }
    
    console.log(`\n✅ Nombre d'étapes trouvées: ${data.length}`);
    
    // Afficher un tableau formaté des steps
    console.table(data.map(step => ({
      step_id: step.step_id.substring(0, 8) + '...', // Tronquer pour lisibilité
      slug: step.slug,
      type: step.type,
      label: step.label,
      position: step.position
    })));
    
    // Vérification des 7 étapes par défaut
    const defaultTypes = ['LANDING', 'OPTIN', 'VSL', 'CALENDLY', 'CALL', 'PAYMENT', 'POSTSALE'];
    const missingDefaultTypes = defaultTypes.filter(type => 
      !data.some(step => step.type === type)
    );
    
    if (missingDefaultTypes.length > 0) {
      console.warn(`⚠️ Types d'étapes par défaut manquants: ${missingDefaultTypes.join(', ')}`);
    } else {
      console.log('✅ Tous les types d\'étapes par défaut sont présents');
    }
    
    // Vérifier les doublons de slugs
    const slugs = data.map(step => step.slug);
    const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
    
    if (duplicateSlugs.length > 0) {
      console.warn(`⚠️ Slugs en doublon détectés: ${[...new Set(duplicateSlugs)].join(', ')}`);
    } else {
      console.log('✅ Aucun slug en doublon détecté');
    }
    
    // Vérifier les positions
    const positions = data.map(step => step.position);
    const duplicatePositions = positions.filter((pos, index) => positions.indexOf(pos) !== index);
    
    if (duplicatePositions.length > 0) {
      console.warn(`⚠️ Positions en doublon détectées: ${[...new Set(duplicatePositions)].join(', ')}`);
    } else {
      console.log('✅ Aucune position en doublon détectée');
    }
    
  } catch (err) {
    console.error('❌ Erreur lors de la requête:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Erreur dans main:', err);
  process.exit(1);
});
