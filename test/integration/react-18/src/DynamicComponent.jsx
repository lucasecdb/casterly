import { useState } from 'react'

const DynamicComponent = () => {
  const [changed, setChanged] = useState(false)

  if (typeof window !== 'undefined') {
    window.dynamicComponentLoaded = true
  }

  return (
    <div>
      <p>
        {!changed
          ? 'Hello from dynamic component!'
          : 'Hello from alternate message!'}
      </p>

      <button onClick={() => setChanged(true)}>change message</button>
    </div>
  )
}

export default DynamicComponent
