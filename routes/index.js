import googleAiRoute from './google.ai.route.js'
const routesMount = (app) => {
    app.use('/api/v1/', googleAiRoute)
}
export default routesMount