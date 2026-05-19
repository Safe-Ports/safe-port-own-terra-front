```md
# OwnTerra Frontend

Frontend application for the OwnTerra platform.

OwnTerra is a web application focused on the management and monitoring of real estate lot acquisition processes, including clients, payments, documentation, progress tracking and administrative workflows.

## Repository

safe-port-own-terra-front

## Tech Stack

- React
- TypeScript
- Vite
- CSS

## Project Status

Initial frontend framework created.

Current scope:

- Base React project
- Essential folder structure
- Initial home page
- Basic responsive styling
- Happy path running locally

## Requirements

Before running the project, make sure you have installed:

- Node.js
- npm

Recommended versions:

- Node.js 20+
- npm 10+

## Installation

Clone the repository:

git clone https://github.com/Safe-Ports/safe-port-own-terra-front.git

Enter the project folder:

cd safe-port-own-terra-front

Install dependencies:

npm install

Run development server:

npm run dev

Open the local URL shown in the terminal, usually:

http://localhost:5173/

## Available Scripts

Run development server:

npm run dev

Generate production build:

npm run build

Preview production build:

npm run preview

Run lint:

npm run lint

## Initial Folder Structure

src/
├── assets/
├── components/
├── layouts/
├── pages/
├── routes/
├── services/
├── styles/
└── utils/

## Folder Purpose

### assets

Static files used by the application, such as images, icons and logos.

### components

Reusable UI components.

### layouts

General page structures.

### pages

Main application pages.

### routes

Application route definitions.

### services

External service connections, API clients and HTTP request logic.

### styles

Global styles and shared CSS files.

### utils

Helper functions used across the project.

## Happy Path

The initial happy path validates that:

1. The project installs correctly.
2. The development server starts.
3. The application renders the OwnTerra home page.
4. The production build completes successfully.

## Acceptance Criteria

- Repository created under Safe-Ports.
- Required permissions configured.
- Essential frontend folders created.
- React application runs locally.
- Initial happy path implemented.
- README created.
- Pull request opened.
- Pull request approved.
- Pull request merged.

## Development Workflow

Create a new branch:

git checkout -b feature/name-of-change

Commit changes:

git add .
git commit -m "feat: describe the change"

Push branch:

git push -u origin feature/name-of-change

Open a pull request into the main branch.

## Notes

This repository contains the frontend base for OwnTerra. Backend integration, authentication, dashboards