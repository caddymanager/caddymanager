# Contributing to CaddyManager

Thank you for your interest in contributing to CaddyManager! Your help is greatly appreciated. Whether you’re reporting bugs, suggesting features, improving documentation, or submitting code, your contributions make this project better for everyone.

## How to Contribute

### 1. Fork & Clone

- Fork the repository on GitHub.
- Clone your fork locally:
  ```sh
  git clone https://github.com/YOUR_USERNAME/caddymanager.git
  cd caddymanager
  ```

### 2. Set Up Your Environment

- Install dependencies for both backend and frontend:
  ```sh
  cd backend && npm install
  cd ../frontend && npm install
  ```
- Copy `.env.example` to `.env` in both `backend/` and `frontend/`, and update values as needed.

### 3. Create a Branch

- Use a descriptive branch name:
  ```sh
  git checkout -b feature/your-feature-name
  ```

### 4. Make Your Changes

- Follow the existing code style and conventions.
- Write clear, concise commit messages.
- Add or update tests as appropriate.

### 5. Test Your Changes

- Run the backend:
  ```sh
  cd backend && npm start
  ```
- Run the frontend:
  ```sh
  cd frontend && npm run dev
  ```
- Ensure all tests pass and the app works as expected.

### 6. Submit a Pull Request

- Push your branch to your fork:
  ```sh
  git push origin feature/your-feature-name
  ```
- Open a pull request on GitHub against the `main` branch.
- Fill out the PR template and describe your changes.

## Code Style

- **Backend:** Node.js, Express, MongoDB (ESLint enforced)
- **Frontend:** Vue 3, Vite, Pinia, Vue Router (Prettier/ESLint enforced)
- Use clear, descriptive variable and function names.
- Keep functions small and focused.

## Reporting Issues

- Use the [GitHub Issues](https://github.com/YOUR_USERNAME/caddymanager/issues) page.
- Include steps to reproduce, expected behavior, and screenshots/logs if possible.

## Feature Requests

- Open an issue with the `[Feature]` label.
- Describe the use case and potential implementation ideas.

## Code of Conduct

Please be respectful and considerate in all interactions. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Ready to contribute? We look forward to your ideas, bug reports, and pull requests!
