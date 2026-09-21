import { AuthExperience } from "@/components/auth/auth-experience";

export const metadata = {
  title: "Masuk",
  description: "KITA — aplikasi pribadi Eki & Dinda untuk keuangan dan rencana hidup berdua.",
};

// Bilah status ponsel ikut gelap supaya menyatu dengan halaman.
export const viewport = { themeColor: "#02040F", colorScheme: "dark" as const };

export default function LoginPage() {
  return <AuthExperience />;
}
