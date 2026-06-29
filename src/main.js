import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
app.use(ElementPlus, { locale: zhCn })
app.use(router)

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
  const el = document.getElementById('app')
  if (el && !el.innerHTML.trim()) {
    el.innerHTML = `<div style="padding:40px;text-align:center;color:red">
      <h3>页面加载失败</h3><p>${err.message}</p></div>`
  }
}

app.mount('#app')
