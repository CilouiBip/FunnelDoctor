"use client";

import { useState, useEffect } from 'react';
import { testYouTubeApiConnection } from '../../services/youtube.service';
import { connectYouTubeAccount } from '../../services/youtube.service';

interface DiagnosticResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
  urlTested?: string;
  config?: {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: Record<string, string>;
  };
}

export default function YouTubeTestPage() {
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectResult, setConnectResult] = useState<any>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  async function runDiagnostic() {
    setLoading(true);
    try {
      const result = await testYouTubeApiConnection();
      setDiagnosticResult(result);
    } catch (error) {
      setDiagnosticResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  }

  async function runConnect() {
    setConnectLoading(true);
    try {
      const result = await connectYouTubeAccount();
      setConnectResult(result);
    } catch (error) {
      setConnectResult({
        success: false,
        error: error.message,
        stack: error.stack
      });
    } finally {
      setConnectLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">YouTube API Diagnostic Tool</h1>
      
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">API Connection Test</h2>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-4"
          onClick={runDiagnostic}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test API Connection'}
        </button>
        
        {diagnosticResult && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">
              {diagnosticResult.success ? '✅ Connection Successful' : '❌ Connection Failed'}
            </h3>
            
            {diagnosticResult.urlTested && (
              <div className="mb-2">
                <span className="font-medium">URL Tested:</span> {diagnosticResult.urlTested}
              </div>
            )}
            
            {diagnosticResult.error && (
              <div className="mb-2 text-red-600">
                <span className="font-medium">Error:</span> {diagnosticResult.error}
              </div>
            )}
            
            {diagnosticResult.status && (
              <div className="mb-2">
                <span className="font-medium">Status Code:</span> {diagnosticResult.status}
              </div>
            )}
            
            <div className="mt-4">
              <details className="border p-2 rounded">
                <summary className="cursor-pointer font-medium">Full Result Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 overflow-auto text-xs">
                  {JSON.stringify(diagnosticResult, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
      
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">YouTube Connect Test</h2>
        <button 
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={runConnect}
          disabled={connectLoading}
        >
          {connectLoading ? 'Connecting...' : 'Test YouTube Connect'}
        </button>
        
        {connectResult && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">
              {connectResult.success !== false ? '✅ Connect Function Ran' : '❌ Connect Failed'}
            </h3>
            
            {connectResult.error && (
              <div className="mb-2 text-red-600">
                <span className="font-medium">Error:</span> {connectResult.error}
              </div>
            )}
            
            <div className="mt-4">
              <details className="border p-2 rounded">
                <summary className="cursor-pointer font-medium">Full Result Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 overflow-auto text-xs">
                  {JSON.stringify(connectResult, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
        <ul className="list-disc list-inside">
          <li><strong>Browser Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</li>
          <li><strong>Current Path:</strong> {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</li>
          <li><strong>Next.js Environment:</strong> {process.env.NODE_ENV}</li>
        </ul>
      </div>
    </div>
  );
}
