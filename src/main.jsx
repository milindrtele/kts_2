import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StereoVideoVR from './StereoVideoVR.jsx'
import VRScene from './VRScene.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <StereoVideoVR /> */}
    {/* <VRScene /> */}
    <App/>
  </StrictMode>,
)
