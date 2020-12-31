import { useNavigate } from 'react-router-dom'

export default function BackLinkPage() {
  const navigate = useNavigate()

  const goBack = () => {
    navigate('/')
  }

  const handleClick = (evt) => {
    evt.preventDefault()

    goBack()
  }

  const handleKeyDown = (evt) => {
    evt.preventDefault()

    if (evt.keyCode === 'Enter') {
      goBack()
    }
  }

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      Go back
    </span>
  )
}
