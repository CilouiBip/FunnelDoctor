"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail } from '@/lib/services/auth.service';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const VerifyEmailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyUserEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Token de vérification invalide ou manquant.');
        return;
      }

      try {
        const response = await verifyEmail(token);
        setStatus('success');
        setMessage(response.message);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'email:', error);
        setStatus('error');
        setMessage('Une erreur est survenue lors de la vérification de votre email. Le token est peut-être expiré ou invalide.');
      }
    };

    verifyUserEmail();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Vérification d&apos;email
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' ? 'Vérification de votre adresse email...' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center p-4 text-center">
            {status === 'loading' && (
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
            <p className="mt-4 text-lg">{message}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          {status !== 'loading' && (
            <Button 
              onClick={() => router.push('/auth/login')} 
              className="w-full"
            >
              {status === 'success' ? 'Se connecter' : 'Retour à la connexion'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
