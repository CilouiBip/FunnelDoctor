const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3333;

// Pour stocker les webhooks reçus
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

app.use(bodyParser.json());

// Endpoint pour calendly
app.post('/api/rdv/webhook', (req, res) => {
  console.log('📬 Webhook Calendly reçu sur /api/rdv/webhook, redirection vers /webhook');
  // Rediriger vers l'endpoint principal
  const originalUrl = req.originalUrl;
  req.url = '/webhook';
  app._router.handle(req, res);
});

// Endpoint principal pour recevoir les webhooks
app.post('/webhook', (req, res) => {
  console.log('📬 Webhook reçu:', JSON.stringify(req.body, null, 2));
  
  // Extraction et log des paramètres importants
  const event = req.body.event;
  const tracking = req.body.payload?.tracking || {};
  
  console.log('🔍 Paramètres de suivi (tracking):', JSON.stringify(tracking, null, 2));
  
  // Recherche spécifique du fd_tlid
  if (tracking.fd_tlid) {
    console.log('✅ fd_tlid trouvé:', tracking.fd_tlid);
  } else {
    console.log('⚠️ fd_tlid non trouvé dans les paramètres de tracking!');
    // Recherche dans d'autres champs potentiels
    if (tracking.utm_medium) console.log('📌 utm_medium:', tracking.utm_medium);
    if (tracking.utm_content) console.log('📌 utm_content:', tracking.utm_content);
  }
  
  // Enregistrement du webhook complet pour analyse
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logsDir, `webhook-${timestamp}.json`);
  
  fs.writeFileSync(
    logFile,
    JSON.stringify({
      receivedAt: new Date().toISOString(),
      headers: req.headers,
      body: req.body
    }, null, 2)
  );
  
  // Page d'accueil avec liste des webhooks reçus
  res.json({
    status: 'success',
    message: 'Webhook received and logged',
    event: event,
    trackingParams: tracking
  });
});

// Page d'accueil avec liste des webhooks reçus
app.get('/', (req, res) => {
  let logs = [];
  
  if (fs.existsSync(logsDir)) {
    logs = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(logsDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return {
            file,
            receivedAt: content.receivedAt,
            event: content.body.event,
            tracking: content.body.payload?.tracking
          };
        } catch (e) {
          return { file, error: e.message };
        }
      })
      .sort((a, b) => {
        if (!a.receivedAt) return 1;
        if (!b.receivedAt) return -1;
        return new Date(b.receivedAt) - new Date(a.receivedAt); // Plus récent en premier
      });
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Webhooks Calendly</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: system-ui, sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 1rem; }
        h1 { color: #2563eb; }
        h2 { color: #4b5563; margin-top: 2rem; }
        pre { background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
        .webhook { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
        .tag { display: inline-block; border-radius: 9999px; padding: 0.25rem 0.75rem; font-size: 0.875rem; margin-right: 0.5rem; }
        .tag-blue { background: #dbeafe; color: #1e40af; }
        .tag-green { background: #dcfce7; color: #166534; }
        .tag-yellow { background: #fef9c3; color: #854d0e; }
        .webhook-time { color: #6b7280; font-size: 0.875rem; }
        button { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; }
        button:hover { background: #1d4ed8; }
        .test-form { background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
      </style>
    </head>
    <body>
      <h1>Test Webhooks Calendly</h1>
      <p>Serveur prêt à recevoir des webhooks Calendly sur <code>/webhook</code></p>
      
      <div class="test-form">
        <h2>Simuler un webhook</h2>
        <p>Utilisez cet outil pour tester sans avoir à configurer Calendly</p>
        <div class="grid">
          <div>
            <button onclick="sendTestWebhook()">Envoyer webhook de test</button>
            <button onclick="location.reload()">Rafraîchir la page</button>
          </div>
          <div>
            <label>
              fd_tlid: 
              <input type="text" id="fd_tlid" value="test_visitor_123" style="padding: 0.25rem; border-radius: 0.25rem; border: 1px solid #d1d5db;">
            </label>
          </div>
        </div>
      </div>

      <h2>Webhooks reçus (${logs.length})</h2>
      ${logs.length === 0 ? '<p>Aucun webhook reçu pour le moment</p>' : ''}
      ${logs.map(log => {
        let trackingDisplay = '';
        let fdTlidFound = false;
        
        if (log.tracking) {
          if (log.tracking.fd_tlid) {
            fdTlidFound = true;
            trackingDisplay += `<span class="tag tag-green">fd_tlid: ${log.tracking.fd_tlid}</span>`;
          }
          if (log.tracking.utm_source) {
            trackingDisplay += `<span class="tag tag-blue">utm_source: ${log.tracking.utm_source}</span>`;
          }
          if (log.tracking.utm_medium) {
            trackingDisplay += `<span class="tag tag-blue">utm_medium: ${log.tracking.utm_medium}</span>`;
          }
        }
        
        return `
          <div class="webhook">
            <h3>${log.event || 'Unknown event'}</h3>
            <p class="webhook-time">${log.receivedAt || 'Unknown time'}</p>
            ${trackingDisplay}
            ${!fdTlidFound && log.tracking ? '<p>⚠️ <strong>fd_tlid non trouvé</strong> dans les paramètres de tracking!</p>' : ''}
            <details>
              <summary>Détails</summary>
              <pre>${JSON.stringify(log.tracking || {}, null, 2)}</pre>
            </details>
          </div>
        `;
      }).join('')}
      
      <script>
        function sendTestWebhook() {
          const fd_tlid = document.getElementById('fd_tlid').value || 'test_visitor_123';
          console.log('Envoi webhook test avec fd_tlid:', fd_tlid);
          
          fetch('/webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event: 'invitee.created',
              payload: {
                event_type: {
                  name: 'Test Meeting'
                },
                invitee: {
                  email: 'test@example.com',
                  name: 'Test User',
                  timezone: 'Europe/Paris'
                },
                scheduled_event: {
                  start_time: new Date().toISOString(),
                  uri: 'https://calendly.com/test/meeting'
                },
                tracking: {
                  utm_source: 'test_simulation',
                  utm_medium: 'direct',
                  utm_campaign: 'webhook_test',
                  fd_tlid: fd_tlid
                }
              }
            })
          })
          .then(response => response.json())
          .then(data => {
            alert('Webhook de test envoyé avec succès!');
            location.reload();
          })
          .catch(error => {
            console.error('Error:', error);
            alert('Erreur lors de l\'envoi du webhook de test');
          });
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Serveur de test pour webhooks Calendly démarré sur http://localhost:${port}`);
  console.log(`Endpoint webhook: http://localhost:${port}/webhook`);
  console.log(`Interface web: http://localhost:${port}`);
});
