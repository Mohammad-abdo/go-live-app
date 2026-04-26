/**
 * @param {import('axios').AxiosResponse} res
 * @returns {any}
 */
export function unwrapData(res) {
  const body = res?.data
  if (body && body.success === false) {
    const msg = body.message || 'Request failed'
    const err = new Error(msg)
    err.response = res
    throw err
  }
  if (body && 'data' in body) return body.data
  return body
}

/** @param {unknown} err */
export function getErrorMessage(err) {
  const e = /** @type {any} */ (err)
  return e?.response?.data?.message || e?.message || 'حدث خطأ'
}
