import React, { createContext, useContext } from 'react'

const ctx = createContext<boolean | undefined>(undefined)

export const useIsRoutePending = () => {
  const contextValue = useContext(ctx)

  if (contextValue == null) {
    throw new Error(
      'Hook useIsRoutePending must be a descendant of either <RootBrowser /> or <RootServer />'
    )
  }

  return contextValue
}

export const RoutePendingContextProvider: React.FC<{ value: boolean }> = ({
  value,
  children,
}) => {
  return <ctx.Provider value={value}>{children}</ctx.Provider>
}
