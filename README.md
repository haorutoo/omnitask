<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1IkECqouxdrVIw4Eo-BBSAbMXPlbEZy5-

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

1. Install the deployment tool:
   `npm install gh-pages --save-dev`

2. Add these properties to your `package.json`:
   ```json
   "homepage": "https://haorutoo.github.io/omnitask",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
   *(Note: Use `-d build` instead of `-d dist` if you are using Create React App instead of Vite)*

3. Deploy:
   `npm run deploy`
