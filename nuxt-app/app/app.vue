<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
    <!-- Global Dark Mode Toggle -->
    <button
      class="fixed top-4 right-4 z-50 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-300"
      @click="toggleColorMode"
      title="Basculer le thème"
    >
      <Icon 
        :name="$colorMode.value === 'dark' ? 'tabler:sun' : 'tabler:moon'" 
        class="w-6 h-6 transition-transform duration-500 hover:rotate-[360deg]"
      />
    </button>
    <NuxtPage />
    <BaseSnackbar />
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
