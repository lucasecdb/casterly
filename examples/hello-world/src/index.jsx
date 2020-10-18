import { useEffect, useState } from 'react'

const App = () => {
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    setInterval(() => {
      setCounter((prevCounter) => prevCounter + 1)
    }, 1000)
  }, [])

  return (
    <>
      <p>Hello world!</p>
      <p>{counter} seconds elapsed</p>
    </>
  )
}

export default App
