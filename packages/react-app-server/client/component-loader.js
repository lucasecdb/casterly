const componentCache = {}

export const registerComponent = (componentName, registerModuleFn) => {
  try {
    const mod = registerModuleFn()
    const componentData = { component: mod.default || mod, mod }
    componentCache[componentName] = componentData
  } catch (error) {
    componentCache[componentName] = { error }
  }
}

export const loadComponent = (componentName) => {
  return new Promise((resolve, reject) => {
    const cachedComponent = componentCache[componentCache]

    if (cachedComponent) {
      resolve(cachedComponent)
      return
    }

    const componentScript = document.querySelector(
      `script[src="/static/components/${componentName}.js"]`
    )

    if (componentScript) {
      componentScript.addEventListener('load', () =>
        resolve(componentCache[componentName])
      )
      componentScript.addEventListener('error', reject)
      return
    }

    reject('Component not loaded')
  })
}
