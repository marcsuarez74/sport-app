import { render, screen } from '@testing-library/react'
import App from '../src/App'

describe('scaffold', () => {
  it('renders the app placeholder', () => {
    render(<App />)
    expect(screen.getByText('Sport App')).toBeInTheDocument()
  })
})
