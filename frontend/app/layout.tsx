// Defines the root layout for the application e.g. including global styles and metadata
import type { Metadata } from "next"; // Defines page metadata  
import "./globals.css";


export const metadata: Metadata = { // Browser title and description
  title: "Speakly",
  description: "A speaking confidence coach for non-native English speakers",
};

export default function RootLayout({ 
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
