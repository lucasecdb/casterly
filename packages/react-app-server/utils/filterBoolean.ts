export const filterBoolean = <T>(value: T | boolean): value is T => {
  return !!value
}
