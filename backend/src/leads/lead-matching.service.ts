import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LeadsService } from './services/leads.service';

@Injectable()
export class LeadMatchingService {
  private readonly logger = new Logger(LeadMatchingService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Associate a secondary email with a visitor/lead
   * @param visitorId The visitor ID
   * @param secondaryEmail The secondary email to associate
   * @param source The source of the secondary email (e.g., 'calendly', 'youtube', 'stripe')
   */
  async captureSecondaryEmail(
    visitorId: string,
    secondaryEmail: string,
    source: string,
  ): Promise<{ success: boolean; message: string; leadId?: string }> {
    try {
      // Normalize email
      const normalizedEmail = secondaryEmail.toLowerCase().trim();
      
      // Check if this email already exists as a primary email for another lead
      const { data: existingLeadWithEmail } = await this.supabaseService
        .getAdminClient()
        .from('leads')
        .select('id, email, visitor_id, secondary_emails')
        .eq('email', normalizedEmail)
        .single();
      
      // Get the current lead by visitor_id
      const { data: currentLead } = await this.supabaseService
        .getAdminClient()
        .from('leads')
        .select('id, email, visitor_id, secondary_emails')
        .eq('visitor_id', visitorId)
        .single();
      
      // Case 1: No existing lead with this visitor_id
      if (!currentLead) {
        this.logger.warn(`No lead found with visitor_id ${visitorId}`);
        return { success: false, message: 'No lead found with this visitor ID' };
      }
      
      // Case 2: This email is already the primary email for this lead
      if (currentLead.email === normalizedEmail) {
        return { 
          success: true, 
          message: 'Email is already the primary email for this lead',
          leadId: currentLead.id 
        };
      }
      
      // Case 3: This email already exists as a primary email for another lead
      if (existingLeadWithEmail && existingLeadWithEmail.id !== currentLead.id) {
        // This is a bridging case - we need to merge the leads
        return await this.mergeLeads(
          currentLead.id, 
          existingLeadWithEmail.id,
          source
        );
      }
      
      // Case 4: Add as secondary email to the current lead
      const secondaryEmails = currentLead.secondary_emails || [];
      
      // Check if email is already in secondary emails
      if (secondaryEmails.includes(normalizedEmail)) {
        return { 
          success: true, 
          message: 'Email is already in secondary emails for this lead',
          leadId: currentLead.id 
        };
      }
      
      // Add the new secondary email
      const updatedSecondaryEmails = [...secondaryEmails, normalizedEmail];
      
      const { error } = await this.supabaseService
        .getAdminClient()
        .from('leads')
        .update({ 
          secondary_emails: updatedSecondaryEmails,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentLead.id);
      
      if (error) {
        this.logger.error(
          `Failed to update secondary emails: ${error.message}`,
          error.stack
        );
        return { success: false, message: 'Failed to update secondary emails' };
      }
      
      // Log the bridging activity
      await this.logBridgingActivity({
        lead_id: currentLead.id,
        action: 'add_secondary_email',
        details: {
          email: normalizedEmail,
          source,
        },
      });
      
      return { 
        success: true, 
        message: 'Secondary email added successfully',
        leadId: currentLead.id 
      };
    } catch (error) {
      this.logger.error(
        `Error capturing secondary email: ${error.message}`,
        error.stack
      );
      return { success: false, message: `Error capturing secondary email: ${error.message}` };
    }
  }

  /**
   * Merge two leads when a secondary email matches across leads
   * @param primaryLeadId The ID of the lead to keep
   * @param secondaryLeadId The ID of the lead to merge and potentially delete
   * @param source The source triggering the merge
   */
  private async mergeLeads(
    primaryLeadId: string,
    secondaryLeadId: string,
    source: string,
  ): Promise<{ success: boolean; message: string; leadId?: string }> {
    const supabase = this.supabaseService.getAdminClient();
    
    try {
      // Get both leads
      const { data: primaryLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', primaryLeadId)
        .single();
        
      const { data: secondaryLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', secondaryLeadId)
        .single();
      
      if (!primaryLead || !secondaryLead) {
        return { success: false, message: 'One or both leads not found' };
      }
      
      // Combine secondary emails, ensuring no duplicates
      const combinedSecondaryEmails = [
        ...(primaryLead.secondary_emails || []),
        ...(secondaryLead.secondary_emails || []),
        secondaryLead.email, // Add the secondary lead's primary email as a secondary
      ].filter(email => {
        // Remove duplicates and the primary lead's email
        return email !== primaryLead.email && 
               !(primaryLead.secondary_emails || []).includes(email);
      });
      
      // Update the primary lead with combined information
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          secondary_emails: combinedSecondaryEmails,
          // Optional: merge other properties if needed
          updated_at: new Date().toISOString(),
        })
        .eq('id', primaryLeadId);
      
      if (updateError) {
        this.logger.error(
          `Failed to update primary lead during merge: ${updateError.message}`,
          updateError.stack
        );
        return { success: false, message: 'Failed to merge leads' };
      }
      
      // Log the merging activity
      await this.logBridgingActivity({
        lead_id: primaryLeadId,
        action: 'merge_leads',
        details: {
          merged_lead_id: secondaryLeadId,
          source,
        },
      });
      
      // OPTIONAL: We could delete the secondary lead, but it's safer to keep it
      // and just update its status to indicate it's been merged
      const { error: secondaryUpdateError } = await supabase
        .from('leads')
        .update({
          status: 'merged',
          merged_into: primaryLeadId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', secondaryLeadId);
      
      if (secondaryUpdateError) {
        this.logger.warn(
          `Failed to update secondary lead status: ${secondaryUpdateError.message}`,
          secondaryUpdateError.stack
        );
        // We don't fail the whole operation just because this part failed
      }
      
      return { 
        success: true, 
        message: 'Leads merged successfully',
        leadId: primaryLeadId 
      };
    } catch (error) {
      this.logger.error(
        `Error merging leads: ${error.message}`,
        error.stack
      );
      return { success: false, message: `Error merging leads: ${error.message}` };
    }
  }

  /**
   * Log bridging activity for auditing
   */
  private async logBridgingActivity(activity: {
    lead_id: string;
    action: string;
    details: Record<string, any>;
  }): Promise<void> {
    try {
      await this.supabaseService
        .getAdminClient()
        .from('bridging_activities')
        .insert({
          ...activity,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      this.logger.error(
        `Failed to log bridging activity: ${error.message}`,
        error.stack
      );
      // Non-blocking - we don't want to fail the main operation if logging fails
    }
  }
}
