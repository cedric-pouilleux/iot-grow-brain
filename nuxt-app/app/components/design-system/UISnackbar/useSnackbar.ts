export type SnackbarType = 'success' | 'error' | 'info' | 'warning'

interface SnackbarState {
  show: boolean
  message: string
  type: SnackbarType
  timeout: number
}

export const useSnackbar = () => {
  const snackbar = useState<SnackbarState>('snackbar', () => ({
    show: false,
    message: '',
    type: 'info',
    timeout: 3000
  }))

  let timer: NodeJS.Timeout | null = null

  const showSnackbar = (message: string, type: SnackbarType = 'info', timeout = 3000) => {
    // Reset existing timer if any
    if (timer) clearTimeout(timer)

    snackbar.value = {
      show: true,
      message,
      type,
      timeout
    }

    timer = setTimeout(() => {
      closeSnackbar()
    }, timeout)
  }

  const closeSnackbar = () => {
    if (timer) clearTimeout(timer)
    snackbar.value.show = false
  }

  return {
    snackbar,
    showSnackbar,
    closeSnackbar
  }
}
