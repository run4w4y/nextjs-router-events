import { GlobalRegistrator } from '@happy-dom/global-registrator'
import '@testing-library/jest-dom'

if (!GlobalRegistrator.isRegistered) {
  GlobalRegistrator.register({ url: 'http://localhost' })
}
