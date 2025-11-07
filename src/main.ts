import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { piniaPersistencePlugin } from './plugins/piniaPersistence'
import './style.css'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPersistencePlugin)

app.use(pinia)
app.use(router)

app.mount('#app')
