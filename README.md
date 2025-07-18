# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/771e90b6-413f-443b-b65d-b0fa0c6759fd

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/771e90b6-413f-443b-b65d-b0fa0c6759fd) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

### Troubleshooting module script errors

If you open `index.html` directly or deploy the project without building it, the
browser may log an error similar to:

```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "application/octet-stream".
```

This happens because the browser is trying to load the TypeScript entry file
(`src/main.tsx`) without Vite transpiling it. Run the development server with
`npm run dev` or build the project using `npm run build` and serve the files
from the generated `dist` directory to resolve the issue.

### Deploying to GitHub Pages

GitHub Pages only serves static files. Run `npm run build` to generate the `dist/` directory, then publish the contents of that folder (for example using a `gh-pages` branch). Opening `index.html` without building first will lead to the module MIME type error above.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/771e90b6-413f-443b-b65d-b0fa0c6759fd) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
