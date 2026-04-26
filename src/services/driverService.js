import { api } from '@/lib/api'
import { unwrapData } from '@/lib/apiResponse'

const D = '/apimobile/driver'

export async function getMyRides(params) {
  const res = await api.get(`${D}/rides`, { params })
  return unwrapData(res)
}

export async function getHelpCenter() {
  const res = await api.get(`${D}/static/help-center`)
  return unwrapData(res)
}

export async function getNotifications(params) {
  const res = await api.get(`${D}/notifications`, { params })
  return res.data
}

export async function logoutDriver() {
  const res = await api.post(`${D}/auth/logout`)
  return unwrapData(res)
}
