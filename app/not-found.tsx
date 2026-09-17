import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#efeae2] p-4 text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Page introuvable</h2>
      <p className="text-sm text-gray-600 mb-4">La page demandée n'existe pas.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-[#00a884] text-white rounded-lg text-sm font-semibold hover:bg-[#008069] transition"
      >
        Retour à la messagerie
      </Link>
    </div>
  );
}
