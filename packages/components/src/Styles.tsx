import React from 'react'

import { useRootContext } from './RootContext'

export const Styles: React.FC<
  Omit<
    React.DetailedHTMLProps<
      React.LinkHTMLAttributes<HTMLLinkElement>,
      HTMLLinkElement
    >,
    'type' | 'rel' | 'href'
  >
> = ({
  // @ts-ignore: You could still pass them if you're
  // using pure JavaScript
  type,
  // @ts-ignore
  rel,
  // @ts-ignore
  href,
  ...props
}) => {
  const { matchedRoutesAssets, mainAssets } = useRootContext()

  return (
    <>
      {matchedRoutesAssets
        .concat(mainAssets)
        .filter((file) => file.endsWith('.css'))
        .map((file) => (
          <link
            key={file}
            {...props}
            rel="stylesheet"
            type="text/css"
            href={`/_casterly${file}`}
          />
        ))}
    </>
  )
}
