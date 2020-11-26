import React from 'react'

import { useRootContext } from './RootContext'

export const Meta: React.VFC = () => {
  const { routeMeta } = useRootContext()

  return (
    <>
      {Object.entries(routeMeta ?? {}).map(([key, value]) => {
        if (key === 'title') {
          return <title key="title">{value}</title>
        }

        return <meta key={key} name={key} content={value} />
      })}
    </>
  )
}
