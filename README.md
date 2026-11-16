# SwachhRail AI by Robustrix — React (Vite)

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in /dist
```

## Notes
- 3D train scene: `src/components/Scene3D.jsx` (three.js 0.128)
- Dashboard data / city multipliers / AI answers: `src/data.js`
- Feedback form + Admin panel: `src/components/Feedback.jsx`
  (demo admin login: `admin` / `admin123` when no backend is running)
- Backend is optional. To use the Node/Express backend (`/api/login`, `/api/feedback`,
  `/api/records`, `/api/ask`), uncomment the proxy in `vite.config.js`.
