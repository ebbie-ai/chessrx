import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock next/link since we're not in a Next.js runtime
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// Mock the game-analyzer (uses browser Worker APIs not available in jsdom)
vi.mock('@/lib/game-analyzer', () => ({
  analyzeGames: vi.fn(),
  criticalPositionToPuzzle: vi.fn(),
  saveImportedPuzzles: vi.fn(),
  loadImportedPuzzles: vi.fn(() => null),
  IMPORTED_PUZZLES_KEY: 'chessrx_imported_puzzles',
}))

// Mock the chesscom-api
vi.mock('@/lib/chesscom-api', () => ({
  fetchPlayerProfile: vi.fn(),
  fetchPlayerStats: vi.fn(),
  fetchRecentGames: vi.fn(),
  getPlayerRating: vi.fn(),
  ChessComApiError: class ChessComApiError extends Error {
    code?: string
    status?: number
    constructor(message: string, status?: number, code?: string) {
      super(message)
      this.name = 'ChessComApiError'
      this.status = status
      this.code = code
    }
  },
}))

// Import after mocks are set up
const { default: ImportPage } = await import('@/app/import/page')

describe('ImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the import page without crashing', () => {
    const { container } = render(React.createElement(ImportPage))
    expect(container).toBeTruthy()
  })

  it('shows the page title', () => {
    render(React.createElement(ImportPage))
    expect(screen.getByText('Import Your Games')).toBeTruthy()
  })

  it('shows the username input', () => {
    render(React.createElement(ImportPage))
    const input = screen.getByPlaceholderText(/btakashi444/i)
    expect(input).toBeTruthy()
  })

  it('shows the Import Games button', () => {
    render(React.createElement(ImportPage))
    const button = screen.getByText('Import Games')
    expect(button).toBeTruthy()
  })

  it('shows time control filter options', () => {
    render(React.createElement(ImportPage))
    expect(screen.getByText('Blitz')).toBeTruthy()
    expect(screen.getByText('Rapid')).toBeTruthy()
    expect(screen.getByText('Bullet')).toBeTruthy()
    expect(screen.getByText('All')).toBeTruthy()
  })

  it('shows time period filter options', () => {
    render(React.createElement(ImportPage))
    expect(screen.getByText('Last month')).toBeTruthy()
    expect(screen.getByText('Last 3 months')).toBeTruthy()
    expect(screen.getByText('Last year')).toBeTruthy()
  })

  it('Import Games button is disabled when username is empty', () => {
    render(React.createElement(ImportPage))
    const button = screen.getByText('Import Games').closest('button')
    expect(button).toBeTruthy()
    expect(button?.disabled).toBe(true)
  })
})
