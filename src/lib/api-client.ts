/**
 * API Client with Authentication Error Handling
 * 
 * This module provides a wrapper around fetch that automatically handles
 * 401 authentication errors by redirecting to the signin page when OIDC is enabled.
 */

import { signOut } from 'next-auth/react';

/**
 * Check if OIDC is enabled by calling the auth config endpoint
 */
async function isOIDCEnabled(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/config');
    if (response.ok) {
      const config = await response.json();
      return config.oidcEnabled === true;
    }
  } catch (error) {
    console.warn('Failed to check OIDC status:', error);
  }
  // Default to true if we can't check (safer for production)
  return true;
}

/**
 * Custom fetch wrapper that handles 401 responses
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, options);
  
  // Handle 401 Unauthorized responses only if OIDC is enabled
  if (response.status === 401) {
    const oidcEnabled = await isOIDCEnabled();
    
    if (oidcEnabled) {
      console.warn('Received 401 response, redirecting to signin');
      
      // Sign out the user to clear any stale session data
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: false 
      });
      
      // Redirect to signin page
      window.location.href = '/auth/signin';
      
      // Return a rejected promise to prevent further processing
      throw new Error('Authentication required');
    } else {
      console.warn('Received 401 response but OIDC is disabled - this should not happen');
      // When OIDC is disabled, 401 responses should not occur
      // Just return the response as-is for the caller to handle
    }
  }
  
  return response;
}

/**
 * API client for JSON responses with 401 handling
 */
export async function apiJson<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use the text or default message
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * API client for text responses with 401 handling
 */
export async function apiText(url: string, options: RequestInit = {}): Promise<string> {
  const response = await apiFetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use the text or default message
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
  
  return response.text();
}
