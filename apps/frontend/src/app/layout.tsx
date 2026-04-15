import './global.css';
import { Sidebar } from '../features/chat/components/Sidebar';

export const metadata = {
  title: 'Naty AI',
  description: 'Votre assistant intelligent multi-provider',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="h-screen overflow-hidden">
        <div className="flex h-full bg-white text-gray-900">
          <Sidebar />

          <main className="flex-1 flex flex-col relative overflow-hidden h-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}