import Vue from 'vue'

import App from './App.vue'
import router from './router'
import store from './store'
import i18n from './lang'
import '@soramitsu/soramitsu-js-ui/lib/styles'
import './styles/soramitsu-variables.scss'
import './plugins'

Vue.config.productionTip = false
Vue.config.devtools = process.env.NODE_ENV === 'development'

new Vue({
  i18n,
  router,
  store,
  render: h => h(App)
}).$mount('#app')
