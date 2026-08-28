import esMessages from "../messages/es.json"
import infoTermsEs from "../messages/legal/infoTerms.es.json"
import infoPrivacyEs from "../messages/legal/infoPrivacy.es.json"
import infoCareersEs from "../messages/legal/infoCareers.es.json"
import adminDashboardEs from "../messages/adminDashboard.es.json"

export type AppMessages = typeof esMessages

const messages = {
  ...esMessages,
  ...infoTermsEs,
  ...infoPrivacyEs,
  ...infoCareersEs,
  ...adminDashboardEs,
} as AppMessages

export default messages
