import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

describe('scaffold', () => {
  it('scaffold is ready', () => {
    expect(true).toBe(true)
  })

  it('renders the app placeholder', () => {
    render(createElement(App))
    expect(screen.getByText('Sport App')).toBeInTheDocument()
  })
})
