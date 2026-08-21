# Contributing to DeepLX

Thank you for your interest in contributing to DeepLX! This document provides guidelines and information for contributors.

## Code of Conduct

This repository and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a branch for your changes
5. Make your changes
6. Test your changes
7. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Cloudflare Wrangler CLI

### Installation

1. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/DeepLX.git
   cd DeepLX
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up your development environment:

   ```bash
   npm run test:setup
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

## Making Changes

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Message Format

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Example:

```
feat(api): add new translation feature

Implement new endpoint that accepts multiple text inputs
for translation to improve performance for bulk operations.

Closes #123
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:performance

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

- Write unit tests for all new functions and classes
- Add integration tests for API endpoints
- Include performance tests for critical paths
- Ensure tests are deterministic and isolated
- Use descriptive test names and organize with `describe` blocks

### Test Requirements

- All tests must pass
- Code coverage should not decrease
- Integration tests should verify real-world scenarios
- Performance tests should validate response times

## Submitting Changes

### Before Submitting

1. Ensure all tests pass: `npm test`
2. Check code style: `npm run lint`
3. Update documentation if needed
4. Add tests for new functionality
5. Update CHANGELOG.md if applicable

### Pull Request Process

1. Create a pull request from your feature branch
2. Fill out the PR template completely
3. Ensure the PR passes all CI checks
4. Request review from maintainers
5. Address any feedback promptly
6. Keep the PR updated with the main branch

### PR Requirements

- Clear description of changes
- Reference related issues
- Include screenshots for UI changes
- Add performance impact notes if applicable
- Update documentation as needed

## Coding Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Define explicit types for function parameters and returns
- Avoid `any` type unless absolutely necessary
- Use meaningful variable and function names
- Follow consistent naming conventions

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multiline structures
- Keep lines under 100 characters
- Use meaningful comments for complex logic

### File Organization

- Keep files focused on a single responsibility
- Use consistent file naming (kebab-case)
- Export types and interfaces from dedicated files
- Group related functionality in modules

### Performance Considerations

- Optimize for Cloudflare Workers environment
- Minimize memory allocations
- Use efficient algorithms and data structures
- Cache frequently accessed data
- Monitor and test performance impact

## Security

### Security Guidelines

- Never commit sensitive information
- Use environment variables for configuration
- Validate all user inputs
- Implement proper error handling
- Follow security best practices for APIs

### Reporting Security Issues

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md) instead of creating a public issue.

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms and business logic
- Include usage examples in documentation
- Keep documentation up to date with code changes

### README Updates

- Update feature lists for new functionality
- Add new configuration options
- Update API documentation
- Include new examples and use cases

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### Changelog

- Update CHANGELOG.md for all user-facing changes
- Group changes by type (Added, Changed, Fixed, Removed)
- Include migration notes for breaking changes
- Reference related issues and PRs

## Getting Help

### Communication Channels

- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and general discussion
- Pull Request comments: Code review and implementation discussion

### Resources

- [Repository Documentation](README.md)
- [API Reference](docs/api.md)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Recognition

Contributors will be recognized in:

- CHANGELOG.md for significant contributions
- README.md contributors section
- GitHub contributors page

Thank you for contributing to DeepLX! 🚀
