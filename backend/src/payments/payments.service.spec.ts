import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { BridgingService } from '../bridging/bridging.service';
import { ConfigService } from '@nestjs/config';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { MasterLeadService } from '../leads/services/master-lead.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { SupabaseService } from '../supabase/supabase.service'; // Keep if used by dependencies like MasterLeadService?
import Stripe from 'stripe';
import { Lead } from '../leads/interfaces/lead.interface';
import { Touchpoint } from '../touchpoints/interfaces/touchpoint.interface';
import { NotFoundException } from '@nestjs/common';

// --- Mocks ---
const mockBridgingService = {
  findVisitorIdByEmail: jest.fn(),
  // createAssociation NO LONGER needed here
};

const mockConfigService = {
  get: jest.fn(),
};

const mockTouchpointsService = {
  create: jest.fn(),
};

const mockMasterLeadService = {
  findOrCreateMasterLead: jest.fn(),
};

const mockIntegrationsService = {
  getIntegrationConfig: jest.fn(),
};

// Mock Stripe constructor and methods
// This needs to be done carefully to resolve the 'is not a constructor' error
const mockStripeInstance = {
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};
// Mock the default export of the 'stripe' module
jest.mock('stripe', () => {
  // This is the constructor mock
  return jest.fn().mockImplementation(() => {
    // This is the instance mock
    return mockStripeInstance;
  });
});


describe('PaymentsService', () => {
  let service: PaymentsService;
  let integrationsService: jest.Mocked<IntegrationsService>;
  let bridgingService: jest.Mocked<BridgingService>;
  let masterLeadService: jest.Mocked<MasterLeadService>;
  let touchpointsService: jest.Mocked<TouchpointsService>;

  const userId = 'test-user-id';
  const stripeSecretKey = 'sk_test_123';
  const stripeWebhookSecret = 'whsec_test_123';
  const mockMasterLead: Lead = { id: 'master-lead-stripe-123', email: 'stripe@example.com', user_id: userId, full_name: 'Mock Stripe User', created_at: new Date(), updated_at: new Date(), status: 'new' };
  const mockTouchpoint: Touchpoint = { id: 'tp-stripe-123', master_lead_id: mockMasterLead.id, visitor_id: 'v-stripe-123', event_type: 'payment_succeeded', created_at: new Date(), updated_at: new Date() };


  beforeEach(async () => {
     // Clear mocks before module compilation if using jest.mock
     jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: BridgingService, useValue: mockBridgingService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TouchpointsService, useValue: mockTouchpointsService },
        { provide: MasterLeadService, useValue: mockMasterLeadService },
        { provide: IntegrationsService, useValue: mockIntegrationsService },
        { provide: SupabaseService, useValue: {} }, // Provide a minimal mock if not used directly
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    integrationsService = module.get(IntegrationsService) as jest.Mocked<IntegrationsService>;
    bridgingService = module.get(BridgingService) as jest.Mocked<BridgingService>;
    masterLeadService = module.get(MasterLeadService) as jest.Mocked<MasterLeadService>;
    touchpointsService = module.get(TouchpointsService) as jest.Mocked<TouchpointsService>;

  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Nous ne testons pas directement les mu00e9thodes privu00e9es, elles sont validu00e9es par les tests des mu00e9thodes publiques

  describe('createCheckoutSession', () => {
      const checkoutData = {
        priceId: 'price_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customerEmail: 'customer@example.com',
        visitor_id: 'visitor-123',
        metadata: { productName: 'Premium Plan' },
      };
      const stripeSession = { id: 'cs_123', url: 'https://stripe.url' };

      beforeEach(() => {
          // Mock getStripeInstance directly for these tests
           jest.spyOn(service as any, 'getStripeInstance').mockResolvedValue(mockStripeInstance);
           mockStripeInstance.checkout.sessions.create.mockResolvedValue(stripeSession);
      })

    it('should call getStripeInstance and create session with fd_visitor_id', async () => {
      await service.createCheckoutSession(checkoutData, userId);

      expect((service as any).getStripeInstance).toHaveBeenCalledWith(userId);
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
          metadata: expect.objectContaining({
              ...checkoutData.metadata,
              fd_visitor_id: checkoutData.visitor_id // Check the correct key is used
          })
      }));
    });

     it('should create session even if visitor_id is undefined', async () => {
        const dataWithoutVisitor = { ...checkoutData, visitor_id: undefined };
        await service.createCheckoutSession(dataWithoutVisitor, userId);

        expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
             metadata: expect.objectContaining({
                 ...checkoutData.metadata,
                 fd_visitor_id: '', // Should default to empty string
             })
         }));
     });

    it('should return session id and url on success', async () => {
      const result = await service.createCheckoutSession(checkoutData, userId);
      expect(result).toEqual({ sessionId: stripeSession.id, url: stripeSession.url });
    });

     it('should throw error if stripe instance creation fails', async () => {
        jest.spyOn(service as any, 'getStripeInstance').mockRejectedValue(new Error('Stripe init failed'));
        await expect(service.createCheckoutSession(checkoutData, userId)).rejects.toThrow('Stripe init failed');
    });

     it('should throw error if session creation fails', async () => {
         mockStripeInstance.checkout.sessions.create.mockRejectedValue(new Error('Session creation failed'));
        await expect(service.createCheckoutSession(checkoutData, userId)).rejects.toThrow('Session creation failed');
    });
  });

  describe('handleWebhookEvent', () => {
    const webhookPayload = Buffer.from(JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed' }));
    const webhookSignature = 'sig_123';
    const mockStripeConfig = { secret_key: stripeSecretKey, webhook_secret: stripeWebhookSecret };
    const mockSession = { id: 'cs_123', customer_email: 'test@example.com', metadata: {}, payment_intent: 'pi_123' } as Stripe.Checkout.Session;
    const mockEvent = { type: 'checkout.session.completed', data: { object: mockSession } } as Stripe.Event;

     beforeEach(() => {
        integrationsService.getIntegrationConfig.mockResolvedValue(mockStripeConfig);
        // Mock getStripeInstance for these tests
        jest.spyOn(service as any, 'getStripeInstance').mockResolvedValue(mockStripeInstance);
        mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
     });

    it('should verify signature and call handleCompletedCheckout for completed session', async () => {
       // Spy on handleCompletedCheckout BEFORE calling handleWebhookEvent
       const handleCompletedCheckoutSpy = jest.spyOn(service as any, 'handleCompletedCheckout').mockResolvedValue({ success: true });

       await service.handleWebhookEvent(webhookPayload, webhookSignature, userId);

       expect(integrationsService.getIntegrationConfig).toHaveBeenCalledWith(userId, 'stripe');
       expect((service as any).getStripeInstance).toHaveBeenCalledWith(userId);
       expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(webhookPayload, webhookSignature, stripeWebhookSecret);
       expect(handleCompletedCheckoutSpy).toHaveBeenCalledWith(mockSession, userId);
    });

    it('should return success if event type is not checkout.session.completed', async () => {
       const otherEvent = { ...mockEvent, type: 'charge.succeeded' };
       mockStripeInstance.webhooks.constructEvent.mockReturnValue(otherEvent);
       const handleCompletedCheckoutSpy = jest.spyOn(service as any, 'handleCompletedCheckout');


       const result = await service.handleWebhookEvent(webhookPayload, webhookSignature, userId);

       expect(handleCompletedCheckoutSpy).not.toHaveBeenCalled();
       expect(result).toEqual({ received: true, type: 'charge.succeeded' });
    });

    it('should throw error if webhook signature verification fails', async () => {
        const error = new Error('Invalid signature');
        mockStripeInstance.webhooks.constructEvent.mockImplementation(() => { throw error; });

        await expect(service.handleWebhookEvent(webhookPayload, webhookSignature, userId)).rejects.toThrow('Webhook signature verification failed: Invalid signature');
    });

     it('should throw error if stripe config is incomplete', async () => {
        integrationsService.getIntegrationConfig.mockResolvedValue({ secret_key: stripeSecretKey }); // Missing webhook_secret
         await expect(service.handleWebhookEvent(webhookPayload, webhookSignature, userId)).rejects.toThrow(NotFoundException);
    });
  });


  describe('handleCompletedCheckout', () => {
    const email = 'stripe-customer@example.com';
    const visitorIdMeta = 'v-meta-123';
    const visitorIdBridge = 'v-bridge-456';
    const mockSessionBase = {
        id: 'cs_test_123',
        customer_email: email,
        customer_details: { email: email },
        amount_total: 5000,
        currency: 'eur',
        payment_intent: 'pi_test_123',
        metadata: {}
    } as Stripe.Checkout.Session;

    beforeEach(() => {
        masterLeadService.findOrCreateMasterLead.mockResolvedValue(mockMasterLead);
        touchpointsService.create.mockResolvedValue(mockTouchpoint);
        bridgingService.findVisitorIdByEmail.mockResolvedValue(null); // Default: bridge finds nothing
    });

    it('should use visitorId from metadata if present', async () => {
        const sessionWithMeta = { ...mockSessionBase, metadata: { fd_visitor_id: visitorIdMeta } };
        await service.handleCompletedCheckout(sessionWithMeta, userId);

        expect(bridgingService.findVisitorIdByEmail).not.toHaveBeenCalled();
        expect(masterLeadService.findOrCreateMasterLead).toHaveBeenCalledWith({ email, visitor_id: visitorIdMeta }, userId, 'stripe');
        expect(touchpointsService.create).toHaveBeenCalledWith(expect.objectContaining({ visitor_id: visitorIdMeta, master_lead_id: mockMasterLead.id }));
    });

     it('should use visitorId from bridge if not in metadata', async () => {
        const sessionWithoutMeta = { ...mockSessionBase, metadata: {} };
        bridgingService.findVisitorIdByEmail.mockResolvedValue(visitorIdBridge);

        await service.handleCompletedCheckout(sessionWithoutMeta, userId);

        expect(bridgingService.findVisitorIdByEmail).toHaveBeenCalledWith(email);
        expect(masterLeadService.findOrCreateMasterLead).toHaveBeenCalledWith({ email, visitor_id: visitorIdBridge }, userId, 'stripe');
        expect(touchpointsService.create).toHaveBeenCalledWith(expect.objectContaining({ visitor_id: visitorIdBridge, master_lead_id: mockMasterLead.id }));
    });

     it('should call findOrCreateMasterLead with undefined visitor_id if none found', async () => {
         const sessionWithoutMeta = { ...mockSessionBase, metadata: {} };
         // bridgingService already mocked to return null by default

         await service.handleCompletedCheckout(sessionWithoutMeta, userId);

         expect(bridgingService.findVisitorIdByEmail).toHaveBeenCalledWith(email);
         expect(masterLeadService.findOrCreateMasterLead).toHaveBeenCalledWith({ email, visitor_id: undefined }, userId, 'stripe');
         // Touchpoint should NOT be created if finalVisitorId is null/undefined
         expect(touchpointsService.create).not.toHaveBeenCalled();
     });

    it('should return success false if email is missing', async () => {
        const sessionWithoutEmail = { ...mockSessionBase, customer_email: null, customer_details: null };
        const result = await service.handleCompletedCheckout(sessionWithoutEmail, userId);
        expect(result.success).toBe(false);
        expect(result.error).toEqual('Missing email');
        expect(masterLeadService.findOrCreateMasterLead).not.toHaveBeenCalled();
    });

     it('should create touchpoint with correct payment data', async () => {
        const sessionWithMeta = { ...mockSessionBase, metadata: { fd_visitor_id: visitorIdMeta, product_name: 'Super Product' } };
        await service.handleCompletedCheckout(sessionWithMeta, userId);

        expect(touchpointsService.create).toHaveBeenCalledWith({
            visitor_id: visitorIdMeta,
            master_lead_id: mockMasterLead.id,
            event_type: 'payment_succeeded',
            event_data: expect.objectContaining({
              payment_intent: 'pi_test_123',
              amount: 5000, // Check amount is correct
              currency: 'eur',
              email: email,
              customer: undefined, // Customer object might be complex, check for presence if needed
              product_name: 'Super Product', // Check product name from metadata
            }),
        });
    });
  });

});