import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app.tsx'
import './styles.css'

registerSW({ immediate: true })

const root = document.getElementById('app')
if (root) render(<App />, root)
