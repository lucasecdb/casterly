import { useState } from 'react'

const DynamicComponent = () => {
  const [changed, setChanged] = useState(false)

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
