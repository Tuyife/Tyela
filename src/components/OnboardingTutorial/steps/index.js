import { Step1Welcome } from './Step1Welcome.jsx'
import { Step2CoupleMode } from './Step2CoupleMode.jsx'
import { Step3GroupMode } from './Step3GroupMode.jsx'
import { Step4RealTimeSync } from './Step4RealTimeSync.jsx'
import { Step5Chat } from './Step5Chat.jsx'

export const STEPS = [
  { ...Step1Welcome.meta, Component: Step1Welcome },
  { ...Step2CoupleMode.meta, Component: Step2CoupleMode },
  { ...Step3GroupMode.meta, Component: Step3GroupMode },
  { ...Step4RealTimeSync.meta, Component: Step4RealTimeSync },
  { ...Step5Chat.meta, Component: Step5Chat }
]