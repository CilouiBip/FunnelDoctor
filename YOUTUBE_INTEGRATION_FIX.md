# YouTube Integration Fix: Global Approach

## 1. Database Structure Analysis

We've confirmed the following about the `integrations` table:
- Has both `name` AND `user_id` columns
- Has a UNIQUE constraint on (`name`, `integration_type`)
- Contains already 4 YouTube integrations
- The `name` column is currently being used to store user IDs

```sql
-- Current constraint
UNIQUE CONSTRAINT "unique_name_integration" (name, integration_type)
```

There is inconsistency between how the DB stores user IDs (in `name`) and how some services try to access it (using `user_id`). This can cause errors like "column integrations.user_id does not exist" in some requests.

## 2. Align Code & DB Structure

The issue is that:
- `integration.service.ts` stores user data in the `name` column
- `youtube-token-refresh.service.ts` tries to access it from the `user_id` column

We have updated the `youtube-token-refresh.service.ts` to use the `name` column instead of `user_id` for consistency.

## 3. Environment Variable Synchronization

We identified two major issues:

1. **Frontend Environment Variable Naming**: 
   - The frontend code in `youtube.service.ts` looks for `NEXT_PUBLIC_BACKEND_URL` 
   - But the frontend environment file only contains `BACKEND_URL=https://funnel.doctor.ngrok.app`
   - This mismatch prevents the frontend from properly connecting to the backend

2. **Backend Environment Validation**:
   - The backend has appropriate environment variables: 
     - `NGROK_PUBLIC_URL=https://funnel.doctor.ngrok.app`
     - `YOUTUBE_REDIRECT_URI=https://funnel.doctor.ngrok.app/api/auth/youtube/callback`

To fix this, we're updating the frontend environment variable to use the required `NEXT_PUBLIC_` prefix required by Next.js.

## 4. Routing Verification

The `/api/auth/youtube/revoke/:userId` endpoint exists in the controller but may not be called correctly from the frontend. The 404 errors are likely caused by:

1. Frontend environment variable mismatch preventing correct URL construction
2. Mismatches between HTTP methods (GET vs POST) for the revoke endpoint

## 5. API Route Testing Plan

We've implemented a comprehensive testing approach that verifies:

1. Backend route availability
2. Proper environment variable usage
3. Complete OAuth flow from start to finish

This includes a validation of all key routes:
- `/api/auth/youtube/diagnostic`
- `/api/auth/youtube/test-authorize`
- `/api/auth/youtube/callback`
- `/api/auth/youtube/revoke/:userId`

## 6. Summary of Changes Made

1. **Frontend Environment Fix**:
   - Updated frontend environment variable from `BACKEND_URL` to `NEXT_PUBLIC_BACKEND_URL` for Next.js compatibility.
   - Added robust validation checks throughout the `youtube.service.ts` to detect misconfiguration.
   - Enhanced logging with more descriptive messages for easier troubleshooting.

2. **Backend Service Update**:
   - Modified `youtube-token-refresh.service.ts` to use `name` instead of `user_id` for consistency.
   - Added additional logging to track token expiration and refresh events.
   
3. **Diagnostic Tools**:
   - Created a comprehensive diagnostic script `verify-youtube-integration.ts` that checks all aspects of the integration.
   - The script verifies environment variables, database structure, and API routes to ensure everything is properly configured.

## 7. Next Steps

1. **Run the Verification Script**:
   ```bash
   cd backend
   npm run start:dev -- --exec 'ts-node src/scripts/verify-youtube-integration.ts'
   ```

2. **Test the Integration Flow**:
   - Ensure ngrok is running with the correct tunnel configuration
   - Navigate to the YouTube integration page in the frontend
   - Attempt to connect and disconnect a YouTube account
   - Check the browser console and backend logs for any errors

3. **Database Monitoring**:
   - Monitor the `integrations` table for correct data structure and values
   - Verify that tokens are being refreshed automatically when they expire

4. **Frontend Consistency**:
   - Verify that the frontend properly handles authentication state changes
   - Ensure the UI correctly reflects when a YouTube account is connected or disconnected
