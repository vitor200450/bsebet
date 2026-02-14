import { useEffect, useState } from "react";

interface TeamLogoProps {
  teamId: number;
  teamName: string;
  logoUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

/**
 * Componente de Logo de Time Otimizado para R2
 *
 * Usa a URL diretamente do banco (Cloudflare R2)
 * - Cache automático pelo CDN
 * - Zero egress do banco de dados
 * - Carregamento lazy
 */
export function TeamLogo({
  teamId,
  teamName,
  logoUrl,
  className = "",
  size = "md",
}: TeamLogoProps) {
  const [error, setError] = useState(false);

  // Fallback se não tiver logo ou der erro
  if (!logoUrl || error) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-xs ${className}`}
        title={teamName}
      >
        {teamName.charAt(0).toUpperCase()}
      </div>
    );
  }

  // Logo do R2 (cacheada pelo CDN)
  return (
    <img
      src={logoUrl}
      alt={teamName}
      className={`${sizeClasses[size]} object-contain rounded-full bg-white ${className}`}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}
