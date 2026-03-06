export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Orveeo API",
    version: "1.0.0",
    description: "API per l'applicazione di prenotazione appuntamenti dal barbiere Orveeo. L'autenticazione è gestita da Firebase Auth (client-side).",
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      description: "Development server",
    },
  ],
  paths: {},
  tags: [],
} as const;
