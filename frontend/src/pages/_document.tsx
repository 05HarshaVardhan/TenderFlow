// ✅ src/pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark"> {/* Default to dark mode */}
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
