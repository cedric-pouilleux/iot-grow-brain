import { registerStandardSensors } from '~/features/modules/common/config/registerStandardSensors'
import { registerStandardHardware } from '~/features/modules/common/config/registerStandardHardware'

export default defineNuxtPlugin(() => {
  // Register hardware first (physical sensors)
  registerStandardHardware()
  
  // Then register measurements (what hardware produces)
  registerStandardSensors()
})

