import type { GetApiModules200Item } from '~/utils/model'
import { getApiModules } from '~/utils/api'

export const useModules = () => {
  const modules = ref<GetApiModules200Item[]>([])
  const error = ref<string | null>(null)

  const loadModules = async () => {
    try {
      const response = await getApiModules()
      if (response.data) {
        modules.value = response.data
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erreur de connexion'
      error.value = `Impossible de charger les modules: ${errorMessage}`
      console.error('Erreur fetch modules:', e)
    }
  }

  const addModuleFromTopic = (topic: string) => {
    const topicParts = topic.split('/')
    if (topicParts.length < 2) return null

    const moduleId = topicParts[0]

    if (!modules.value.find(m => m.id === moduleId)) {
      // Optimistic update
      modules.value.push({
        id: moduleId,
        name: moduleId,
        type: 'unknown',
        status: null,
      })
      return moduleId
    }

    return null
  }

  return {
    modules: readonly(modules),
    error: readonly(error),
    loadModules,
    addModuleFromTopic,
  }
}
