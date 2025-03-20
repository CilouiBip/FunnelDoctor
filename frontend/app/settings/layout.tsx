"use client";

import AuthenticatedLayout from '../../components/AuthenticatedLayout';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
