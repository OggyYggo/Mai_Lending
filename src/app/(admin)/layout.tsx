export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <span className="text-lg font-semibold">Admin Dashboard</span>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
