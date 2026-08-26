'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/client';
import { getManualPaymentSettings, listManualPaymentBanks, updateManualPaymentSettings, type ManualPaymentBank, type ManualPaymentSettings } from '@/lib/api/manual-payments';

export function ManualPaymentSettingsCard() {
  const banks = useQuery({ queryKey: ['manual-payment-banks'], queryFn: listManualPaymentBanks });
  const settings = useQuery({ queryKey: ['manual-payment-settings'], queryFn: getManualPaymentSettings });
  if (banks.isLoading || settings.isLoading) return <Card><CardContent className="py-8 text-sm text-muted-foreground">Loading bank settings…</CardContent></Card>;
  if (banks.isError || settings.isError) return <Card><CardContent className="py-8 text-sm text-destructive">Could not load bank settings.</CardContent></Card>;
  return <ManualPaymentSettingsForm key={settings.data?.updatedAt ?? 'new'} banks={banks.data ?? []} initial={settings.data} />;
}

function ManualPaymentSettingsForm({ banks, initial }: Readonly<{ banks: ManualPaymentBank[]; initial: ManualPaymentSettings | null | undefined }>) {
  const queryClient = useQueryClient();
  const [bankCode, setBankCode] = useState(initial?.bankCode ?? '');
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? '');
  const [accountName, setAccountName] = useState(initial?.accountName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => updateManualPaymentSettings({ bankCode, accountNumber, accountName: accountName.trim(), currentPassword }),
    onSuccess: () => {
      toast.success('Bank details saved. Manual payment mode was disabled for safety.');
      setCurrentPassword('');
      void queryClient.invalidateQueries({ queryKey: ['manual-payment-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not save bank details'),
  });
  const valid = Boolean(bankCode && /^\d{10}$/.test(accountNumber) && accountName.trim().length >= 2 && currentPassword.length >= 8);

  return <Card>
    <CardHeader><CardTitle>Customer payment account</CardTitle><CardDescription>Super Admin only. Customers see these details when manual payment mode is enabled.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <Alert><AlertTitle>Safety behavior</AlertTitle><AlertDescription>Saving details switches manual payment mode off. Review the account, then enable the flag separately.</AlertDescription></Alert>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="manual-bank">Bank</Label><select id="manual-bank" value={bankCode} onChange={(event) => setBankCode(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Select a bank</option>{banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="manual-account-number">Account number</Label><Input id="manual-account-number" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit account number" /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="manual-account-name">Account name</Label><Input id="manual-account-name" value={accountName} onChange={(event) => setAccountName(event.target.value)} maxLength={150} /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="manual-current-password">Confirm your password</Label><Input id="manual-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div>
      </div>
      <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save bank details'}</Button>
    </CardContent>
  </Card>;
}
