import 'uno.css'
import './reset.css'
import './style.css'

import { createApp } from 'vue'
import Root from './components/Root.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(Root);

app.use(ElementPlus)
app.mount('#app')



