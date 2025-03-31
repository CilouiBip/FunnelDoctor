// tests/bridging.test.js

// Configurer l'environnement Node.js pour les tests
process.env.NODE_ENV = 'test';

// Importer le module à tester
const bridging = require('../public/bridging.js');

// Désactiver les logs de console pendant les tests
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

describe('Bridging JS', () => {
  let windowAddEventListenerSpy;
  let documentAddEventListenerSpy;
  let mockSendBeacon;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mocks pour navigation.sendBeacon
    mockSendBeacon = jest.fn().mockReturnValue(true);
    
    // Setup du DOM et du window
    global.window = {
      location: { href: 'https://test.example.com' },
      addEventListener: jest.fn(),
      FunnelDoctor: {
        initialized: true,
        getVisitorId: jest.fn().mockReturnValue('test-visitor-123'),
        getStoredUTMParams: jest.fn().mockReturnValue({
          utm_source: 'test',
          utm_medium: 'unit-test'
        })
      }
    };
    
    global.document = {
      querySelector: jest.fn(),
      querySelectorAll: jest.fn().mockReturnValue([]),
      addEventListener: jest.fn(),
      body: {},
      readyState: 'complete'
    };
    
    global.navigator = {
      sendBeacon: mockSendBeacon
    };
    
    // Mock storage
    const mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    
    global.localStorage = {...mockStorage};
    global.sessionStorage = {...mockStorage};
    
    // Capture les spies pour les méthodes addEventListener
    windowAddEventListenerSpy = jest.spyOn(window, 'addEventListener');
    documentAddEventListenerSpy = jest.spyOn(document, 'addEventListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialize()', () => {
    test('should attach event listeners when initialized', () => {
      // Exécute la fonction d'initialisation
      bridging.initialize();
      
      // Vérifie que les écouteurs d'événements sont attachés
      expect(documentAddEventListenerSpy).toHaveBeenCalledWith('submit', expect.any(Function));
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });
  
  describe('setupFormListener()', () => {
    test('should attach a submit event listener to document', () => {
      // Exécute la fonction à tester
      bridging.setupFormListener();
      
      // Vérifie que l'écouteur a été ajouté
      expect(documentAddEventListenerSpy).toHaveBeenCalledWith('submit', expect.any(Function));
    });
  });
  
  describe('setupCalendlyListener()', () => {
    test('should attach a message event listener to window', () => {
      // Exécute la fonction à tester
      bridging.setupCalendlyListener();
      
      // Vérifie que l'écouteur a été ajouté
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });
  
  describe('setupCalendlyPrefill()', () => {
    test('should query Calendly links and check for known email', () => {
      // Créer un spy pour querySelectorAll avant toute autre opération
      const querySelectorAllSpy = jest.spyOn(document, 'querySelectorAll');
      
      // Configure les mocks
      const mockLink = {
        href: 'https://calendly.com/test/meeting',
        tagName: 'A'
      };
      
      // S'assurer que querySelectorAll retourne notre lien mock
      querySelectorAllSpy.mockReturnValue([mockLink]);
      
      // Remplacer l'implémentation complète de localStorage avec une définition robuste
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: jest.fn().mockReturnValue('test@example.com'),
          setItem: jest.fn()
        },
        writable: true
      });
      
      // Mock URL constructor avec une fonction qui préserve le lien original
      // mais permet d'ajouter des paramètres
      global.URL = jest.fn(function(url) {
        return {
          toString: () => url + '?email=test@example.com',
          searchParams: { 
            set: jest.fn() 
          }
        };
      });
      
      // Exécute la fonction à tester
      bridging.setupCalendlyPrefill();
      
      // Vérifier que querySelectorAll a été appelé avec le bon sélecteur
      expect(querySelectorAllSpy).toHaveBeenCalledWith('a[href*="calendly.com"]');
      
      // Vérifier que localStorage a été consulté pour l'email
      expect(localStorage.getItem).toHaveBeenCalledWith('fd_known_email');
      
      // Vérifier que l'écouteur de formulaire a été ajouté
      expect(documentAddEventListenerSpy).toHaveBeenCalledWith('submit', expect.any(Function));
    });
  });
});
