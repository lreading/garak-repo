// Force dynamic rendering for the docs page
// This prevents Next.js from trying to statically generate this route during build
export const dynamic = 'force-dynamic';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

