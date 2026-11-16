import { api } from '../server/http.js'
import { dispatch } from '../server/router.js'

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } }

export default api(['GET', 'POST', 'DELETE'], dispatch)
