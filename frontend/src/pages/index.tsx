//frontend/src/pages/index.js
import { useRouter } from "next/router";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8">
      <Image src="/next.svg" alt="Next.js logo" width={180} height={38} priority />
      <h1 className="text-4xl font-bold text-center typing-text">
  Welcome to Your App!
</h1>



      <button
        onClick={() => router.push("/dashboard")}
        className="bg-white text-black font-semibold px-8 py-3 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:shadow-[0_0_25px_rgba(255,255,255,0.8)] transition duration-300"
      >
        Get Started
      </button>
    </main>
  );
}
