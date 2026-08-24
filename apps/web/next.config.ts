import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default es 1mb — no alcanza para subir un PDF/foto de laboratorio
    // desde el portal del paciente (Server Action subirLaboratorio).
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
