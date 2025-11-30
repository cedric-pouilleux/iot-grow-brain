import type { Module } from '../types'

export const useModules = () => {
  const modules = ref<Module[]>([])
  const error = ref<string | null>(null)

  const loadModules = async () => {
    try {
      const data = await $fetch<Module[]>('/api/modules', { timeout: 5000, retry: 0 })
      modules.value = data
    } catch (e: any) {
      error.value = `Impossible de charger les modules: ${e.message || 'Erreur de connexion'}`
      console.error('Erreur fetch modules:', e)
    }
  }

  const addModuleFromTopic = (topic: string) => {
    const topicParts = topic.split('/')
    if (topicParts.length < 2) return null

    const moduleId = topicParts[0]
    
    if (!modules.value.find(m => m.id === moduleId)) {
      modules.value.push({
        id: moduleId,
        name: moduleId
      })
      return moduleId
    }
    
    return null
  }

  return {
    modules: readonly(modules),
    error: readonly(error),
    loadModules,
    addModuleFromTopic
  }
}

