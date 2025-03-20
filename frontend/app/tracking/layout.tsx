"use client";

import AuthenticatedLayout from '../../components/AuthenticatedLayout';

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
