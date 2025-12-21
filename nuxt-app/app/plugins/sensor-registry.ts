import { registerStandardSensors } from '~/features/modules/common/config/registerStandardSensors'

export default defineNuxtPlugin(() => {
  registerStandardSensors()
})
