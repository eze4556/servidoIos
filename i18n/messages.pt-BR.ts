import ptBRMessages from "../messages/pt-BR.json"
import infoTermsPt from "../messages/legal/infoTerms.pt-BR.json"
import infoPrivacyPt from "../messages/legal/infoPrivacy.pt-BR.json"
import infoCareersPt from "../messages/legal/infoCareers.pt-BR.json"
import adminDashboardPt from "../messages/adminDashboard.pt-BR.json"
import type { AppMessages } from "./messages.es"

const messages = {
  ...ptBRMessages,
  ...infoTermsPt,
  ...infoPrivacyPt,
  ...infoCareersPt,
  ...adminDashboardPt,
} as unknown as AppMessages

export default messages
