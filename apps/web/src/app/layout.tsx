import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Desmos CRM", template: "%s · Desmos CRM" },
  description:
    "Uma base organizada para conectar sua equipe e seus próximos negócios.",
};
const themeScript = `(function(){var t='light';try{var s=localStorage.getItem('orbit-theme');if(s==='dark'||s==='light')t=s}catch(e){}document.documentElement.dataset.theme=t})()`;
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
