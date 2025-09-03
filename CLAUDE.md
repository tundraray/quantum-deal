# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram bot project built with NestJS framework.

## Commands

### Development
- `pnpm run start:dev` - Start the bot in watch mode (auto-restart on changes)
- `pnpm run start:debug` - Start with debugging enabled
- `pnpm run build` - Build the application for production
- `pnpm run start:prod` - Run the production build

### Code Quality
- `pnpm run lint` - Run ESLint and auto-fix issues
- `pnpm run format` - Format code with Prettier

## Architecture

This is a NestJS-based Telegram bot using a modular architecture:

- **Main entry point**: `src/main.ts` - Bootstraps the NestJS application on port 3000 (or `PORT` env variable)
- **Root module**: `src/app.module.ts` - The main application module that imports all feature modules
- **Module pattern**: Each feature should be organized as a NestJS module with controllers, services, and related components
- **Dependency injection**: NestJS uses decorators (`@Module`, `@Controller`, `@Injectable`) for dependency injection
- **TypeScript configuration**: Uses Node.js native ES modules with `nodenext` module resolution, targeting ES2023