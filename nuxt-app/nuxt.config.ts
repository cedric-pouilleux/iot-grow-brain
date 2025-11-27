// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],

  icon: {
    serverBundle: 'local',
    clientBundle: {
      scan: true,
      includeCustomCollections: true, 
    }, 
  },

  runtimeConfig: {
    public: {
      // En prod, on utilise SOCKET_URL=/ pour passer par Nginx (port 80)
      // En dev, on peut surcharger avec http://localhost:3001 via NUXT_PUBLIC_SOCKET_URL
      socketUrl: process.env.SOCKET_URL || '/'
    }
  },
  
  typescript: {
    strict: false, 
    typeCheck: false
  },

  // Proxy interne pour éviter les problèmes CORS et Docker Network
  routeRules: {
    // En dev local sans docker, fallback sur localhost:3001
    '/api/**': { proxy: `${process.env.API_URL || 'http://localhost:3001'}/api/**` }
  }
})
